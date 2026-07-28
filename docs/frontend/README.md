# Frontend Documentation

## Architecture Overview

React + TypeScript SPA with Vite. Uses React Query for server state and React Router for navigation. Forms use `react-hook-form` + `zod`; charts use Recharts; animation via `framer-motion`; PWA via `vite-plugin-pwa`.

### Commands (from `src/frontend/`)

```powershell
npm install
npm run dev        # Vite dev server
npm run lint       # ESLint
npm run check      # tsc --noEmit && vite build  (what CI runs)
```

```
frontend/src/
├── App.tsx              # Root component, providers, routes
├── main.tsx             # Entry point
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # DashboardLayout, Sidebar, Topbar
│   └── dashboard/       # Domain-specific components
├── pages/               # Route components
│   ├── auth/            # Login, Register
│   └── dashboard/       # All dashboard pages
├── contexts/            # React contexts (Auth, User)
├── hooks/               # Custom hooks
└── lib/
    └── api/             # API client and endpoints
        ├── client.ts    # HTTP client, token management
        ├── endpoints/   # Domain-specific API functions
        └── types/       # TypeScript interfaces
```

---

## State Management

### Two Contexts

**AuthContext** - Authentication state
- `isAuthenticated`, `userId`, `isLoading`
- `login()`, `register()`, `logout()`
- Wraps app with `RequireAuth` for protected routes

**UserContext** - User profile and preferences
- `profile`, `currency`
- `formatCurrency()` - Locale-aware formatting (CZK uses cs-CZ, others use en-US)
- Auto-fetches profile on auth state change

### Why Two Contexts?

Auth state is critical path - needs to resolve before any routing decisions. User profile is secondary data that can load after. Separating them prevents unnecessary re-renders.

---

## API Client

### Token Manager

```typescript
tokenManager.setTokens(accessToken, refreshToken, userId)
tokenManager.getAccessToken()
tokenManager.clearTokens()
tokenManager.isAuthenticated()
```

Tokens stored in `localStorage` with keys:
- `finance_access_token`
- `finance_refresh_token`
- `finance_user_id`

### Auto Token Refresh

Refresh happens two ways.

**Proactively**, before a request goes out: `shouldRefreshAccessToken()` decodes the JWT's `exp`
client-side and refreshes when it is within 60s of expiring, so most requests never see a 498 at
all. `AuthProvider` runs the same check on page load before routing resolves.

**Reactively**, when a 498 comes back anyway:

1. Intercepts 498 response
2. Calls `/refresh/` with stored refresh token
3. Stores new token pair
4. Retries original request with new token (exactly once — no retry loop)
5. If refresh fails → clears tokens, emits `finance:session-expired`, throws `TokenExpiredError`

### Session Expiry

`client.ts` cannot touch React state, so when a session is unrecoverable it dispatches a
`SESSION_EXPIRED_EVENT` (`finance:session-expired`) on `window`. `AuthProvider` listens and tears
down auth state, clears the React Query cache, and toasts — `RequireAuth` then redirects to login.

Without this the dashboard kept rendering after the tokens were gone, sending unauthenticated
requests until the user reloaded by hand. The event fires once per transition, re-armed the next
time tokens are stored.

Clearing the query cache on teardown matters: otherwise the next account to log in on the same
browser briefly renders the previous user's data from cache.

### Logout

`authApi.logout()` calls `POST /auth/logout` to revoke the session server-side, then clears local
tokens in a `finally` — a network failure can never trap the user in a logged-in state.
`AuthContext.logout` is async; it drops React state first so the UI responds immediately, while
the tokens stay in storage just long enough to authenticate the revocation call.

`clearLocalSession()` is the no-server variant, for when there is nothing left to revoke (after
the account itself has been deleted).

### Multi-Tab Resilience

When refresh fails (e.g., "Already Used" error), client checks if `refreshToken` changed in localStorage since the request started. If another tab already refreshed successfully, considers it a success.

`AuthProvider` also listens for `storage` events on `finance_access_token`: when the key is
removed, that tab tears down its own session too, so logging out in one tab logs out all of them.

### Request Headers

All requests include:
```
X-API-KEY: <app-level key from env>
Content-Type: application/json
Authorization: Bearer <access_token>  (if authenticated)
```

---

## React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### Why These Defaults?

- **5 min staleTime**: Financial data doesn't change frequently. Prevents unnecessary refetches when navigating between pages.
- **No refetchOnWindowFocus**: Users tab-switch often. Refetching every time is wasteful and causes UI flicker.

Individual queries can override these defaults when needed.

