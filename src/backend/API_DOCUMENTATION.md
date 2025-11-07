# Budgeting Dashboard API Documentation

## Overview

This is a FastAPI-based budgeting and financial analytics API. The API provides endpoints for managing transactions, accounts, categories, savings funds, and generating financial analytics reports.

**Base URL**: Configured via environment variables  
**API Version**: 1.0  
**Authentication**: API Key + JWT Bearer Token (for most endpoints)

---

## Authentication

### Authentication Types

1. **API Key Authentication** (Required for all endpoints)
   - Header: `X-API-KEY`
   - Type: String
   - Description: Validates the client application

2. **JWT Bearer Token** (Required for protected endpoints)
   - Header: `Authorization: Bearer <token>`
   - Type: JWT token
   - Description: User authentication token obtained from login endpoint
   - Token contains: `user_id`, `email`, `access_token`

3. **Login Key** (For login/register endpoints)
   - Header: `X-Login`
   - Format: `email&&&password&&&full_name`
   - Description: Credentials for authentication

4. **Refresh Token** (For token refresh endpoint)
   - Header: `X-Refresh-Token`
   - Type: String
   - Description: Refresh token to obtain new access token

### Authentication Flow

1. Register/Login → Get access token and refresh token
2. Use access token in `Authorization: Bearer <token>` header for protected endpoints
3. When token expires (status 498), use refresh token to get new access token
4. All requests require `X-API-KEY` header

---

## Data Models

### Enums

#### CategoryType
- `expense` - Expense transaction
- `income` - Income transaction
- `transfer` - Transfer between accounts
- `saving` - Savings transaction
- `investment` - Investment transaction
- `exclude` - Excluded from calculations

#### SpendingType
- `Core` - Core expenses (essential)
- `Fun` - Fun/discretionary expenses
- `Future` - Future-oriented expenses
- `Income` - Income category

### Core Data Models

#### TransactionData
```json
{
  "id": "string",
  "user_id": "string",
  "account_id": "string",
  "category_id": 1,
  "amount": 100.00,
  "date": "2025-01-15",
  "notes": "string (optional)",
  "created_at": "2025-01-15T10:30:00Z (optional)",
  "savings_fund_id": "string (optional)"
}
```

#### CategoryData
```json
{
  "categories_id": 1,
  "category_name": "string",
  "type": "expense|income|transfer|saving|investment|exclude",
  "is_active": true,
  "spending_type": "Core|Fun|Future|Income (optional)",
  "created_at": "2025-01-15T10:30:00Z (optional)"
}
```

#### AccountData
```json
{
  "accounts_id": "string",
  "user_id": "string (optional)",
  "account_name": "string",
  "type": "string",
  "currency": "string",
  "created_at": "2025-01-15T10:30:00Z (optional)"
}
```

