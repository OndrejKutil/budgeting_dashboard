-- Auto-posting for recurring templates.
--
-- A template with auto_post = true is posted by a daily job instead of waiting for the user to
-- press "Post" on the Recurring page. The job is scripts/post_recurring.py on the Raspberry Pi
-- (same as the other scheduled jobs), which calls POST /recurring/post-due on the backend, which
-- calls post_due_recurring() below with the service-role client. Every automatic posting is recorded in
-- fct_recurring_postings, which doubles as the notification feed: the app lists unacknowledged
-- postings from the last few days so the user can edit, delete or dismiss them.
--
--   dim_recurring.auto_post   -- per-template opt-in, defaults to false (existing templates unchanged)
--   fct_recurring_postings    -- one row per automatically posted occurrence; unique on
--                                (recurring_id_fk, occurrence_date) so an occurrence can never be
--                                posted twice, even if two runs overlap
--   post_due_recurring()      -- SECURITY DEFINER worker; callable by service_role only
--
-- Manual posting (POST /recurring/{id}/post) is untouched and records no posting: the user just
-- did it, there is nothing to notify about.


-- ================================================================================================
--                                   dim_recurring.auto_post
-- ================================================================================================

ALTER TABLE "public"."dim_recurring"
    ADD COLUMN "auto_post" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."dim_recurring"."auto_post" IS
    'When true (and is_active), post_due_recurring() posts due occurrences automatically every day and records each one in fct_recurring_postings.';

CREATE INDEX "ix_recurring_auto_post_due" ON "public"."dim_recurring" USING "btree" ("next_date")
    WHERE "auto_post" AND "is_active";


-- ================================================================================================
--                                   fct_recurring_postings
-- ================================================================================================

CREATE TABLE "public"."fct_recurring_postings" (
    "recurring_postings_id_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"               "uuid" NOT NULL
                                   REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    -- Deleting a template drops its notifications; the posted transactions themselves stay.
    "recurring_id_fk"          "uuid" NOT NULL
                                   REFERENCES "public"."dim_recurring"("recurring_id_pk") ON DELETE CASCADE,
    -- Deleting the transaction (the "Delete" action on a notification) drops the posting with it.
    "transaction_id_fk"        "uuid" NOT NULL
                                   REFERENCES "public"."fct_transactions"("id_pk") ON DELETE CASCADE,
    "occurrence_date"          "date" NOT NULL,
    "posted_at"                timestamp with time zone DEFAULT "now"() NOT NULL,
    "acknowledged_at"          timestamp with time zone,
    CONSTRAINT "fct_recurring_postings_occurrence_unique" UNIQUE ("recurring_id_fk", "occurrence_date")
);

ALTER TABLE "public"."fct_recurring_postings" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_recurring_postings" IS
    'One row per occurrence posted automatically by post_due_recurring(). Rows with acknowledged_at IS NULL and a recent posted_at are shown as notifications; old ones simply stop being shown. Written only by post_due_recurring() (no INSERT policy); the user can acknowledge (UPDATE) or delete their own.';

CREATE INDEX "ix_recurring_postings_user_unack" ON "public"."fct_recurring_postings"
    USING "btree" ("user_id_fk", "posted_at" DESC) WHERE "acknowledged_at" IS NULL;
CREATE INDEX "ix_recurring_postings_transaction" ON "public"."fct_recurring_postings" ("transaction_id_fk");

ALTER TABLE "public"."fct_recurring_postings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own recurring postings" ON "public"."fct_recurring_postings"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Update own recurring postings" ON "public"."fct_recurring_postings"
    FOR UPDATE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Delete own recurring postings" ON "public"."fct_recurring_postings"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

-- Supabase's default privileges grant anon/authenticated ALL on new tables; narrow that down.
-- Users may only read, dismiss (acknowledged_at is the one updatable column) and delete.
REVOKE ALL ON TABLE "public"."fct_recurring_postings" FROM "anon", "authenticated";
GRANT SELECT, DELETE ON TABLE "public"."fct_recurring_postings" TO "authenticated";
GRANT UPDATE ("acknowledged_at") ON TABLE "public"."fct_recurring_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."fct_recurring_postings" TO "service_role";


-- ================================================================================================
--                                   post_due_recurring()
-- ================================================================================================

