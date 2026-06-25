# Feature & Growth Proposal — Budgeting Dashboard

## Context

The app is a production personal-finance dashboard (React/TS + Vite frontend, FastAPI + Polars backend, Supabase/Postgres, live at budget.ondrejkutil.com). It is deliberately **manual-first** (no bank sync, no automated advice), **free**, and built around a distinctive spending-type framework (**Core / Necessary / Fun / Future**). It already covers accounts, transactions, per-user categories, savings funds, budgets, monthly/yearly analytics, an emergency-fund calculator, dividend/investing calculators, multi-currency with a daily exchange-rate Edge Function, EN/CZ i18n, and a PWA with pull-to-refresh + auto-updating service worker. There's also an n8n + Groq + GPT-4o voice-ingestion workflow for adding transactions by voice.

**Goal of this doc:** propose new *functionality* and *marketing/growth* moves that (1) make the owner's own monthly finance workflow better — the #1 priority — and (2) demo impressively as a portfolio piece — #2. Everything below respects the manual-first principle: the aim is to make manual entry *fast and delightful* and to extract *more insight* from manually-entered data, not to add bank automation.

This is a proposal/strategy document. Features are prioritized into tiers so they can be picked off independently.

---

## Part A — Functionality

### Tier 1 — Highest leverage (build these first)

**A1. Recurring transactions & subscription tracker**
The biggest pain in manual entry is re-typing the same rent/salary/subscription every month. Add recurring "templates" that auto-materialize transactions on a schedule (or one-tap confirm), plus a Subscriptions view that surfaces all recurring outflows, their cadence, annualized cost, and an **upcoming-bills calendar/list**.
- Reuse: `src/backend/routers/transactions.py` + `schemas/base.py` (transactions already carry account/category/savings-fund FKs); add a `dim_recurring` table mirroring transaction fields + cadence (`monthly`/`weekly`/`yearly`) and `next_date`.
- Materialization options: a Supabase Edge Function on a daily cron (same pattern as `src/db/edge_function_refresh_exchange_rates.ts`), or generate-on-load in the backend. Edge Function is the cleaner, more demoable approach.
- Frontend: new `pages/dashboard/RecurringPage.tsx`; reuse the transaction form components and `lib/api/endpoints/transactions.ts` patterns.

**A2. Net-worth timeline (multi-account, multi-currency)**
You already compute a 30-day balance history per account (`helper/calculations/accounts_calc.py`). Aggregate all accounts into a single **net-worth-over-time** chart, converting currencies via the existing rate table. This is the single most impressive "wealth dashboard" visual and directly useful personally.
- Reuse: `helper/exchange_rates.py` + `dim_exchange_rates` for conversion; Recharts area chart like the existing analytics pages.
- Extend history beyond 30 days by snapshotting balances (daily Edge Function writing to a `fct_balance_snapshots` table) so the timeline grows over months/years.

**A3. Goal-based savings with target dates & projections**
Savings funds today track current vs target amount. Add an optional **target date** and compute "you need X/month to hit this by then," projected completion date at current pace, and on-track/behind status.
- Reuse: `fct_savings_funds` + `helper/calculations/savings_funds_calc.py` (already computes 30-day net flow per fund — feed that into the pace projection). Mostly additive: one nullable `target_date` column + calc logic, no new tables.

**A4. Fast manual entry: command palette + templates**
Make adding a transaction near-instant from anywhere: a `Cmd/Ctrl-K` quick-add with smart defaults (last-used account, recently-used categories first) and saved "favorite" transactions (e.g., "Coffee — 89 CZK — Fun"). This is the highest-impact UX win for a manual-first product and pairs with the existing voice-ingestion workflow.
- Reuse: shadcn `command` primitive (already in `components/ui`), `hooks/use-debounce.ts`, and existing transaction endpoints. Favorites can be stored client-side first, then promoted to a small table if wanted.

### Tier 2 — Strong follow-ups

**A5. Cash-flow forecast / runway.** Combine recurring items (A1) + current balances + budget to project end-of-month balance and answer "will I make it to payday?" Reuses the run-rate logic already in `monthly_page_calc.py`.

**A6. Live budget progress & alerts.** You compute budget-vs-actual (`budgets_calc.py`); surface it as live burndown bars per category with a visual warning as a category approaches its limit. Optionally fire a PWA push (see A8).

