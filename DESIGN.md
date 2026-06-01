# Design System

## Intent

Budgeting Dashboard should feel like a practical finance workspace. The design system optimizes for scanning balances, reviewing transactions, and making small repeated decisions without visual noise.

## Typography

- Use one system sans stack for UI, headings, labels, and navigation.
- Keep `font-display` as a compatibility alias, but it resolves to the same sans stack.
- Use `font-mono` only for amounts, identifiers, formulas, and tabular values.
- Avoid decorative serif accents in product UI. Marketing pages should be rewritten before using any display typography.

## Color

- Default strategy: restrained dark/light surfaces with amber reserved for primary action, focus, and current selection.
- Use semantic chart roles from `src/frontend/src/lib/chart-colors.ts` instead of page-local chart colors.
- Use color for financial meaning, state, and priority. Do not use glow, glass, or gradients as decoration.

## Surfaces

- Cards use `rounded-xl`, a 1px border, and `shadow-card` only when elevation is useful.
- Interactive cards should change border or background on hover, not glow.
- Avoid nested cards. Use sections, grids, separators, and tables for dense dashboard surfaces.

## Components

- Primary buttons are filled primary actions.
- Secondary, outline, and ghost buttons should remain visually quiet.
- Inputs, selects, dialogs, drawers, and dropdowns should use the shared shadcn-style primitives.
- Icon-only actions need an accessible label and visible keyboard focus.

## Auth Pages

- Preserve the current two-column desktop structure and focused mobile form.
- The left desktop panel should provide product context: clear monthly summary, spending analytics, and savings goals.
- Avoid poetic onboarding copy. Use direct task-oriented language.
- OAuth options should look like account providers, not marketing CTAs.
- Loading and error states should be calm, specific, and consistent with form controls.

## Motion

- Use motion only for state feedback or small surface transitions.
- Avoid page-load choreography for dashboard and auth workflows.
- Reduced-motion behavior is required for any non-trivial animation.
