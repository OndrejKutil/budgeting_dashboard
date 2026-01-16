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

Each router handles a domain. All protected endpoints use `Depends(api_key_auth)` and `Depends(get_current_user)`.

| Router               | Prefix         | Purpose                                    |
|----------------------|----------------|--------------------------------------------|
| `transactions`       | `/transactions`| CRUD + filtered listing with pagination    |
| `login`              | `/auth`        | Login/register via Supabase                |
| `token_refresh`      | `/refresh`     | Exchange refresh token for new pair        |
| `categories`         | `/categories`  | Category management                        |
| `accounts`           | `/accounts`    | Account management                         |
| `profile`            | `/profile`     | User profile CRUD                          |
| `summary`            | `/summary`     | Dashboard summary data                     |
| `yearly_analytics`   | `/yearly`      | Year-over-year analytics                   |
| `monthly_analytics`  | `/monthly`     | Month-by-month analytics                   |
| `savings_funds`      | `/funds`       | Savings fund tracking                      |

---

## Schemas

Organized in three files under `schemas/`:

- **`base.py`** - Core domain models (Transaction, Account, Category, etc.)
- **`requests.py`** - Input validation for POST/PUT bodies
- **`responses.py`** - Response wrappers with success/data structure

All schemas use Pydantic v2.

---

## Database

Supabase client initialized once via `get_db_client()`. Connection uses:
- `PROJECT_URL` - Supabase project URL
- `ANON_KEY` - Public anon key for client

All data access goes through Supabase's REST API (via Python client).

---

## Environment Variables

| Variable              | Purpose                                    |
|-----------------------|--------------------------------------------|
| `FRONTEND_URL`        | CORS origin whitelist                      |
| `API_KEY`             | App-level API key                          |
| `ADMIN_KEY`           | Admin-only endpoints (e.g., log access)    |
| `PROJECT_URL`         | Supabase project URL                       |
| `ANON_KEY`            | Supabase anon key                          |
| `SUPABASE_JWT_SECRET` | JWT verification secret                    |
| `DEVELOPMENT_MODE`    | Flag for dev-specific behavior             |

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