---

## Optimistic Mutations

`lib/optimistic.ts` wraps the standard React Query optimistic recipe — `cancelQueries` →
snapshot → `setQueryData` → rollback on error → invalidate on settle. Use `optimisticList` when
the cached value is a flat array, `optimisticQuery` when it is a wrapper object (e.g. the
recurring response, which carries `data` alongside `count` and `summary`).

It returns handlers to *compose* into a mutation rather than a `useMutation` wrapper, so pages
keep their own toasts:

```typescript
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

**Applied to:** accounts, categories, funds, recurring — flat lists where the cache shape is
simple. Transactions, budgets and dividends stay pessimistic: that list is paginated, filtered and
sorted with a separate summary aggregate, so an optimistic insert needs filter-matching logic and
visibly misplaces rows.

Two rules when adding more:

- **Creates must build a complete entity, not a partial.** These pages derive buckets
  (active/inactive, native/foreign currency) from the list; a partial object lands in the wrong
  bucket and jumps when the server row arrives.
- **Optimistic rows must not be actionable.** They carry a temp id (`tempUuid()` for uuid PKs,
  `tempNumericId()` — always negative — for integer PKs), so acting on one would send a request
  for a row that does not exist yet. Guard with `isOptimistic(item)`: dim the row and disable its
  actions menu.

Note that accounts, categories and funds are *conditionally* soft-deleted server-side when
transactions reference them. Removing the row optimistically is right for the list the user is
looking at either way; a soft-deleted one reappears under inactive/archived on reconcile. Only
recurring templates are hard-deleted unconditionally.

---

## URL State Persistence

Pages like Transactions, Monthly Analytics, etc. store filter state in URL search params:

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const year = searchParams.get('year') || currentYear;
```

Preserves filters when:
- Navigating away and back
- Refreshing the page
- Sharing links

---

## Routing Structure

### Public Routes
- `/` - Landing page, `/demo` - interactive demo, `/about`
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/callback` (OAuth)
- `/terms`, `/privacy`, `/faq`, `/how-it-works`

### Protected Routes (require auth)
All under `/dashboard`:
- `/dashboard` - Overview
- `/dashboard/transactions`, `/recurring` - ledger + recurring templates
- `/dashboard/accounts`, `/categories`, `/funds` - dimension management
- `/dashboard/analytics/monthly`, `/analytics/yearly`, `/analytics/emergency-fund`
- `/dashboard/budget-maker`, `/investing-calculator`, `/dividend-calculator` - tools
- `/dashboard/profile`

`RequireAuth` wrapper redirects to login if not authenticated. Routes are lazy-loaded
(`withSuspense` + per-area skeletons).

---

## API Endpoints Organization

Each domain has its own file in `lib/api/endpoints/`:

| File              | Exports                                        |
|-------------------|------------------------------------------------|
| `auth.ts`         | `authApi.login()`, `.register()`, `.logout()`  |
| `transactions.ts` | `transactionsApi.getAll()`, `.create()`, etc.  |
| `accounts.ts`     | `accountsApi.getAll()`, `.create()`, etc.      |
| `categories.ts`   | `categoriesApi.getAll()`                       |
| `funds.ts`        | `fundsApi.getAll()`, `.create()`, etc.         |
| `profile.ts`      | `profileApi.getMe()`, `.updateProfile()`       |
| `summary.ts`      | `summaryApi.getSummary()`                      |
| `analytics.ts`    | `analyticsApi.getYearly()`, `.getMonthly()`    |
| `health.ts`       | `healthApi.warmup()` - fire-and-forget on load |

All re-exported from `client.ts` for backwards compatibility.

---

## Types Organization

Mirrors backend schema structure:

- **`base.ts`** - Domain entities (Transaction, Account, Category, Fund, Profile)
- **`requests.ts`** - API request body types
- **`responses.ts`** - API response wrappers

---

## Component Patterns

### UI Components

Uses shadcn/ui as the component library. Components in `components/ui/` are generated primitives (Button, Card, Input, etc.).

### Dashboard Components

Domain-specific components live in `components/dashboard/`. These compose UI primitives for specific use cases.

### Layout

`DashboardLayout` provides:
- Sidebar navigation
- Top bar with user menu
- Main content area with outlet for nested routes

---

## Environment Variables

| Variable            | Purpose                    |
|---------------------|----------------------------|
| `VITE_API_BASE_URL` | Backend API URL            |
| `VITE_API_KEY`      | App-level API key          |

---

## Currency Formatting

`UserContext.formatCurrency()` handles locale-aware formatting
