-- Trading212 positions: record the instrument's own quote currency alongside the account one.
--
-- Why: GET /equity/portfolio returns averagePrice/currentPrice in the *instrument's* quote
-- currency (EUR for a Xetra-listed ETF) while ppl comes back in the *account* currency. The
-- original sync stamped every row with the account currency alone, so a EUR-quoted price and
-- the market value derived from it were stored -- and rendered -- as CZK, with the read-time
-- conversion a silent no-op (get_rate("CZK", "CZK") = 1.0). Two figures in one row, two
-- different currencies, one label.
--
-- `currency` keeps its existing meaning: the account currency at sync time, which is what
-- unrealised_pnl is denominated in. `instrument_currency` is the quote currency that
-- average_price, current_price and market_value are denominated in.
--
-- Nullable deliberately: rows written before this migration have no known quote currency until
-- the next sync, and a ticker missing from T212's instrument catalogue stays null rather than
-- being guessed. The backend treats null as "unknown" and leaves those figures unconverted.
--
-- Rollback (as a new forward migration -- the CLI has no `down`):
--     ALTER TABLE "public"."fct_t212_positions" DROP COLUMN "instrument_currency";
-- Additive and nullable, so that is lossless for every other column, and this table is a
-- disposable snapshot rebuilt in full by the next successful sync regardless.

ALTER TABLE "public"."fct_t212_positions"
    ADD COLUMN "instrument_currency" "text";

COMMENT ON COLUMN "public"."fct_t212_positions"."instrument_currency" IS
    'Quote currency of average_price / current_price / market_value, resolved from T212''s instrument catalogue (GET /equity/metadata/instruments). Differs from "currency" whenever the instrument is not quoted in the account currency -- a EUR-denominated ETF in a CZK account. Null = not resolved yet (pre-migration row, or ticker absent from the catalogue); the backend then leaves those figures unconverted rather than guessing a currency.';

COMMENT ON COLUMN "public"."fct_t212_positions"."currency" IS
    'T212 account currency at sync time (T212 does not support multi-currency accounts). This is the currency unrealised_pnl is denominated in -- the price columns use "instrument_currency" instead.';