-- Posts every due occurrence of every active auto_post template, for all users, and advances
-- next_date. Missed days are caught up (each occurrence dated on its own due date), so a day
-- the Pi was off only delays postings, it doesn't lose them.
--
-- Catch-up window: only templates whose next_date is within the last 31 days are picked up. A
-- template that was already long overdue when auto-post was switched on (or when it was
-- un-paused) is left alone and stays in "Due now" for the user to post by hand, instead of
-- silently back-posting months of transactions. Once it is within the window, auto-post takes
-- over. In normal operation the job runs daily, so the window only matters in that case.
-- v_max_per is a second safety cap per template per run.
--
-- Each template is posted in its own sub-transaction: one failing template (bad FK, a future
-- trigger) is skipped with a WARNING instead of rolling back the whole run for every user.
--
-- Date stepping must match routers/recurring.py::_advance_date: Postgres' interval arithmetic
-- clamps month-end the same way (Jan 31 + 1 month = Feb 28; Feb 29 + 1 year = Feb 28).
--
-- "Today" is Europe/Prague, the app's home timezone, so a template due on the 1st posts on the
-- 1st local time whatever the server clock says.
CREATE OR REPLACE FUNCTION "public"."post_due_recurring"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_today    date := (now() AT TIME ZONE 'Europe/Prague')::date;
    v_window   constant integer := 31;
    v_max_per  constant integer := 10;
    v_posted   integer := 0;
    v_tpl_n    integer;
    v_tpl      record;
    v_date     date;
    v_steps    integer;
    v_tx_id    uuid;
BEGIN
    FOR v_tpl IN
        SELECT *
        FROM public.dim_recurring
        WHERE auto_post AND is_active
          AND next_date <= v_today
          AND next_date >= v_today - v_window
        ORDER BY next_date
        FOR UPDATE SKIP LOCKED
    LOOP
      BEGIN
        v_date  := v_tpl.next_date;
        v_steps := 0;
        v_tpl_n := 0;

        WHILE v_date <= v_today AND v_steps < v_max_per LOOP
            -- Guard against a duplicate if next_date was ever rewound onto an already-posted date.
            IF NOT EXISTS (
                SELECT 1 FROM public.fct_recurring_postings
                WHERE recurring_id_fk = v_tpl.recurring_id_pk AND occurrence_date = v_date
            ) THEN
                INSERT INTO public.fct_transactions
                    (user_id_fk, account_id_fk, category_id_fk, amount, date, notes, savings_fund_id_fk)
                VALUES
                    (v_tpl.user_id_fk, v_tpl.account_id_fk, v_tpl.category_id_fk, v_tpl.amount,
                     v_date, v_tpl.notes, v_tpl.savings_fund_id_fk)
                RETURNING id_pk INTO v_tx_id;

                INSERT INTO public.fct_recurring_postings
                    (user_id_fk, recurring_id_fk, transaction_id_fk, occurrence_date)
                VALUES
                    (v_tpl.user_id_fk, v_tpl.recurring_id_pk, v_tx_id, v_date);

                v_tpl_n := v_tpl_n + 1;
            END IF;

            v_date := CASE v_tpl.cadence
                WHEN 'weekly'    THEN v_date + 7
                WHEN 'biweekly'  THEN v_date + 14
                WHEN 'monthly'   THEN (v_date + interval '1 month')::date
                WHEN 'quarterly' THEN (v_date + interval '3 months')::date
                WHEN 'yearly'    THEN (v_date + interval '1 year')::date
            END;
            v_steps := v_steps + 1;
        END LOOP;

        UPDATE public.dim_recurring
        SET next_date = v_date, updated_at = now()
        WHERE recurring_id_pk = v_tpl.recurring_id_pk;

        -- Counted only once the template's savepoint has succeeded.
        v_posted := v_posted + v_tpl_n;
      EXCEPTION WHEN OTHERS THEN
        -- Rolls back just this template's inserts (the BEGIN block is a savepoint).
        RAISE WARNING 'post_due_recurring: template % skipped: %', v_tpl.recurring_id_pk, SQLERRM;
      END;
    END LOOP;

    RETURN v_posted;
END;
$$;

ALTER FUNCTION "public"."post_due_recurring"() OWNER TO "postgres";

-- SECURITY DEFINER and acting for every user: must never be reachable through PostgREST RPC by
-- app users. Only the backend's service-role client (POST /recurring/post-due) may call it.
REVOKE ALL ON FUNCTION "public"."post_due_recurring"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."post_due_recurring"() FROM "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."post_due_recurring"() TO "service_role";

