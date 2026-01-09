# Backend API Documentation

> **Base URL**: Configured via environment variable  
> **Version**: 1.0  
> **Last Updated**: January 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Headers](#common-headers)
3. [Rate Limiting](#rate-limiting)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)
   - [Authentication (`/auth`)](#authentication-endpoints)
   - [Token Refresh (`/refresh`)](#token-refresh-endpoints)
   - [Transactions (`/transactions`)](#transactions-endpoints)
   - [Categories (`/categories`)](#categories-endpoints)
   - [Accounts (`/accounts`)](#accounts-endpoints)
   - [Profile (`/profile`)](#profile-endpoints)
   - [Summary (`/summary`)](#summary-endpoints)
   - [Monthly Analytics (`/monthly`)](#monthly-analytics-endpoints)
   - [Yearly Analytics (`/yearly`)](#yearly-analytics-endpoints)
   - [Savings Funds (`/funds`)](#savings-funds-endpoints)
6. [Data Schemas](#data-schemas)

---

## Authentication

The API uses a dual authentication system:

### 1. API Key Authentication
All endpoints require an API key for access control.

### 2. JWT Bearer Token Authentication  
Most endpoints require a valid Supabase JWT access token for user identification.

### Authentication Flow

1. **Login** → Receive `access_token` and `refresh_token`
2. **Authenticated Requests** → Include both API key and Bearer token
3. **Token Expired** → Use refresh endpoint with `refresh_token`
4. **Refresh Failed** → Re-authenticate via login

---

## Common Headers

### Required for All Endpoints

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-KEY` | string | ✅ Yes | API key for application access |

### Required for Authenticated Endpoints

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | ✅ Yes | Bearer token: `Bearer <access_token>` |

### Required for Token Refresh

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-Refresh-Token` | string | ✅ Yes | Refresh token (with or without `Bearer ` prefix) |

### Optional Headers

| Header | Type | Description |
|--------|------|-------------|
| `Content-Type` | string | `application/json` for POST/PUT requests |

---

## Rate Limiting

The API implements rate limiting to prevent abuse. Limits vary by endpoint type:

| Endpoint Type | Rate Limit | Description |
|---------------|------------|-------------|
| `login` | 1000/minute | Login attempts |
| `auth` | 50/minute | Authentication operations (register, token refresh) |
| `read_only` | 120/minute | GET endpoints for data retrieval |
| `standard` | 60/minute | Standard CRUD operations |
| `write` | 30/minute | Create, update, delete operations |
| `heavy` | 20/minute | Analytics and computation-heavy endpoints |
| `health` | 300/minute | Health check endpoints |

**Rate Limit Exceeded Response**: `HTTP 429 Too Many Requests`

---

## Error Responses

All error responses follow this structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid parameters or missing required fields |
| `401` | Unauthorized - Invalid API key or JWT token |
| `404` | Not Found - Resource doesn't exist |
| `429` | Too Many Requests - Rate limit exceeded |
| `498` | Token Expired - JWT access token has expired (custom code) |
| `500` | Internal Server Error - Server-side error |
| `503` | Service Unavailable - Database connection failed |

### JWT Token Errors

| Status | Detail | Action Required |
|--------|--------|-----------------|
| `400` | "Authorization header is missing" | Include `Authorization` header |
| `401` | "Invalid token" | Re-authenticate |
| `498` | "Token expired" | Use refresh token endpoint |

---

## Endpoints

---

## Authentication Endpoints

### POST `/auth/login`

Authenticate a user with email and password.

**Rate Limit**: `1000/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |
| `password` | string | ✅ | User's password |

#### Response `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.refresh_token_string...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "v1.refresh_token_string..."
    }
  }
}
```

#### Error Responses
| Status | Detail |
|--------|--------|
| `401` | "Invalid credentials" |
| `500` | "Server error: {details}" |

---

### POST `/auth/register`

Register a new user account.

**Rate Limit**: `50/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |
| `password` | string | ✅ | Password (min 8 characters) |
| `full_name` | string | ❌ | User's full name (optional) |

#### Response `200 OK`
Same structure as login response.

#### Error Responses
| Status | Detail |
|--------|--------|
| `401` | "Invalid credentials" |
| `500` | "Server error" |

---

## Token Refresh Endpoints

### POST `/refresh/`

Refresh an expired access token using a valid refresh token.

**Rate Limit**: `50/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `X-Refresh-Token` | ✅ | Your refresh token |

#### Request Body
None required.

#### Response `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "authenticated",
    "aud": "authenticated",
    "email_confirmed_at": "2025-01-15T10:30:00Z",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-20T14:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.new_refresh_token_string...",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1705756800
  }
}
```

#### Error Responses
| Status | Detail |
|--------|--------|
| `400` | "Empty refresh token" |
| `401` | "Invalid refresh token. Please log in again." |
| `500` | "Token refresh failed. Please try again." |
| `503` | "Failed to refresh session. Please log in again." |

---

## Transactions Endpoints

### GET `/transactions/`

Retrieve transactions with optional filtering and pagination.

**Rate Limit**: `120/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | date | ❌ | - | Filter: transactions on or after this date (YYYY-MM-DD) |
| `end_date` | date | ❌ | - | Filter: transactions on or before this date (YYYY-MM-DD) |
| `category_id` | string | ❌ | - | Filter by category ID |
| `account_id` | string | ❌ | - | Filter by account ID |
| `transaction_id` | string | ❌ | - | Filter by specific transaction ID |
| `limit` | integer | ❌ | 100 | Number of items to return (1-1000) |
| `offset` | integer | ❌ | 0 | Number of items to skip for pagination |

#### Response `200 OK`
```json
{
  "data": [
    {
      "id_pk": "txn-uuid-123",
      "user_id_fk": "user-uuid-456",
      "account_id_fk": "acc-uuid-789",
      "category_id_fk": 2,
      "amount": 49.99,
      "date": "2025-01-15",
      "notes": "Weekly grocery shopping",
      "created_at": "2025-01-15T10:30:00Z",
      "savings_fund_id_fk": null
    }
  ],
  "count": 1,
  "success": true,
  "message": "Transactions retrieved successfully"
}
```

#### Notes
- Results are ordered by date (most recent first)
- Amounts for expenses are negative, income are positive

---

### POST `/transactions/`

Create a new transaction.

**Rate Limit**: `30/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
```json
{
  "account_id_fk": "acc-uuid-789",
  "category_id_fk": 2,
  "amount": -49.99,
  "date": "2025-01-15",
  "notes": "Weekly grocery shopping",
  "savings_fund_id_fk": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id_fk` | string | ✅ | Account ID for the transaction |
| `category_id_fk` | integer | ✅ | Category ID for the transaction |
| `amount` | decimal | ✅ | Transaction amount (negative for expenses) |
| `date` | date | ✅ | Transaction date (YYYY-MM-DD) |
| `notes` | string | ❌ | Optional description/notes |
| `created_at` | datetime | ❌ | Optional creation timestamp |
| `savings_fund_id_fk` | string | ❌ | Optional savings fund ID for savings transactions |

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": [
    {
      "id_pk": "new-txn-uuid",
      "user_id_fk": "user-uuid-456",
      "account_id_fk": "acc-uuid-789",
      "category_id_fk": 2,
      "amount": 49.99,
      "date": "2025-01-15",
      "notes": "Weekly grocery shopping",
      "created_at": "2025-01-15T10:30:00Z",
      "savings_fund_id_fk": null
    }
  ]
}
```

---

### PUT `/transactions/{transaction_id}`

Update an existing transaction.

**Rate Limit**: `30/minute`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transaction_id` | string | ✅ | ID of the transaction to update |

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
Same as POST `/transactions/` - all fields required.

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Transaction {transaction_id} updated successfully",
  "data": [{ ... }]
}
```

---

### DELETE `/transactions/{transaction_id}`

Delete a transaction.

**Rate Limit**: `30/minute`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `transaction_id` | string | ✅ | ID of the transaction to delete |

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Transaction {transaction_id} deleted successfully",
  "data": null
}
```

---

## Categories Endpoints

### GET `/categories/`

Retrieve all categories or filter by specific criteria.

**Rate Limit**: `120/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category_id` | integer | ❌ | Filter by category ID |
| `category_name` | string | ❌ | Filter by category name |

#### Response `200 OK`
```json
{
  "data": [
    {
      "categories_id_pk": 1,
      "category_name": "Groceries",
      "type": "expense",
      "is_active": true,
      "spending_type": "Core",
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "categories_id_pk": 2,
      "category_name": "Salary",
      "type": "income",
      "is_active": true,
      "spending_type": "Income",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 2
}
```

#### Category Types
| Type | Description |
|------|-------------|
| `expense` | Regular expenses |
| `income` | Income sources |
| `transfer` | Account transfers |
| `saving` | Savings allocations |
| `investment` | Investment allocations |
| `exclude` | Excluded from calculations |

#### Spending Types
| Type | Description |
|------|-------------|
| `Core` | Essential/necessary expenses |
| `Necessary` | Required but not essential |
| `Fun` | Discretionary spending |
| `Future` | Future-oriented expenses |
| `Income` | Income categories |

---

## Accounts Endpoints

### GET `/accounts/`

Retrieve all user accounts.

**Rate Limit**: `120/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | integer | ❌ | Filter by account ID |
| `account_name` | string | ❌ | Filter by account name |

#### Response `200 OK`
```json
{
  "data": [
    {
      "accounts_id_pk": "acc-uuid-789",
      "user_id_fk": "user-uuid-456",
      "account_name": "Main Checking Account",
      "type": "checking",
      "currency": "USD",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "success": true,
  "message": "Accounts fetched successfully"
}
```

---

### POST `/accounts/`

Create a new account.

**Rate Limit**: `30/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
```json
{
  "account_name": "Savings Account",
  "type": "savings",
  "currency": "USD"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account_name` | string | ✅ | Name for the account |
| `type` | string | ✅ | Account type (e.g., "checking", "savings", "credit") |
| `currency` | string | ✅ | Currency code (e.g., "USD", "EUR") |
| `created_at` | datetime | ❌ | Optional creation timestamp |

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Account created successfully"
}
```

---

### PUT `/accounts/{account_id}`

Update an existing account.

**Rate Limit**: `30/minute`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | ✅ | ID of the account to update |

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
Same as POST `/accounts/`.

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Account updated successfully"
}
```

---

### DELETE `/accounts/{account_id}`

Delete an account.

**Rate Limit**: `30/minute`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | ✅ | ID of the account to delete |

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Profile Endpoints

### GET `/profile/me`

Get the current authenticated user's profile information.

**Rate Limit**: `60/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Response `200 OK`
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "aud": "authenticated",
    "role": "authenticated",
    "is_anonymous": false,
    "email": "user@example.com",
    "email_confirmed_at": "2025-01-15T10:30:00Z",
    "phone": null,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-20T14:00:00Z",
    "last_sign_in_at": "2025-01-20T14:00:00Z",
    "app_metadata": {},
    "user_metadata": {
      "full_name": "John Doe"
    },
    "identities": [
      {
        "id": "identity-uuid",
        "identity_id": "provider-identity-id",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "provider": "email",
        "identity_data": {},
        "created_at": "2025-01-15T10:30:00Z",
        "last_sign_in_at": "2025-01-20T14:00:00Z",
        "updated_at": "2025-01-20T14:00:00Z"
      }
    ],
    "factors": null
  },
  "success": true,
  "message": "User profile retrieved successfully"
}
```

#### Error Responses
| Status | Detail |
|--------|--------|
| `404` | "User profile not found" |
| `500` | "Failed to fetch user profile" |

---

## Summary Endpoints

### GET `/summary/`

Get a financial summary with totals by category type.

**Rate Limit**: `20/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | date | ❌ | Start date for filtering (YYYY-MM-DD) |
| `end_date` | date | ❌ | End date for filtering (YYYY-MM-DD) |

#### Response `200 OK`
```json
{
  "data": {
    "total_income": 5000.00,
    "total_expense": 3500.00,
    "total_saving": 1000.00,
    "total_investment": 500.00,
    "profit": 1500.00,
    "net_cash_flow": 0.00,
    "by_category": {
      "Salary": 5000.00,
      "Groceries": -800.00,
      "Utilities": -300.00,
      "Savings": -1000.00
    }
  },
  "success": true,
  "message": "Financial summary from 2025-01-01 to 2025-01-31 retrieved successfully"
}
```

#### Field Descriptions
| Field | Description |
|-------|-------------|
| `total_income` | Sum of all income transactions |
| `total_expense` | Sum of all expense transactions (absolute value) |
| `total_saving` | Sum of all savings allocations (absolute value) |
| `total_investment` | Sum of all investment allocations (absolute value) |
| `profit` | Income minus expenses |
| `net_cash_flow` | Income minus expenses minus savings minus investments |
| `by_category` | Breakdown of amounts by category name |

#### Error Responses
| Status | Detail |
|--------|--------|
| `400` | "Invalid date parameters" |
| `500` | "Failed to generate financial summary" |
| `503` | "Database connection failed. Please try again later." |

---

## Monthly Analytics Endpoints

### GET `/monthly/analytics`

Get comprehensive monthly analytics with daily spending, category breakdown, and spending type analysis.

**Rate Limit**: `20/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `year` | integer | ❌ | Current year | Year for analytics |
| `month` | integer | ❌ | Current month | Month for analytics (1-12) |

#### Response `200 OK`
```json
{
  "data": {
    "year": 2025,
    "month": 1,
    "month_name": "January",
    "income": 5000.00,
    "expenses": 2500.00,
    "savings": 1000.00,
    "investments": 500.00,
    "profit": 2000.00,
    "cashflow": 1000.00,
    "daily_spending_heatmap": [
      { "day": "2025-01-15", "amount": 125.50 },
      { "day": "2025-01-16", "amount": 75.25 }
    ],
    "category_breakdown": [
      { "category": "Salary", "total": 5000.00 },
      { "category": "Groceries", "total": 450.75 }
    ],
    "spending_type_breakdown": [
      { "type": "Core", "amount": 1250.00 },
      { "type": "Fun", "amount": 300.00 },
      { "type": "Future", "amount": 500.00 }
    ]
  },
  "success": true,
  "message": "Monthly analytics for January 2025 retrieved successfully"
}
```

#### Field Descriptions
| Field | Description |
|-------|-------------|
| `income` | Total income for the month |
| `expenses` | Total expenses (absolute value) |
| `savings` | Total savings (absolute value) |
| `investments` | Total investments (absolute value) |
| `profit` | Income + expenses + investments |
| `cashflow` | Income + expenses + investments + savings |
| `daily_spending_heatmap` | Array of daily spending amounts for visualization |
| `category_breakdown` | Spending breakdown by category |
| `spending_type_breakdown` | Breakdown by spending type (Core/Fun/Future) |

#### Error Responses
| Status | Detail |
|--------|--------|
| `400` | "Month must be between 1 and 12" |
| `400` | "Invalid year or month parameters" |
| `500` | "Failed to generate monthly analytics" |
| `503` | "Database connection failed. Please try again later." |

---

## Yearly Analytics Endpoints

### GET `/yearly/analytics`

Get comprehensive yearly analytics with monthly trends and category breakdowns.

**Rate Limit**: `20/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `year` | integer | ❌ | Current year | Year for analytics |

#### Response `200 OK`
```json
{
  "data": {
    "year": 2024,
    "total_income": 60000.00,
    "total_expense": 45000.00,
    "total_saving": 10000.00,
    "total_investment": 5000.00,
    "total_core_expense": 30000.00,
    "total_fun_expense": 15000.00,
    "total_future_expense": 5000.00,
    "profit": 15000.00,
    "net_cash_flow": 0.00,
    "savings_rate": 16.67,
    "investment_rate": 8.33,
    "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "monthly_income": [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
    "monthly_expense": [3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750],
    "monthly_saving": [833, 833, 833, 833, 833, 833, 833, 833, 833, 833, 833, 833],
    "monthly_investment": [417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417],
    "monthly_core_expense": [2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
    "monthly_fun_expense": [1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250],
    "monthly_future_expense": [417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417],
    "monthly_savings_rate": [16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
    "monthly_investment_rate": [8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33],
    "by_category": {
      "Salary": 60000.00,
      "Rent": -18000.00,
      "Groceries": -12000.00
    },
    "core_categories": {
      "Rent": 18000.00,
      "Groceries": 12000.00
    },
    "income_by_category": {
      "Salary": 60000.00
    },
    "expense_by_category": {
      "Rent": 18000.00,
      "Groceries": 12000.00
    }
  },
  "success": true,
  "message": "Yearly analytics for 2024 retrieved successfully"
}
```

#### Field Descriptions
| Field | Description |
|-------|-------------|
| `savings_rate` | Savings as percentage of income |
| `investment_rate` | Investments as percentage of income |
| `months` | Array of month abbreviations |
| `monthly_*` | Arrays of 12 values, one per month |
| `by_category` | All categories with signed amounts |
| `core_categories` | Core expense categories (absolute values) |
| `income_by_category` | Income categories only |
| `expense_by_category` | Expense categories only (absolute values) |

---

### GET `/yearly/emergency-fund`

Get emergency fund analysis based on core expenses.

**Rate Limit**: `20/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `year` | integer | ❌ | Current year | Year for calculation |

#### Response `200 OK`
```json
{
  "data": {
    "year": 2024,
    "average_monthly_core_expenses": 2500.00,
    "total_core_expenses": 30000.00,
    "three_month_fund_target": 7500.00,
    "six_month_fund_target": 15000.00,
    "core_category_breakdown": {
      "Rent": 18000.00,
      "Groceries": 8000.00,
      "Utilities": 4000.00
    },
    "months_analyzed": 12
  },
  "success": true,
  "message": "Emergency fund analysis for 2024 retrieved successfully"
}
```

#### Field Descriptions
| Field | Description |
|-------|-------------|
| `average_monthly_core_expenses` | Average of monthly core (essential) expenses |
| `total_core_expenses` | Total core expenses for the year |
| `three_month_fund_target` | Recommended 3-month emergency fund amount |
| `six_month_fund_target` | Recommended 6-month emergency fund amount |
| `core_category_breakdown` | Breakdown of core expenses by category |
| `months_analyzed` | Number of months with transaction data |

---

## Savings Funds Endpoints

### GET `/funds/`

Retrieve all savings funds for the current user.

**Rate Limit**: `120/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fund_id` | string | ❌ | Filter by fund ID |
| `fund_name` | string | ❌ | Filter by fund name |

#### Response `200 OK`
```json
{
  "data": [
    {
      "savings_funds_id_pk": "fund-uuid-123",
      "user_id_fk": "user-uuid-456",
      "fund_name": "Emergency Fund",
      "target_amount": 5000,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "success": true,
  "message": "Savings funds retrieved successfully"
}
```

---

### POST `/funds/`

Create a new savings fund.

**Rate Limit**: `30/minute`

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
```json
{
  "user_id_fk": "user-uuid-456",
  "fund_name": "Vacation Fund",
  "target_amount": 3000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id_fk` | string | ✅ | User ID (should match authenticated user) |
| `fund_name` | string | ✅ | Name for the savings fund |
| `target_amount` | integer | ✅ | Target savings amount |
| `created_at` | datetime | ❌ | Optional creation timestamp |

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Savings fund created successfully",
  "data": [
    {
      "savings_funds_id_pk": "new-fund-uuid",
      "user_id_fk": "user-uuid-456",
      "fund_name": "Vacation Fund",
      "target_amount": 3000,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### PUT `/funds/{fund_id}`

Update an existing savings fund.

**Rate Limit**: `30/minute`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fund_id` | string | ✅ | ID of the fund to update |

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |
| `Content-Type` | ✅ | `application/json` |

#### Request Body
Same as POST `/funds/`.

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Savings fund {fund_id} updated successfully",
  "data": [{ ... }]
}
```

---

### DELETE `/funds/{fund_id}`

Delete a savings fund.

**Rate Limit**: `30/minute`

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fund_id` | string | ✅ | ID of the fund to delete |

#### Headers
| Header | Required | Value |
|--------|----------|-------|
| `X-API-KEY` | ✅ | Your API key |
| `Authorization` | ✅ | `Bearer <access_token>` |

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Savings fund {fund_id} deleted successfully",
  "data": null
}
```

---

## Data Schemas

### TransactionData
```typescript
{
  id_pk: string | null;           // Transaction ID
  user_id_fk: string | null;      // User ID
  account_id_fk: string;          // Account ID
  category_id_fk: number;         // Category ID
  amount: number;                 // Amount (negative for expenses)
  date: string;                   // Date (YYYY-MM-DD)
  notes: string | null;           // Optional notes
  created_at: string | null;      // ISO datetime
  savings_fund_id_fk: string | null; // Optional savings fund ID
}
```

### CategoryData
```typescript
{
  categories_id_pk: number;       // Category ID
  category_name: string;          // Category name
  type: "expense" | "income" | "transfer" | "saving" | "investment" | "exclude";
  is_active: boolean | null;      // Active status
  spending_type: "Core" | "Necessary" | "Fun" | "Future" | "Income" | null;
  created_at: string | null;      // ISO datetime
}
```

### AccountData
```typescript
{
  accounts_id_pk: string;         // Account ID
  user_id_fk: string | null;      // User ID
  account_name: string;           // Account name
  type: string;                   // Account type
  currency: string | null;        // Currency code
  created_at: string | null;      // ISO datetime
}
```

### SavingsFundsData
```typescript
{
  savings_funds_id_pk: string;    // Fund ID
  user_id_fk: string;             // User ID
  fund_name: string;              // Fund name
  target_amount: number;          // Target amount
  created_at: string | null;      // ISO datetime
}
```

---

## Quick Reference

### Endpoint Summary Table

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | `/auth/login` | User login | API Key | 1000/min |
| POST | `/auth/register` | User registration | API Key | 50/min |
| POST | `/refresh/` | Refresh access token | API Key + Refresh | 50/min |
| GET | `/transactions/` | List transactions | Full | 120/min |
| POST | `/transactions/` | Create transaction | Full | 30/min |
| PUT | `/transactions/{id}` | Update transaction | Full | 30/min |
| DELETE | `/transactions/{id}` | Delete transaction | Full | 30/min |
| GET | `/categories/` | List categories | Full | 120/min |
| GET | `/accounts/` | List accounts | Full | 120/min |
| POST | `/accounts/` | Create account | Full | 30/min |
| PUT | `/accounts/{id}` | Update account | Full | 30/min |
| DELETE | `/accounts/{id}` | Delete account | Full | 30/min |
| GET | `/profile/me` | Get user profile | Full | 60/min |
| GET | `/summary/` | Financial summary | Full | 20/min |
| GET | `/monthly/analytics` | Monthly analytics | Full | 20/min |
| GET | `/yearly/analytics` | Yearly analytics | Full | 20/min |
| GET | `/yearly/emergency-fund` | Emergency fund analysis | Full | 20/min |
| GET | `/funds/` | List savings funds | Full | 120/min |
| POST | `/funds/` | Create savings fund | Full | 30/min |
| PUT | `/funds/{id}` | Update savings fund | Full | 30/min |
| DELETE | `/funds/{id}` | Delete savings fund | Full | 30/min |

**Auth Legend:**
- **API Key**: Only requires `X-API-KEY` header
- **API Key + Refresh**: Requires `X-API-KEY` and `X-Refresh-Token` headers
- **Full**: Requires `X-API-KEY` and `Authorization: Bearer <token>` headers
