-- Account groups: lets a user label several dim_accounts rows (typically the same bank
-- account represented once per currency) as belonging together, so the UI can show them as
-- one card with a combined, currency-converted total instead of scattering them across the
-- native/foreign currency split.
--
-- Deliberately minimal: just a name, keyed by user. No balance is stored here -- balances stay
-- derived from fct_transactions everywhere in this app (accounts_calc.py), and a group is a
-- pure labelling concern, not a financial one.
--
--   dim_account_groups                -- one row per group, user_id_fk-keyed, RLS-scoped to auth.uid()
--   dim_accounts.account_group_id_fk  -- nullable FK, ON DELETE SET NULL (deleting a group
--                                         un-groups its members, it does not touch their data)
--
-- Additive only: every existing dim_accounts row gets account_group_id_fk = NULL (ungrouped),
-- which is exactly how the accounts page already treats an account with no group.


-- ================================================================================================
--                                   dim_account_groups
-- ================================================================================================

CREATE TABLE "public"."dim_account_groups" (
    "account_groups_id_pk"  "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id_fk"             "uuid" DEFAULT "auth"."uid"() NOT NULL
                                 REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "group_name"             "text" NOT NULL,
    "created_at"             timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dim_account_groups_name_unique" UNIQUE ("user_id_fk", "group_name")
);

ALTER TABLE "public"."dim_account_groups" OWNER TO "postgres";

COMMENT ON TABLE "public"."dim_account_groups" IS
    'User-defined label grouping several dim_accounts rows together (e.g. one bank account held in multiple currencies). No balance is stored here -- the frontend sums the converted current_balance of member accounts at read time, same as every other aggregate in this app.';

CREATE INDEX "dim_account_groups_user_id_idx" ON "public"."dim_account_groups" ("user_id_fk");

ALTER TABLE "public"."dim_account_groups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own account groups" ON "public"."dim_account_groups"
    FOR SELECT USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Insert own account groups" ON "public"."dim_account_groups"
    FOR INSERT WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Update own account groups" ON "public"."dim_account_groups"
    FOR UPDATE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")))
    WITH CHECK (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "Delete own account groups" ON "public"."dim_account_groups"
    FOR DELETE USING (("user_id_fk" = ( SELECT "auth"."uid"() AS "uid")));


-- ================================================================================================
--                                   dim_accounts.account_group_id_fk
-- ================================================================================================

ALTER TABLE "public"."dim_accounts"
    ADD COLUMN "account_group_id_fk" "uuid"
        REFERENCES "public"."dim_account_groups"("account_groups_id_pk") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."dim_accounts"."account_group_id_fk" IS
    'Optional group this account belongs to. Nullable and additive -- every existing account is ungrouped (NULL) after this migration, and every reader other than the accounts page/router ignores this column entirely. ON DELETE SET NULL (not RESTRICT, unlike fct_transactions/dim_recurring''s FKs to dim_accounts): deleting a group is a labelling change, not a data change, so members simply become ungrouped rather than blocking the delete.';

CREATE INDEX "dim_accounts_account_group_id_idx" ON "public"."dim_accounts" ("account_group_id_fk");
