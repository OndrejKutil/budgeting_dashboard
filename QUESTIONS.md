# Trading212 integration — decisions not covered by SPEC.md

`SPEC.md` as committed to this branch is missing §1–4 (and the start of §5.1) — the file
starts mid-sentence at §5.2. Per instructions: no invented decision is silent. Each item below
is a design call made to keep building, with the reasoning and the safest-reversible choice
taken. Flag any of these that should go the other way and it's a small, isolated change.

---

## 1. T212 authentication is a key **+ secret pair**, not a single key (blocking, resolved by research)

SPEC.md §6 specifies `POST /connection` with body `{api_key}` and talks throughout about
"the key" (singular). Live research against `docs.trading212.com/api` (fetched directly,
cross-checked against a third-party client's docs at `trading212.readthedocs.io`) shows the
real API:

- Base URL: `https://live.trading212.com/api/v0`.
- Auth: `Authorization: Basic base64(API_KEY:API_SECRET)` — HTTP Basic auth with a
  **key + secret pair**, generated together, secret shown once.
- No endpoint exposes granted scopes/permissions for introspection — this was §10's first
  blocking question; answer is "documented only, not enforceable in code."

**Decision:** `POST /trading212/connection` body is `{api_key, api_secret}`. Both are combined
into a single JSON blob and encrypted as one Fernet token (`encrypted_credentials`), stored as
one column — keeps "decrypt the key" in §5.2 step 2 a single operation, and there's no
legitimate reason to ever have one without the other. `GET /connection` still never returns
either value, matching §6's letter.

**Why safest-reversible:** this isn't a preference call — SPEC's single-key design simply
cannot authenticate against the real API. Building the originally-specified shape would produce
code that fails on the first real request.

## 2. Read-only enforcement: documentation only, not code (resolves §10 blocking question 1)

No T212 endpoint reports what permissions a key was granted. §4.1 (missing text) presumably
specified a "read-only key" requirement; since it can't be verified server-side, the connect
panel's copy has to carry the whole burden: explicit instructions to grant only
account/portfolio/history-read permissions and *not* trading permissions when generating the
key in the T212 UI. Defense in depth: the backend client only ever calls the two read endpoints
it needs (`/equity/account/summary`, `/equity/portfolio`) and no order-placement endpoint
exists anywhere in this codebase, so even an over-scoped key can't be misused by a bug here.

## 3. Positions are always in the account's single primary currency (resolves §10 non-blocking question 3)

T212's own "API Limitations" page states multi-currency accounts aren't supported through the
API — "account, position and result values in the responses will be in the primary account
currency." So there's no native-currency-vs-base-currency choice to make for positions; every
value from T212 is already in one currency (`dim_t212_connections.account_currency`), and the
only conversion needed is that currency → the user's dashboard base currency, same as every
other cross-currency value in this app (`helper/exchange_rates.get_rate`).

## 4. Sync job does not touch T212's own order/transaction/dividend history endpoints

§5.2's "Per run" steps only fetch account/cash then positions, and §6's API surface only
exposes *our own* `fct_t212_value_history` table via `GET /history` — never T212's
`/equity/history/*` endpoints. The line "History endpoints only need incremental fetches" in
§5.2's preamble reads as guidance for a possible future extension (pulling T212's order/dividend
history), not something the described per-run job does. Implemented scope: account summary +
positions only, each run. Full order/transaction/dividend history sync is out of scope for this
build — flag if that's wrong, it's a separate, additive piece of work.

## 5. Cron authentication: a dedicated job secret, not the existing `ADMIN_KEY`

§5.1's visible fragment says to gate the cron path "on the job secret specifically, so a
logged-in user cannot drive the cron path" — implying a secret distinct from a user JWT, but
doesn't name which one. The repo already has `ADMIN_KEY` for admin-only endpoints (log access
etc.). Reusing it would work, but conflates two different trust boundaries: a secret typed by
an admin from a browser vs. a secret that lives unattended in a `tmux` session on a Raspberry
Pi for weeks. **Decision:** new `T212_SYNC_JOB_SECRET` env var + `job_secret_auth` dependency,
scoped to exactly one endpoint. A leaked Pi secret then can't be replayed against any other
admin surface, and it can be rotated independently. Safest-reversible: narrower blast radius,
trivial to consolidate into `ADMIN_KEY` later if that's actually preferred.

## 6. DB schema (§3 missing entirely)

Designed from scratch following this repo's `dim_*`/`fct_*`, `<name>_id_pk`/`<name>_id_fk`,
per-user-RLS conventions (see `dim_features`/`dim_features_users` migration as the closest
precedent for a "one row per user" + "facts referencing it" pair):

- `dim_t212_connections` — one row per user (`UNIQUE user_id_fk`): `encrypted_credentials`,
  `account_currency`, `last_synced_at`, `last_sync_status`
  (`never|ok|auth_failed|error`), timestamps. RLS: user can SELECT/INSERT/UPDATE/DELETE their
  own row (manual connect/sync/disconnect all run as the user's own JWT); the cron path uses
  the service-role client to iterate every user's row, same pattern as account deletion.
- `fct_t212_positions` — latest snapshot, `UNIQUE (user_id_fk, ticker)` for upsert, deleted and
  re-inserted per sync (stale-row cleanup per §5.2 step 4).
- `fct_t212_value_history` — insert-only, one row per successful sync (§5.2 step 5).

Full DDL in the migration file, not reproduced here.

## 7. T212 API environment: live only

`api-environments` docs also list a `demo.trading212.com` paper-trading base URL. SPEC never
mentions supporting it, and this is a personal finance dashboard tracking a real portfolio, so
only the live environment is wired up. Trivial to add a `T212_ENVIRONMENT` switch later if
ever useful for testing.

## 8. Rate-limit numbers confirmed, cadence unchanged

Confirmed via docs: `/equity/account/summary` = 1 req/5s, `/equity/portfolio` presumed same
tier (undocumented explicitly but same "account" endpoint class), `/equity/history/*` = 6
req/min. §5.2's 30-minute cadence and 5/hour manual-refresh cap both sit far under every one of
these, so no cadence changes were needed — SPEC's own budget estimate held up against the real
numbers.
