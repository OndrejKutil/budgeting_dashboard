# Budgeting Dashboard — Ranked Idea Catalog

## Context

The app has run as a personal-finance tool for ~2 years. This document is a *ranked ideation
catalog* for evolving it: surfacing **new insights from existing data**, deciding **what else
is worth logging**, and adding **modern, genuinely interesting features**. No code is written
yet — this is the idea backlog to pick from. Guiding decisions:

- **Audience: mainly the owner.** Optimize for depth and nerdy insight. No multi-user/
  household, no marketing/onboarding-for-strangers work.
- **AI: yes, but free.** Use GitHub Models free tier (gpt-4o-class) — not a paid API.
- **Integrations: no bank/open-banking sync** (cost/compliance). Free **CSV import** is the
  self-contained equivalent and stays in scope.
- **Effort appetite: mix** of quick wins (existing data, no schema change) and a few
  structural features (new tables/fields).

Each idea lists **Value** (⭐1–5), **Effort** (S / M / L), **Type** (Quick = existing data ·
Struct = schema change · AI · UX), and **Reuse** (existing code to build on, so it's
executable later).

---

## What already exists (so we don't re-invent it)

- **Logged:** transactions (date, signed amount, category, account, fund, tags, free-text
  notes); budgets (monthly `plan_json`); savings funds + targets; recurring templates
  (cadence, next_date); multi-account + multi-currency w/ daily FX; dividend portfolio;
  `spending_type` per category (Core/Necessary/Fun/Future).
- **Insights:** monthly & yearly analytics, run-rate forecast, net-worth timeline,
  emergency-fund scenarios (3/6-mo), period comparisons, top categories, biggest mover,
  trend directions, daily spending heatmap.
- **Confirmed gaps:** no account opening balances (net worth is purely tx-derived), no
  liabilities/non-cash assets, no CSV *import* (export only), no merchant/payee field, no
  auto-detected subscriptions, no notifications infra, no AI, dividends siloed from net worth.

---

## Master ranking (recommended first wave in **bold**)

