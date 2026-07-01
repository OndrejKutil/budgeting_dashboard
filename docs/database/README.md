# Database & Migrations

This project uses a single **Supabase** project (Postgres + Auth + Edge Functions) as its
backend datastore. Schema changes are managed as **version-controlled migrations** in this
repo via the Supabase CLI — not by pasting SQL into the dashboard.

> **TL;DR for agents & devs:** never hand-edit the live schema. Add a new timestamped
> `.sql` file under `supabase/migrations/`, then apply it with `supabase db push`.
> Migrations are append-only and run in filename (timestamp) order.

---

## Repo layout

```
supabase/
├── config.toml                         # CLI config (from `supabase init`)
├── migrations/                         # ordered .sql files — the schema source of truth
│   ├── 20260701000000_baseline.sql     # full snapshot of the schema (the "recreate everything" file)
│   └── <timestamp>_<name>.sql          # each later change, in order
└── functions/
    └── refresh-exchange-rates/index.ts # Edge Function (daily FX-rate refresh)
```

We use the CLI only — the paid "GitHub integration / Preview Branches" feature is
intentionally **not** used (see [why](#why-no-branching)).

---

## Data model

Naming follows a star-schema style: `dim_*` = entities/dimensions, `fct_*` = facts.
Primary keys are `<name>_id_pk`, foreign keys `<name>_id_fk`. **Every user-facing table
has Row Level Security enabled**, with policies scoped to `auth.uid()`.

| Table | Kind | Purpose |
|-------|------|---------|
| `dim_accounts` | dim | User money accounts (name, type, currency) → FK to `auth.users` |
| `dim_categories` | dim | Global default categories (a template, not user-owned) |
| `dim_categories_users` | dim | Per-user categories, **seeded from `dim_categories` on signup** by the `seed_default_categories()` trigger |
| `dim_savings_funds` | dim | Savings goals; soft-deleted via `fund_is_active` when still referenced by transactions |
| `dim_recurring` | dim | Recurring-transaction templates (`cadence`, `next_date`) |
| `dim_exchange_rates` | dim | One row per currency pair; refreshed daily by the edge function (write = service role only, read = any authenticated user) |
| `fct_transactions` | fct | Core ledger; FKs to account / category / fund |
| `fct_budgets` | fct | One row per user / month / year; the plan is stored as `plan_json` (JSONB) |
| `fct_dividend_portfolios` | fct | One row per user; holdings stored as `portfolio_json` (JSONB) |

**Enums:** `category_type` (`income`, `expense`, `saving`, `transfer`, `investment`,
`exclude`) and `spending_type` (`Core`, `Fun`, `Future`, `Income`, `Necessary`).

> `test` is a leftover scratch table — safe to drop in a future migration.

**Not captured by the `public`-schema baseline** (re-create manually if rebuilding from
zero): the trigger on `auth.users` that fires `seed_default_categories()`, plus Auth
settings, Storage buckets, and Edge Functions (functions live in `supabase/functions/`).

---

## One-time setup (per developer machine)

You do **not** create a new project — you link the existing one.

1. Install the CLI (Windows uses Scoop; `npm i -g supabase` is unsupported):
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   supabase --version
   ```
2. Initialise and link:
   ```powershell
   supabase init                              # creates supabase/config.toml
   supabase login                             # opens browser, stores access token
   supabase link --project-ref <ref>          # <ref> = subdomain of PROJECT_URL, prompts for DB password
   ```
3. The baseline already exists (`20260701000000_baseline.sql`) and is recorded as applied
   on the remote, so the repo and live project are already in sync. Confirm with:
   ```powershell
   supabase migration list                    # baseline should show on BOTH Local and Remote
   ```

> **Docker note:** `db pull`, `db diff`, `db reset`, and the local stack (`supabase start`)
> need Docker Desktop running (they use a throwaway "shadow" Postgres). `db push`,
> `functions deploy`, `login`, and `link` do **not**.

---

## Everyday workflow: making a schema change

```powershell
# 1. Create a migration file
supabase migration new add_some_table
#    → writes supabase/migrations/<timestamp>_add_some_table.sql — put your DDL in it

# 2. (Optional, needs Docker) rebuild a local DB by replaying ALL migrations from scratch.
#    Best safety net: proves the whole chain applies cleanly.
supabase db reset

# 3. Preview, then apply to the live project
supabase db push --dry-run
supabase db push

# 4. Confirm sync
supabase migration list
```

### How `db push` decides what to run
Supabase tracks applied versions in `supabase_migrations.schema_migrations` on the remote.
`db push` runs **only** migrations not yet recorded there, in ascending timestamp order.
A local `db reset` is different — it drops the local DB and replays **all** migrations from
empty. Because of this, **migrations are forward-only and immutable**: never edit one that
has already been pushed; add a new migration instead.

### Conventions (match the existing schema)
- `dim_*` / `fct_*` prefixes; PK `<name>_id_pk`, FK `<name>_id_fk`.
- **Enable RLS on every user-facing table** with policies scoped to `auth.uid()` — the
  backend relies on RLS for per-user isolation (it queries with the user's JWT).
- Reference `auth.users(id)` with `on delete cascade` for user-owned rows.

### Cleaning something up
Deleting a table in the **dashboard** only changes the live DB — it does *not* remove the
migration that created it, so a later `db reset` would recreate it. To remove something
"properly" everywhere, add a migration:
```powershell
supabase migration new drop_whatever
# body: drop table if exists public.whatever;
supabase db push
```
This is the golden rule: **the database is changed by migrations; the dashboard is for
viewing and one-off pokes.** Mixing them causes drift — which this setup exists to prevent.

---

## Edge Functions

`supabase/functions/refresh-exchange-rates/index.ts` fetches FX rates from Frankfurter and
upserts them into `dim_exchange_rates`. It's triggered daily by
`scripts/refresh_exchange_rates.py` (a small `schedule` loop meant to run on a Raspberry Pi
in tmux), and can also be invoked manually from the dashboard.

Deploy after changes:
```powershell
supabase functions deploy refresh-exchange-rates
```

---

## Auto-deploy on merge to `main` (CI)

Migrations are applied automatically by the `deploy-migrations` job in
`.github/workflows/ci.yml`. On every push to `main` it runs `supabase db push`, and the
**Render deploy waits for it** (`deploy-render` `needs: [deploy-migrations]`) — so the
schema is updated *before* the new backend goes live.

Requires three repo secrets (Settings → Secrets and variables → Actions); the job no-ops
if they're absent:

| Secret | Where to get it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database (the DB password) |
| `SUPABASE_PROJECT_ID` | your project ref (subdomain of `PROJECT_URL`) |

This is a plain CLI call in CI — **not** the Branching feature — so it costs nothing beyond
normal GitHub Actions minutes.

> **Destructive changes & timing (expand/contract).** Because migrations run *before* the
> backend redeploys, a migration that **drops or renames** something still used by the
> currently-running backend will break it during the gap. Do it in two deploys: first ship
> additive changes + the code that stops using the old shape; then, in a later migration,
> drop the old column/table. Additive migrations are always safe.

---

## Why no branching

Supabase's native GitHub integration spins up a full ephemeral Postgres/Auth/Functions
instance per PR (Preview Branches). Useful for teams shipping risky schema changes, but it
requires a paid plan and bills compute per branch-hour. For this solo project the
migrations-in-repo workflow above gives the main benefit — reproducible, reviewable
schema — without the cost.