#### SavingsFundsData
```json
{
  "savings_funds_id": "string",
  "user_id": "string",
  "fund_name": "string",
  "target_amount": 5000,
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

## API Endpoints

### Root Endpoints

#### GET /
- **Description**: Health check endpoint
- **Authentication**: None
- **Response**: `{"message": "Backend server is running!"}`

#### GET /health
- **Description**: Health check endpoint
- **Authentication**: None
- **Response**: `{"status": "healthy"}`

---

### Authentication Endpoints

#### POST /auth/login
- **Description**: User login
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `X-Login` (format: `email&&&password&&&full_name`)
- **Request Body**: None (credentials in header)
- **Response**: 
  ```json
  {
    "data": {
      "user": {...},
      "session": {
        "access_token": "string",
        "refresh_token": "string",
        ...
      }
    }
  }
  ```
- **Error Codes**: 500 (Server error)

#### POST /auth/register
- **Description**: User registration
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `X-Login` (format: `email&&&password&&&full_name`)
- **Request Body**: None (credentials in header)
- **Response**: 
  ```json
  {
    "data": {
      "user": {...},
      "session": {...}
    }
  }
  ```
- **Error Codes**: 500 (Server error)

#### POST /refresh/
- **Description**: Refresh access token
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `X-Refresh-Token`
- **Request Body**: None
- **Response**: 
  ```json
  {
    "user": {...},
    "session": {
      "access_token": "string",
      "refresh_token": "string",
      ...
    }
  }
  ```
- **Error Codes**: 
  - 400 (Empty refresh token)
  - 401 (Invalid refresh token)
  - 500 (Server error)
  - 503 (Service unavailable)

---

### Transaction Endpoints

**Base Path**: `/transactions`

#### GET /transactions/
- **Description**: Get all transactions with optional filtering
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `start_date` (optional, date): Starting date for filtering (YYYY-MM-DD)
  - `end_date` (optional, date): Ending date for filtering (YYYY-MM-DD)
  - `category_id` (optional, string): Filter by category ID
  - `account_id` (optional, string): Filter by account ID
  - `transaction_id` (optional, string): Filter by specific transaction ID
  - `limit` (optional, int, default: 100, range: 1-1000): Number of items to return
  - `offset` (optional, int, default: 0, min: 0): Number of items to skip
- **Response**: 
  ```json
  {
    "data": [TransactionData, ...],
    "count": 2
  }
  ```
- **Error Codes**: 500 (Database query failed)
- **Notes**: Results are ordered by date (most recent first)

#### POST /transactions/
- **Description**: Create a new transaction
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Request Body**: TransactionRequest
  ```json
  {
    "account_id": "string",
    "category_id": 1,
    "amount": 100.00,
    "date": "2025-01-15",
    "notes": "string (optional)",
    "created_at": "2025-01-15T10:30:00Z (optional)",
    "savings_fund_id": "string (optional)"
  }
  ```
- **Response**: 
  ```json
  {
    "data": [TransactionData],
    "count": 1
  }
  ```
- **Error Codes**: 500 (Failed to create transaction)
- **Notes**: `user_id` is automatically set from the authenticated user

#### PUT /transactions/{transaction_id}
- **Description**: Update an existing transaction
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Path Parameters**:
  - `transaction_id` (string): ID of the transaction to update
- **Request Body**: TransactionRequest (same as POST)
- **Response**: 
  ```json
  {
    "data": [TransactionData],
    "count": 1
  }
  ```
- **Error Codes**: 500 (Failed to update transaction)

#### DELETE /transactions/{transaction_id}
- **Description**: Delete a transaction
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Path Parameters**:
  - `transaction_id` (string): ID of the transaction to delete
- **Response**: 
  ```json
  {
    "message": "Transaction deleted successfully"
  }
  ```
- **Error Codes**: 500 (Failed to delete transaction)

---

### Account Endpoints

**Base Path**: `/accounts`

#### GET /accounts/
- **Description**: Get all accounts with optional filtering
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `account_id` (optional, int): Filter by account ID
  - `account_name` (optional, string): Filter by account name
- **Response**: 
  ```json
  {
    "data": [AccountData, ...],
    "count": 2
  }
  ```
- **Error Codes**: 500 (Database query failed)

#### POST /accounts/
- **Description**: Create a new account
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Request Body**: AccountRequest
  ```json
  {
    "account_name": "string",
    "type": "string",
    "currency": "string",
    "created_at": "2025-01-15T10:30:00Z (optional)"
  }
  ```
- **Response**: 
  ```json
  {
    "message": "Account created successfully",
    "data": [AccountData]
  }
  ```
- **Error Codes**: 500 (Failed to create account)
- **Notes**: `user_id` is automatically set from the authenticated user

#### PUT /accounts/{account_id}
- **Description**: Update an existing account
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Path Parameters**:
  - `account_id` (string): ID of the account to update
- **Request Body**: AccountRequest (same as POST)
- **Response**: 
  ```json
  {
    "message": "Account updated successfully",
    "data": [AccountData]
  }
  ```
- **Error Codes**: 500 (Failed to update account)

#### DELETE /accounts/{account_id}
- **Description**: Delete an account
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Path Parameters**:
  - `account_id` (string): ID of the account to delete
- **Response**: 
  ```json
  {
    "message": "Account deleted successfully",
    "data": [...]
  }
  ```
- **Error Codes**: 500 (Failed to delete account)

---

### Category Endpoints

**Base Path**: `/categories`

#### GET /categories/
- **Description**: Get all categories with optional filtering
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `category_id` (optional, int): Filter by category ID
  - `category_name` (optional, string): Filter by category name
- **Response**: 
  ```json
  {
    "data": [CategoryData, ...],
    "count": 2
  }
  ```
- **Error Codes**: 500 (Database query failed)
- **Notes**: Categories are typically system-defined and read-only

---

### Profile Endpoints

**Base Path**: `/profile`

#### GET /profile/me
- **Description**: Get current user's profile information
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Response**: 
  ```json
  {
    "data": {
      "id": "string",
      "email": "string",
      "email_confirmed_at": "datetime",
      "phone": "string",
      "created_at": "datetime",
      "updated_at": "datetime",
      "last_sign_in_at": "datetime",
      "user_metadata": {},
      "app_metadata": {},
      "identities": [...],
      ...
    }
  }
  ```
- **Error Codes**: 
  - 404 (User profile not found)
  - 500 (Failed to fetch user profile)

---

### Summary Endpoints

**Base Path**: `/summary`

#### GET /summary/
- **Description**: Get financial summary including totals by category type and account
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `start_date` (optional, date): Start date for filtering transactions (YYYY-MM-DD)
  - `end_date` (optional, date): End date for filtering transactions (YYYY-MM-DD)
- **Response**: 
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
        "Utilities": -300.00
      }
    }
  }
  ```
