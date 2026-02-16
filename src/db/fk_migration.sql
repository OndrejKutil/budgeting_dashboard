-- =============================================================================
-- FK Migration: Re-point fct_transactions from dim_categories → dim_categories_users
-- =============================================================================

BEGIN;

-- 1. Drop the old FK constraint FIRST (so the UPDATE doesn't validate against dim_categories)
ALTER TABLE fct_transactions
    DROP CONSTRAINT IF EXISTS fct_transactions_category_id_fk_fkey;

-- 2. Re-map category_id_fk values: old IDs → new IDs
UPDATE fct_transactions t
SET category_id_fk = dcu.categories_id_pk
FROM dim_categories dc
JOIN dim_categories_users dcu
    ON dc.category_name = dcu.category_name
    AND dc.type = dcu.type
WHERE t.category_id_fk = dc.categories_id_pk
  AND dcu.user_id_fk = t.user_id_fk;

-- 3. Add new FK pointing to dim_categories_users
ALTER TABLE fct_transactions
    ADD CONSTRAINT fct_transactions_category_id_fk_fkey
    FOREIGN KEY (category_id_fk)
    REFERENCES dim_categories_users(categories_id_pk)
    ON DELETE RESTRICT;

COMMIT;