**A7. Tags (cross-cutting labels).** Categories are a single hierarchy; add free-form tags (e.g., `vacation-2026`, `reimbursable`) for slicing across categories. New `tags` + join table; additive to the transaction filter UI.

**A8. Monthly recap (PWA push + optional email).** This *is* the product's positioning ("a monthly review without the spreadsheet hunt"). On the 1st of each month, push/email a recap: cash flow, savings rate, biggest mover, top categories — all already computed in `summary_calc.py`. Your service worker (`vite.config.ts`) is set up for auto-update; add the Push API subscription + a cron Edge Function. High wow-factor for a demo.

**A9. Split transactions.** Let one purchase span multiple categories (groceries + household in one receipt). Modest schema change (parent/child or a JSON splits column) but a common real-world need.

### Tier 3 — Nice-to-have / polish
- Spending-insight cards ("you spent 28% more on Fun than last month") — extends the existing "biggest mover" logic.
- Customizable/rearrangeable dashboard widgets.
- CSV *export* already exists; a guarded one-time CSV *import* for onboarding history (keep it opt-in so it doesn't violate manual-first ethos).

---

## Part B — Marketing & Growth

Given personal-first/portfolio-second ambition, the goal here is **credible positioning + a frictionless way for strangers (and recruiters) to experience the app**, not paid acquisition.

**B1. Demo / sandbox mode (highest-ROI growth + portfolio move).**
A "Try it without signing up" button that loads a read-only or ephemeral session seeded with realistic sample data. This simultaneously: lifts landing-page conversion, lets recruiters explore in one click, and is itself a technically interesting feature to show off. Implement as a seeded demo user + a guest session, or client-side mock data behind the existing routes.
- Touches: `LandingPage.tsx` CTA, `AuthContext.tsx` (guest/demo session), and a data-seeding script under `scripts/`.

**B2. Own the "Core / Necessary / Fun / Future" framework.**
This four-bucket spending model is genuinely differentiated. Name it, write a short methodology page, and lead with it on the landing page and in content. It's the hook that separates you from Mint/YNAB clones.

**B3. Sharpen positioning as the privacy-first, manual, you-own-your-data tracker.**
The deliberate "no bank sync, no ads, free, open-source" stance is a *feature* in 2026. Frame it explicitly on the landing page: "We never touch your bank. No data selling. No upsells." Targets the post-Mint-shutdown, privacy-conscious audience.

**B4. SEO content + portfolio case study.**
- A handful of evergreen guides (emergency-fund sizing, the C/N/F/F method, monthly-review ritual) — each links into the matching tool. Low effort, compounding SEO.
- A polished README/architecture write-up (FastAPI + Polars + Supabase + React Query + PWA) with screenshots and the live demo link — this is the portfolio centerpiece.

**B5. Distribution channels that fit a free/open project.**
Show HN, r/personalfinance, r/selfhosted (lean into the open-source + privacy angle — consider documenting self-hosting), Product Hunt. The demo link (B1) is the conversion asset for all of these.

**B6. Landing-page upgrades.** Add real (anonymized) screenshots/GIFs of the net-worth timeline (A2) and monthly recap (A8), a short "how it works in 30 seconds" loop, and the demo CTA above the fold.

---

## Recommended sequencing

1. **A4 (fast entry) + A1 (recurring)** — these remove the daily friction of a manual tracker; you'll feel the benefit immediately as the primary user.
2. **A2 (net-worth timeline) + B1 (demo mode)** — the two most demoable, portfolio-defining additions; B1 makes A2 visible to visitors.
3. **A3 (goals) + A8 (monthly recap)** — reinforce the "monthly review" positioning (ties to B-marketing).
4. Marketing pass (B2–B6) once the demo + a flagship visual exist.
5. Tier 2/3 features opportunistically.

## Notes / open questions for implementation time
- Whether recurring/snapshots should be Edge-Function-cron (cleaner, demoable) vs backend-on-load (simpler) — recommend Edge Function to match the existing exchange-rate pattern.
- Demo mode: ephemeral guest session vs shared seeded read-only user — recommend a seeded demo user with writes sandboxed/reset on a schedule.
