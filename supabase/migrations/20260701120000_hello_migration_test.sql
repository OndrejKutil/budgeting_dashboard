-- Test migration: creates a throwaway table to verify the `db push` workflow.
-- Safe to remove afterwards (delete it in the dashboard, or add a follow-up
-- migration with `drop table public.migration_test;`).

create table if not exists public.migration_test (
    id         uuid        primary key default gen_random_uuid(),
    note       text        not null,
    created_at timestamptz not null default now()
);
