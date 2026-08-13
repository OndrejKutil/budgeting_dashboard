-- Trading212 portfolio integration: a per-user broker connection, a disposable positions
-- snapshot, and an append-only value-history log used to add an "invested" figure to net worth.
--
-- See SPEC.md and QUESTIONS.md (section 6) for the design rationale. Three tables:
--
--   dim_t212_connections   -- one row per user; holds the encrypted T212 credentials
--   fct_t212_positions     -- latest snapshot, upserted + stale rows deleted each sync
--   fct_t212_value_history -- one row appended per successful sync; never updated or bulk-deleted
--
-- The encrypted blob is opaque to Postgres -- encryption/decryption happens in the backend
-- (helper/trading212_crypto.py) using a key that only the backend process holds, never stored
-- in the database. RLS on all three tables scopes rows to auth.uid(), matching every other
-- per-user table in this schema; the sync cron job (which must touch every user's row, not
-- just the caller's) uses the service-role client the same way account deletion already does.


-- ================================================================================================
--                                   dim_t212_connections
-- ================================================================================================

CREATE TABLE "public"."dim_t212_connections" (
    "id_pk"                "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"            "uuid" DEFAULT "auth"."uid"() NOT NULL UNIQUE
                                REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "encrypted_credentials" "text" NOT NULL,
    "account_currency"      "text",
    "last_synced_at"        timestamp with time zone,
    "last_sync_status"      "text" DEFAULT 'never' NOT NULL,
    "created_at"            timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at"            timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dim_t212_connections_status_check"
        CHECK (("last_sync_status" = ANY (ARRAY['never'::"text", 'ok'::"text", 'auth_failed'::"text", 'error'::"text"])))
);

ALTER TABLE "public"."dim_t212_connections" OWNER TO "postgres";

COMMENT ON TABLE "public"."dim_t212_connections" IS
    'One row per user holding their encrypted Trading212 API key+secret. encrypted_credentials is a Fernet token over {"api_key","api_secret"} -- the decryption key lives only in the backend process, never in Postgres.';
COMMENT ON COLUMN "public"."dim_t212_connections"."last_sync_status" IS
    'never: no sync attempted yet. ok: last sync succeeded. auth_failed: credentials rejected by T212 (sync job skips this row until reconnected). error: transient failure (network, T212 5xx, rate limit).';

ALTER TABLE "public"."dim_t212_connections" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own t212 connection" ON "public"."dim_t212_connections"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Insert own t212 connection" ON "public"."dim_t212_connections"
    FOR INSERT WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Update own t212 connection" ON "public"."dim_t212_connections"
    FOR UPDATE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Delete own t212 connection" ON "public"."dim_t212_connections"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));


-- ================================================================================================
--                                   fct_t212_positions
-- ================================================================================================

CREATE TABLE "public"."fct_t212_positions" (
    "id_pk"          "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"     "uuid" DEFAULT "auth"."uid"() NOT NULL
                         REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "ticker"         "text" NOT NULL,
    "quantity"       numeric NOT NULL,
    "average_price"  numeric NOT NULL,
    "current_price"  numeric NOT NULL,
    "market_value"   numeric NOT NULL,
    "ppl"            numeric NOT NULL,
    "synced_at"      timestamp with time zone NOT NULL,
    CONSTRAINT "fct_t212_positions_unique" UNIQUE ("user_id_fk", "ticker")
);

ALTER TABLE "public"."fct_t212_positions" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_t212_positions" IS
    'Latest open-positions snapshot per user, upserted on every sync. Disposable -- rebuilt in full by the next successful sync, so it is deleted (not archived) on disconnect. Values are in the connection''s account_currency (T212 does not support multi-currency accounts).';
COMMENT ON COLUMN "public"."fct_t212_positions"."ppl" IS 'Profit/loss on this position, in account_currency.';

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
    "id_pk"        "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"   "uuid" DEFAULT "auth"."uid"() NOT NULL
                       REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "total_value"  numeric NOT NULL,
    "snapshot_at"  timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at"   timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."fct_t212_value_history" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_t212_value_history" IS
    'Append-only portfolio value log, one row per successful sync. There is no backfill path for this table -- a gap in the series is a gap forever -- so it is only ever inserted or, on disconnect with delete_history=true, deleted wholesale. Never updated. total_value is in the connection''s account_currency at the time of the snapshot.';

CREATE INDEX "fct_t212_value_history_user_id_snapshot_idx"
    ON "public"."fct_t212_value_history" ("user_id_fk", "snapshot_at");

ALTER TABLE "public"."fct_t212_value_history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own t212 value history" ON "public"."fct_t212_value_history"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Insert own t212 value history" ON "public"."fct_t212_value_history"
    FOR INSERT WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

-- No UPDATE policy -- rows are immutable once written.

CREATE POLICY "Delete own t212 value history" ON "public"."fct_t212_value_history"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));


-- ================================================================================================
--                                   Register the feature flag
-- ================================================================================================
-- Follows the two-statement pattern documented at the bottom of
-- 20260810000000_add_feature_flags.sql.

INSERT INTO public.dim_features (feature_key, feature_name, feature_description)
VALUES ('trading212', 'Trading212 integration',
        'Sync portfolio positions and value history from a connected Trading212 account')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.dim_features_users (user_id_fk, feature_key, is_enabled)
SELECT u.id, 'trading212', false FROM auth.users u
ON CONFLICT (user_id_fk, feature_key) DO NOTHING;
