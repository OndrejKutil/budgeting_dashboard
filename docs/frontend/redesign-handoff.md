# Redesign handoff

Written 2026-11-13 to continue the frontend redesign in a fresh session. This file is
self-contained: read it first, then open the documents it points to as needed.

## 0. How to start a new session

Paste something like this as the first message:

> Continue the frontend redesign. Read `docs/frontend/redesign-handoff.md` and follow it.
> Start with section 4, phase 4. Work on branch `<branch>`.

Then:

1. All work so far is on branch `claude/dreamy-hawking-aygb9i` (no pull request open at
   the time of writing). If it has been merged to `main`, branch from `main` instead.
2. `cd src/frontend && npm ci`.
3. Read this file, then `redesign-spec.md` sections 1 and 2, then open
   `mockups/pages.html` in a browser.

## 1. Documents

| File | What it is | Status |
|---|---|---|
| `docs/frontend/redesign-handoff.md` | This file: state, remaining work, how to build it | Current |
| `docs/frontend/redesign-spec.md` | Decisions, style rules, navigation, per-page notes, footer | Binding for sections 1 and 2. Section 3's mobile dock text is outdated (see 2.3). |
| `docs/frontend/redesign-inventory.md` | Every element and behaviour on every existing page | Use as a checklist per page. The Decision column was never filled in; the rule in 2.1 replaces it. |
| `docs/frontend/mockups/pages.html` | Visual reference for the chosen style | Drawn for Overview, Transactions, add form, Accounts, Funds, Monthly, Budget Maker, menus, landing + footer, mobile. Not drawn for the remaining pages. |
| `docs/frontend/mockups/*.html` (others) | Earlier explorations | History only |
| `docs/frontend/agent-briefs/` | Briefs used for builder and reviewer subagents, a mock-API harness, conventions | Reuse; replace the `/tmp/...` paths |

## 2. What the design is

### 2.1 The rules

Dark, amber, "quiet glass". In full in `redesign-spec.md` section 2; the short form:

- **No cards or boxes around content.** Structure comes from type size, whitespace and
  1px hairlines.
- **Labelled figures, not sentences.** A page opens with a row of labelled figures
  (`components/data/MetricGrid`): label over a hairline, the amount, one short line under
  it (difference from the six-month average, or a short note). Use the app's own terms:
  Income, Expenses, Saved, Invested, Profit, Cash flow, Net worth. No narrative sentences
  ("you earned … and spent …", "Left this month"). Owner decision, 2026-11-13.
- **Three levels of size:** summary figures (large) > group/section heading with its
  total (about 1.125–1.25rem) > rows (body size). A row amount must never be larger than
  the total of the group it sits in.
- **Glass only on floating chrome:** top bar, menus, dialogs, sheets, mobile dock.
- **Amber** marks the primary action and at most one data point per view.
- **Amounts:** negative red, income / favourable green, neutral muted. Errors are also
  red, so an error always comes with a message or icon.
- **Bars are lines:** progress and proportion are a 2px line under the row they belong
  to.
- **Charts are frameless:** faint gridlines, one amber series, dashed grey comparison,
  labelled end point, no gradient fill, legend as inline text.
- **Selection is an amber underline**, not a filled pill (the top bar is the exception).
- **Category colour is a 6px dot.** Rows with a type or state carry a thin side line.
- **Form fields are a label over a line**, error text directly beneath.
- **Numbers are right-aligned and tabular.**
- **Comparisons use the average of the previous six months**, never the previous month.
- **Default for anything not listed: keep every existing feature and restyle it.**
  Nothing is removed without the owner's explicit decision.

### 2.2 Decisions the owner has made

See the table in `redesign-spec.md` section 1. The ones that most affect remaining
work:

- Dark is the default theme; the user can switch to light. Light has not had a design
  pass.
- Net cash flow (income − spending − investing − saving) is labelled **Cash flow**, never
  "Left". Profit (income − spending − investing) is always shown beside it as its own
  labelled figure.
- Charts keep a y-axis; reference lines are labelled at their end ("avg 1 240 Kč"), not
  in a caption above the chart.
- Controls that change data (filters, ranges) must not move the layout: fixed widths,
  reserved slots, controls disabled rather than hidden, previous data kept while loading.
