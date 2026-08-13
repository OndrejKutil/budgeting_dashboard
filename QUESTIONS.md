# Trading212 integration — decisions and deviations

`SPEC.md` was completed partway through this build (it initially started mid-sentence at §5.2,
missing §§1-4 and §10; the full spec landed once §§4-9 below had already been implemented against
the partial version). This file now tracks the deviations that survived reconciliation against
the complete spec, plus the one open item resolved by explicit user instruction.

---

## 1. T212 authentication is a key **+ secret pair**, not a single key

SPEC.md §3/§6 model a single `api_key_ciphertext` / `POST /connection` body `{api_key}`. Live
research against `docs.trading212.com/api` (cross-checked against a third-party client's docs)
shows the real API:

- Base URL: `https://live.trading212.com/api/v0`.
- Auth: `Authorization: Basic base64(API_KEY:API_SECRET)` — HTTP Basic with a **key + secret
  pair**, generated together, secret shown once.
- No endpoint exposes granted scopes/permissions for introspection, which SPEC.md §4.1 itself
  anticipated as a possibility ("if scopes aren't inspectable, document the manual step... do
  not attempt to probe write capability by calling a write endpoint") — that's exactly what's
  implemented.

**Decision, unchanged from the original investigation:** `POST /trading212/connection` body is
`{api_key, api_secret}`. Both are combined into one JSON blob and encrypted as a single Fernet
token, stored in `fct_t212_connection.credentials_ciphertext` (named to match SPEC.md's column
rather than introducing a second name). `GET /connection` still never returns either value.
SPEC.md §9 step 2 explicitly names this exact risk ("may invalidate parts of §3 and §5") — this
is that invalidation, and the rest of §3/§4's design (KEK in a backend env var, decrypt only in
the sync job and connect-validation path, `key_version` for rotation) carried over unchanged.

## 2. Job secret: literal in the script, per explicit instruction

SPEC.md §5.1 asks for the T212 sync job secret to be read from an environment variable and fail
loudly if unset, distinguishing it from `refresh_exchange_rates.py`'s inlined (public-by-design)
anon key. The user explicitly overrode this mid-build: *"You can leave the key in the full sync
script that will be running on my pie, there does not have to be env."* `scripts/sync_trading212.py`
keeps `JOB_SECRET` as a module-level literal, matching the existing script's style. This is a
single-operator personal deployment, not a shared or multi-tenant one, so the risk SPEC.md was
guarding against (a credential sitting in a tracked file) is accepted knowingly here rather than
overlooked.

## 3. Positions are always in the account's single primary currency

T212's own "API Limitations" page states multi-currency accounts aren't supported through the
API — "account, position and result values in the responses will be in the primary account
currency." Matches SPEC.md §3's storage note directly: values are stored in T212's account
currency and converted to base currency at read time via `helper/exchange_rates.get_rate`,
implemented on both `GET /positions` and `GET /history` (each now takes a `base_currency` query
param, mirroring `GET /net-worth/`).

## 4. Sync job does not touch T212's own order/transaction/dividend history endpoints

SPEC.md §1 "Out of scope" explicitly excludes dividends and doesn't list order/transaction
history as in-scope surfaces; §5.2's "Per run" steps only fetch account/cash then positions, and
§6's API surface only exposes *our own* `fct_t212_value_history` table via `GET /history` — never
T212's `/equity/history/*` endpoints. Implemented scope: account summary + positions only, each
run.

## 5. T212 API environment: live only

`api-environments` docs also list a `demo.trading212.com` paper-trading base URL. SPEC never
mentions supporting it, and this is a personal dashboard tracking a real portfolio, so only the
live environment is wired up.

## 6. Rate-limit numbers confirmed against real docs

Confirmed via docs: `/equity/account/summary` = 1 req/5s, `/equity/portfolio` presumed same tier
(undocumented explicitly but same "account" endpoint class), `/equity/history/*` = 6 req/min.
SPEC.md §5.2's 30-minute cadence and 5/hour manual-refresh cap both sit far under every one of
these.

## 7. Net-worth headline: liquid-only, not liquid + invested

SPEC.md §7's "Decisions already made" table and its own body text are explicit: "Net-worth
headline | Total (liquid + invested), with a `+ €X invested` delta chip" and "Frontend: headline
= `liquid_now + investments.total_value`." That's what was originally built.

**Overridden by explicit user instruction**: the headline number in `AccountsPage.tsx` now shows
liquid net worth only, unchanged from before this feature existed. The `+ €X invested` chip is
still shown next to it (still pulling from `investments.total_value`), but is purely
informational rather than folded into the headline. The backend is untouched —
`NetWorthResponse.data.investments` still carries the same converted figure; only the frontend's
display choice changed. If the combined total is wanted back, it's a one-line revert in
`AccountsPage.tsx`.

## 8. sync_all_connections crashed on the pinned postgrest client

Caught only by actually running it against the user's real Docker + Supabase setup, not by any
automated check here: `pyproject.toml` pins `supabase==1.0.4`, which pulls in
`postgrest==0.10.8` — old enough that its query builder has no `.or_()` method at all. The
original NULL-inclusive cron filter (`.or_("last_sync_status.is.null,last_sync_status.neq.auth_failed")`)
threw `AttributeError` on every real invocation, 500ing `POST /trading212/sync-all` before it
touched any data. `helper/trading212_sync.py` now fetches `fct_t212_connection` unfiltered and
excludes `auth_failed` rows in Python instead — this table is one row per user, so there's no
real cost, and it removes the dependency on a query-builder method the pinned client doesn't
have. `sync_one_connection`'s own DB calls remain unverified by the automated test suite (it's
explicitly out of scope there, per that file's docstring) — worth a manual pass over the rest of
that function's Supabase calls if anything else looks off in practice.
