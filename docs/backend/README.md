# Backend Documentation

## Architecture Overview

FastAPI application with Supabase as the database and auth provider. Deployed as a containerized service.

```
backend/
├── backend_server.py    # Entry point, middleware, router registration
├── auth/                # Authentication logic
├── routers/             # API endpoints grouped by domain
├── schemas/             # Pydantic models (base, requests, responses)
├── helper/              # Utilities (env, rate limiting, calculations)
└── data/                # Database client
```

---

## Authentication

### Dual-Layer Auth

Every request requires **two** authentication checks:

1. **API Key** (`X-API-KEY` header) - App-level key shared by all frontend clients
2. **JWT** (`Authorization: Bearer ...`) - User-specific token from Supabase

The API key prevents unauthorized apps from hitting the API. The JWT identifies and authorizes the specific user.

### Token Flow

```
Login → Backend calls Supabase auth → Returns access_token + refresh_token
          ↓
Frontend stores both tokens in localStorage
          ↓
All requests include: X-API-KEY + Authorization: Bearer <access_token>
          ↓
Token expires (detected by 498 status) → Frontend calls /refresh/ with refresh_token
          ↓
Backend exchanges refresh_token with Supabase → Returns new token pair
```

The frontend also refreshes *proactively*, before the token expires — see the
[frontend docs](../frontend/README.md#auto-token-refresh).

### Session Lifetime

| Lifetime | Value | Set in |
|---|---|---|
| Access token (JWT) | 1 hour | `jwt_expiry` in `supabase/config.toml` |
| Refresh token | rotates on each use | `enable_refresh_token_rotation` |
| Absolute session cap | 30 days | `[auth.sessions] timebox` |
| Idle timeout | 7 days | `[auth.sessions] inactivity_timeout` |

The session settings bound how long a stolen refresh token stays useful. **`config.toml` drives
the local stack only** — the deployed project runs on Supabase Cloud, so the same values must be
set in the hosted dashboard under Authentication → Sessions.

### Logout

`POST /auth/logout` revokes the caller's session with Supabase (GoTrue `/auth/v1/logout` with
`scope=local`, so other devices stay signed in). Without it, clearing browser storage left the
refresh token valid server-side indefinitely.

It is called through GoTrue's REST API rather than `client.auth.sign_out()` because
`get_db_client` authenticates only the PostgREST layer — the Python client has no GoTrue session
to sign out of. The endpoint always returns success: a client that has decided to log out must
never be blocked by a failure here.

### Re-authentication for Destructive Actions

`POST /profile/delete-account` requires proof of identity beyond the ambient JWT, verified
*before* anything is deleted:

- Accounts with an `email` identity send their current `password`, checked with
  `sign_in_with_password` on a throwaway client.
- OAuth-only accounts (GitHub/Google) have no password, so they type their own email address into
  `email_confirmation` instead.

Which one is demanded is decided server-side from the user's linked identities
(`helper/identity.py::has_password_identity`) — never from a client-supplied flag. A wrong
credential returns `401`, a missing one `400`.

This replaced the old `DELETE /profile/me`; POST because the confirmation travels in the body.

### Custom Status Code

- **498** - Token expired (not standard HTTP, chosen to differentiate from 401 which means "invalid token")

### JWT Verification

```python
# 5 second leeway for clock drift between systems
# Audience verification disabled - Supabase handles this
jwt.decode(token, SECRET, algorithms=["HS256"], leeway=5, options={"verify_aud": False})
```

---

## Rate Limiting

Uses `slowapi` with in-memory storage (works for single-instance deployment).

### Presets

| Preset          | Limit        | Use Case                           |
|-----------------|--------------|-------------------------------------|
| `health`        | 300/min      | Health checks, warmup calls         |
| `read_only`     | 120/min      | GET endpoints                       |
| `standard`      | 60/min       | CRUD operations                     |
| `write`         | 30/min       | Create, update, delete              |
| `heavy`         | 20/min       | Analytics, reports                  |
| `auth`          | 50/min       | Registration                        |
| `login`         | 1000/min     | Login (high for UX, brute force handled by Supabase) |
| `bulk`          | 10/min       | Batch operations                    |
| `password_reset`| 3/min        | Reset flows                         |

### Client Identification Priority

1. API Key (first 8 chars)
2. User ID from JWT
3. IP address (fallback)

---

## Routers

Each router handles a domain and is registered in `backend_server.py`. All protected
endpoints use `Depends(api_key_auth)` and `Depends(get_current_user)`.