- The year-over-year comparison was removed from Monthly; it stays on Yearly.
- A fund target is required but may be 0, which means "no target". Whole numbers only.
- The Demo page was removed altogether (owner decision, 2026-11-13): no `/demo` route, no
  demo data, no links. Do not bring it back.
- Footer upgrade on the landing page and all public pages (spec section "Footer").

### 2.3 What is built (phases 1 to 3)

**Shell and theme**

- `src/frontend/src/index.css`: dark tokens moved to the spec palette; `.glass`,
  `.glass-dense` (for surfaces over text), `.app-shell` (faint amber glow, dark only).
  Fluid root font size above 1440px:
  `clamp(100%, calc(100% + (100vw - 1440px) * 0.00536), 137.5%)` (16px to 22px at
  2560px, capped). Raise the last value if large screens should scale further.
- Typeface: Hanken Grotesk, self-hosted via `@fontsource-variable/hanken-grotesk`.
- `components/layout/Topbar.tsx`: floating glass top bar from `lg` (1024px) up.
  Overview, Transactions, Accounts, Funds, and menus Analytics (Monthly, Yearly, Cash
  Flow, Emergency Fund), Plan (Budget Maker, Recurring, Categories), Tools (Screenshot
  Import and Trading212 behind their feature flags, Investing and Dividend calculators).
  Right side: hide-amounts toggle, refresh, avatar menu.
