export const CHART_COLORS = {
  income: 'hsl(var(--chart-income))',
  expense: 'hsl(var(--chart-expense))',
  savings: 'hsl(var(--chart-savings))',
  investment: 'hsl(var(--chart-investment))',
  profit: 'hsl(var(--chart-profit))',
  cashFlow: 'hsl(var(--chart-cashflow))',
  core: 'hsl(var(--chart-core))',
  necessary: 'hsl(var(--chart-necessary))',
  fun: 'hsl(var(--chart-fun))',
  future: 'hsl(var(--chart-future))',
  neutral: 'hsl(var(--chart-neutral))',
} as const;

export const CATEGORY_CHART_COLORS = [
  CHART_COLORS.expense,
  CHART_COLORS.necessary,
  CHART_COLORS.fun,
  CHART_COLORS.core,
  CHART_COLORS.future,
  CHART_COLORS.investment,
  CHART_COLORS.savings,
  CHART_COLORS.neutral,
] as const;