| Router               | Prefix         | Purpose                                    |
|----------------------|----------------|--------------------------------------------|
| `transactions`       | `/transactions`| CRUD + filtered listing with pagination    |
| `login`              | `/auth`        | Login/register via Supabase                |
| `token_refresh`      | `/refresh`     | Exchange refresh token for new pair        |
| `export`             | `/export`      | Data export                                |
| `categories`         | `/categories`  | Category management                        |
| `accounts`           | `/accounts`    | Account management                         |
| `profile`            | `/profile`     | User profile CRUD (+ account deletion)     |
| `summary`            | `/summary`     | Dashboard summary data                     |
| `yearly_analytics`   | `/yearly`      | Year-over-year analytics                   |
| `monthly_analytics`  | `/monthly`     | Month-by-month analytics                   |
| `savings_funds`      | `/funds`       | Savings fund tracking                      |
| `budgets`            | `/budgets`     | Monthly budget plans (`plan_json`)         |
| `dividends`          | `/dividends`   | Dividend portfolio calculator              |
| `recurring`          | `/recurring`   | Recurring-transaction templates            |
| `net_worth`          | `/net-worth`   | Net-worth chart data                       |
| `features`           | `/features`    | Per-user feature flags (read-only)         |
| `screenshot_import`  | `/screenshot-import` | Screenshot → draft transactions (flag-gated) |

> The auto-generated OpenAPI at `/docs` (Swagger) and `/redoc` is the canonical, always
> up-to-date endpoint reference — there is no hand-maintained endpoint list.

---

## Schemas

Organized in three files under `schemas/`:

- **`base.py`** - Core domain models (Transaction, Account, Category, etc.)
- **`requests.py`** - Input validation for POST/PUT bodies
- **`responses.py`** - Response wrappers with success/data structure

All schemas use Pydantic v2.

---

## Database

All data access goes through Supabase's REST API via the Python client
(`data/database.py`). Two factories:

- **`get_db_client(access_token)`** — creates a client with the anon key, then
  authenticates it with the **user's JWT** (`client.postgrest.auth(token)`). This is the
  key decision: every user query runs under that user's identity, so **Postgres Row Level
  Security enforces per-user isolation** — routers generally don't add manual
  `where user_id = …` filters; RLS does it. `auto_refresh_token` and `persist_session` are
  disabled (the frontend owns token refresh).
- **`get_service_db_client()`** — uses the `SERVICE_ROLE_KEY` (bypasses RLS). Used **only**
  for account deletion, and only after the user is authenticated at the API layer.

Schema is **not** managed from here — it lives as migrations in `supabase/`. See
[docs/database](../database/README.md).

---

## Commands

From `src/backend/`:

```powershell
pip install -e ".[dev,test]"            # install with dev + test extras
uvicorn backend_server:app --reload     # dev server → http://localhost:8000
ruff check .                            # lint (config in pyproject.toml)
mypy .                                  # type check (config in pyproject.toml)
pytest                                  # tests + coverage
```

---

## Environment Variables

| Variable              | Purpose                                    |
|-----------------------|--------------------------------------------|
| `FRONTEND_URL`        | CORS origin whitelist                      |
| `API_KEY`             | App-level API key                          |
| `ADMIN_KEY`           | Admin-only endpoints (e.g., log access)    |
| `PROJECT_URL`         | Supabase project URL                       |
| `ANON_KEY`            | Supabase anon key                          |
| `SERVICE_ROLE_KEY`    | Supabase service role key for account deletion |
| `SUPABASE_JWT_SECRET` | JWT verification secret                    |
| `DEVELOPMENT_MODE`    | Flag for dev-specific behavior             |
| `INFERENCE_API_KEY`   | Vision-model API key for `/screenshot-import` |
| `INFERENCE_MODEL`     | Vision-model identifier for `/screenshot-import` |
| `REASONING_MODEL`     | Text-only reasoning-model identifier for `/screenshot-import` |

---

## Logging

- **File**: `backend.log` (INFO and above, overwritten on restart)
- **Console**: WARNING and above only

Sensitive data (full tokens, passwords) is never logged - only error types and safe metadata.

---

## Deployment Notes

- Dockerfile in `backend/` for containerization
- `DEPLOYMENT.md` contains full deployment guide
- CORS configured for single frontend origin only
- Rate limiter uses in-memory storage (not suitable for multi-instance without Redis)
