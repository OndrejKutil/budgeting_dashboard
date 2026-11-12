# Frontend redesign spec (draft)

Status: draft for editing. Nothing in this document is implemented yet.
Last updated: 2026-11-12.

Reference mockups (private Claude artifacts, sample data):

- Pages in the chosen style: https://claude.ai/artifact/LHc8DgM5DyxRYr6fj7jfLD
- Layout iterations (layout 1 was chosen): https://claude.ai/artifact/HL2pbCs7CbXCHpjBZv8msE

The mockups predate some decisions below. Where they disagree, this document wins.
See "Mockup differences" at the end.

---

## 1. Decisions made

| Topic | Decision |
|---|---|
| Direction | Quiet glass: glass only on floating chrome, no card grid |
| Layout | Layout 1, floating top bar, no sidebar |
| Brand colour | Amber, kept |
| Theme | Dark by default, user can switch to light |
| Overview headline | "Left this month" (income − spending − saving) |
| Comparisons | Against the average of the last six months |
| Negative amounts | Red, as today. Income green |
| Form fields | Label over a line, no box |
| Mobile navigation | Bottom glass dock, icons only, Add button in the middle |
| Funds | Saved amount is the main figure per fund; side line shows recent activity |
| Accounts | Individual accounts and groups are the focus, not net worth |
| Budget Maker | Primarily an editing tool; actuals are secondary |
| Transactions filters | Tags, month/date, account and type stay visible; the rest behind a button |

---

## 2. Style rules

1. **No boxes around content.** Sections are separated by space and one-pixel lines.
   Cards, panels and tiles are not used for data.
2. **One large figure per page.** Each page opens with the number that answers it.
   Light weight, very large.
3. **A sentence under the figure.** One plain sentence says what the number is made of,
   with the key amounts in brighter text.
4. **Glass only where things float.** Top bar, menus, dialogs, mobile dock and sheet.
   Never behind tables or figures.
5. **Amber marks one thing per view.** The primary action, plus at most one data point
   that deserves attention.
6. **Amount colours.** Negative amounts red, income green, zero and neutral values muted.
   Errors also use red, so an error must always come with an icon or message, never
   colour alone.
7. **Bars are lines.** Progress and proportion are a two-pixel line under the row they
   belong to, not a separate bar in a track.
8. **Charts without frames.** No chart card and no legend box: faint gridlines, one amber
   series, a dashed grey comparison, a labelled end point. No gradient fills.
9. **Words for navigation.** Text labels in the top bar and for filters. Icons appear
   next to actions and in the mobile dock.
10. **Underlined selection.** The current filter, tab or range has an amber underline,
    not a filled pill. The top bar's active item is the one exception.
11. **Category colour is a dot.** A six-pixel dot before the category name. No coloured
    badges.
