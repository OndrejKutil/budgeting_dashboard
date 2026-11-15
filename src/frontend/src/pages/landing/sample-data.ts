import type { SankeyInput } from '@/components/analytics/SankeyChart';

/**
 * One invented month (January 2026) behind the whole landing page. Every total is derived from
 * the parts below, so the headline, both charts and the sentences always reconcile.
 */
export const SAMPLE_MONTH = { name: 'January', year: 2026, days: 31 } as const;

const INCOME = { Salary: 30000, 'Side work': 2491 };
const EXPENSES = {
  Rent: 7200,
  Groceries: 3650,
  Utilities: 1890,
  Transport: 1450,
  'Eating out': 1280,
  'Everything else': 3209,
};
const SAVINGS = { 'Emergency reserve': 5000, Vacation: 2975 };

const sum = (record: Record<string, number>) => Object.values(record).reduce((total, value) => total + value, 0);

export const income = sum(INCOME);
export const spent = sum(EXPENSES);
export const saved = sum(SAVINGS);
/** No investments in the sample month. */
export const cashFlow = income - spent - saved;

export const sankeyInput: SankeyInput = {
  income_by_category: INCOME,
  expense_by_category: EXPENSES,
  saving_by_category: SAVINGS,
  investment_by_category: {},
  total_saving: saved,
  total_investment: 0,
};

/** Spending per day of the month (index 0 is the 1st): rent first, then uneven steps. */
const DAILY_SPENDING = [
  7200, 340, 0, 412, 0, 1890, 285, 0, 330, 215, 0, 540, 1150, 0, 420, 380, 0, 705, 160, 0, 1450, 310, 0, 628, 1059, 0, 275,
  520, 0, 410, 0,
];

const cumulative = (values: number[]) => {
  let running = 0;
  return values.map((value) => (running += value));
};

/** Cumulative spending, day by day. */
export const dailyCumulative = cumulative(DAILY_SPENDING);

/** Six-month average, cumulative: a smooth line from the usual rent-day jump to its month-end total. */
const AVERAGE_FIRST_DAY = 7000;
const AVERAGE_TOTAL = 20400;
export const averageCumulative = Array.from({ length: SAMPLE_MONTH.days }, (_, index) =>
  Math.round(AVERAGE_FIRST_DAY + (AVERAGE_TOTAL - AVERAGE_FIRST_DAY) * Math.pow(index / (SAMPLE_MONTH.days - 1), 0.92)),
);

export const spentByMonthEnd = dailyCumulative[dailyCumulative.length - 1];
export const averageByMonthEnd = averageCumulative[averageCumulative.length - 1];

const NUMBER = new Intl.NumberFormat('cs-CZ');
const AXIS = new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (value: number) => NUMBER.format(value);
/** Amount followed by "Kč", joined by a no-break space. */
export const formatKc = (value: number) => `${NUMBER.format(value)}\u00a0Kč`;
export const formatAxis = (value: number) => AXIS.format(value);