| # | Idea | Axis | Value | Effort | Type |
|---|------|------|-------|--------|------|
| 1 | **Account opening balances** | Log | ⭐⭐⭐⭐⭐ | S | Struct |
| 2 | **FIRE / financial-independence dashboard** | Insight | ⭐⭐⭐⭐⭐ | M | Quick |
| 3 | **AI monthly narrative ("money in words")** | Modern | ⭐⭐⭐⭐ | S–M | AI |
| 4 | **AI natural-language transaction entry** | Modern | ⭐⭐⭐⭐⭐ | M | AI |
| 5 | **Auto-detected subscription / recurring audit** | Insight | ⭐⭐⭐⭐⭐ | M | Quick |
| 6 | **Cash-flow forecast & account runway** | Insight | ⭐⭐⭐⭐⭐ | M | Quick |
| 7 | **CSV / statement import (AI-assisted)** | Modern | ⭐⭐⭐⭐⭐ | M–L | AI |
| 8 | **True net worth: assets + liabilities** | Log | ⭐⭐⭐⭐⭐ | L | Struct |
| 9 | TTM rolling metrics + YoY seasonal compare | Insight | ⭐⭐⭐⭐ | S | Quick |
| 10 | Net-worth projection / forecast | Insight | ⭐⭐⭐⭐ | S–M | Quick |
| 11 | Merchant/payee structured field | Log | ⭐⭐⭐⭐ | M | Struct |
| 12 | Financial health score (0–100) | Insight | ⭐⭐⭐⭐ | M | Quick |
| 13 | Anomaly / unusual-spend detection | Insight | ⭐⭐⭐⭐ | M | Quick |
| 14 | Savings-fund ETA / goal projection | Insight | ⭐⭐⭐⭐ | S | Quick |
| 15 | Lifestyle-creep watch (Core/Fun/Future trend) | Insight | ⭐⭐⭐⭐ | S | Quick |
| 16 | Notifications / reminders infrastructure | Log | ⭐⭐⭐⭐ | M | Struct |
| 17 | AI auto-categorization | Modern | ⭐⭐⭐⭐ | M | AI |
| 18 | Budget rollover / envelope mode | Log | ⭐⭐⭐⭐ | M | Struct |
| 19 | Split transactions | Log | ⭐⭐⭐⭐ | M | Struct |
| 20 | Scenario / what-if planner | Insight | ⭐⭐⭐⭐ | M | Quick |
| 21 | Sankey cash-flow diagram | Insight | ⭐⭐⭐⭐ | M | UX |
| 22 | Chat with your finances | Modern | ⭐⭐⭐ | M–L | AI |
| 23 | Full-year calendar spending heatmap | Insight | ⭐⭐⭐ | S | UX |
| 24 | Merchant analytics from notes (bridge) | Insight | ⭐⭐⭐ | M | Quick |
| 25 | Dividends folded into net worth & cashflow | Insight | ⭐⭐⭐ | S | Quick |
| 26 | Budget-adherence streaks / gamification | Insight | ⭐⭐⭐ | S | Quick |
| 27 | Tag-based analytics | Insight | ⭐⭐⭐ | S | Quick |
| 28 | Cost-of-living / burn & runway metrics | Insight | ⭐⭐⭐ | S | Quick |
| 29 | "Year in Review" financial Wrapped | Modern | ⭐⭐⭐ | M | UX |
| 30 | Receipt / attachment storage | Log | ⭐⭐⭐ | M | Struct |
| 31 | Recurring: end-date / count / auto-post | Log | ⭐⭐⭐ | S–M | Struct |
| 32 | Per-transaction original currency | Log | ⭐⭐⭐ | M | Struct |
| 33 | First-class financial goals | Log | ⭐⭐⭐ | M | Struct |
| 34 | Net-worth snapshot table | Log | ⭐⭐⭐ | S | Struct |
| 35 | PWA quick-entry / offline / installable | Modern | ⭐⭐⭐ | M | UX |
| 36 | PDF monthly/annual statement export | Modern | ⭐⭐ | M | UX |
| 37 | Customizable dashboard widgets | Modern | ⭐⭐ | M | UX |

---

## Axis 1 — New insights from existing data (quick wins, no schema change)

**2. FIRE / financial-independence dashboard** — ⭐⭐⭐⭐⭐ · M · Quick
The single biggest nerd payoff. Compute the FI number (25× annual core+necessary expenses,
i.e. the 4% rule), current progress %, and a **projected FI date** from net-worth growth rate
+ current savings rate. Add Coast-FIRE and Lean/Fat variants.
*Reuse:* `_emergency_fund_analysis()` already computes core & core+necessary monthly expenses;
`net_worth_calc.py` gives the net-worth curve; savings rate is in `summary_calc.py`.

**5. Auto-detected subscription / recurring audit** — ⭐⭐⭐⭐⭐ · M · Quick
Mine `fct_transactions` for repeating (similar amount + similar notes/merchant + regular
interval) patterns to surface subscriptions — *including ones never entered into
`dim_recurring`*. Flag **price creep** (same subscription, rising amount) and **rarely-used**
recurring costs. Offer "convert to recurring template" in one click.
*Reuse:* notes trigram index already exists (`fct_tx_notes_trgm_idx`); cadence normalization
factors live in `recurring.py`.

**6. Cash-flow forecast & account runway** — ⭐⭐⭐⭐⭐ · M · Quick
Project each account's balance forward N days by combining `dim_recurring` (next_date +
cadence) with a historical average of discretionary spend. Warn when a balance is predicted
to dip below a threshold. "You have ~X days of runway at current burn."
*Reuse:* `accounts_calc.py` (balances + 30d flow), recurring monthly-equivalent logic.

**9. TTM rolling metrics + YoY seasonal comparison** — ⭐⭐⭐⭐ · S · Quick
With 2 years of data: (a) show **trailing-twelve-month** rolling income/expense/savings-rate
to kill monthly noise, and (b) compare a month vs the **same month last year**, not just vs
the previous month (December vs December is fairer).
*Reuse:* `_calculate_period_comparison()` and `_get_previous_period_dates()` in
`summary_calc.py` — generalize "previous period" to "same period last year".

