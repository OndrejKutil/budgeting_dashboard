-- Migration: dim_recurring — recurring transaction templates for A1
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS dim_recurring (
    recurring_id_pk  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_fk       UUID        NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
    account_id_fk    UUID        NOT NULL REFERENCES dim_accounts(accounts_id_pk) ON DELETE RESTRICT,
    category_id_fk   BIGINT      NOT NULL REFERENCES dim_categories_users(categories_id_pk) ON DELETE RESTRICT,
    savings_fund_id_fk UUID      NULL     REFERENCES dim_savings_funds(savings_funds_id_pk) ON DELETE SET NULL,
    amount           NUMERIC     NOT NULL,
    cadence          TEXT        NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','quarterly','yearly')),
    next_date        DATE        NOT NULL,
    notes            TEXT,
    is_active        BOOLEAN     NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dim_recurring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_select" ON dim_recurring
    FOR SELECT TO authenticated USING (user_id_fk = auth.uid());

CREATE POLICY "recurring_insert" ON dim_recurring
    FOR INSERT TO authenticated WITH CHECK (user_id_fk = auth.uid());

CREATE POLICY "recurring_update" ON dim_recurring
    FOR UPDATE TO authenticated USING (user_id_fk = auth.uid());

CREATE POLICY "recurring_delete" ON dim_recurring
    FOR DELETE TO authenticated USING (user_id_fk = auth.uid());

CREATE INDEX IF NOT EXISTS ix_recurring_user_active   ON dim_recurring (user_id_fk, is_active);
CREATE INDEX IF NOT EXISTS ix_recurring_user_nextdate ON dim_recurring (user_id_fk, next_date);
