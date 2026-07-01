-- Test migration: inserts one row into public.migration_test to verify the CI
-- `supabase db push` runs end-to-end on merge to main.
-- Depends on 20260701120000_hello_migration_test.sql (which creates the table).
-- Safe to remove later together with the table.

insert into public.migration_test (note)
values ('CI migration test — inserted by GitHub Actions on merge to main');