**10. Net-worth projection / forecast** — ⭐⭐⭐⭐ · S–M · Quick
Extend the net-worth timeline into the future with a linear fit + optional compounding
assumption slider (expected % return). Shade a confidence band.
*Reuse:* `net_worth_calc.calculate_net_worth_timeline()`.

**12. Financial health score (0–100)** — ⭐⭐⭐⭐ · M · Quick
One glanceable composite from sub-scores already computed: savings rate, emergency-fund
coverage, budget adherence, spending balance (Core/Fun/Future), income stability. Show the
breakdown so it's explainable, not a black box.

**13. Anomaly / unusual-spend detection** — ⭐⭐⭐⭐ · M · Quick
Per-category baseline (median/IQR over trailing months); flag outlier transactions and
category spikes for the current month ("dining is 2.3× your usual"). Great feed for the
dashboard and for notifications later.

**14. Savings-fund ETA / goal projection** — ⭐⭐⭐⭐ · S · Quick
For each fund, use recent `net_flow` to project a **completion date** and an on-track/behind
badge.
*Reuse:* `savings_funds_calc.calculate_fund_metrics()` (current_amount, net_flow_30d) + target.

**15. Lifestyle-creep watch** — ⭐⭐⭐⭐ · S · Quick
Leverage `spending_type` harder: track Core/Fun/Future **share trend** over time and alert
when Fun spending grows faster than income.
*Reuse:* yearly `spending_balance` + `monthly_*` series in `yearly_page_calc.py`.

**20. Scenario / what-if planner** — ⭐⭐⭐⭐ · M · Quick
Sliders: "cut dining 20%, raise income 5%" → recompute projected FI date / goal ETA / runway
live. Ties FIRE + projection + runway into one interactive tool.

**21. Sankey cash-flow diagram** — ⭐⭐⭐⭐ · M · UX
Income sources → categories → savings/investment/expense. The most visually striking view a
finance app can show. Recharts lacks a good Sankey — add a small dedicated lib.

**23. Full-year calendar spending heatmap** — ⭐⭐⭐ · S · UX
GitHub-contribution-style grid, one cell/day colored by spend, for a whole year.
*Reuse:* the monthly `daily_spending_heatmap` already produces per-day totals — extend range.

**24–28 (bundle of small wins):** merchant analytics parsed from free-text notes (bridge to
the structured field in Axis 2); folding **dividend** projected income into net worth &
cash-flow (currently siloed); **budget-adherence streaks**; **tag-based analytics** (tags
exist but analytics are thin); **cost-of-living/burn** metrics (avg cost per day, expense-to-
income ratio trend). Each is S effort, ⭐⭐⭐.

---

## Axis 2 — New data to log (structural)

**1. Account opening balances** — ⭐⭐⭐⭐⭐ · S · Struct · *foundational*
Today net worth is purely transaction-derived, so any account not backfilled from day one is
wrong. Add `opening_balance` + `opening_as_of` to `dim_accounts` and offset all balance/net-
worth math by it. Small change, corrects the accuracy of everything downstream.
*Reuse:* `accounts_calc.py`, `net_worth_calc.py` — add the constant offset.

**8. True net worth: assets + liabilities** — ⭐⭐⭐⭐⭐ · L · Struct
Two new tables: **liabilities** (mortgage/loans/credit — principal, rate, min payment, term →
payoff schedule + interest projection) and **manual assets** (property, car, brokerage value,
crypto — with periodic value snapshots). Real net worth = cash accounts + assets − liabilities.
Also gives the **dividend portfolio** a home inside net worth instead of a silo.

**11. Merchant/payee structured field** — ⭐⭐⭐⭐ · M · Struct
Add `merchant` to `fct_transactions` (optionally a `dim_merchant`). Unlocks reliable merchant
analytics, better subscription detection, and AI auto-categorization keyed on merchant.