- **Error Codes**: 500 (Failed to generate financial summary)

---

### Monthly Analytics Endpoints

**Base Path**: `/monthly`

#### GET /monthly/analytics
- **Description**: Get comprehensive monthly analytics including totals, daily spending heatmap, category breakdown, and spending type analysis
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `year` (optional, int, default: current year): Year for analytics
  - `month` (optional, int, default: current month, range: 1-12): Month for analytics
- **Response**: 
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
        {
          "day": "2025-01-15",
          "amount": 125.50
        }
      ],
      "category_breakdown": [
        {
          "category": "Salary",
          "total": 5000.00
        }
      ],
      "spending_type_breakdown": [
        {
          "type": "Core",
          "amount": 1250.00
        }
      ]
    },
    "success": true,
    "message": "Monthly analytics for January 2025 retrieved successfully"
  }
  ```
- **Error Codes**: 
  - 400 (Invalid year or month parameters, month must be 1-12)
  - 404 (No data found for the specified month)
  - 500 (Failed to generate monthly analytics)

---

### Yearly Analytics Endpoints

**Base Path**: `/yearly`

#### GET /yearly/analytics
- **Description**: Get comprehensive yearly analytics including totals, monthly breakdown, and trends
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `year` (optional, int, default: current year): Year for analytics
- **Response**: 
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
      "months": ["Jan", "Feb", "Mar", ...],
      "monthly_income": [5000, 5000, ...],
      "monthly_expense": [3750, 3750, ...],
      "monthly_saving": [833, 833, ...],
      "monthly_investment": [417, 417, ...],
      "monthly_core_expense": [2500, 2500, ...],
      "monthly_fun_expense": [1250, 1250, ...],
      "monthly_future_expense": [417, 417, ...],
      "monthly_savings_rate": [16.67, 16.67, ...],
      "monthly_investment_rate": [8.33, 8.33, ...],
      "by_category": {
        "Salary": 60000.00,
        "Rent": -18000.00,
        "Groceries": -12000.00
      },
      "core_categories": {
        "Rent": 18000.00,
        "Groceries": 12000.00
      }
    },
    "count": 12
  }
  ```
- **Error Codes**: 
  - 404 (No data found for the specified year)
  - 500 (Failed to generate yearly analytics)

