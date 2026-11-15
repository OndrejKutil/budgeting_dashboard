-- Bank statement import (CSV / XLSX). See docs/specs/statement-import.md.
--
--   fct_import_batches                   -- one row per imported file; the unit of "Undo"
--   fct_transactions.import_batch_id_fk  -- which import a transaction came from (null = typed by hand)
--   feature flag statement_import        -- per-user rollout
--
-- Additive only. The uploaded file itself is never stored.


-- ================================================================================================
--                                   fct_import_batches
-- ================================================================================================

CREATE TABLE "public"."fct_import_batches" (
    "import_batch_id_pk" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"         "uuid" NOT NULL DEFAULT "auth"."uid"()
                             REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "account_id_fk"      "uuid" NOT NULL
                             REFERENCES "public"."dim_accounts"("accounts_id_pk") ON DELETE CASCADE,
    "file_name"          "text",
    "preset"             "text",
    "mapping_json"       "jsonb",
    "row_count"          integer NOT NULL DEFAULT 0,
    "date_from"          "date",
    "date_to"            "date",
    "created_at"         timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."fct_import_batches" OWNER TO "postgres";

COMMENT ON TABLE "public"."fct_import_batches" IS
    'One row per imported bank statement. mapping_json is the StatementMapping used, reused for the next file into the same account. Undo deletes the batch''s transactions first, then this row.';

CREATE INDEX "ix_import_batches_user_created" ON "public"."fct_import_batches"
    USING "btree" ("user_id_fk", "created_at" DESC);
CREATE INDEX "ix_import_batches_account" ON "public"."fct_import_batches" ("account_id_fk");

ALTER TABLE "public"."fct_import_batches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own import batches" ON "public"."fct_import_batches"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

-- FK checks bypass RLS, so the policy itself makes sure the account is the user's own too.
CREATE POLICY "Insert own import batches" ON "public"."fct_import_batches"
    FOR INSERT WITH CHECK (
        "user_id_fk" = ( SELECT "auth"."uid"() AS "uid")
        AND EXISTS (
            SELECT 1 FROM "public"."dim_accounts" a
            WHERE a."accounts_id_pk" = "account_id_fk"
              AND a."user_id_fk" = ( SELECT "auth"."uid"() AS "uid")
        )
    );

CREATE POLICY "Delete own import batches" ON "public"."fct_import_batches"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

-- No UPDATE policy: a batch is written once. Narrow Supabase's default ALL grant to match.
REVOKE ALL ON TABLE "public"."fct_import_batches" FROM "anon", "authenticated";
GRANT SELECT, INSERT, DELETE ON TABLE "public"."fct_import_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."fct_import_batches" TO "service_role";


-- ================================================================================================
--                                   fct_transactions.import_batch_id_fk
-- ================================================================================================

-- ON DELETE SET NULL: removing a batch row on its own never deletes money data. Undo deletes
-- the transactions explicitly before the batch.
ALTER TABLE "public"."fct_transactions"
    ADD COLUMN "import_batch_id_fk" "uuid"
        REFERENCES "public"."fct_import_batches"("import_batch_id_pk") ON DELETE SET NULL;

CREATE INDEX "ix_transactions_import_batch" ON "public"."fct_transactions" ("import_batch_id_fk")
    WHERE "import_batch_id_fk" IS NOT NULL;


-- ================================================================================================
--                                   Feature flag
-- ================================================================================================

INSERT INTO public.dim_features (feature_key, feature_name, feature_description)
VALUES ('statement_import', 'Statement import',
        'Import transactions from a bank statement export (CSV / XLSX)')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.dim_features_users (user_id_fk, feature_key, is_enabled)
SELECT u.id, 'statement_import', false FROM auth.users u
ON CONFLICT (user_id_fk, feature_key) DO NOTHING;