**16. Notifications / reminders infrastructure** — ⭐⭐⭐⭐ · M · Struct · *enabler*
The pattern already exists: a Raspberry-Pi cron calling an edge function
(`scripts/refresh_exchange_rates.py` → `refresh-exchange-rates`). Add a `notifications` table
+ a daily job for: bill/recurring due, budget overspend, low-balance/runway warning, weekly
digest email. Enables the "alert" half of many Axis-1 insights.

**18. Budget rollover / envelope mode** — ⭐⭐⭐⭐ · M · Struct
Carry unspent (or overspent) category budget into the next month. Extends `plan_json` shape
and `budgets_calc.get_month_budget_view()`.

**19. Split transactions** — ⭐⭐⭐⭐ · M · Struct
One purchase across multiple categories (supermarket = groceries + household + alcohol). Add a
line-items child table (or JSON on the transaction). Improves categorization accuracy for
real-world receipts.

**30–34 (smaller structural):** receipt/attachment storage (Supabase Storage);
recurring **end-date / occurrence count / auto-post** flags; **per-transaction original
currency** (foreign spend on a home account); first-class **financial goals** (target net
worth, savings rate, FI date); **net-worth snapshot table** (so history survives asset-value
edits — pairs with #8).

---

## Axis 3 — Modernization & AI (free via GitHub Models)

**3. AI monthly narrative — "your money in words"** — ⭐⭐⭐⭐ · S–M · AI
Feed the JSON already computed in `monthly_page_calc.py` to a GitHub Models model and get a
plain-language monthly review + 3 concrete, personalized tips. Cheap (free tier), high wow,
almost no new data plumbing — the analytics already exist.

**4. AI natural-language transaction entry** — ⭐⭐⭐⭐⭐ · M · AI
"spent 250 czk on groceries at Lidl yesterday" → parsed transaction (amount, category, date,
merchant, account) shown for confirm. The best quick-entry UX and a daily-use win given 2
years of manual entry. Pairs with the merchant field (#11) and auto-categorization.

**7. CSV / statement import (AI-assisted)** — ⭐⭐⭐⭐⭐ · M–L · AI
Export exists but not import. Import a bank CSV with column mapping, **AI-assisted
categorization**, and duplicate detection. The free, self-contained substitute for bank-sync;
removes most manual-entry burden. *Reuse:* mirror the denormalized shape in `export.py`; reuse
auto-categorization (#17).

**17. AI auto-categorization** — ⭐⭐⭐⭐ · M · AI
Suggest category / spending_type / tags from notes + merchant, on single entry and in bulk for
imports. Learns from your own history as few-shot examples.

**22. Chat with your finances** — ⭐⭐⭐ · M–L · AI
NL Q&A ("how much on coffee in 2025?") via a model with function-calling against existing
analytics endpoints. Very demo-able; lower priority for a personal tool but fun.

**29. "Year in Review" financial Wrapped** — ⭐⭐⭐ · M · UX
Annual recap (Spotify-Wrapped style) generated from `yearly_page_calc.py`. Combine with the AI
narrative for the copy.

**35–37 (UX polish):** PWA quick-entry / offline / installable; PDF monthly/annual statement
export; customizable/rearrangeable dashboard widgets.

---

## Recommended first wave

A tight bundle that mixes quick + structural and front-loads value:

1. **Account opening balances** (#1) — foundational accuracy fix, S effort.
2. **FIRE dashboard** (#2) — flagship nerd insight, existing data.
3. **AI monthly narrative** (#3) — fastest AI win, reuses existing analytics.
4. **AI natural-language entry** (#4) — biggest daily-workflow improvement.
5. **Subscription audit** (#5) + **cash-flow runway** (#6) — high-value existing-data insights.
6. Then structural investment: **true net worth (assets + liabilities)** (#8) and
   **CSV import** (#7).

This ships visible value early (2–3, 5–6 need no schema change), fixes correctness early (1),
and defers heavy structural work (7, 8) until the quick wins are banked.

---

## Next step

This is an idea backlog only — no implementation. When you pick an item it becomes its own
scoped task (schema migration + backend calc + frontend + types + verification). The **Reuse**
notes name the exact existing functions/files each idea should build on, so any pick converts
to an implementation plan quickly.