#### GET /yearly/emergency-fund
- **Description**: Get emergency fund analysis based on core expenses
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `year` (optional, int, default: current year): Year for emergency fund calculation
- **Response**: 
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
    "count": 1
  }
  ```
- **Error Codes**: 
  - 404 (No emergency fund data found for the specified year)
  - 500 (Failed to generate emergency fund analysis)

---

### Savings Funds Endpoints

**Base Path**: `/funds`

#### GET /funds/
- **Description**: Get all savings funds with optional filtering
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `fund_id` (optional, string): Filter by fund ID
  - `fund_name` (optional, string): Filter by fund name
- **Response**: 
  ```json
  [
    {
      "savings_funds_id": "123aaa",
      "user_id": "456user",
      "fund_name": "Emergency Fund",
      "target_amount": 5000,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
  ```
- **Error Codes**: 500 (Internal Server Error)

#### POST /funds/
- **Description**: Create a new savings fund
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Request Body**: SavingsFundsRequest
  ```json
  {
    "user_id": "string",
    "fund_name": "string",
    "target_amount": 5000,
    "created_at": "2025-01-15T10:30:00Z (optional)"
  }
  ```
- **Response**: 
  ```json
  [
    {
      "savings_funds_id": "string",
      "user_id": "string",
      "fund_name": "string",
      "target_amount": 5000,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
  ```
- **Error Codes**: 500 (Internal Server Error)

#### PUT /funds/{fund_id}
- **Description**: Update an existing savings fund
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Path Parameters**:
  - `fund_id` (string): ID of the fund to update
- **Request Body**: SavingsFundsRequest (same as POST)
- **Response**: 
  ```json
  [
    {
      "savings_funds_id": "string",
      "user_id": "string",
      "fund_name": "string",
      "target_amount": 5000,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
  ```
- **Error Codes**: 500 (Internal Server Error)

#### DELETE /funds/{fund_id}
- **Description**: Delete a savings fund
- **Authentication**: 
  - Required: `X-API-KEY`
  - Required: `Authorization: Bearer <token>`
- **Path Parameters**:
  - `fund_id` (string): ID of the fund to delete
- **Response**: 
  ```json
  {
    "message": "Savings fund deleted successfully"
  }
  ```
- **Error Codes**: 500 (Internal Server Error)

---

## Error Handling

### Standard HTTP Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request parameters or missing required fields
- **401 Unauthorized**: Invalid or missing authentication credentials
- **404 Not Found**: Resource not found
- **498 Token Expired**: JWT access token has expired (custom status code)
- **500 Internal Server Error**: Server-side error occurred
- **503 Service Unavailable**: Service temporarily unavailable

### Error Response Format

```json
{
  "detail": "Error message description"
}
```

### Common Error Scenarios

1. **Missing API Key**: Returns 400 with "API key is missing"
2. **Invalid API Key**: Returns 401 with "Invalid API key"
3. **Missing Authorization Token**: Returns 400 with "Authorization header is missing"
4. **Expired Token**: Returns 498 with "Token expired" (check `X-Token-Status: expired` header)
5. **Invalid Token**: Returns 401 with "Invalid token"
6. **Database Errors**: Returns 500 with specific error message

---

## Data Types and Formats

### Date Format
- **Format**: `YYYY-MM-DD` (ISO 8601 date format)
- **Example**: `2025-01-15`

### DateTime Format
- **Format**: ISO 8601 datetime format
- **Example**: `2025-01-15T10:30:00Z`

### Decimal/Number Format
- All monetary amounts are represented as floats in JSON
- Internally handled as Decimal for precision
- **Example**: `100.50`

### Pagination
- **limit**: Maximum number of items to return (default: 100, max: 1000)
- **offset**: Number of items to skip (default: 0)
- Results are typically ordered by date (most recent first)

---

## Usage Examples

### Example 1: Login and Get Transactions

```http
# Step 1: Login
POST /auth/login
X-API-KEY: your-api-key
X-Login: user@example.com&&&password123&&&John Doe

# Response contains access_token and refresh_token

# Step 2: Get Transactions
GET /transactions/?start_date=2025-01-01&end_date=2025-01-31&limit=50
X-API-KEY: your-api-key
Authorization: Bearer <access_token>
```

### Example 2: Create a Transaction

```http
POST /transactions/
X-API-KEY: your-api-key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "account_id": "acc123",
  "category_id": 5,
  "amount": 49.99,
  "date": "2025-01-15",
  "notes": "Grocery shopping"
}
```

### Example 3: Get Monthly Analytics

```http
GET /monthly/analytics?year=2025&month=1
X-API-KEY: your-api-key
Authorization: Bearer <access_token>
```

### Example 4: Refresh Token

```http
POST /refresh/
X-API-KEY: your-api-key
X-Refresh-Token: <refresh_token>
```

---

## Notes for AI Agents

1. **Always include X-API-KEY header** in all requests
2. **For protected endpoints**, include `Authorization: Bearer <token>` header
3. **Token expiration**: If you receive status 498, use the refresh token endpoint to get a new access token
4. **Date filtering**: Use ISO 8601 format (YYYY-MM-DD) for all date parameters
5. **Pagination**: Use `limit` and `offset` for large result sets (max limit: 1000)
6. **Error handling**: Check the `detail` field in error responses for specific error messages
7. **User context**: Most endpoints automatically filter by the authenticated user's ID
8. **Transaction ordering**: Transactions are returned in reverse chronological order (newest first)
9. **Decimal precision**: Monetary values are handled as floats in JSON but use Decimal internally
10. **Optional fields**: Fields marked as optional can be omitted from request bodies

---

## Endpoint Summary Table

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/` | None | Health check |
| GET | `/health` | None | Health check |
| POST | `/auth/login` | API Key + Login Key | User login |
| POST | `/auth/register` | API Key + Login Key | User registration |
| POST | `/refresh/` | API Key + Refresh Token | Refresh access token |
| GET | `/transactions/` | API Key + JWT | Get transactions |
| POST | `/transactions/` | API Key + JWT | Create transaction |
| PUT | `/transactions/{id}` | API Key + JWT | Update transaction |
| DELETE | `/transactions/{id}` | API Key + JWT | Delete transaction |
| GET | `/accounts/` | API Key + JWT | Get accounts |
| POST | `/accounts/` | API Key + JWT | Create account |
| PUT | `/accounts/{id}` | API Key + JWT | Update account |
| DELETE | `/accounts/{id}` | API Key + JWT | Delete account |
| GET | `/categories/` | API Key + JWT | Get categories |
| GET | `/profile/me` | API Key + JWT | Get user profile |
| GET | `/summary/` | API Key + JWT | Get financial summary |
| GET | `/monthly/analytics` | API Key + JWT | Get monthly analytics |
| GET | `/yearly/analytics` | API Key + JWT | Get yearly analytics |
| GET | `/yearly/emergency-fund` | API Key + JWT | Get emergency fund analysis |
| GET | `/funds/` | API Key + JWT | Get savings funds |
| POST | `/funds/` | API Key + JWT | Create savings fund |
| PUT | `/funds/{id}` | API Key + JWT | Update savings fund |
| DELETE | `/funds/{id}` | API Key + JWT | Delete savings fund |

---

## Version History

- **v1.0**: Initial API documentation

