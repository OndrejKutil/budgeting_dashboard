# Frontend Page Structure & Theme

This document outlines the recommended frontend pages and navigation based on the available backend APIs, plus a high-level theme description for implementation.

---

## High-Level UX Flow

- Public **Landing page** (`/`)
	- Marketing copy, value proposition, feature highlights (analytics, budgeting, savings funds).
	- Primary call-to-action: **“Log in / Sign up”**.
	- Optional secondary CTA: link to docs or demo.
- **Auth flow** (`/auth/login`, `/auth/register`)
	- Uses `/auth/login` and `/auth/register` endpoints.
	- On successful login/registration, redirect to **Dashboard / Monthly Overview**.
- Authenticated **App Shell** (`/app` or `/dashboard`)
	- Persistent layout: sidebar navigation + top bar (profile, theme toggle, date filters).
	- Main content switches between pages listed below.

Default post-login page: **Monthly Overview Dashboard** combining current month KPIs + quick summary.

---

## Page List

### 1. Landing Page (`/`)

Purpose:
- Public entry point with basic product explanation and a clear path to authentication.

Content ideas:
- Hero section with headline and short description.
- 2–3 feature highlights:
	- "Automatic transaction aggregation and categorisation"
	- "Monthly and yearly analytics"
	- "Savings funds and emergency fund tracking"
- Screenshots or illustrations of the dashboard.
- **Buttons**:
	- `Log in` → `/auth/login`
	- `Sign up` → `/auth/register`

No API calls required here.

---

### 2. Auth Pages (`/auth/login`, `/auth/register`)

**Login** (`/auth/login`):
- Form fields: `email`, `password`.
- Calls `POST /auth/login`.
- On success: store `access_token`, `refresh_token`, `user_id`; redirect to `/dashboard`.

**Register** (`/auth/register`):
- Form fields: `email`, `password`, optional `full_name`.
- Calls `POST /auth/register`.
- On success: treat same as login (tokens + redirect to `/dashboard`).

Both pages should share the same layout and error handling.

Planned extension:
- Add OAuth-based login (e.g. Google/GitHub/Supabase providers) alongside email/password, reusing the same auth layout and redirecting to `/dashboard` after successful OAuth sign-in.

---

### 3. Dashboard Shell (`/dashboard`)

Acts as the main application container with:
- Global filters (e.g., month/year selector, date range for summary).
- Navigation to sub-pages:
	- `Overview` (default)
	- `Transactions`
	- `Accounts`
	- `Categories`
	- `Savings Funds`
	- `Analytics` (Monthly / Yearly / Emergency Fund)
	- `Profile`

Technical notes:
- All child pages require:
	- `X-API-KEY` header.
	- `Authorization: Bearer <access_token>` header.
	- Token refresh via `POST /refresh/` when needed.

---

### 4. Overview / Monthly Dashboard (`/dashboard` or `/dashboard/overview`)

**Recommended as default post-login page.**

Purpose:
- Give a single-glance picture of the current month plus a short-term summary.

APIs used:
- `GET /monthly/analytics` (current year + month).
- `GET /summary` (optional date range for the same month).

Core sections:
- **Top KPIs**:
	- Income, Expenses, Savings, Investments.
	- Profit and Net Cash Flow.
- **Charts / Visuals**:
	- Daily spending heatmap (`daily_spending_heatmap`).
	- Category breakdown chart (`category_breakdown`).
	- Spending type breakdown (`spending_type_breakdown`).
- **Snapshot widgets**:
	- Short summary from `/summary` for the same date range.
	- Quick links to detailed pages (e.g. "View all transactions", "Go to yearly analytics").

---

### 5. Transactions Page (`/dashboard/transactions`)

Purpose:
- CRUD interface for all transactions with filtering and pagination.

APIs used:
- `GET /transactions/` with filters: `start_date`, `end_date`, `category_id`, `account_id`, `limit`, `offset`.
- `POST /transactions/` to create.
- `PUT /transactions/{transaction_id}` to update.
- `DELETE /transactions/{transaction_id}` to delete.

Features:
- Table listing with infinite scroll or paginated list.
- Filters (date range, category, account, search text).
- Inline edit / drawer for editing a transaction.
- Quick links to open related account / category.

---

### 6. Accounts Page (`/dashboard/accounts`)

Purpose:
- Manage user accounts (checking, savings, credit cards, etc.).

APIs used:
- `GET /accounts/` (optionally filter by `account_id`, `account_name`).
- `POST /accounts/` to create.
- `PUT /accounts/{account_id}` to update.
- `DELETE /accounts/{account_id}` to delete.

