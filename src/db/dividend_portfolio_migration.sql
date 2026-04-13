BEGIN;

-- ============================================================
-- Dividend Portfolio Table Migration
-- ============================================================
-- One row per user. portfolio_json holds the full array of
-- stock rows so the schema stays simple (same pattern as fct_budgets).
-- ============================================================

CREATE TABLE IF NOT EXISTS fct_dividend_portfolios (
    id_pk          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_fk     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
    portfolio_json  JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Enforce one record per user
    CONSTRAINT fct_dividend_portfolios_user_unique UNIQUE (user_id_fk)
);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE fct_dividend_portfolios ENABLE ROW LEVEL SECURITY;

-- Users can only see their own portfolio
CREATE POLICY "Users can view own dividend portfolio"
    ON fct_dividend_portfolios FOR SELECT
    USING (auth.uid() = user_id_fk);

-- Users can insert their own portfolio
CREATE POLICY "Users can insert own dividend portfolio"
    ON fct_dividend_portfolios FOR INSERT
    WITH CHECK (auth.uid() = user_id_fk);

-- Users can update their own portfolio
CREATE POLICY "Users can update own dividend portfolio"
    ON fct_dividend_portfolios FOR UPDATE
    USING (auth.uid() = user_id_fk)
    WITH CHECK (auth.uid() = user_id_fk);

-- Users can delete their own portfolio
CREATE POLICY "Users can delete own dividend portfolio"
    ON fct_dividend_portfolios FOR DELETE
    USING (auth.uid() = user_id_fk);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dividend_portfolios_user_id
    ON fct_dividend_portfolios (user_id_fk);

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE fct_dividend_portfolios IS
    'Stores each authenticated user''s dividend portfolio (one row per user). '
    'portfolio_json is an array of stock rows: ticker, weight_pct, dividend_yield, yield_frequency.';

COMMENT ON COLUMN fct_dividend_portfolios.portfolio_value IS
    'Total portfolio value used to compute estimated income amounts.';

COMMENT ON COLUMN fct_dividend_portfolios.portfolio_json IS
    'JSONB array: [{"ticker": "AAPL", "weight_pct": 25.0, "dividend_yield": 0.55, "yield_frequency": "annual"}, ...]';

COMMIT;
