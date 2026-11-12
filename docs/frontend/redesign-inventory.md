# Redesign inventory

This is a page-by-page list of what the React frontend (`src/frontend/src`) actually shows and does today, read from the source and the en-US strings in `lib/i18n.ts`, so that the redesign does not drop a feature by accident. The "In mockup?" column is based on section 4 of `redesign-spec.md`; the Decision column is to be filled in by the owner.

Legend for "In mockup?": `yes`, `changed` (present in a different form), `no` (not drawn), `n/a` (page not drawn at all). "Suggested" is a default, not a decision.

---

## Overview - `/dashboard`

Current-calendar-month summary (`pages/dashboard/DashboardOverview.tsx`): headline cash figures, four KPI tiles, largest transactions and top categories.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | Title "Monthly Overview", description "Financial summary for {month}", buttons "Transactions" (outline) and "Full Analytics" (primary) | changed - headline becomes "Left this month" | restyle | |
| Net Cash Flow hero | Big figure from `data.net_cash_flow`, red if negative, arrow + % vs previous month, sentence "Positive cash flow. You are building alignment." / "Negative cash flow. Outflows exceed inflows." | changed - replaced by "Left this month" (income - spending - saving) | restyle | |
| Net Profit hero | Big figure from `data.profit`, red if negative, arrow + % vs previous month, sentence "You're net positive this month." / "Expenses exceeding income." | no (listed as undecided) | keep | |
| KPI tile: Total Income | Value, delta % "vs. {prev month}", YTD sparkline (area, months 1..current from yearly analytics) | changed - income appears in the sentence and split bar, no tile | restyle | |
| KPI tile: Total Expenses | Same as above; delta colour inverted (decrease = good) | changed - spent segment of split bar | restyle | |
| KPI tile: Savings | Value, savings-rate chip "x.x% Rate", delta, sparkline | changed - saved segment of split bar, rate not shown | restyle | |
| KPI tile: Investments | Value, investment-rate chip "x.x% Rate", delta, sparkline | no - mock splits only spent / saved / left | keep | |
| Comparison basis | All deltas are vs the previous calendar month (`prevMonthName`) | changed - mock compares to six-month average | restyle | |
| Largest Transactions | Card "Largest Transactions / Where the money went": ranked list (1..n), notes (or "Uncategorized"), short date, absolute amount; "View All" link to Transactions; empty text "No transactions found" | changed - mock shows "Latest transactions" instead (also listed as undecided) | keep | |
| Spotlight (biggest mover) | Only shown if `data.biggest_mover` exists: category name, total spend, "Share of Wallet" % with progress bar | no (listed as undecided) | merge into Category Top 3 | |
| Category Top 3 | First 3 of `data.top_expenses`: dot (red for #1), name, amount | changed - mock has "Where it went" category rows with a line under each | restyle | |
| Fixed to current month | No period navigator on this page; always `new Date()` month | changed - mock has a month switcher in the top bar | restyle | |
| Loading state | `DashboardSkeleton` | n/a | keep | |
| Error state | Red message + "Retry" button (does `window.location.reload()`) | n/a | keep | |
| Privacy masking | Every figure and % wrapped in `SensitiveValue` | n/a | keep | |
| Prefetch | On mount prefetches monthly and yearly analytics queries so the analytics pages open warm | n/a | keep | |

Notes:
- Mockup items with no counterpart today: "Latest transactions", the income split bar (spent / saved / left), "Spending through the month" line with six-month average, "You earned X, spent Y and put Z aside." The daily series exists only on the Monthly analytics API.
- "Left this month" must be defined against the API: today `net_cash_flow` is described on How it works as Clean Income - True Expenses - Investments - Net Savings, whereas the spec says income - spending - saving. Whether investments are subtracted is unclear.

## Transactions - `/dashboard/transactions`

Filterable, paginated ledger with add / edit / duplicate dialog, transfers, fund withdrawals and tag management (`pages/dashboard/TransactionsPage.tsx`).

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Transactions", "View and manage all your financial transactions"; "Add Transaction" button (hidden on mobile, replaced by FAB) | changed - heading with count; adds "Import screenshot" action | restyle | |
| Mobile FAB | Fixed round "+" button bottom right (`sm:hidden`) | changed - Add moves to the centre of the bottom dock | merge into bottom dock Add | |
| Search | Text box "Search by notes...", 500 ms debounce, URL param `q` | yes | keep | |
| Date preset chips | "This Month", "Last Month", "Last 3 Months", "This Year"; swipeable row on phone | changed - mock has month/date control | restyle | |
| Year select | Select of years with data plus one future year; disabled while months are picked | changed - behind the filter button | keep | |
| Month multi-select | Months grouped under year headers, "All Months"; can span years (Nov+Dec+Jan) | yes (month/date visible) | keep | |
| Type multi-select | Income / Expense / Saving / Investment, "All Types" | yes | keep | |
| Account multi-select | Sectioned like the account picker, includes inactive accounts, shows balance hint, "All Accounts" | yes | keep | |
| Tags multi-select | Sorted tag list, "All Tags" | yes | keep | |
| Category multi-select | Grouped by category type (Expense, Income, Saving, Investment, Exclude, Transfer), "All Categories" | yes - behind filter button | keep | |
| Fund multi-select | "Not Assigned" plus funds, "All Funds" (`none` means IS NULL) | yes - behind filter button | keep | |
| Min / Max amount | Two text inputs, decimal with comma or dot, 500 ms debounce | yes - behind filter button | keep | |
| Filters toggle (phone) | "Filters" button with active-filter count badge; on desktop all nine controls are always visible | changed - filter button on all sizes | restyle | |
| Reset Filters | Button shown when any filter active; clears URL and sessionStorage state | no | keep | |
| Filter persistence | All filters and page live in URL params and are restored from sessionStorage on return | no | keep | |
| Filtered summary bar | When any filter active: "{count} transactions - total {amount}", converted to the user's base currency by the backend; English text is hard-coded, not in i18n | yes (listed as keep) | restyle | |
| Table columns | Date, Notes (tag badges under notes), Category (dot coloured by type), Account, Fund (lg screens only), Amount | changed - Fund column not drawn | keep fund column or merge into notes line | |
| Row amount | Signed, formatted in the account's own currency (`formatMoney`), not the base currency; masked by `SensitiveValue` | no | keep | |
| Type side line | 2 px stripe at row end coloured by category type (income green, saving, investment, else red) | yes (open question 9) | keep | |
| Row actions | "..." menu: Edit, Duplicate, Delete; visible on hover on desktop, always on touch | yes | keep | |
| Delete confirmation | Alert dialog "Delete this transaction?" showing notes, date, category, account | no | keep | |
| Mobile card view | Below `md` each row is a bordered card with category pill, account, tags, actions | no | restyle | |
| Pagination | 20 per page; "Showing x-y transactions", "Newest", "Previous", "Next"; no total count (next enabled when page is full) | yes | keep | |
| Loading / empty / error | Skeleton rows; EmptyState "No transactions found" with Add action; error card "Failed to load transactions" with no retry button | no | keep; add retry | |
| Dialog: mode switch | Radio group Transaction / Transfer / From fund, help text under it; Transfer disabled when editing an existing row | yes | keep | |
| Dialog: amount | Text input with separate +/- sign toggle button, decimal comma or dot | yes | keep | |
| Dialog: notes, date | Notes with placeholder "e.g., Grocery Store"; date popover calendar, max one year ahead | yes | keep | |
| Dialog: category | Select grouped by type, active categories only; hidden in Transfer and From fund modes (fixed automatically) | yes | keep | |
| Dialog: account | `AccountSelect` with balances; labelled "From Account" in transfer mode | yes | keep | |
| Dialog: transfer fields | "To Account"; cross-currency adds "Received Amount (CUR)" field with bank-statement hint and a two-way "Implied rate" line (1 EUR = x CZK and 1 CZK = y EUR) | yes (cross-currency fields) | keep | |
| Dialog: fund | Select with "None"; "Savings Fund (Optional)" with hint, required in From fund mode | yes | keep | |
| Dialog: tags | Tag multi-select with create-on-type, plus "Manage tags" link | yes | keep | |
| Dialog: errors | Inline field errors, in-dialog error alert for save failures (not a toast), Enter submits | yes | keep | |
| Duplicate | Prefills the create form from a row; title "Duplicate Transaction" | yes ("copy" kept) | keep | |
| Manage Tags dialog | List with inline rename (Save/Cancel) and delete with confirm ("removes the tag from all transactions") | yes ("tag management") | keep | |
| Toasts | Created, updated, deleted, transfer completed, partial transfer failure warning, rename/delete tag failures | n/a | keep | |

Notes:
- A transfer is saved as two ordinary transactions in the category named `Exclude`, with notes "Transfer to {account}: ..." / "Transfer from {account}: ...". If the second leg fails the message says the outgoing side was posted. Editing one leg does not touch the other.
- "From fund" requires a category named `Savings Funds Withdrawal` (looked up by name) and is recorded as income. Both lookups by name are business rules the redesign must not rename away.
- Keyboard: Enter submits. The spec's `N` shortcut and arrow keys on the mode switch do not exist yet. There is no "Import screenshot" button on this page today (it is only in the Tools menu and is feature-flagged).
- Dates can be set up to one year ahead and the year filter offers one future year.

## Accounts - `/dashboard/accounts`

Account cards with balance, 30-day trend and month flow, multi-currency groups, and a net-worth timeline (`pages/dashboard/AccountsPage.tsx`).

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Accounts", "Manage your bank accounts and balances", "Add Account" button | yes | restyle | |
| Account card | Type icon (checking, savings, credit, investment, cash), name, "Current Balance" in the account's own currency, "Last 30 days" area chart, "This Month" net flow (green/red, signed) | changed - balance is the main figure with month change beside it and a 30-day trace | restyle | |
| Per-account 30-day chart | 60 px area chart, "No history" text when empty | no (listed as undecided) | restyle | |
| Group card | One card per group (Layers icon): name, currency codes joined by " - ", "Total Balance" in base currency, one row per member with flag, currency, own-currency balance, micro sparkline (green/red by month flow), row menu, "This Month" combined flow | changed - group is a heading with total, accounts indented below | restyle | |
| Groups section | Labelled "Groups"; groups with no active members are hidden | changed | keep | |
| Foreign Currencies section | When ungrouped accounts exist in a non-base currency: base-currency accounts under a currency heading, others under "Foreign Currencies" | no (listed as undecided) | keep | |
| Ungrouped accounts | Mock calls them "Other accounts" with own total; today no per-section total | changed | restyle | |
| Inactive Accounts | Collapsed accordion "Inactive Accounts (n)"; cards dimmed with "Inactive" pill, menu offers "Activate" | no (listed as undecided) | keep | |
| Account menu | Edit, Activate (inactive only), Delete; disabled while an optimistic row is pending | n/a | keep | |
| Add / Edit dialog | Account Name, Account Type (Cash, Checking, Credit, Investment, Savings), Currency (AUD, CAD, CZK, EUR, GBP, PLN, USD), Group select ("No group", existing groups, "+ New group..." with name input, help tooltip) | n/a | keep | |
| Delete account dialog | "Delete Account"; text says accounts with transactions are deactivated instead of deleted | n/a | keep | |
| Group management | Group menu: "Rename group" dialog, "Delete group" confirm (accounts become ungrouped) | n/a | keep | |
| Net Worth card | Area chart of net worth, big current figure, range buttons 30d / 90d / 1y / All (default 1y), tooltip, empty text "No transaction data to show net worth." | changed - small figure and trace in the page header | restyle | |
| "invested" chip | Pill "+ {amount} invested" next to net worth (green; grey with "(stale)" when data is old); headline stays liquid-only by design | no (listed as undecided) | keep | |
| Optimistic updates | Create, edit, delete write to cache immediately and close the dialog; rollback on error | n/a | keep | |
| Loading / empty / error | `AccountSkeleton` x3; EmptyState "No active accounts" with "Add Your First Account"; error card "Failed to load accounts" (no retry) | n/a | keep; add retry | |
| Privacy masking | All balances, flows and net worth masked | n/a | keep | |

Notes:
- Balances are shown in each account's own currency; only group totals, group flow and net worth use the user's base currency. A single foreign account card shows no base-currency equivalent.
- Group help text states grouping changes presentation only: balances, transactions and analytics remain per account.
- The Trading212 integration feeds the "invested" chip, so the chip depends on that feature flag.

## Savings funds - `/dashboard/funds`

Savings goals with target, progress and recent flow (`pages/dashboard/FundsPage.tsx`).

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Savings Funds", "Track your savings goals and progress", sort select + "Create Fund" | yes | restyle | |
| Sort select | Date Created, Name (A-Z), Progress, Target Amount, Recent Activity; remembered in localStorage (`funds-sort`) | no (listed as undecided) | keep | |
| Summary card | "Total Saved" big figure, "of {total target} active target", progress bar and "x% complete" (active funds only) | changed - headline is total saved | restyle | |
| Fund card | Target icon (green when complete), name, saved amount "of {target}", thin progress bar | changed - saved amount is main figure, progress as supporting text and faint line | restyle | |
| Month flow line | Under the name: "+x this month" green or "-x this month" red (30-day net flow, label says month) | changed - 30-day flow with side line colour | restyle | |
| Goal reached | Green pill "Goal Reached", green progress bar when saved >= target | no | keep | |
| Projection line | "~{Mon YYYY} at current pace" when flow is positive, "Net outflow - consider adding contributions" when negative | no | keep | |
| Inactive Funds | Collapsed accordion "Inactive Funds (n)"; "Inactive" pill; menu "Activate" | no (listed as undecided) | keep | |
| Fund menu | Edit, Activate (inactive only), Delete | n/a | keep | |
| Create / Edit dialog | Fund Name, Target Amount (required, must be > 0, parsed as integer) | changed - mock shows "No target" funds | restyle; decide target | |
| Delete dialog | Text says funds with transactions are deactivated instead of deleted | n/a | keep | |
| Optimistic updates | Create, edit, delete optimistic with rollback | n/a | keep | |
| Loading / empty / error | Skeleton summary and 4 skeleton cards; EmptyState "No active funds yet" + "Create Your First Fund"; error card with "Retry" | n/a | keep | |

Notes:
- The mockup assumes funds can have no target; today the dialog requires a positive target, and the summary and progress maths divide by it. Allowing "No target" needs a form and API decision.
- Fund names matter: the Emergency Fund page counts funds whose name contains "Emergency Fund".
- The 30-day flow drives the card colour in the mockup but the projection line today; keep both if projection is wanted.

## Categories - `/dashboard/categories`

Category management grouped by type (`pages/dashboard/CategoriesPage.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Categories", "View and manage spending categories", "Add Category" | n/a | restyle | |
| Info banner | Blue banner explaining types, spending types and that used categories are deactivated, not deleted | n/a | keep | |
| Type groups | Collapsible sections in order Income, Expense, Saving, Investment, Exclude, each with count; all collapsed by default | n/a | restyle | |
| Category card | Icon (picked by category name, default credit-card), name, spending-type pill (Core, Necessary, Fun, Future, Income, colour coded), "Inactive" pill, dimmed when inactive | n/a | restyle | |
| Card menu | Edit, Activate (inactive only), Delete; disabled for optimistic rows | n/a | keep | |
| Add / Edit dialog | Name, Type (Exclude, Expense, Income, Investment, Saving), Spending Type (Core, Fun, Future, Income, Necessary); no active toggle (activation via menu) | n/a | keep | |
| Delete dialog | Text: deactivated instead of deleted when it has transactions | n/a | keep | |
| Optimistic updates | Create, edit, delete optimistic with rollback | n/a | keep | |
| Loading / error | Skeleton groups; error card with "Retry" | n/a | keep | |

Notes:
- Categories with a type outside the five rendered ones (for example `transfer`, which other pages list) would not appear here. Whether such rows exist is unclear.
- Several rules are keyed by category name: `Exclude` (transfers) and `Savings Funds Withdrawal` (fund withdrawals). The redesign must not let users rename them without handling this.
- The spending type feeds the Core / Fun / Future analytics and the emergency fund scenarios.

## Recurring - `/dashboard/recurring`

Templates for recurring transactions that the user posts manually (`pages/dashboard/RecurringPage.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Recurring", "Templates for recurring transactions and subscriptions", "Add Template" | n/a | restyle | |
| Summary cards | Three cards: "Monthly recurring", "Annual total" (base currency), "Active templates" (count of all templates) | n/a | restyle | |
| Due Now list | Heading with count; cards for templates whose next date is today or past; "Nothing due" when empty | n/a | keep | |
| Upcoming list | Cards for future templates | n/a | keep | |
| Template card | Notes (or category name), cadence pill, account name, relative date (Today, "Overdue (3d)", "in 5 days"), amount in the account's currency (green if positive) | n/a | restyle | |
| Post button | Full-width "Post" on due cards (shows "Posting..."); creates the transaction and advances the next date | n/a | keep | |
| Card menu | Edit, Delete | n/a | keep | |
| Add / Edit dialog | Amount with +/- toggle, Account, Category (active only), Cadence (Weekly, Biweekly, Monthly, Quarterly, Yearly), Next Date calendar, Savings Fund (optional), Notes | n/a | keep | |
| Delete dialog | Confirm text only | n/a | keep | |
| Optimistic updates | Template list is optimistic; transactions, accounts, summary and net worth are invalidated, not optimistic | n/a | keep | |
| Loading / empty | Skeleton cards; EmptyState "No templates yet" + "Create Your First Template". No error state is rendered | n/a | keep; add error state | |

Notes:
- Nothing posts automatically: the user presses "Post" on a due template. A redesign must keep that action prominent, and should not imply automation.
- The form carries an `is_active` field but there is no control for it, so "Active templates" counts every template.

## Budget Maker - `/dashboard/budget-maker`

Monthly plan editor with autosave and actual-vs-plan tracking (`pages/dashboard/BudgetMaker.tsx`, `components/budget/*`).

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Budget Maker", "Plan your monthly income, expenses, and savings goals."; right side holds save status, "Copy to..." and delete icon | yes | restyle | |
| Period navigator | `PeriodNavigator` month mode, period in URL `?month&year`; years go one past the newest | n/a (top bar month switcher) | keep | |
| Autosave status | "Unsaved changes", "Saving...", "All changes saved", "Name and a valid amount needed to save", "Couldn't save" + Retry; `role=status` | yes | keep | |
| Autosave behaviour | Debounced; saves serialized; flushed on month change, unmount and tab hidden; an invalid row blocks the whole save; blank untouched rows skipped | n/a | keep | |
| Copy to... | Dialog: target month and year selects, text warns it overwrites the target; toast "Budget copied to {month} {year}" with "Open" action | yes | keep | |
| Delete budget | Trash icon, alert dialog "Are you absolutely sure?" naming month and year; only shown when rows exist | no | keep | |
| Empty month banner | Dashed banner "No budget for {month} {year} yet" with "Copy from {prev month} {year}" when the previous month has rows | no | keep | |
| Sections | Income, Expenses, Savings, Investments; collapsible, all open by default; header shows planned total, % of income (not on Income) and "Actual" total | yes (Investments kept) | keep | |
| Section total colouring | "Actual" turns red when actual exceeds plan (Expenses only) | changed - section headings carry totals | restyle | |
| Add Row | Per-section "Add Row" button (label hidden on phone) and clickable empty-section text "No items in this section." | yes | keep | |
| Row: drag handle | dnd-kit vertical reorder, pointer and keyboard sensors, "Drag to reorder" | yes | keep | |
| Row: name | Borderless text input "Item name" | yes | keep | |
| Row: "Linked to" | Popover with search over categories and tags (chips, removable); empty shows "Link categories or tags" | yes | keep | |
| Row: Planned | Right-aligned amount input; shows formatted currency when idle, raw text when focused; accepts "1 234,50"; blurred in privacy mode | yes ("plan") | keep | |
| Row: Actual | Amount from linked categories/tags with a thin progress bar (red > 100%, amber > 90% for expenses, green when reached for others); "-" with tooltip "Link categories or tags to track actual amounts" | yes (secondary) | keep | |
| Row: Diff | Percentage (not an amount), "+x%" / "-x%", green or red depending on section | yes | keep | |
| Row: over plan | Expense row tinted red when actual > plan | changed - marked row, possibly the word "over" | restyle | |
| Row: "Total" toggle | Checkbox (column "Total", tooltip "Include in total") excluding the row from section and overall totals | yes | keep | |
| Row: remove | Trash icon; non-empty rows show toast "Removed {name}" with Undo | no (Undo) | keep | |
| Remaining Planned Budget | Fixed floating card bottom right: amount and % of income, red if negative | changed - one quiet line above the table (planned in, allocated, left) | restyle | |
| Mobile layout | Row becomes a card: handle + name + remove, linked chips, Planned input, Actual / Diff, "Include in total" checkbox | no | keep | |
| Loading / error | `BudgetMakerSkeleton`; error card "Couldn't load this budget." with Retry | n/a | keep | |

Notes:
- Actuals come from the server and are patched onto local rows after each save without overwriting text the user is typing.
- Income has no "% of income" figure; the Remaining line is total income minus expenses, savings and investments (included rows only).
- Copying creates the target budget if it does not exist, otherwise overwrites it.

## Monthly analytics - `/dashboard/analytics/monthly`

One month in detail, with PDF export (`pages/dashboard/analytics/MonthlyAnalyticsPage.tsx`).

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Monthly Analytics", "Detailed breakdown of your monthly finances for {month} {year}"; period navigator (URL-driven month/year) and "Export PDF" | yes | restyle | |
| Figure: Income | Value, delta "vs. {prev month}", second line vs same month last year | changed | restyle | |
| Figure: Expenses | Same; delta colour inverted | changed | restyle | |
| Figure: Savings | Value, savings rate chip, delta, YoY line | changed - mock shows savings rate as its own figure | restyle | |
| Figure: Investments | Value, investment rate chip, delta, YoY line | no (mock has four figures: income, expenses, savings rate, left) | keep | |
| Figure: Profit | Value, delta, YoY line | no | keep | |
| Figure: Cash Flow | Value, delta, YoY line | changed - closest to "left" | keep | |
| Same-month-last-year comparison | Small "vs. {year-1}" line under every figure, only when `yoy_comparison` is present | no (listed as undecided, open question 2) | keep | |
| Comparison basis | Delta vs previous month | changed - mock uses six-month average | restyle | |
| Daily Spending | Area chart (expense colour), x = day of month, tooltip with weekday date and amount; no average line | changed - bar strip with dashed average line | restyle | |
| Income Sources | Donut with legend (amount and %), centre total; top slices plus "Other"; empty text "No income data recorded" | changed - mock uses rows | restyle | |
| Spending Type Breakdown | Donut (Core, Necessary, Fun, Future, fixed colours) with legend; empty text | changed | restyle | |
| Expense Categories | Full-width ranked table: #, category with colour dot, share bar + %, amount; footer total | changed - mock uses category rows (undecided whether the full table stays) | keep | |
| Export PDF | Calls `window.print()`; a print-only "Monthly Statement" (`StatementDocument`) shows summary plus four tables | yes | keep | |
| Print statement contents | Summary (income, expenses, savings, investments, profit, cash flow) and tables Income / Expenses / Savings / Investments by category | no | keep | |
| Loading / empty | `AnalyticsSkeleton`; "No data available for this month." with no retry | n/a | keep | |
| Lazy sections | Donut pair and the expense table render through `DeferredRender` with placeholders | n/a | keep | |
| Privacy masking | `SensitiveValue` plus `privacy-chart-values` class on charts | n/a | keep | |

Notes:
- Savings-by-category and investments-by-category tables exist only in the print statement, not on screen. A redesign that drops the print layout loses them.
- The donut legends carry the exact figures; the daily chart shows amounts only in its tooltip.

## Yearly analytics - `/dashboard/analytics/yearly`

Year-level KPIs, trends, composition and a spending heatmap, with PDF export (`pages/dashboard/analytics/YearlyAnalyticsPage.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Yearly Analytics", "Detailed financial analysis for {year}"; "Export PDF" and year `PeriodNavigator` (URL `year`) | n/a | restyle | |
| KPI header | Six figures: Income, Expenses, Savings (+ rate), Investments (+ rate), Profit, Cash Flow | n/a | restyle | |
| Trend labels | Under income, expenses, savings rate: Growing / Declining / Stable (expenses use Creeping), from `trend_directions` | n/a | keep | |
| Yearly Records | Best Cashflow month, Highest Spend month, Top Savings Rate month with values | n/a | keep | |
| Income vs Costs | Line chart, income and expenses by month; "Monthly cash flow gap"; click a point drills down to Monthly analytics for that month | n/a | keep | |
| Wealth Generation | Grouped bars savings + investments by month; click a bar drills down | n/a | keep | |
| Profit & Cash Flow | Two small signed-bar panels (`SignedBarFacet`); click a bar drills down | n/a | keep | |
| Monthly Breakdown | Table: Month, Income, Expenses, Savings, Investments, Profit, Cash Flow, with Total row; row click drills down | n/a | keep | |
| Spending Balance | Core / Fun / Future shares (%), stacked bar, caption "Target: 50% Core / 30% Fun / 20% Future" | n/a | keep | |
| Spending Type History | 100% stacked bars of Core, Fun, Future per month | n/a | keep | |
| Expense Distribution | Horizontal bars per expense category, height scales with count, deliberately not a donut | n/a | keep | |
| Full-Year Spending Heatmap | Calendar-style grid of daily expense totals, darker = higher, tooltip, Less / More legend; empty text "No spending data available for this year" | n/a | keep | |
| Export PDF | `window.print()` with "Yearly Statement" (summary + four category tables) | n/a | keep | |
| Loading / error | `AnalyticsSkeleton`; error with "Retry" (page reload) | n/a | keep | |
| Lazy sections | Charts below the fold use `DeferredRender` | n/a | keep | |

Notes:
- The 50/30/20 target is hard-coded text and is not user-configurable.
- Drill-down links pass `?year=&month=` to Monthly analytics; the redesign must keep that deep link.
- The heatmap is the one place with a full-year daily view; the spec lists it as to be drawn.

## Cash Flow - `/dashboard/analytics/cashflow`

Sankey diagram of income into expenses, savings and investments (`pages/dashboard/analytics/CashFlowPage.tsx`, `components/analytics/SankeyChart.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Cash Flow", "Where your money comes from and goes - Sankey diagram for {period}" | n/a | restyle | |
| Mode select | "Yearly" / "Monthly" (URL `mode`, default year) | n/a | keep | |
| Period navigator | Year mode or month mode, URL-driven | n/a | keep | |
| Export PNG | Renders the SVG to a PNG file `cashflow-{period}.png`; disabled with no data | n/a | keep | |
| Sankey diagram | Income categories -> Income pool -> Expenses / Savings / Investments (+ Surplus) -> leaf categories; 560 px high | n/a | restyle | |
| Interactions | Hover highlights node and downstream links; click pins a node; collapse/expand triangles on groups; hover tooltip with amount | n/a | keep | |
| Empty / loading / error | "No cash flow data available for this period"; skeleton; error with "Retry" | n/a | keep | |

Notes:
- A "Surplus" sink node is added to the diagram under a condition (`showSurplus`) in `SankeyChart.tsx`; the exact rule was not checked.
- Node tooltips are mouse-hover (`onMouseMove`); on touch only the click-to-pin interaction applies.

## Emergency Fund - `/dashboard/analytics/emergency-fund`

Progress of the emergency fund against three expense scenarios (`pages/dashboard/analytics/EmergencyFundPage.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | "Emergency Fund Analysis", description, info chip "Tracking savings funds containing "Emergency Fund" in their name." | n/a | keep | |
| Scenario tabs | Core Only / Core + Necessary / All Expenses (local state, not in URL) | n/a | keep | |
| Year navigator | `PeriodNavigator` year mode (URL `year`) | n/a | keep | |
| Scenario header | Title and description of the scenario, "Monthly Burn" (average) and "Annual Total" | n/a | keep | |
| 3-Month Resilience | Current savings / 3x burn, % and progress bar, shield icon, "{amount} to reach buffer" | n/a | keep | |
| 6-Month Resilience | Same against 6x burn | n/a | keep | |
| Core Monthly Expenses Breakdown | Horizontal bars per core category; shown on the Core tab only | n/a | keep | |
| Loading / error | `AnalyticsSkeleton`; error with "Retry" | n/a | keep | |

Notes:
- The "current savings" figure comes from funds matched by name; renaming or splitting the fund changes the result.
- The scenarios depend on category spending types (Core, Necessary).

## Screenshot Import - `/dashboard/import/screenshot`

Feature-flagged tool that turns a screenshot into draft transactions to review and import (`pages/dashboard/ScreenshotImportPage.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Feature gate | Flag `screenshot_import`; when off: EmptyState "Not enabled for this account" | n/a | keep | |
| Page header | "Screenshot Import", description; inference model name shown under it after extraction | n/a | keep | |
| Dropzone | Drag and drop, "Choose image" / "Replace image", paste with Ctrl+V anywhere on the page, preview with remove button; rejects non-images and files over 8 MB inline | n/a | keep | |
| Instructions | Optional textarea (max 1000 chars) with example and hint; cleared after use for the next screenshot | n/a | keep | |
| Extract button | "Extract transactions", disabled with no file or while pending | n/a | keep | |
| Extraction errors | Rate-limit message; empty-result reasons (generic, unreadable, not a transaction screenshot, grouped notifications, no transactions visible) | n/a | keep | |
| Review header | "Review drafts" with "{count} transaction(s) found - {n} need your input." | n/a | keep | |
| Apply to all drafts | Bar with Account, Category, Savings Fund, Tags ("Keep as is" defaults), Apply / Cancel | n/a | keep | |
| Draft card | Notes, Amount (+/- toggle), Currency, Date (no future dates), Account, Category, Fund, Tags (with "new" tags created at import), discard button | n/a | keep | |
| Field provenance | Per-field badges: "Needs your input" (red), "Defaulted", "From history" (with tooltip); clears when edited | n/a | keep | |
| Warnings | "Worth a look" list per draft | n/a | keep | |
| Import button | "Import {count} transaction(s)", disabled until every draft has amount, date, account, category; hint to fill highlighted fields; "Cancel" | n/a | keep | |
| Import errors | Tag creation failure aborts the whole import ("Nothing was imported") | n/a | keep | |

Notes:
- The page is only reachable when the flag is on (the Tools menu entry is also flag-gated), but the route itself always exists.
- The spec wants an "Import screenshot" action on the Transactions header; it should respect the same flag.

## Trading212 - `/dashboard/trading212`

Feature-flagged read-only brokerage sync (`pages/dashboard/Trading212Page.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Feature gate | Flag `t212_integration`; when off: EmptyState "Not enabled for this account"; skeleton while the flag loads | n/a | keep | |
| Connect form | "Connect your Trading212 account" with read-only API key guidance, "API key" and "API secret" inputs, "Connect" | n/a | keep | |
| Connection status | "Connected" badge, sync status badge (OK, "Credentials rejected - reconnect", "Last sync failed - will retry"), "Last synced {date time}" or "Not synced yet" | n/a | keep | |
| Sync now | Button with spinner; toasts for success and failure | n/a | keep | |
| Disconnect | Alert dialog with optional checkbox "Also delete recorded portfolio history" | n/a | keep | |
| Portfolio value chart | Line chart with spans 7d, 1m, 3m, YTD, 1y, All (default 3m), latest value, last-synced note, "No value history yet." | n/a | keep | |
| Positions table | Ticker, Qty, Avg price, Price, Value, P/L (green/red), Weight; sortable by Value, P/L, Weight (default Value descending); empty text | n/a | keep | |
| Unknown-currency marker | Prices with unknown quote currency are shown unconverted with a help-cursor marker and tooltip | n/a | keep | |
| Privacy masking | Quantities, values and P/L masked | n/a | keep | |

Notes:
- Syncs run roughly every 30 minutes (comment in code), so the "last synced" time includes time of day.
- The synced value is what the Accounts page shows as the "invested" chip.

## Investing Calculator - `/dashboard/investing-calculator`

Compound-growth projection (`pages/dashboard/InvestingCalculator.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Heading | Own h1 "Compound Growth Calculator" (does not use `PageHeader`) | n/a | restyle | |
| Parameters card | Starting Amount, Contribution, Frequency (Daily, Weekly, Monthly, Quarterly, Yearly), Interest Rate (%), Inflation (%), Time Period (Years) | n/a | keep | |
| Reset to Defaults | Clears URL params and stored values (defaults 10000, 500, monthly, 7 %, 10 years, 0 %) | n/a | keep | |
| URL state | Every input is in the query string so scenarios are shareable | n/a | keep | |
| Future Balance card | Result "After {n} years", with "(adjusting for x% inflation)" suffix when inflation > 0 | n/a | keep | |
| Total Contributed card | "Principal + {n} years of contributions" | n/a | keep | |
| Growth Projection chart | Area chart "Total Invested" vs "Total Balance" by year, compact y-axis ticks | n/a | keep | |

Notes:
- With inflation > 0 the rate used is interest minus inflation (a real return), so the chart is in today's money.
- Y-axis tick format is hard-coded to en-US compact notation and ignores the user's locale and currency.
- Nothing is saved to the account.

## Dividend Calculator - `/dashboard/dividend-calculator`

Saved dividend portfolio with income estimates (`pages/dashboard/DividendCalculator.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Page header | Own heading "Dividend Calculator", "Track your dividend portfolio and estimate income"; "Clear" and "Save" buttons (Save enabled only when changed) | n/a | restyle | |
| Summary cards | Portfolio Value, Weighted Avg Yield, Annual Income, Monthly Income (Annual / 12) | n/a | restyle | |
| Portfolio Settings | "Total Value" input | n/a | keep | |
| Holdings table | Rows: Ticker, Weight %, Yield %, Frequency (Annual, Quarterly, Monthly), per-stock Annual Income, delete; "Add Stock" and "Add Another Stock" buttons; Total footer | n/a | keep | |
| Weight validation | Banner when weights do not sum to 100 ("they must equal 100% before saving") | n/a | keep | |
| Income breakdown | Callout with Daily, Monthly, Quarterly, Annual estimate and note "assumes dividends are evenly distributed" | n/a | keep | |
| Persistence | Loaded from and saved to the server (create or update), "Clear" deletes it; toasts | n/a | keep | |
| Loading / error | Error text "Failed to load dividend portfolio." with Retry | n/a | keep | |

Notes:
- The yield entered is per payment: Monthly multiplies by 12 and Quarterly by 4 to get the annual yield. The labels do not say this.
- Unlike the Investing Calculator, this page persists to the account and has explicit Save.

## Profile & Settings - `/dashboard/profile`

Identity, preferences, connected logins, data export and account deletion (`pages/dashboard/ProfilePage.tsx`). Page not drawn.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Header | "Profile & Settings", "Manage your identity and preferences" | n/a | restyle | |
| Identity block | Avatar (provider image or initials), display name, "Member since {year}", "Sign Out" button | n/a | keep | |
| Account Details | Full Name, Email Address, System ID | n/a | keep | |
| Default Currency | Select (AUD, CAD, CZK, EUR, GBP, PLN, USD); drives all totals | n/a | keep | |
| Language | Select English / Cestina (cs-CZ), saved to the account | n/a | keep | |
| Theme | Two buttons "Use dark theme" / "Use light theme", per device | n/a | keep | |
| Connected Accounts | GitHub and Google rows: status text, "Connect" button or "Connected" label, spinner | n/a | keep | |
| Export Transactions | "Export CSV" downloads transactions, categories, accounts and funds; spinner "Exporting..." | n/a | keep | |
| Import Transactions | Disabled "Coming Soon" button (CSV bulk import) | n/a | remove? decide whether to show a disabled promise | |
| Delete Account | Red section; alert dialog requires password (email/password users) or typed email (OAuth users); "Permanently delete" | n/a | keep | |

Notes:
- The landing footer plan claims export and delete are available from Profile; both exist here.
- Import is not implemented; the FAQ mentions "CSV imports", which does not match.
- Currency and language are account settings (server), theme is per device (local).

## Landing - `/`

Public marketing page (`pages/LandingPage.tsx`). Text is hard-coded English.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Header | Sticky bar: "Budgeting Dashboard" brand; signed out: "Log in", "Create account"; signed in: `UserNav` | n/a (not specified) | restyle | |
| Hero | H1 "One tracker for your finances.", subtitle "Transactions, budgets, savings, and cash flow in one monthly view."; CTAs "Create account" + "Try Demo" (signed in: "Open dashboard") | changed - one sentence, one figure | restyle | |
| Product preview | Animated dark mock "Monthly review / January 2026": cash left (5 800 Kc, count-up), savings rate, budget status, metric bars, animated donut "Spending by category", "Plan snapshot" with emergency runway | changed - one figure instead of the preview | restyle | |
| Review section | "A monthly review without the spreadsheet hunt." + sentence "The landing page does not need to explain every screen..." + three items (Monthly cash flow, Category pressure, Next budget) | changed - spec says remove the leftover sentence | restyle | |
| Manual control section | "Built for manual control.", text, "View details" button to How it works, three steps (Import or enter records, Categorize the month, Plan from the result) | changed - three short explanations | restyle | |
| Closing CTA | "Start with this month." with "Create account" and "or try the demo first"; hidden when signed in | yes (part of upgraded footer) | merge into footer CTA | |
| Footer | Brand blurb, "Built by Ondrej Kutil", columns Product (How it works, FAQs), Project (About, GitHub), Legal (Privacy Policy, Terms of Service) | changed - upgraded footer (CTA, data facts, contact, legal line) | restyle | |
| Backend warm-up | On mount calls `healthApi.check()` and ignores the result | n/a | keep | |

Notes:
- Footer today has no Demo link and no contact; Terms and Privacy use a smaller separate footer; FAQ, How it works and About have no footer.
- There is no language or theme switch on any public page.

## Demo - `/demo`

Self-contained sample-data version of the dashboard (`pages/DemoPage.tsx`, data in `data/demo-data.ts`). It has its own sidebar and topbar, not the real layout.

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Demo shell | Own collapsible sidebar (mobile overlay), topbar with greeting and "Log in" / "Create account" | n/a | restyle with app shell | |
| Navigation | Overview, Transactions, Accounts, Analytics group (opens the demo analytics page); locked items shown disabled: Categories, Savings Funds, Yearly, Emergency Fund; "Sign up to unlock all" | n/a | keep | |
| Overview | "Overview / May 2026 - Sample data", "Demo mode" badge, Net cash flow and Net profit heroes, KPI tiles with sparklines, Largest transactions, Quick stats | n/a | restyle | |
| Analytics | Month switcher (April, May, June), figures, Daily spending, Income sources, Spending type, Expense categories (mirror of Monthly analytics) | n/a | restyle | |
| Transactions | Search, quick presets, type and month filters, reset, paginated table of sample data | n/a | restyle | |
| Accounts | Static account cards from sample data | n/a | restyle | |

Notes:
- The demo duplicates the real Overview, Monthly, Transactions and Accounts markup by hand and uses fixed CZK formatting, so it will not pick up the redesign automatically. Sample data only covers January - June 2026.

## FAQ - `/faq`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Header | Fixed bar with brand and "Back to Home" | n/a | restyle | |
| Title | "FREQUENTLY ASKED QUESTIONS", "Common questions about the Budgeting Dashboard." | n/a | restyle | |
| Accordion | 11 questions (data safety, bank sync, why savings can be negative, savings vs expenses, savings withdrawals vs income, Profit vs Cash Flow, investments, password reset, free, mobile app, help) | n/a | keep | |
| Contact block | "Still have questions?" with contact email | n/a | keep | |

Notes:
- The answers define the money terms (Net Savings, Profit, Cash Flow). Keep the wording consistent with How it works and the app labels.
- The mobile answer recommends adding the site to the iPhone home screen (PWA).

## How it works - `/how-it-works`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Header | Fixed bar with brand and back link | n/a | restyle | |
| Intro | Title and lead text | n/a | restyle | |
| KPI definitions | Five cards: Clean Income, True Expenses, Net Savings, Profit, Cash Flow, each with description and formula | n/a | keep | |
| Worked example | Table with sample amounts (30 000, 18 000, 3 000, 5 000, 2 000 Kc) and results (Net Savings 3 000, Profit 9 000, Cash Flow 6 000) | n/a | keep | |

Notes:
- This is the only place the formulas are written out; labels in the app (Income, Expenses, Savings, Profit, Cash Flow) differ from these names (Clean Income, True Expenses, Net Savings).

## About - `/about`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Header | Fixed bar with brand and back link | n/a | restyle | |
| Intro | "About Budgeting Dashboard", personal project by Ondrej Kutil | n/a | keep | |
| Why it exists / Project status | Two cards of text | n/a | keep | |
| Links row | How it works, GitHub, mailto contact | n/a | keep | |

## Terms of Service - `/terms`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Content | Title, "Last updated: May 4, 2026", amber "Notice" box, nine numbered sections (acceptance, nature, no financial advice, user responsibility, liability, warranty, data handling, changes, contact) | n/a | keep | |
| Footer | Smaller footer: "Built by Ondrej Kutil", Privacy Policy, GitHub | n/a | merge into upgraded footer | |

## Privacy Policy - `/privacy`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Content | Title, "Last updated: May 31, 2026", "Notice" box (personal student project), eight sections (introduction, information collected, use, third-party infrastructure naming Supabase and Render, cookies and authentication, security disclaimer, rights and deletion, contact) | n/a | keep | |
| Footer | Same smaller footer as Terms | n/a | merge into upgraded footer | |

Notes:
- Section 5 lists what is stored locally: JWTs, theme, privacy mode, URL filters and OAuth redirect state. Any new local storage added by the redesign (for example filter or sort preferences) must be reflected here, and the spec's footer statements must stay consistent with this text.

## Not found - any unknown route

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| 404 page | Large "404" with "Error 404" and "404_INSUFFICIENT_FUNDS", "Budget Not Found", "We couldn't find the page you're looking for.", quote "It must have been cut from this month's budget.", buttons Home and Go back (browser history) | n/a | restyle | |

## Login - `/auth/login`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Layout | `AuthLayout`: left decorative panel (desktop only, brand + abstract cards), form column with title and subtitle ("Sign in to review your financial workspace"); mobile shows brand above the form | n/a | restyle | |
| OAuth buttons | "Continue with GitHub", "Continue with Google" with loading states; remembers redirect target in sessionStorage | n/a | keep | |
| Email and password | Fields with inline errors, show/hide password toggle, "Forgot password?" link | n/a | keep | |
| Submit and states | "Sign in"; general error banner; "Still connecting. This can take a few seconds." after a delay (backend cold start) | n/a | keep | |
| Redirect | Already-authenticated users are redirected to the dashboard; link to register | n/a | keep | |

## Register - `/auth/register`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Layout | `AuthLayout` with "Create an account" | n/a | restyle | |
| OAuth buttons | GitHub and Google sign-up | n/a | keep | |
| Fields | Full Name (optional), Email, Password with show/hide | n/a | keep | |
| Password checklist | Live list: at least 8 characters, contains a number, contains uppercase | n/a | keep | |
| Submit and legal | "Create account"; slow-connection message; links to Terms and Privacy Policy; link to sign in | n/a | keep | |

Notes:
- Only the 8-character rule is enforced on submit; the number and uppercase items are advisory. Reset password enforces 6 characters, so the rules disagree.

## Forgot password - `/auth/forgot-password`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Form | Title "Forgot password?", email field, "Send reset link", back to login | n/a | restyle | |
| Success state | "Check your email" / "We've sent you a password reset link" | n/a | keep | |

## Reset password - `/auth/reset-password`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Form | "Reset your password": New Password and Confirm Password with show/hide, "Reset password"; reads the recovery token from the URL hash | n/a | restyle | |
| Invalid link state | "Invalid reset link" with action to request a new one | n/a | keep | |
| Success state | "Password reset successful" with button to sign in; clears the URL hash | n/a | keep | |

## Auth callback - `/auth/callback`

| Element | What it is today | In mockup? | Suggested | Decision |
|---|---|---|---|---|
| Status screen | "Signing you in..." spinner, then "Welcome!" and a redirect after 1.5 s; "Authentication Failed" with button back to login; no `AuthLayout` | n/a | restyle | |
| Token handling | Stores tokens from the URL hash, clears the hash, redirects to the stored target (default dashboard) | n/a | keep | |

---

## Cross-cutting

| Shared thing | Where | What the redesign must preserve |
|---|---|---|
| Page header | `components/ui/page-header.tsx` on most app pages (title, description, actions slot); calculators and Demo use their own headings | One consistent title/description/actions pattern, with actions collapsing on mobile |
| Period navigator | `components/period/PeriodNavigator.tsx`: previous/next arrows, month and year selects, "This month / This year" reset; month mode and year mode; stops at the ends of available years; period lives in the URL on Monthly, Cash Flow, Budget Maker, Yearly, Emergency Fund | Keep a way to pick any month/year and jump back to current; keep URL-driven period and deep links from Yearly to Monthly. Overview and Transactions currently have no navigator |
| Years list | `hooks/use-available-years.ts`: years with data, optionally plus future years | Same list in every picker |
| URL and session state | `hooks/use-url-state.ts`: filters, page, mode, calculator inputs in the query string, restored from sessionStorage | Filters survive navigation; calculator scenarios stay shareable |
| Skeletons | `components/skeletons/*` (Dashboard, Analytics, BudgetMaker, generic) and per-page skeletons | Every page keeps a loading placeholder shaped like its content |
| Empty states | `components/ui/empty-state.tsx` with icon, text and optional action | Each list keeps an empty state with a primary action |
| Error states | Mixed: card with Retry (Funds, Categories, Budget Maker, Dividend Calculator), reload button (Overview, Yearly, Cash Flow, Emergency Fund), error card without retry (Transactions, Accounts), no error state at all (Recurring, Monthly analytics) | Make every page show an error with a working retry |
| Toasts | Radix `Toaster` plus `Sonner`; used for create / update / delete results, undo actions (Budget Maker), partial-failure warnings | Keep success and failure feedback, including the Undo action |
| Form errors | `use-form-errors` and `Field`: inline messages, `aria-invalid`, in-dialog alert for save errors | Keep inline errors and Enter-to-submit |
| Optimistic updates | Accounts, Funds, Categories, Recurring templates (`lib/optimistic.ts`), rows disabled while pending | Keep instant feedback and rollback |
| SensitiveValue masking | `components/privacy/SensitiveValue.tsx` blurs children; state in `PrivacyContext`, stored in localStorage `budget-dashboard:privacy-mode`; charts use `privacy-chart-values`; Budget Maker amount inputs blur too; toggle is in the top bar | Every currency amount and percentage derived from money stays wrapped; charts and tooltips included; the avatar menu keeps "Hide amounts" |
| Currency formatting | `UserContext.formatCurrency` (user's base currency) vs `lib/currency.ts` `formatMoney` (account's own currency, canonical locale per currency); `formatCurrencyCompact` for axes; currency flags | Keep the distinction: per-account amounts in own currency, totals in base currency; do not format everything in one currency |
| Locale and i18n | `lib/i18n.ts` with en-US and cs-CZ for the dashboard; language set in Profile and stored on the account; public pages, auth pages and Demo are hard-coded English | New strings need both locales; decide whether public pages get translated (the footer plan adds an English / Cestina switch) |
| Light / dark theme | `next-themes`; toggle only in Profile ("this device") | Spec makes dark default with a light option; keep a switch reachable |
| PWA and pull-to-refresh | `components/layout/PullToRefresh.tsx` invalidates all queries; active only when installed as a standalone app; FAQ tells iPhone users to add to home screen | Keep pull-to-refresh in standalone mode and safe-area padding |
| Feature flags | `hooks/use-feature-flag.ts`, fails closed; flags `screenshot_import` and `t212_integration`; the sidebar hides gated tools | The new "Tools" menu and any Transactions "Import screenshot" button must hide when the flag is off; pages keep their "Not enabled" state |
| Privacy of local storage | Privacy Policy lists JWTs, theme, privacy mode, URL filters and OAuth redirect state | New persisted preferences must be added to the policy |
| Keyboard | Enter submits forms; dnd-kit keyboard sensor in Budget Maker; Ctrl+V paste in Screenshot Import | `N` for Add is new; keep the existing ones |
| Mobile variants | Transaction cards, Budget Maker row cards, filter toggle, FAB, bottom nav | Each mobile-only layout needs an equivalent |
| Print styles | `no-print` and `print-statement` classes on Monthly and Yearly | PDF export is browser print; redesigned layout must keep the print statement |

## Biggest risks

1. Budget Maker per-row "Linked to" categories/tags: Actual and Diff only work when rows are linked, and the mockup treats actuals as secondary, so the linking control and the "link to track actuals" hint are easy to lose.
2. Business rules keyed by name: categories `Exclude` (transfers) and `Savings Funds Withdrawal` (fund withdrawals), and funds containing "Emergency Fund". Restyling the dialogs or renaming defaults silently breaks transfers, withdrawals and the emergency page.
3. Cross-currency handling: account-currency amounts in Transactions, group totals and foreign-currency section in Accounts, and the "Received Amount" with implied rate in transfers. The mockup focuses on single-currency views.
4. Savings and investments by-category tables in the print statement (Monthly and Yearly): not visible on screen, so they are easy to lose when the layout changes.
5. Feature-flagged tools (Screenshot Import, Trading212) and the "invested" chip they feed; the new Tools menu and the Transactions "Import screenshot" button must honour the flags.
6. Funds: required positive target, projection line ("~Mon YYYY at current pace"), "Goal Reached", and sort preference; the mockup assumes "No target" funds and drops the projection.
7. Overview blocks the mockup drops: Net Profit, Spotlight / Share of Wallet, Largest Transactions, Net Cash Flow definition, and the Investments tile with its rate; plus the fact that Overview is fixed to the current month.
8. Persisted filter and period state (URL plus sessionStorage), including Yearly to Monthly drill-down links and shareable calculator URLs.
9. Mobile-only layouts and the Budget Maker autosave guarantees (flush on month change, unmount and tab hidden; invalid rows block saving; Undo on row removal).
10. Recurring "Post" action and due/upcoming split: nothing posts automatically, and the page is not drawn in the spec.
