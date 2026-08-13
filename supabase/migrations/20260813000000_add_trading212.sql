-- Trading212 portfolio integration: a per-user broker connection, a disposable positions
-- snapshot, and an append-only value-history log used to add an "invested" figure to net worth.
--
-- See SPEC.md §§2-4 and QUESTIONS.md for the design rationale. Three tables, all
-- user_id_fk-keyed and RLS-scoped to auth.uid(), matching fct_dividend_portfolios (SPEC.md §3):
--
--   fct_t212_connection    -- one row per user; holds the encrypted T212 credentials
--                             (SELECT/INSERT/UPDATE/DELETE)
--   fct_t212_positions     -- latest snapshot, upserted + stale rows deleted each sync
--                             (SELECT/INSERT/UPDATE/DELETE)
--   fct_t212_value_history -- one row appended per successful sync; never updated or bulk-deleted
--                             (SELECT/INSERT/DELETE -- no UPDATE policy, rows are immutable)
--
-- The encrypted blob is opaque to Postgres -- encryption/decryption happens in the backend
-- (helper/trading212_crypto.py) using a key (T212_ENCRYPTION_KEY) that only the backend process
-- holds, never stored in the database (SPEC.md §4.2). RLS on all three tables scopes rows to
-- auth.uid(); the sync cron job (which must touch every user's row, not just the caller's) uses
-- the service-role client the same way account deletion already does.


-- ================================================================================================
--                                   fct_t212_connection
-- ================================================================================================

CREATE TABLE "public"."fct_t212_connection" (
    "id_pk"                    "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"                "uuid" DEFAULT "auth"."uid"() NOT NULL UNIQUE
                                    REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "credentials_ciphertext"    "text" NOT NULL,
    "key_version"               smallint DEFAULT 1 NOT NULL,
    "account_currency"          "text",
    "last_synced_at"            timestamp with time zone,
    "last_sync_status"          "text",
    "last_sync_error"           "text",
    "created_at"                timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at"                timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fct_t212_connection_status_check"
        CHECK (("last_sync_status" IS NULL OR "last_sync_status" = ANY (
            ARRAY['ok'::"text", 'auth_failed'::"text", 'rate_limited'::"text", 'error'::"text"]
        )))
);

ALTER TABLE "public"."fct_t212_connection" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_t212_connection" IS
    'One row per user holding their encrypted Trading212 credentials. credentials_ciphertext is a Fernet token over {"api_key","api_secret"} (SPEC.md §3 modelled a single api_key_ciphertext; live T212 research showed the real API needs a key+secret pair via HTTP Basic auth -- see QUESTIONS.md §1) -- the decryption key lives only in the backend process, never in Postgres. Ciphertext is readable by the owning user''s own token (RLS); that''s fine, ciphertext without the KEK is inert (SPEC.md §3).';
COMMENT ON COLUMN "public"."fct_t212_connection"."last_sync_status" IS
    'null: no sync attempted yet. ok: last sync succeeded. auth_failed: credentials rejected by T212 (sync job skips this row until reconnected). rate_limited: aborted on a 429. error: any other failure.';
COMMENT ON COLUMN "public"."fct_t212_connection"."last_sync_error" IS
    'Short classified reason (matches last_sync_status), never the raw upstream response or the key (SPEC.md §4.4).';
COMMENT ON COLUMN "public"."fct_t212_connection"."key_version" IS
    'Bumped on key rotation so decrypting an older row can pick the right KEK generation, without a migration (SPEC.md §4.2).';

ALTER TABLE "public"."fct_t212_connection" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own t212 connection" ON "public"."fct_t212_connection"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Insert own t212 connection" ON "public"."fct_t212_connection"
    FOR INSERT WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Update own t212 connection" ON "public"."fct_t212_connection"
    FOR UPDATE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Delete own t212 connection" ON "public"."fct_t212_connection"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));


-- ================================================================================================
--                                   fct_t212_positions
-- ================================================================================================

