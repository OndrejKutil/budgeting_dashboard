# Frontend Documentation

## Architecture Overview

React + TypeScript SPA with Vite. Uses React Query for server state and React Router for navigation.

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

The `request()` function handles 498 (token expired) automatically:

1. Intercepts 498 response
2. Calls `/refresh/` with stored refresh token
3. Stores new token pair
4. Retries original request with new token
5. If refresh fails → clears tokens, throws `TokenExpiredError`

### Multi-Tab Resilience

When refresh fails (e.g., "Already Used" error), client checks if `refreshToken` changed in localStorage since the request started. If another tab already refreshed successfully, considers it a success.

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
- `/` - Landing page
- `/auth/login`, `/auth/register`
- `/terms`, `/privacy`, `/faq`, `/how-it-works`

### Protected Routes (require auth)
All under `/dashboard`:
- `/dashboard` - Overview
- `/dashboard/transactions` - Transaction list
- `/dashboard/accounts`, `/categories`, `/funds` - Dimension management
- `/dashboard/analytics/monthly`, `/analytics/yearly`, `/analytics/emergency-fund`
- `/dashboard/profile`
- `/dashboard/budget-maker`, `/investing-calculator`

`RequireAuth` wrapper redirects to login if not authenticated.

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
