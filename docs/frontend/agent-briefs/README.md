# Agent briefs for the redesign build

Working notes for the subagents that rebuild pages. Not product documentation; delete
when the redesign is finished.

- `page-builder.md`: common brief given to every page builder. The paths under `/tmp`
  refer to a session scratch directory and must be replaced in a new session.
- `page-reviewer.md`: common brief given to every page reviewer.
- `mock-harness.cjs`: Playwright helper that fakes a signed-in session and mocks the API,
  so pages render without a backend. Extend a copy with page-specific data.

## Status (update as phases land)

| Phase | Scope | State |
|---|---|---|
| 1 | Theme, typeface, top bar, mobile dock, N shortcut | merged |
| 2 | Overview (incl. backend six-month average), Transactions, shared form/dialog/table primitives | merged |
| 3 | Accounts, Funds, Budget Maker, Monthly analytics | in progress |
| 3a | Large-screen scaling (fluid root size, rem sizes), Latest row overflow fix | in progress |
| 4 | Landing, footer, public and auth pages | not started |
| 5 | Yearly, Cash Flow, Emergency Fund, Categories, Recurring, tools, Profile, Demo | not started |
| 6 | Light theme pass | not started |

## Conventions learned so far

- Sizes that should scale are in rem; px only for 1-3px lines, blur and breakpoints.
- Rows with text on the left and an amount on the right: left part `min-w-0` + truncate.
- With the pinned postgrest client, `.range(start, end)` has an exclusive end.
- `cn()` drops a `leading-*` class placed before a `text-[size]` class.
- Agent worktrees may start from an old commit: reset to the branch head first.
- Some files use CRLF line endings (AccountsPage.tsx, App.tsx): preserve them.