- `components/layout/MobileDock.tsx`: below `lg`, an icon-only glass dock: Overview,
  Transactions, Add (amber), **Accounts**, More. Funds and everything else are in the
  More sheet. (The spec's navigation section still says Funds; the dock is right.)
- `components/layout/nav-config.ts`, `use-nav.ts`: single source for navigation items.
- `hooks/use-add-transaction.ts`: `N` shortcut and the dock's Add both navigate to
  Transactions with location state `{ openAdd: true }`.
- Content column max width `82rem` (was 72.5rem; widened at the owner's request).

**Shared primitives**

- `components/ui/*` restyled: glass Dialog / AlertDialog / Sheet / Popover /
  DropdownMenu / Select content; Input, Textarea, SelectTrigger as label-over-line via
  `components/ui/field-line.ts`; pill buttons; boxless Table; sticky DialogFooter;
  `Field` and `FormAlert` in `components/ui/field.tsx` with `hooks/use-form-errors.ts`.
- `components/data/*`: `MetricGrid` (labelled figures with a six-month comparison or a
  note; the standard page summary), `BigFigure` / `FigureParts`, `SplitBar`,
  `LineRows` (rows with a proportional line; optional `detail`, `barClassName`),
  `RowList` / `RowListItem`, `SeriesLineChart` (zero-based cumulative line with a
  dashed comparison), `ChartLegend`, `DayBars` (one bar per day with an average line),
  `interpolate.ts` (i18n templates with rich parameters).
- `components/data/ValueLineChart.tsx` (was `accounts/NetWorthChart`): a line chart whose
  axis fits the data (use this, not `SeriesLineChart`, for series that are large or can go
  negative). Takes plain dates or full timestamps. Used by Accounts and Trading212.

**Pages rebuilt and reviewed**

| Page | Files | Notes |
|---|---|---|
| Overview | `pages/dashboard/DashboardOverview.tsx` | Month navigation, Cash flow + Profit, then Income / Expenses / Saved / Invested (each vs six-month average), split bar, Where it went, spending line vs six-month average, Latest, link to Monthly analytics |
| Transactions | `pages/dashboard/TransactionsPage.tsx` + `transactions/*` | Visible filters: date, account, type, tags; rest behind More. Type side line. Dialog with amount as headline |
| Accounts | `pages/dashboard/AccountsPage.tsx` (CRLF) + `accounts/*` | Groups as headings with totals, balance largest on the row, net worth secondary with a collapsible chart |
| Funds | `pages/dashboard/FundsPage.tsx` + `funds/*` | Saved amount as the row figure, side line by 30-day activity |
| Budget Maker | `pages/dashboard/BudgetMaker.tsx`, `components/budget/*` | Editing first; difference as an amount; no progress bars |
| Monthly analytics | `pages/dashboard/analytics/MonthlyAnalyticsPage.tsx` | Six figures vs six-month average, DayBars with a y-axis, rows instead of donuts, print statement kept |
| Yearly analytics | `analytics/YearlyAnalyticsPage.tsx`, `components/analytics/{MonthlyBreakdownTable,SignedBarFacet,YearlyHeatmap}` | Six figures with trend notes, records linking to Monthly, frameless charts, localized month names, amber heatmap (tooltip now privacy-aware), print statement kept. Not yet checked with real data |
| Profile | `pages/dashboard/ProfilePage.tsx` | Sections of rows; all 7 currencies; Dark/Light text switch; error state with retry. Not yet checked with real data |
| Recurring | `pages/dashboard/RecurringPage.tsx` | Summary figures ("Templates", not "Active templates"), Due/Upcoming rows with side line, Post as the amber action, error state. Not yet checked with real data |
| Categories | `pages/dashboard/CategoriesPage.tsx` | Open groups with counts, unknown types listed, `Exclude` and `Savings Funds Withdrawal` locked (no rename/retype/delete). Not yet checked with real data |
| Emergency Fund | `analytics/EmergencyFundPage.tsx` | Runway / balance / monthly spending figures, scenario in the URL, target rows, core breakdown as rows. Not yet checked with real data |
| Trading212 | `pages/dashboard/Trading212Page.tsx` | Value / unrealised P/L / change figures, status as a line under the title, `ValueLineChart` with span picker (keeps data while switching), boxless positions table, connect form in line style. Not yet checked with real data |
| Screenshot Import | `pages/dashboard/ScreenshotImportPage.tsx` | Dashed hairline dropzone beside instructions, draft rows with a red side line plus "Needs your input" text, field-level needs-input errors, line-style fields, apply-to-all as a plain section. Logic unchanged. Not yet checked with real data |

**Backend changes** (`src/backend`)

- `helper/calculations/summary_calc.py`: `/summary` now also returns
  `expense_categories`, `daily_cumulative_expense`, `average_daily_cumulative_expense`,
  `six_month_average`. Helpers for the six-month window (`_average_window_months`,
  `_months_with_history`, `_month_rows`, `_is_whole_month`) and a paged fetch
  (`_fetch_summary_transactions`). Extra data is only computed for whole calendar months.
- `helper/calculations/monthly_page_calc.py`: `six_month_average` added, reusing the
  helpers above; `yoy_comparison` removed.
- Tests: `tests/test_summary_overview.py`, `tests/test_monthly_analytics.py`. 180 pass.

## 3. Verification status and known gaps

- Frontend `npm run check` and `npm run lint` pass. Backend `ruff`, `mypy`, `pytest`
  pass (180 tests).
- **Only Overview has been seen against the real backend.** Every other page was tested
  with a mocked API. First thing to do with real data: open each rebuilt page and
  compare its numbers with the old app, especially Monthly analytics.
- Not tested: a real phone (safe areas, touch), toasts over the mobile dock.
- Not re-checked after the last fix rounds: light theme and Czech on Budget Maker and
  Accounts; dialogs and the More sheet at viewports above 1440px.
- The server decides "today" in UTC; around local midnight on the 1st of a month the
  Overview chart can briefly show no spending.
- Pages that are not rebuilt yet already use the new inputs, buttons, tables and
  dialogs, so they look mixed until their phase.

**Owner's answers (2026-11-13)** to the questions previously open here:

1. Hide-amounts mode keeps direction (green/red, "more"/"less"). No change.
2. Split bar: it splits the money the month had to work with = income, plus the net
   withdrawal when more was taken out of savings than put in (net saving < 0). Then the
   parts always add up to 100 %, and a line under the bar says "Includes X taken from
   savings". Months with net saving >= 0 are unchanged. Built on Overview
   (`DashboardOverview.tsx`); apply the same rule wherever a split of income is drawn
   (Yearly, Cash Flow).
3. Budget Maker colours as built (muted) are accepted.
4. 22px at 2560px is enough.
5. Footer compliance wording, accepted: "Budgeting Dashboard is a personal project, not a
   bank or financial adviser. Nothing here is financial advice." and "© <year> Ondřej
   Kutil · Data on Supabase · hosted on Render".
6. No reference footer: build our own (see 4.2). Contact = email and GitHub only.

## 4. Remaining work

Rule for every page: open its section in `redesign-inventory.md`, keep every row,
restyle to 2.1, reuse the primitives in 2.3. Where no mockup exists, the design
direction below is a proposal in the same language; show the owner a screenshot before
polishing.

### Phase 4: public pages

**Built (awaiting owner sign-off).** Shared shell in `components/public/`: `PublicHeader`
(brand, glass pill with How it works / FAQ / About, Log in + Create account or Open
dashboard; links in a row under the bar below `lg`), `PublicFooter` (a panel within the page width with a darker
background and rounded top: closing call to actionclosing call to action
for signed-out visitors, link columns, contact `me@ondrejkutil.com` and
GitHub, disclaimer and the "Data on Supabase · hosted on Render" line) and `PublicLayout` /
`PublicPageTitle`. Landing, FAQ, How it works, About, Terms, Privacy and NotFound use it;
`AuthLayout` is a centred column without the decorative panel. Decisions taken while building:
public pages stay English-only, so the footer has no language switch yet; the landing headline
avoids "left" ("Know your cash flow before the month ends."); How it works and FAQ use the
app's terms (Income, Expenses, Saved, Profit, Cash flow); the owner asked for little text (short landing line, no data facts in the footer) instead of "Clean Income" / "Net
Savings"; the FAQ no longer mentions CSV import; reset password now needs 8 characters like
registration (frontend and `schemas/requests.py`). `components/effects/ParticleWave.tsx` is
unused: delete in phase 7. The Demo page has been removed; so has every "Try the demo" link.

**4.1 Landing** — `pages/LandingPage.tsx`. Mockup: `pages.html`, screen `landing`.

- Top: brand, glass pill with How it works / FAQ / About / Demo, Log in, amber
  "Create account".
- Hero: headline "Know what is left before the month ends." (amber on one word), one
  paragraph, Create account + Try the demo. Beside it a static sample: big figure,
  split bar, three statement rows. Mark sample data as sample.
- Three short explanations split by vertical hairlines. No card grid.
- Remove the leftover sentence "The landing page does not need to explain every
  screen." and the particle effect if it conflicts with the style
  (`components/effects/ParticleWave.tsx`; ask before deleting).
- Must work signed out, in both themes, and be fast (no heavy chart libraries).

**4.2 Footer** — new shared component, used by Landing, FAQ, How it works, About,
Terms, Privacy, Demo. Spec section "Footer" has the full structure:

1. Closing call to action ("Start with this month.") with the two buttons.
2. Four data facts split by hairlines: no bank connection; export from Profile; delete
   account from Profile; open source (MIT). Each must stay true.
3. Link columns: brand + one line; Product (Overview, Demo, How it works, FAQ);
   Project (About, source on GitHub); Legal (Terms, Privacy); Contact (email, GitHub
   https://github.com/OndrejKutil). Confirm the exact public email address with the
   owner when building; do not guess it.
4. Legal line: the disclaimer and copyright line from answer 5 in section 3, language
   switch.

Mobile: columns stack, facts in a 2×2 grid.

**4.3 FAQ, How it works, About, Terms, Privacy, NotFound** — `pages/*.tsx`.

- Shared public layout: the landing top bar and the footer.
- Long text pages: one column about 65 characters wide, headings by size, hairlines
  between sections, no boxes. FAQ as plain disclosure rows.
- These pages are hard-coded English today. Moving them into `lib/i18n.ts` (en-US and
  cs-CZ) is desirable but large: ask the owner whether it is in scope.
- The FAQ mentions CSV import while Profile shows it as "Coming Soon": fix the text.

**4.4 Auth** — `pages/auth/*`, `components/auth/AuthLayout.tsx`.

- Centred narrow column, brand on top, title, line-style fields, amber submit, OAuth
  buttons as hairline pills. No card around the form.
- Keep everything from PR #94: inline errors, `autocomplete`, `noValidate`, announced
  errors. Password rules disagree (Register 8 characters, Reset 6): align to 8 and
  check the backend rule.
- Hard-coded English today; same i18n question as 4.3.

### Phase 5: remaining app pages

Done: Yearly, Recurring, Categories, Emergency Fund, Profile (see the table in 2.3; the
notes below are kept for reference), plus Trading212 and Screenshot Import. Remaining
order: Cash Flow, then the Investing and Dividend calculators.

**5.1 Yearly analytics** — `analytics/YearlyAnalyticsPage.tsx`, uses
`components/analytics/{YearlyHeatmap,MonthlyBreakdownTable,SignedBarFacet,StatementDocument}`.

- Summary: `MetricGrid` with Income, Expenses, Saved, Invested, Profit, Cash flow for the
  year, as on Monthly.
- Year-over-year comparison stays here (it was removed from Monthly).
- Monthly breakdown as a boxless table: one row per month, columns income, expenses,
  saved, invested, left; current month marked; row links to that month's Monthly page.
- Heatmap: keep; restyle cells to the palette (neutral to amber intensity), frameless,
  accessible names, privacy-aware tooltips.
- Signed bars: thin bars, positive green, negative red, faint zero line.
- Print statement must keep working (`window.print()` with `StatementDocument`, which
  now forces a white background). Verify with Playwright print media.
- Needs a backend six-month or prior-year baseline only if a comparison is shown that
  the endpoint does not already provide; prefer what exists.

**5.2 Cash Flow** — `analytics/CashFlowPage.tsx`, `components/analytics/SankeyChart.tsx`.

- Keep the Sankey: it is the point of the page. Restyle only: no card, muted link
  colours with one amber path for "left", node labels as plain text with tabular
  amounts, privacy-aware. Make it scale with the root font size (it uses d3-sankey with
  measured width).
- Period navigation as on Overview. Summary: `MetricGrid` with Income, Expenses, Saved,
  Invested, Cash flow.
- On mobile a Sankey is hard to read: offer the same data as a `LineRows` list below
  it, or instead of it under a width threshold.

**5.3 Recurring** — `pages/dashboard/RecurringPage.tsx`.

- Summary: `MetricGrid` with Monthly total, Annual total, Templates (the page already
  has these three numbers).
- Two lists as rows with a side line: "Due" (amber or red side line when overdue, with
  a "Post" action that is the amber element on the page) and "Upcoming".
  Row: notes, "category · account · cadence", next date as relative text, amount.
- Nothing posts automatically: keep the manual Post flow and its confirmation.
- `is_active` has no control today, so "Active templates" counts everything: either add
  the toggle or relabel the figure. Ask the owner.
- Add an error state with retry (none today). The dialog already has inline errors.

**5.4 Categories** — `pages/dashboard/CategoriesPage.tsx`.

- No headline figure needed; this is a management list. Group by type (Expenses,
  Income, Saving, Investment, Exclude) as headings with counts; rows with the 6px
  colour dot, name, spending type as muted text, active state, row menu.
- Keep create/edit/delete, the active toggle, inline validation. Categories named
  `Exclude` and `Savings Funds Withdrawal` are relied on by transfers and fund
  withdrawals: protect them from rename/delete if they are not already, or warn.

**5.5 Emergency Fund** — `analytics/EmergencyFundPage.tsx`.

- Summary: `MetricGrid` with Runway (months, e.g. "4.8 months"), Fund balance, Average
  monthly core spending.
- One progress line toward the target months; scenario rows (3 / 6 / 12 months) as
  `LineRows`.
- The page only counts funds whose name contains "Emergency Fund". Keep the rule, state
  it on the page in small text, and show a helpful empty state when no fund matches.

**5.6 Profile** — `pages/dashboard/ProfilePage.tsx`.

- Sections by heading and hairline, not cards: Identity, Preferences (currency,
  language, theme), Connected accounts (GitHub, Google), Data (export, the disabled
  "Coming Soon" import), Danger zone (delete account with its confirmation).
- Fields in line style; save feedback inline. Keep the theme switch working: this is
  where light mode is selected.

**5.7 Tools**

- Screenshot Import (`ScreenshotImportPage.tsx`, behind `screenshot_import`): dropzone
  as a dashed hairline area, review rows in the transactions list language, line-style
  editing, the existing "needs input" state made obvious without relying on colour
  alone. It uses `TagMultiSelect` with pending tags: test that path.
- Trading212 (`Trading212Page.tsx`, behind `t212_integration`): portfolio value as the
  headline, positions as a boxless table, history with `ValueLineChart`. (Built.)
- Investing and Dividend calculators: inputs in line style on the left, result as the
  labelled figures (`MetricGrid`), chart frameless. Dividend yields are per payment
  (monthly ×12, quarterly ×4): say so in the labels. The Investing chart uses en-US
  compact ticks: use the user's locale.

**5.8 Demo** — removed (see 2.2).

### Phase 6: light theme

- Go through every page in light mode. Known weak points: muted text is pale on the
  light background; glass needs enough contrast over white; chart neutrals
  (`rgba(255,255,255,…)`-style values) must come from tokens.
- Check amber on white for contrast; use a darker amber for text, the bright one for
  fills.
- The print statement is always light and must stay unaffected.

### Phase 7: clean-up

- Remove unused i18n keys, `components/effects` if unused, the unused summary fields
  (`top_expenses`, `biggest_mover`, `largest_transactions`) after checking consumers.
- Convert remaining px sizes in non-rebuilt components to rem.
- Update `docs/frontend/README.md` (it still describes the sidebar) and delete
  `docs/frontend/agent-briefs/` and the exploration mockups if no longer wanted.
- Close the keyboard gaps noted in the spec.

## 5. How to build a page

The process that worked, per page: one builder, one separate reviewer, fixes, merge.
The briefs are in `docs/frontend/agent-briefs/`.

**Conventions (all learned the hard way)**

- Sizes that should scale are in **rem** (`text-[1.75rem]`, not `text-[28px]`). px only
  for 1 to 3px lines and borders, blur, breakpoints. Hand-written SVG must scale too.
- Any row with text on the left and an amount on the right: text `min-w-0 truncate`,
  amount `shrink-0 whitespace-nowrap`; in a grid use `minmax(0,1fr)_auto`.
- Every amount goes through the user-context formatters and `SensitiveValue`. Privacy
  mode is localStorage `budget-dashboard:privacy-mode` = `"true"`.
- Every visible string and aria-label in both locales in `lib/i18n.ts`. Sentences from
  templates with parameters, plurals with `Intl.PluralRules` and separate keys (see the
  transactions count).
- Each page needs a loading skeleton, an empty state and an error state with retry.
- `cn()` (tailwind-merge) drops a `leading-*` class placed before a `text-[size]`
  class: put line-height after the size.
- Some files are CRLF (`AccountsPage.tsx`, `App.tsx`). Check before editing and keep
  them; a flipped file becomes a whole-file diff.
- Do not change `components/ui/*`, `components/layout/*`, `index.css` or
  `tailwind.config.ts` from a page task; if a primitive is wrong, fix it as its own
  change and re-check every page that uses it.
- Backend: mirror existing calculation conventions; with the pinned postgrest client
  `.range(start, end)` has an **exclusive** end; add pure-function tests; run `ruff`,
  `mypy`, `pytest` as CI does.
- If subagents run in git worktrees, their worktree may start from an old commit: reset
  to the branch head first. Several agents in parallel exhaust a usage window quickly;
  two at a time is a safer pace.

**Checks before calling a page done**

- `npm run check` and `npm run lint` in `src/frontend`; backend checks if touched.
- In a browser at 1280×900, 1024×768, 390×844, 360×740 and 2560 wide: normal data,
  empty, API error + retry, hide-amounts, light theme, cs-CZ, very long names, every
  dialog and menu, every mutation (compare the outgoing request with the old page's).
- No page errors, no horizontal overflow.
- Walk the page's inventory rows one by one and account for each.

**Running without a backend**

`docs/frontend/agent-briefs/mock-harness.cjs` fakes a signed-in session and mocks the
API with Playwright:

```
cd src/frontend
VITE_API_BASE_URL=http://api.mock npx vite --host 127.0.0.1 --port 5199 --strictPort
```

then `require` the harness from a script and call
`open({ width, height, mobile, authed, overrides })`. Its default data covers
transactions, accounts, categories, funds and tags only; extend a copy with the
response shape of the page under test (read `lib/api/types` and the backend schemas).
Pages whose endpoints are not mocked will crash on empty shapes: that is the mock, not
the app.

## 6. Suggested first steps in the new session

1. Open a pull request for phases 1 to 3 if there is none, and try it against real
   data (section 3).
2. Get the owner's answers to the open questions in section 3.
3. Phase 4.1 and 4.2 (landing and footer) can ship on their own.
4. Then phase 5 in the suggested order, two pages at a time.
