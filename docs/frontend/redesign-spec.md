# Frontend redesign spec (draft)

Status: draft for editing. Nothing in this document is implemented yet.
Last updated: 2026-11-12.

Reference mockups (private Claude artifacts, sample data):

- Pages in the chosen style: https://claude.ai/artifact/LHc8DgM5DyxRYr6fj7jfLD
- Layout iterations (layout 1 was chosen): https://claude.ai/artifact/HL2pbCs7CbXCHpjBZv8msE
- Earlier glass samples with five accent colours: https://claude.ai/artifact/6Gk5C8dgQpTiT97kk19E77

The pages mockup was updated on 2026-11-12 (second pass) to match the decisions in
section 1. Where a mockup and this document disagree, this document wins. See
"Mockup status" at the end.

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
| Landing footer | Upgraded: closing call to action, data facts, link columns with contact, legal line |

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
15. **Compare with the average.** The small change under a figure and the dashed line
    in a chart both use the average of the last six months.
16. **Type side line.** Rows that have a type or state carry a thin vertical line on the
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

- Redrawn in the second pass. The first mock was too flat and led with net worth, which
  is not what is checked.
- Focus: each account's balance, and each group's total (for example Revolut across
  currencies).
- Hierarchy: a group is a heading with its total on the right; its accounts sit
  indented beneath; the balance is the largest thing on each row, with this month's
  change beside it and a 30-day trace.
- Accounts outside a group are listed under "Other accounts" with their own total.
- Net worth is secondary: a small figure and trace in the page header.
- Not yet decided: "invested" chip on net worth, Foreign Currencies section, inactive
  accounts, per-account 30-day chart.

### Savings funds

- Redrawn in the second pass.
- Each row: fund name, **saved amount as the main figure**, target and progress as
  supporting text, last-30-days flow. A faint line under the row still shows progress.
- A fund without a target shows "No target" and no progress line.
- Side line colour: green if money went in during the last 30 days, red if it came out,
  grey if nothing moved.
- Page headline: total saved across funds.
- Not yet decided: sort options, inactive funds.

### Monthly analytics

- Four figures split by lines: income, expenses, savings rate, left. Each compared with
  the six-month average.
- Daily spending strip: one bar per day, with a **dashed amber average line**. Days
  above the average are slightly brighter. No single day is highlighted.
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
- No large summary figures. One quiet line above the table: planned in, allocated,
  left to plan.
- The plan column is the editable one and the brightest; each plan value sits on an
  input line. "Add row" under every section, including an empty Investments section.

### Landing

- Same language as the app: one sentence, one figure, three short explanations, no card
  grid.
- Remove the leftover sentence on the current page: "The landing page does not need to
  explain every screen."
- Ends with the upgraded footer below.

### Footer (landing and all public pages)

Today's footer is a brand blurb and three link columns (Product, Project, Legal). The
upgrade adds contact, plain statements about data, and a legal line. It is used on the
landing page and on FAQ, How it works, About, Terms, Privacy and the demo.

Style reference requested: the footer on barleysolutions.cz. **That page could not be
opened from the build environment (host blocked), so the mock is an independent
proposal.** To align with the reference, either allow that host or add a screenshot,
then revise this section.

Structure, top to bottom:

1. **Closing call to action.** A large line ("Start with this month.") with Create
   account and Try the demo.
2. **Data facts.** Four short statements split by lines. Each must stay true:
   - No bank connection: records are entered by the user.
   - Export: transactions can be exported from Profile.
   - Delete: the account and its data can be deleted from Profile.
   - Open source: MIT licence, code on GitHub.
3. **Link columns.**
   - Brand and one-line description.
   - Product: How it works, FAQ, Demo.
   - Project: About, Source on GitHub, MIT licence.
   - Legal: Privacy Policy, Terms of Service.
   - Contact: email address, GitHub profile.
4. **Legal line.** Copyright and author, where data is stored and hosted (Supabase,
   Render), language switch (English / Čeština).

To decide before build:

- Compliance wording. Nothing may be claimed that is not in the Privacy Policy. Check
  whether a GDPR statement, data region, or cookie notice should be named here, and
  whether a cookie policy link is needed.
- Whether a postal address or business identifier is required or wanted.
- Whether the app (signed-in) pages get a reduced footer or none.
- Whether the language switch belongs in the footer, the top bar, or both.
- Mobile layout: columns stack; the data facts become a two-by-two grid.

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
   different marker than colour? (The mock adds the word "over".)
8. Footer: see the "To decide before build" list in the Footer section.
9. Transactions: with every spending row red, is the type side line still needed, or
   does it now duplicate the amount colour?

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

## Mockup status

The pages mockup (second pass) now reflects:

- Spending in red, income in green.
- Comparisons and the dashed chart line against the six-month average.
- Monthly daily strip with an average line and no highlighted day.
- Icon-only mobile dock with Add in the middle.
- Funds, Accounts and Budget Maker redrawn as described above.
- Transactions with month, account, type and tags visible, and the type side line.
- Landing with the proposed footer.

Still not reflected or not drawn:

- Light theme.
- The footer on mobile, and on public pages other than the landing page.
- Everything under "Not yet drawn" and every "Not yet decided" item in section 4.
- The typeface has not been checked on a real screen.
- The mockup source files are not in this repository; they exist only as the published
  artifacts linked at the top.
