# Common brief for phase-3 page builders

You are rebuilding ONE page of a personal-finance app to a new design. Repo: budgeting_dashboard (React + TS + Vite + Tailwind + shadcn frontend in src/frontend; FastAPI + Python backend in src/backend). You work in a git worktree: use YOUR CURRENT WORKING DIRECTORY, never /home/user/budgeting_dashboard directly.

FIRST STEP, before anything else: your worktree may have been created from an old commit. Run `git log --oneline -1`. If HEAD is not c577cda, run `git reset --hard c577cda` (you have no changes yet). Confirm docs/frontend/redesign-spec.md and src/frontend/src/components/data/BigFigure.tsx exist. Then `npm ci` in src/frontend.

Other agents are rebuilding other pages in parallel in their own worktrees. Commit your work locally with clear messages (do NOT push, do NOT open a PR, do not amend others' commits).

## Read first
- docs/frontend/redesign-spec.md: section 1 (decisions) and section 2 (style rules) are binding; section 4 has your page.
- docs/frontend/mockups/pages.html: the visual reference. Study the <style> block and your page's entry in the SCREENS object. Sizes, weights, spacing come from there.
- docs/frontend/redesign-inventory.md: your page's section and "Cross-cutting". DEFAULT RULE: every element and behaviour listed there is KEPT and restyled unless your page brief says otherwise. Nothing is dropped silently.
- The already-rebuilt reference pages, to match their code patterns exactly: src/frontend/src/pages/dashboard/DashboardOverview.tsx and src/frontend/src/pages/dashboard/TransactionsPage.tsx with pages/dashboard/transactions/*.
- Shared primitives to REUSE (do not duplicate): src/frontend/src/components/data/* (BigFigure, LeadSentence/LeadFigure, SplitBar, LineRows, RowList, SeriesLineChart, ChartLegend), components/ui/* (glass Dialog, line-style Input/Select via field-line.ts, pill Buttons, boxless Table, Field/FormAlert, EmptyState), hooks/use-form-errors.ts, hooks/use-add-transaction.ts, components/privacy/SensitiveValue.tsx, components/period/PeriodNavigator.tsx, lib/currency.ts.

## Style rules in one paragraph
No cards or boxes around content; structure comes from type size, whitespace and 1px hairlines. One very large light figure per page with a plain sentence under it. Glass only on floating chrome (already handled by primitives). Amber marks the primary action and at most one data point. Negative amounts red, income/favourable green, neutral muted. Bars are 2px lines under the row they belong to. Charts are frameless: faint gridlines, one amber series, dashed grey comparison, labelled end point, no gradient fills. Selection is an amber underline, not a filled pill. Category colour is a 6px dot. Numbers right-aligned and tabular. Comparisons use the six-month average.

## Ownership (to keep merges clean)
- You own your page's route file(s) and may create a sub-folder next to it for split files.
- components/data/*: you may ADD new files; do not change existing ones' behaviour (if one needs a new optional prop, add it backward-compatibly and say so in your report).
- components/ui/*, components/layout/*, index.css, tailwind.config.ts: do NOT edit. Report anything you think must change.
- src/frontend/src/lib/i18n.ts: edit ONLY your page's block(s) in each locale (en-US and cs-CZ), named in your page brief. Add keys; remove keys only when a grep proves them unused. Do not reformat.
- Other pages: do not edit.

## Quality bar
- Every amount through the existing currency formatters and SensitiveValue ("hide amounts" must mask everything, incl. sentences, chart labels, tooltips, aria-labels).
- Dark theme primary; light theme must stay legible (tokens only, no hard-coded dark colours).
- Responsive: single column below 1024px; no horizontal overflow at 360px; the mobile dock covers the bottom ~7rem (the layout already pads for it).
- Loading skeleton matching the new layout, empty state, and an error state WITH a retry button.
- Every visible string and aria-label in both locales. Sentences from i18n templates with parameters, never concatenation. Plurals via the pattern used for the transactions count (Intl.PluralRules + separate keys).
- Accessibility: labelled controls, visible focus, keyboard-operable menus/dialogs, accessible names for charts and icon buttons.
- TypeScript strict, no `any`. Check each file's line endings before editing and preserve them (some files are CRLF; `grep -c $'\r' file`). Beware: `cn()` (tailwind-merge) drops a `leading-*` class placed before a `text-[size]` class.
- Do not change API contracts unless your page brief says so. If you change the backend: mirror existing calculation conventions, update Pydantic schemas and TS types, add pure-function tests, and run exactly what CI runs for the backend (.github/workflows/ci.yml: ruff, mypy, pytest). Note: with the pinned postgrest, `.range(start, end)` has an EXCLUSIVE end.

## Verify (required)
- src/frontend: `npm run check` and `npm run lint` pass.
- Browser: Playwright is pre-installed (`require('playwright')`, chromium.launch() with no options; never run playwright install). Start `VITE_API_BASE_URL=http://api.mock npx vite --host 127.0.0.1 --port <YOUR PORT> --strictPort` from src/frontend in the background. Mock harnesses live in /tmp/claude-0/-home-user-budgeting-dashboard/9ee918a9-26b9-5920-823c-3e3db07825a5/scratchpad/ : mock.cjs (base) and mock2.cjs (flags on, more rows, 0-target fund); both export `open({width,height,mobile,authed,overrides})` -> `{browser,page,errors,unhandled}` where `overrides` is `{'GET /path': (route, ok, req) => ok(body, status?)}` matched by method + path prefix. COPY one to a new file prefixed with your page name and extend the copy with realistic data for your page's endpoints (read the TS response types and backend schemas for exact shapes). All your scripts and screenshots go in that scratchpad directory with your page-name prefix; never in the repo; never overwrite files you did not create.
- Check at 1280x900, 1024x768, 390x844 and 360x740: normal data, empty, API error + retry, hide-amounts on, light theme, cs-CZ (profile `user_metadata.locale`), every dialog and menu on the page, every mutation (capture the outgoing request and compare with what the old page sent: `git show c577cda:<path>`). No page errors, no horizontal overflow.
- Compare a 1280px screenshot with the mockup (open docs/frontend/mockups/pages.html#<screen> via file://; CDN fonts/icons will not load there) and fix differences in layout, sizes and spacing.
- Stop the dev server when done.

## Report (final message; concise; facts only)
Worktree path, branch, commit hashes. Files changed. Exact check results. For each inventory row of your page: kept / restyled / changed (how) / removed (why) — as a compact list. What you verified in the browser and what you could not. Decisions the spec did not settle. Anything left undone. Shared primitives you added or think need changing.
