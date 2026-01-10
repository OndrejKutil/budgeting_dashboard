# API Endpoints

This document lists all available API endpoints. For data model details, see [schemas.md](schemas.md).

## Authentication

### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Summary**: Authenticate a user and return tokens.
- **Request Body**: [LoginRequest](schemas.md#loginrequest)
- **Response**: [LoginResponse](schemas.md#loginresponse)

### Register
- **URL**: `/auth/register`
- **Method**: `POST`
- **Summary**: Register a new user.
- **Request Body**: [UserData](schemas.md#userdata) (Note: Currently uses UserData from schemas.base)
- **Response**: [LoginResponse](schemas.md#loginresponse)

### Refresh Token
- **URL**: `/refresh/`
- **Method**: `POST`
- **Summary**: Refresh access token using a valid refresh token.
- **Response**: [RefreshTokenResponse](schemas.md#refreshtokenresponse)

---

## User Profile

### Get My Profile
- **URL**: `/profile/me`
- **Method**: `GET`
- **Summary**: Get current user's profile information.
- **Response**: [ProfileResponse](schemas.md#profileresponse)

---

## Accounts

### Get All Accounts
- **URL**: `/accounts/`
- **Method**: `GET`
- **Summary**: Get all accounts for the current user.
- **Query Params**: `account_id` (optional), `account_name` (optional)
- **Response**: [AccountsResponse](schemas.md#accountsresponse)

### Create Account
- **URL**: `/accounts/`
- **Method**: `POST`
- **Summary**: Create a new account.
- **Request Body**: [AccountRequest](schemas.md#accountrequest)
- **Response**: [AccountSuccessResponse](schemas.md#generic-success-responses)

### Update Account
- **URL**: `/accounts/{account_id}`
- **Method**: `PUT`
- **Summary**: Update an existing account.
- **Request Body**: [AccountRequest](schemas.md#accountrequest)
- **Response**: [AccountSuccessResponse](schemas.md#generic-success-responses)

### Delete Account
- **URL**: `/accounts/{account_id}`
- **Method**: `DELETE`
- **Summary**: Delete an account.
- **Response**: [AccountSuccessResponse](schemas.md#generic-success-responses)

---

## Categories

### Get All Categories
- **URL**: `/categories/`
- **Method**: `GET`
- **Summary**: Get all transaction categories.
- **Query Params**: `category_id` (optional), `category_name` (optional)
- **Response**: [CategoriesResponse](schemas.md#categoriesresponse)

---

## Transactions

### Get All Transactions
- **URL**: `/all/`
- **Method**: `GET`
- **Summary**: Get all transactions with filtering and pagination.
- **Query Params**: 
  - `start_date`, `end_date`
  - `category_id`, `account_id`, `transaction_id`
  - `limit` (default: 100), `offset` (default: 0)
- **Response**: [TransactionsResponse](schemas.md#transactionsresponse)

### Create Transaction
- **URL**: `/all/`
- **Method**: `POST`
- **Summary**: Create a new transaction.
- **Request Body**: [TransactionRequest](schemas.md#transactionrequest)
- **Response**: [TransactionSuccessResponse](schemas.md#generic-success-responses)

### Update Transaction
- **URL**: `/all/{transaction_id}`
- **Method**: `PUT`
- **Summary**: Update an existing transaction.
- **Request Body**: [TransactionRequest](schemas.md#transactionrequest)
- **Response**: [TransactionSuccessResponse](schemas.md#generic-success-responses)

### Delete Transaction
- **URL**: `/all/{transaction_id}`
- **Method**: `DELETE`
- **Summary**: Delete a transaction.
- **Response**: [TransactionSuccessResponse](schemas.md#generic-success-responses)

---

## Savings Funds

### Get Savings Funds
- **URL**: `/funds/`
- **Method**: `GET`
- **Summary**: Get all savings funds.
- **Query Params**: `fund_id` (optional), `fund_name` (optional)
- **Response**: [SavingsFundsResponse](schemas.md#savingsfundsresponse)

### Create Savings Fund
- **URL**: `/funds/`
- **Method**: `POST`
- **Summary**: Create a new savings fund.
- **Request Body**: [SavingsFundsRequest](schemas.md#savingsfundsrequest)
- **Response**: [SavingsFundSuccessResponse](schemas.md#generic-success-responses)

### Update Savings Fund
- **URL**: `/funds/{fund_id}`
- **Method**: `PUT`
- **Summary**: Update a savings fund.
- **Request Body**: [SavingsFundsRequest](schemas.md#savingsfundsrequest)
- **Response**: [SavingsFundSuccessResponse](schemas.md#generic-success-responses)

### Delete Savings Fund
- **URL**: `/funds/{fund_id}`
- **Method**: `DELETE`
- **Summary**: Delete a savings fund.
- **Response**: [SavingsFundSuccessResponse](schemas.md#generic-success-responses)

---

## Analytics & Summary

### Get Financial Summary
- **URL**: `/summary/`
- **Method**: `GET`
- **Summary**: Get financial summary totals and category breakdown.
- **Query Params**: `start_date` (optional), `end_date` (optional)
- **Response**: [SummaryResponse](schemas.md#summaryresponse)

### Get Monthly Analytics
- **URL**: `/monthly/analytics`
- **Method**: `GET`
- **Summary**: Get totals, daily heatmaps, and spending type analysis for a specific month.
- **Query Params**: `year` (default: current), `month` (default: current)
- **Response**: [MonthlyAnalyticsResponse](schemas.md#monthlyanalyticsresponse)

### Get Yearly Analytics
- **URL**: `/yearly/analytics`
- **Method**: `GET`
- **Summary**: Get yearly totals and monthly trends.
- **Query Params**: `year` (default: current)
- **Response**: [YearlyAnalyticsResponse](schemas.md#yearlyanalyticsresponse)

### Get Emergency Fund Analysis
- **URL**: `/yearly/emergency-fund`
- **Method**: `GET`
- **Summary**: Get emergency fund targets based on core expenses.
- **Query Params**: `year` (default: current)
- **Response**: [EmergencyFundResponse](schemas.md#emergencyfundresponse)