Features:
- List of accounts with balances (balance can be computed on frontend using transactions if needed).
- Form/dialog for creating/editing accounts.
- Tagging of account type, currency.

---

### 7. Categories Page (`/dashboard/categories`)

Purpose:
- View (and possibly manage) spending categories.

APIs used:
- `GET /categories/` with `category_id` or `category_name` filters.

Features:
- Category list grouped by `type` (expense, income, saving, investment, etc.).
- Show `spending_type` (Core / Necessary / Fun / Future / Income).
- Highlight inactive categories.
- (If you later add backend support) allow creating/updating categories.

---

### 8. Savings Funds Page (`/dashboard/funds`)

Purpose:
- Manage named savings goals (funds) and link them to transactions.

APIs used:
- `GET /funds/` (filters: `fund_id`, `fund_name`).
- `POST /funds/` to create.
- `PUT /funds/{fund_id}` to update.
- `DELETE /funds/{fund_id}` to delete.

Features:
- List of funds with target amount and (optionally) current progress.
- Create/edit dialogs.
- Link from transaction details when a transaction is associated with a fund.

---

### 9. Analytics Pages

#### 9.1 Monthly Analytics (`/dashboard/analytics/monthly`)

Deep-dive view of one selected month.

APIs used:
- `GET /monthly/analytics` with query params `year`, `month`.

Features:
- Larger, more detailed versions of charts from the Overview page.
- Ability to compare two months side by side (optional, front-end only).
- Export/print options.

#### 9.2 Yearly Analytics (`/dashboard/analytics/yearly`)

APIs used:
- `GET /yearly/analytics` with optional `year`.

Features:
- Yearly KPI summary: income, expenses, savings, investments, profit, cash flow.
- Monthly trend charts using `monthly_*` arrays.
- Category breakdowns (by income, expense, core categories).

#### 9.3 Emergency Fund Analysis (`/dashboard/analytics/emergency-fund`)

APIs used:
- `GET /yearly/emergency-fund` with optional `year`.

Features:
- Display recommended 3-month and 6-month fund targets.
- Show `core_category_breakdown` as chart.
- Indicate how current savings funds compare to targets (if computed on frontend).

---

### 10. Profile & Settings Page (`/dashboard/profile`)

Purpose:
- Show user identity and basic settings.

APIs used:
- `GET /profile/me`.

Features:
- Display email, last sign-in, metadata (e.g., `full_name`).
- Account-related actions (e.g., link to Supabase auth management or password change flow, if implemented separately).
- Theme toggle (light / dark, within the blurple palette).

---

## Theme: Blurple Dark

Target: a modern, high-contrast **dark theme** with a blurple primary accent.

### Core Palette

- **Background**
	- App background: `#050816`–`#0B1020` gradient or flat.
	- Surface / card: `#111827` / `#151A2D`.
- **Primary (Blurple)**
	- Primary accent: `#6366F1` (indigo-500) or `#5865F2` (Discord-style blurple).
	- Primary hover: slightly lighter, e.g. `#818CF8`.
	- Primary muted (for subtle accents): `#4F46E5`.
- **Neutrals / Text**
	- Primary text: `#F9FAFB`.
	- Secondary text: `#9CA3AF`.
	- Disabled / subtle: `#4B5563`.
- **Status Colors** (optional)
	- Success: `#22C55E`.
	- Warning: `#F59E0B`.
	- Error: `#EF4444`.

### UI Patterns

- **Navigation**
	- Sidebar with dark background and blurple highlight for the active item.
	- Top bar with slight translucency (e.g., background `rgba(15, 23, 42, 0.9)` and blur effect).
- **Cards & Panels**
	- Rounded corners, subtle inner shadows.
	- Dividers with low opacity (`rgba(148, 163, 184, 0.15)`).
- **Charts**
	- Use blurple as primary series, teal/emerald as secondary, amber/red for expenses.
	- Grid lines very subtle, text labels in `#E5E7EB`.
- **Inputs & Buttons**
	- Primary button: blurple background, white text.
	- Ghost/secondary actions: transparent background with blurple border.
	- Inputs: dark surface with blurple focus ring.

### Theming Implementation Notes

- Define a token set (CSS variables / Tailwind config) so the blurple dark theme can be toggled globally.
- Keep enough contrast for accessibility (aim for WCAG AA where possible).
- Ensure charts and tables follow the same palette for a cohesive look.

