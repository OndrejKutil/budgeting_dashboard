-- Exchange rates table — run once in the Supabase SQL editor.
-- Stores one current rate per currency pair, refreshed daily by the Edge Function.

CREATE TABLE IF NOT EXISTS dim_exchange_rates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency   TEXT        NOT NULL,
    target_currency TEXT        NOT NULL,
    rate            NUMERIC     NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (base_currency, target_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
    ON dim_exchange_rates (base_currency, target_currency);

ALTER TABLE dim_exchange_rates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read; writes happen only via the Edge Function (service role)
CREATE POLICY "exchange_rates_read"
    ON dim_exchange_rates FOR SELECT TO authenticated USING (true);