CREATE TABLE "public"."fct_t212_positions" (
    "id_pk"            "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"       "uuid" DEFAULT "auth"."uid"() NOT NULL
                           REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "ticker"           "text" NOT NULL,
    "quantity"         numeric NOT NULL,
    "average_price"    numeric NOT NULL,
    "current_price"    numeric NOT NULL,
    "market_value"     numeric NOT NULL,
    "unrealised_pnl"   numeric NOT NULL,
    "currency"         "text" NOT NULL,
    "synced_at"        timestamp with time zone NOT NULL,
    CONSTRAINT "fct_t212_positions_unique" UNIQUE ("user_id_fk", "ticker")
);

ALTER TABLE "public"."fct_t212_positions" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_t212_positions" IS
    'Latest open-positions snapshot per user, upserted on every sync then diffed against synced_at to drop closed positions (SPEC.md §3). Disposable -- rebuilt in full by the next successful sync, so it is deleted (not archived) on disconnect.';
COMMENT ON COLUMN "public"."fct_t212_positions"."unrealised_pnl" IS 'Unrealised profit/loss on this position, in currency.';
COMMENT ON COLUMN "public"."fct_t212_positions"."currency" IS 'T212 account currency at sync time (T212 does not support multi-currency accounts).';

CREATE INDEX "fct_t212_positions_user_id_idx" ON "public"."fct_t212_positions" ("user_id_fk");

ALTER TABLE "public"."fct_t212_positions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own t212 positions" ON "public"."fct_t212_positions"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Insert own t212 positions" ON "public"."fct_t212_positions"
    FOR INSERT WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Update own t212 positions" ON "public"."fct_t212_positions"
    FOR UPDATE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Delete own t212 positions" ON "public"."fct_t212_positions"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));


-- ================================================================================================
--                                   fct_t212_value_history
-- ================================================================================================

CREATE TABLE "public"."fct_t212_value_history" (
    "id_pk"            "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"       "uuid" DEFAULT "auth"."uid"() NOT NULL
                           REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "total_value"      numeric NOT NULL,
    "cash_value"       numeric NOT NULL,
    "invested_value"   numeric NOT NULL,
    "currency"         "text" NOT NULL,
    "snapshot_at"      timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at"       timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."fct_t212_value_history" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_t212_value_history" IS
    'Append-only portfolio value log, one row per successful sync (SPEC.md §3). There is no backfill path for this table (SPEC.md §1) -- a gap in the series is a gap forever -- so it is only ever inserted or, on disconnect with delete_history=true, deleted wholesale. Never updated.';
COMMENT ON COLUMN "public"."fct_t212_value_history"."cash_value" IS 'Free cash, stored separately even though it counts toward "invested" in the net-worth headline -- cheap now, painful to reconstruct later.';
COMMENT ON COLUMN "public"."fct_t212_value_history"."currency" IS 'T212 account currency, not base currency -- converted at read time via helper/exchange_rates.get_rate so historical figures do not shift retroactively when FX rates refresh.';

CREATE INDEX "fct_t212_value_history_user_id_snapshot_idx"
    ON "public"."fct_t212_value_history" ("user_id_fk", "snapshot_at" DESC);

ALTER TABLE "public"."fct_t212_value_history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own t212 value history" ON "public"."fct_t212_value_history"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Insert own t212 value history" ON "public"."fct_t212_value_history"
    FOR INSERT WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

-- No UPDATE policy -- rows are immutable once written.

CREATE POLICY "Delete own t212 value history" ON "public"."fct_t212_value_history"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));


-- ================================================================================================
--                                   Register the feature flag (SPEC.md §2)
-- ================================================================================================

INSERT INTO public.dim_features (feature_key, feature_name, feature_description)
VALUES ('t212_integration', 'Trading 212',
        'Sync portfolio positions and value from a read-only Trading 212 API key')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.dim_features_users (user_id_fk, feature_key, is_enabled)
SELECT u.id, 't212_integration', false FROM auth.users u
ON CONFLICT (user_id_fk, feature_key) DO NOTHING;
