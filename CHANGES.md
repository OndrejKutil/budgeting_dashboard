# Optimistic list mutations + session hardening

Detailed write-up of the changes made on `feature/new-features`, covering two questions:
whether the app used optimistic rendering, and whether it should force a daily relogin.

- [What prompted this](#what-prompted-this)
- [Part A — Optimistic rendering](#part-a--optimistic-rendering)
- [Part B — Session hardening](#part-b--session-hardening)
- [Files changed](#files-changed)
- [Verification](#verification)
- [Deployment steps](#deployment-steps)
- [Known gaps and follow-ups](#known-gaps-and-follow-ups)

---

## What prompted this

### 1. Optimistic rendering was not used anywhere

All 21 `useMutation` calls across 7 page files shared one shape:

```ts
onSuccess: () => { queryClient.invalidateQueries(...); toast(...); closeModal(); }
onError:   () => toast({ variant: 'destructive' })
```

No `onMutate`, no `setQueryData`, no rollback, no shared mutation abstraction. Every write cost
a full round-trip **plus** a refetch before the UI moved. With `staleTime: 5min` and
`refetchOnWindowFocus: false` ([App.tsx:48-58](src/frontend/src/App.tsx#L48-L58)), invalidation
was the only thing keeping data fresh after a write.

Two genuine bugs surfaced while mapping this:

| Bug | Location | Effect |
|---|---|---|
| `isSubmitting` was dead state — `setIsSubmitting` was never called | `TransactionsPage.tsx` | `disabled={isSubmitting}` never fired, so **double-clicking Save created duplicate transactions** |
| Transfers ran as two bare `await`s outside React Query | `TransactionsPage.tsx` | No pending state, no spinner, no disabled button on the slowest path in the app |

### 2. Sessions were effectively permanent, and "log out" did not log out

| Problem | Detail |
|---|---|
| No session bound | `[auth.sessions]` was commented out in `supabase/config.toml` — no timebox, no inactivity timeout. Refresh tokens rotated indefinitely. |
| Logout was cosmetic | `authApi.logout()` only cleared `localStorage`. Supabase `sign_out` was never called anywhere in the repo and no `/auth/logout` endpoint existed, so **the refresh token stayed valid server-side forever**. |
| Expiry was invisible | When refresh failed, `client.ts` cleared tokens but nothing updated React state. `isAuthenticated` stayed `true`, `RequireAuth` kept rendering the dashboard, and requests went out unauthenticated until a manual reload. `TokenExpiredError` was caught nowhere. |
| No re-auth on destructive actions | `DELETE /profile/me` deleted everything behind a plain confirm dialog, using only the ambient JWT. |

### Why not daily relogin

Forcing a daily password entry was considered and rejected. The dominant risk here is XSS
reading `localStorage`, and daily relogin does nothing about it — an attacker with a stolen token
simply refreshes it themselves. It also adds real friction to a daily-use tool, which tends to
push users toward weaker passwords.

Bounded sessions + a logout that actually revokes + visible expiry + a gate on destructive
actions address the actual holes without that friction.

---

## Part A — Optimistic rendering

### Scope

Applied to **accounts, categories, funds, recurring** — 12 mutations across four flat-list pages.

Deliberately **not** applied to transactions, budgets, or dividends. The transactions list is
paginated, filtered, sorted and backed by a separate summary aggregate, so an optimistic insert
would need filter-matching logic and would visibly misplace rows.

### The shared helper

New file: [`src/frontend/src/lib/optimistic.ts`](src/frontend/src/lib/optimistic.ts)

There was no mutation abstraction to hook into, and the `onError` boilerplate was copy-pasted
~20 times. Rather than hand-rolling the React Query recipe 12 times, one factory implements it:

```ts
export function optimisticQuery<TData, TVars>(queryClient, queryKey, apply)
export function optimisticList<TItem, TVars>(queryClient, queryKey, apply)   // array wrapper
```

Both return `{ onMutate, rollback, onSettled }` implementing
`cancelQueries` → snapshot via `getQueryData` → `setQueryData(apply(...))` → rollback on error →
invalidate on settle.

`optimisticQuery` exists because `RecurringPage` caches a whole `RecurringResponse` object
(`{ data, count, summary }`), not a bare array.

**These compose into existing mutations rather than wrapping `useMutation`**, so each page keeps
its own toasts. The redundant `invalidateQueries` moved out of `onSuccess` into `onSettled`:

```ts
const optimistic = optimisticList<Account, string>(queryClient, ['accounts'],
  (prev, id) => withoutId(prev, 'accounts_id_pk', id));

useMutation({
  mutationFn: accountsApi.delete,
  onMutate: optimistic.onMutate,
  onSuccess: () => toast({ ... }),
  onError: (err, _vars, ctx) => { optimistic.rollback(ctx); toast({ ... }); },
  onSettled: optimistic.onSettled,
});
```

Supporting utilities: `markOptimistic` / `isOptimistic`, `tempUuid()` / `tempNumericId()`,
`withoutId()` / `patchById()`.

### Per-page wiring

| Page | Mutations | Query key |
|---|---|---|
| `AccountsPage.tsx` | create / update / delete | `['accounts']` |
| `CategoriesPage.tsx` | create / update / delete | `['categories']` |
| `FundsPage.tsx` | create / update / delete | `['funds']` |
| `RecurringPage.tsx` | create / update / delete | `['recurring', userCurrency]` |

`RecurringPage`'s `postMutation` (posts a template to the ledger) stays fully pessimistic — it
creates a transaction and moves account balances, with nothing simple to write optimistically.
Its per-row spinner is unchanged. The shared `invalidate()` helper still fans out to five query
families; only `['recurring']` gets the optimistic write, and the four derived aggregates
(transactions, accounts, summary, net-worth) stay pessimistic.

### Two constraints that are easy to get wrong

**1. Creates must build a complete entity, not a partial.**

These pages derive buckets from the list —
[AccountsPage.tsx:170-173](src/frontend/src/pages/dashboard/AccountsPage.tsx#L170-L173) splits on
`account_is_active` and `currency`. A partial optimistic object lands in the wrong bucket and
visibly jumps when the server row arrives. Every `apply` sets a full entity, e.g.
`account_is_active: true`, the real currency, `current_balance: 0`, `history_30d: []`.

**2. Optimistic rows must not be actionable.**

They carry a temporary id (`crypto.randomUUID()` for uuid PKs; a decrementing negative integer
for `categories_id_pk`, which can never collide with a positive serial). Clicking Edit or Delete
on one would fire a request for a row that does not exist yet. Every card now computes
`const pending = isOptimistic(item)` and applies `opacity-60` plus `disabled={pending}` on its
actions trigger. On `RecurringPage` the per-row **Post** button is disabled too.

### Delete semantics — a deliberate trade-off

Accounts, categories and funds are **conditionally soft-deleted** server-side when transactions
reference them, and hard-deleted otherwise:

- [`accounts.py:205-215`](src/backend/routers/accounts.py#L205-L215)
- [`categories.py:187-198`](src/backend/routers/categories.py#L187-L198)
- [`savings_funds.py:211-221`](src/backend/routers/savings_funds.py#L211-L221)

Only recurring templates are hard-deleted unconditionally
([`recurring.py:193-201`](src/backend/routers/recurring.py#L193-L201)).

The client cannot know which branch the server will take. Optimistically removing the row is
correct for the list the user is looking at in **both** cases; the difference is that a
soft-deleted row reappears under inactive/archived on reconcile. That is correct behaviour, not
a rollback — but it is a visible pop-in.

**If that reads as a glitch in real use**, the fallback is to make delete pessimistic for those
three entities and keep it only for recurring. The create/update wins are unaffected either way.

### UX consequences

- Create/edit modals now close **on click** (`closeModal()` after `mutate()`) instead of holding
  a spinner for the round-trip.
- Delete confirm dialogs close in `onMutate` instead of `onSuccess`. Previously
  `setDeleteConfirmId(null)` ran in `onSuccess`, so the dialog sat open with a spinner for the
  whole request — closing it alongside the optimistic removal is most of the perceived win.
- Pending-gated buttons and their `Loader2` spinners were removed from these four pages, since
  the modal closes on click and gating on `isPending` would only block a quick second create.
  Unused `Loader2` imports were dropped.

### Transaction bug fixes

Independent of the optimistic work:

- **Double-submit** — the dead `isSubmitting` state was deleted and replaced with
  `isSaving = createMutation.isPending || updateMutation.isPending || transferMutation.isPending`,
  which drives both `disabled` and the spinner.
- **Transfers** — moved into a `transferMutation`, so the button disables and spins like every
  other path. A `PartialTransferError` (declared at module scope so `instanceof` survives
  re-renders) distinguishes the case where the outgoing leg posted but the incoming one failed;
  the error toast now says so instead of implying nothing happened, and the error path
  invalidates `transactions` / `summary` / `accounts` so the list reflects whatever actually
  landed.

New i18n key `pages.transactions.transferPartialFailed` (en + cs).

---

## Part B — Session hardening

### B1 — Real server-side logout

**Backend** — new `POST /auth/logout` in [`routers/login.py`](src/backend/routers/login.py),
guarded by `api_key_auth` + `get_current_user`.

It calls GoTrue's REST API (`POST {PROJECT_URL}/auth/v1/logout?scope=local`) rather than
`client.auth.sign_out()`, because `get_db_client` authenticates only the PostgREST layer — the
Python client has no GoTrue session to sign out of. `scope=local` revokes just this session, so
the user's other devices stay signed in.

The endpoint **always returns success**. A client that has decided to log out must never be
blocked by a failure here; failures are logged at warning level.

**Frontend** — [`endpoints/auth.ts`](src/frontend/src/lib/api/endpoints/auth.ts) `logout` became
async, POSTs through `apiClient` (so a nearly-expired token is refreshed first), and clears
tokens in a `finally` — a network failure can never trap the user in a logged-in state.

`AuthContext.logout` is now `() => Promise<void>`; both call sites (`UserNav`, `ProfilePage`)
await it.

**Ordering detail that matters:** `clearAuthState()` deliberately does *not* clear tokens. If it
did, the revocation request would go out unauthenticated and the server-side logout would never
happen. React state drops immediately for responsiveness; the tokens survive just long enough
for `authApi.logout()` to use them.

### B2 — Session expiry reaches the UI

`client.ts` has no React dependency, so it dispatches a DOM event rather than calling a
registered callback — no import cycle, and any number of listeners can hook in:

```ts
export const SESSION_EXPIRED_EVENT = 'finance:session-expired';
```

Fired from every point where the session is genuinely unrecoverable: both
`clearTokens(); return false` branches in `refreshAccessToken`, and before each
`throw new TokenExpiredError()`. A module-level `sessionExpiryAnnounced` flag makes it idempotent
so a burst of failing requests cannot spam the toast; it is re-armed inside `setTokens`.

`AuthProvider` subscribes and, if currently authenticated, calls `clearAuthState()` and toasts
"Session expired". `RequireAuth` then redirects to `/auth/login`.

`clearAuthState()` also runs `queryClient.clear()`. Without that, the next account to log in on
the same browser would briefly render the previous user's data from cache.

The `isAuthenticatedRef` guard means a cold page load with a stale token does not show a
confusing "session expired" toast to someone who was never logged in this session.

**This is a prerequisite for B4** — bounded sessions make refresh failure a normal event, so it
had to ship in the same change.

### B3 — Cross-tab logout

`AuthProvider` listens for `storage` events on `finance_access_token`; when the key is removed,
that tab tears down its own session. `storage` only fires in tabs *other* than the one that made
the change, so this never double-handles. Previously, logging out in one tab left every other tab
rendering a dashboard with no tokens.

### B4 — Bounded sessions

[`supabase/config.toml`](supabase/config.toml) — `[auth.sessions]` uncommented:

```toml
timebox = "720h"             # 30 days absolute cap
inactivity_timeout = "168h"  # 7 days idle
```

| | Value |
|---|---|
| Access token (JWT) | 1 hour (`jwt_expiry`, unchanged) |
| Refresh token | rotates on each use (unchanged) |
| Absolute session cap | **30 days** (new) |
| Idle timeout | **7 days** (new) |

> **This file drives the local stack only.** The deployed project runs on Supabase Cloud, so the
> same values must be set by hand in the hosted dashboard — see
> [Deployment steps](#deployment-steps). The repo edit keeps the intent documented and in sync.

### B5 — Re-authentication on account deletion

`DELETE /profile/me` → **`POST /profile/delete-account`**. POST because the confirmation
credential travels in the body, which not every HTTP client sends on a DELETE. The route had a
single consumer (`profileApi.deleteAccount`), so changing the verb was safe.

Verification runs **before anything is deleted**, in `_verify_deletion_credentials`:

| Account type | Credential | Failure |
|---|---|---|
| Has an `email` identity | `password`, checked with `sign_in_with_password` on a throwaway client | `401 Incorrect password` |
| OAuth-only (GitHub/Google) | `email_confirmation` — their own address, compared case-insensitively against the JWT's email | `401 The email address does not match this account` |
| Either, credential missing | — | `400` |

Which credential is demanded is decided **server-side** from the user's linked identities, never
from a client-supplied flag. That logic lives in
[`helper/identity.py::has_password_identity`](src/backend/helper/identity.py), extracted into a
dependency-free module so it stays unit-testable (see
[Known gaps](#known-gaps-and-follow-ups) for why that mattered).

**Handling OAuth-only accounts was essential, not a nicety.** They have no password at all, so a
password-only gate would have permanently locked GitHub/Google users out of deleting their own
account.

The password is never logged, and the underlying auth error is swallowed rather than echoed.
One deliberate trade-off is commented in the source: the verification sign-in mints a second
session, which is *not* signed out, because supabase-py's `sign_out` defaults to **global** scope
and would revoke the caller's own sessions. Deleting the auth user moments later invalidates it.

**Frontend** — the existing `AlertDialog` in `ProfilePage` gained a password or email field
(chosen by `usesPasswordAuth`, mirroring the backend check against `profile.identities`), with
the confirm button disabled until non-empty. Backend `detail` messages surface in the error toast
so a wrong password says so. On success it calls the new `clearLocalSession()` — the account no
longer exists, so there is no server session left to revoke.

Four new i18n keys (en + cs): `deleteAccountPasswordLabel`, `deleteAccountPasswordHint`,
`deleteAccountEmailLabel`, `deleteAccountEmailHint`.

### Password change was deliberately left alone

The app changes passwords via the emailed reset link
([`login.py:173-207`](src/backend/routers/login.py#L173-L207)), which already proves email
control. Flipping `secure_password_change = true` would require a recent login and risks breaking
that flow — it should be a separate, individually verified change.

---

## Files changed

### New

| File | Purpose |
|---|---|
| `src/frontend/src/lib/optimistic.ts` | Optimistic mutation helper (`optimisticQuery`, `optimisticList`, temp ids, list transforms) |
| `src/backend/helper/identity.py` | `has_password_identity` — dependency-free so it stays testable |
| `src/backend/tests/test_account_deletion.py` | 8 tests over the identity decision + `DeleteAccountRequest` |

### Modified — frontend

| File | Change |
|---|---|
| `pages/dashboard/AccountsPage.tsx` | Optimistic create/update/delete; pending-row guard |
| `pages/dashboard/CategoriesPage.tsx` | Optimistic create/update/delete; pending-row guard |
| `pages/dashboard/FundsPage.tsx` | Optimistic create/update/delete; pending-row guard |
| `pages/dashboard/RecurringPage.tsx` | Optimistic create/update/delete via `optimisticQuery`; pending-row guard |
| `pages/dashboard/TransactionsPage.tsx` | Double-submit fix; transfer moved to a mutation; `PartialTransferError` |
| `pages/dashboard/ProfilePage.tsx` | Re-auth field in the delete dialog; async logout; `clearLocalSession` |
| `contexts/AuthContext.tsx` | `clearAuthState` / `clearLocalSession`; expiry + `storage` listeners; async logout |
| `contexts/auth-context.ts` | `logout: () => Promise<void>`; added `clearLocalSession` |
| `lib/api/client.ts` | `SESSION_EXPIRED_EVENT`, idempotent `announceSessionExpired()` |
| `lib/api/endpoints/auth.ts` | `logout` calls `POST /auth/logout`, clears tokens in `finally` |
| `lib/api/endpoints/profile.ts` | `deleteAccount(confirmation)` → `POST /profile/delete-account` |
| `lib/api/types/requests.ts` | `DeleteAccountRequest` |
| `lib/i18n.ts` | 5 new keys × 2 locales |
| `components/layout/UserNav.tsx` | `await logout()` |

### Modified — backend / infra / docs

| File | Change |
|---|---|
| `routers/login.py` | `POST /logout` |
| `routers/profile.py` | `_verify_deletion_credentials`; `DELETE /me` → `POST /delete-account` |
| `schemas/requests.py` | `DeleteAccountRequest` |
| `supabase/config.toml` | `[auth.sessions]` enabled |
| `docs/backend/README.md` | Session lifetime table, logout, re-auth sections |
| `docs/frontend/README.md` | Proactive refresh, session expiry, logout, cross-tab, optimistic mutations |

---

## Verification

### Automated — all passing

| Check | Result |
|---|---|
| `mypy .` (from `src/backend/`) | 47 source files, no issues |
| `pytest` (from `src/backend/`) | 20 passed (12 pre-existing + 8 new) |
| `npm run check` (from `src/frontend/`) | tsc clean, vite build succeeded |
| `npm run lint` (from `src/frontend/`) | clean |

> `pytest-cov` is not installed in the local venv, so the run used
> `pytest --override-ini="addopts="` to skip the coverage flags configured in `pyproject.toml`.

### Manual — still worth doing

**Optimistic behaviour** — `npm run dev`, then per entity (accounts, categories, funds, recurring):

1. Throttle to Slow 3G in devtools. Create, rename and delete an item — each should reflect
   instantly, with the delete dialog closing immediately.
2. Confirm an optimistic row is dimmed and its actions menu is disabled until the server responds.
3. Force a failure (stop the backend, or block the endpoint) — the list should snap back to its
   prior state with an error toast.
4. Delete one entity that **is** referenced by transactions and one that is **not**. The
   referenced one should reappear under inactive/archived; the unreferenced one should stay gone.

**Transaction bugs** — throttled, double-click Save on a new transaction: exactly one row created,
button disabled on the first click. Submit a transfer and confirm the button spins and disables.

**Session**

1. Log out — confirm `POST /auth/logout` in the network tab, then replay the old refresh token
   against `POST /refresh/` and confirm it is rejected.
2. Corrupt `finance_refresh_token` in localStorage and trigger any request — expect a redirect to
   `/auth/login` with a toast, not a broken dashboard.
3. Open two tabs, log out in one — the other returns to login.
4. Account deletion: wrong password → `401`, nothing deleted; correct password → deletes. Repeat
   with a GitHub/Google-only account to exercise the email-confirmation branch.

---

## Deployment steps

1. **Set the session settings in the Supabase Cloud dashboard** (Authentication → Sessions):
   timebox `720h`, inactivity timeout `168h`. Editing `supabase/config.toml` alone changes
   nothing in production.
2. No database migration is required — none of this touches the schema.
3. Deploy backend and frontend together. `POST /profile/delete-account` replaces
   `DELETE /profile/me`, so a frontend running against an older backend would fail to delete
   accounts, and an older frontend against the new backend would 405.

---

## Known gaps and follow-ups

### HTTP-level tests are outstanding

Router-level tests for `POST /auth/logout` and the 401-on-bad-credential path could not be
written and run locally. The venv runs **Python 3.14**, where its pinned `httpcore` crashes on
import:

```
AttributeError: 'typing.Union' object has no attribute '__module__'
```

That makes **every module importing `httpx` unimportable** — which is every router. The problem
is pre-existing and unrelated to these changes; it is why the existing suite only ever covered
schemas and pure calculations. The project targets Python 3.13 (per `CLAUDE.md`), where CI is
unaffected.

Rather than ship tests that could not be executed, the security-critical decision was extracted
into `helper/identity.py` and covered directly. Adding the HTTP-level tests needs either a 3.13
venv or an `httpcore`/`httpx` bump.

### Deliberately out of scope

- Optimistic updates on transactions, budgets, dividends.
- Forced daily relogin (rejected above).
- Moving tokens out of `localStorage` into httpOnly cookies — the real XSS fix, but a much larger
  change to the auth contract.
- Extracting per-entity mutation hooks for all seven pages.
- Raising `minimum_password_length` from 6 and enabling `secure_password_change`.

### Worth a follow-up

Two paths still bypass `request()` and therefore its refresh and 498 handling — they read
`tokenManager.getAccessToken()` directly:

- [`lib/api/endpoints/export.ts:12-21`](src/frontend/src/lib/api/endpoints/export.ts#L12-L21)
- the OAuth link calls in `ProfilePage`

A CSV export attempted with a just-expired token will fail rather than transparently refresh.