12. **Form fields are a label over a line.** The bottom line thickens and turns red on
    error, with the message directly beneath (behaviour already shipped in PR #94).
13. **One typeface, four weights.** A single grotesque with tabular figures.
14. **Numbers align right, always tabular.**
15. **Type side line.** Rows that have a type or state carry a thin vertical line on the
    side, as transaction rows do today. Used for transactions (type) and funds (recent
    activity).

### Tokens (proposed, dark)

| Token | Value | Use |
|---|---|---|
| Background | `#0a0b0d` | Page |
| Ink | `#f2f2f0` | Primary text |
| Muted | `#9a9c9f` | Secondary text |
| Faint | `#63666b` | Column headings, axis labels |
| Line | white at 10 % | Dividers |
| Amber | `#f5a524` | Primary action, one highlight |
| Positive | `#6fd6a3` | Income, favourable change |
| Negative | `#ff8a80` | Spending, errors, over plan |
| Glass | white at 6 %, 26px blur, 1px top highlight | Floating chrome |

Backdrop: a single faint amber glow behind the top of the page so the glass has
something to refract. No other gradients.

Typeface: Hanken Grotesk proposed (300/400/500/600). **Not yet verified on a real
screen.**

Light theme: not designed yet. Needs its own token set and a mock before build.

---

## 3. Navigation

### Desktop: floating top bar

Brand on the left, a glass pill of links in the centre, month switcher and avatar on
the right.

| Top bar | Contains |
|---|---|
| Overview | |
| Transactions | |
| Accounts | |
| Funds | |
| Analytics ▾ | Monthly, Yearly, Cash Flow, Emergency Fund |
| Plan ▾ | Budget Maker, Recurring, Categories |
| Tools ▾ | Screenshot Import, Trading212, Investing Calculator, Dividend Calculator |
| Avatar | Profile & settings, Hide amounts, Sign out |

### Mobile: bottom glass dock

Five positions, icons only, no labels: Overview, Transactions, **Add** (amber, centre),
Funds, More. "More" opens the remaining pages. Icons need accessible names.

### Keyboard

- `N` opens Add transaction.
- Enter submits forms (shipped in PR #94).
- Open gaps from PR #94 to close during the redesign: tag chips removable by keyboard,
  arrow keys on the Transaction / Transfer / From fund switch.

---

## 4. Pages

Each page lists what the mock shows and what the real page has today that the mock
left out. **The "not yet decided" items were dropped by accident, not on purpose.**
Each needs a keep / restyle / remove decision.

### Overview

- Headline: Left this month, with the sentence "You earned X, spent Y and put Z aside."
- One bar splitting income into spent / saved / left.
- Where it went: category rows with a line under each.
- Spending through the month: amber line, dashed grey line for the six-month average.
- Latest transactions.
- Not yet decided: Largest Transactions, Net Profit, Spotlight, Share of Wallet,
  Category Top 3, Net Cash Flow figure.

### Transactions

- Heading with count. Actions: Import screenshot, Add transaction.
- Visible filters: search, month/date, account, type, tags.
- Behind the filter button: category, fund, amount range, year.
- Table without a box: date, notes, category (dot), account, amount.
- Type side line on each row, as today.
- Keep from today: pagination, filtered summary total, row actions (edit, copy, delete),
  tag management.

### Add / edit transaction

- Glass dialog on desktop, glass bottom sheet on mobile.
- Switch: Transaction / Transfer / From fund (underlined selection).
- Amount as the headline, then notes, date, account, category, fund, tags.
- Keep all behaviour from PR #94: inline errors, in-dialog save error, cross-currency
  transfer fields.

### Accounts

- **To be redrawn.** The mock was too flat and led with net worth, which is not what is
  checked.
- Focus: each account's balance, and each group's total (for example Revolut across
  currencies).
- Hierarchy to establish: group as a clear heading with its total; accounts beneath;
  balance as the largest thing on each row.
- Net worth becomes secondary (smaller figure and chart).
- Not yet decided: "invested" chip on net worth, Foreign Currencies section, inactive
  accounts, per-account 30-day chart.

### Savings funds

- **To be redrawn.**
- Each row: fund name, **saved amount as the main figure**, target and progress as
  supporting text, last-30-days flow.
- Side line colour: green if money went in during the last 30 days, red if it came out,
  grey if nothing moved.
- Page headline: total saved across funds.
- Not yet decided: sort options, inactive funds.

### Monthly analytics

- Four figures split by lines: income, expenses, savings rate, left. Each compared with
  the six-month average.
- Daily spending strip: one bar per day, with a **horizontal average line**. No
  highlighted highest day.
- Three columns: expense categories, income sources, spending type.
- Export PDF.
- Not yet decided: comparison with the same month last year (today's page has it),
  full expense category table, whether donuts are fully replaced by rows.

### Budget Maker

- Editing comes first: rows must be quick to add, rename, re-amount and reorder.
- Table: item, linked categories/tags, plan, actual, difference. Section headings carry
  totals.
- Actual and difference are secondary; a row over plan is marked.
- Keep from today: drag to reorder, per-row "Total" toggle, autosave status, copy to
  another month, Investments section.
- The summary figures above the table in the mock should be reduced, since the page is
  mainly used for editing.

### Landing

- Same language as the app: one sentence, one figure, three short explanations, no card
  grid.
- Remove the leftover sentence on the current page: "The landing page does not need to
  explain every screen."

### Not yet drawn

Yearly analytics (heatmap), Cash Flow (Sankey), Emergency Fund, Categories, Recurring,
Screenshot Import, Trading212, Investing Calculator, Dividend Calculator, Profile, auth
pages, FAQ / How it works / About, the public demo.

---

## 5. Open questions

1. Accounts: should net worth stay on the Accounts page at all, or move to Overview or
   Analytics?
2. Monthly analytics: keep the same-month-last-year comparison alongside the six-month
   average?
3. Overview: which of the dropped blocks come back (see the list above)?
4. Donut charts: replace everywhere with rows, or keep one where a part-of-whole view
   matters?
5. Light theme: when, and how close to the dark one?
6. Typeface: confirm Hanken Grotesk after seeing it rendered, or pick another.
7. Amount colours: with spending in red, does "over plan" in Budget Maker need a
   different marker than colour?

---

## 6. Suggested order of work

1. Inventory: go through every real page and list each section and control as keep,
   restyle or remove. Resolves the "not yet decided" lists.
2. Redraw Accounts and Funds; apply the mockup differences below.
3. Draw the pages not yet drawn, at least Yearly, Cash Flow and Categories.
4. Build: theme tokens and top bar first, then Overview and Transactions, then the
   rest page by page. Landing can ship independently.
5. Light theme.

---

## Mockup differences

The page mockups still show these, which the decisions above have changed:

- Negative amounts in white. They should be red.
- Comparisons against December. They should be against the six-month average.
- Monthly daily strip highlights the highest day. It should show an average line.
- Mobile dock has text labels. It should be icons only.
- Funds rows lead with progress. They should lead with the saved amount and carry the
  activity side line.
- Accounts leads with net worth and has flat rows. To be redrawn.
- Transactions shows All / Spending / Income / Saving as the visible filters. The
  visible set should be month/date, account, type and tags.
- Budget Maker has three large summary figures. To be reduced.
