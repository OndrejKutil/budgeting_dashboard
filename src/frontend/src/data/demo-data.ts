export type DemoMonth = 'apr' | 'may' | 'jun';

export interface DemoAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  currency: string;
  history_30d: { balance: number }[];
  net_flow_30d: number;
}

export interface DemoTransaction {
  id: string;
  date: string;
  notes: string;
  category: string;
  categoryType: 'income' | 'expense' | 'saving' | 'investment';
  spendingType: 'Core' | 'Necessary' | 'Fun' | 'Future' | 'Income';
  account: string;
  amount: number;
}

export interface DemoComparison {
  income_delta_pct: number;
  expenses_delta_pct: number;
  savings_delta_pct: number;
  investments_delta_pct: number;
  profit_delta_pct: number;
  cashflow_delta_pct: number;
}

export interface DemoMonthlySummary {
  label: string;
  income: number;
  expenses: number;
  savings: number;
  investing: number;
  cashflow: number;
  profit: number;
  savings_rate: number;
  investment_rate: number;
  comparison: DemoComparison;
  spendingByType: { core: number; necessary: number; fun: number; future: number };
  incomeBreakdown: { category: string; amount: number }[];
  dailySpending: { date: string; amount: number }[];
  byCategory: { name: string; amount: number; color: string }[];
}

// Helpers for generating smooth mock histories
function makeHistory(start: number, end: number, points = 30): { balance: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const noise = (Math.sin(i * 2.3) * 0.04 + Math.cos(i * 1.7) * 0.03) * Math.abs(end - start);
    return { balance: Math.round(start + (end - start) * t + noise) };
  });
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'acc-1', name: 'Main Checking', type: 'checking', balance: 38400, currency: 'CZK',
    history_30d: makeHistory(35600, 38400),
    net_flow_30d: 2800,
  },
  {
    id: 'acc-2', name: 'Savings Account', type: 'savings', balance: 151000, currency: 'CZK',
    history_30d: makeHistory(146000, 151000),
    net_flow_30d: 5000,
  },
  {
    id: 'acc-3', name: 'Credit Card', type: 'credit', balance: -4200, currency: 'CZK',
    history_30d: makeHistory(-1800, -4200),
    net_flow_30d: -2400,
  },
  {
    id: 'acc-4', name: 'ETF Portfolio', type: 'investment', balance: 224000, currency: 'CZK',
    history_30d: makeHistory(216000, 224000),
    net_flow_30d: 8000,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Housing: 'hsl(var(--chart-core))',
  Utilities: 'hsl(var(--chart-core))',
  Groceries: 'hsl(var(--chart-necessary))',
  Transport: 'hsl(var(--chart-necessary))',
  Healthcare: 'hsl(var(--chart-necessary))',
  'Dining Out': 'hsl(var(--chart-fun))',
  Entertainment: 'hsl(var(--chart-fun))',
  Fitness: 'hsl(var(--chart-fun))',
  Investing: 'hsl(var(--chart-investment))',
  'Vacation Fund': 'hsl(var(--chart-savings))',
  'Emergency Fund': 'hsl(var(--chart-savings))',
};

export const DEMO_MONTHLY_DATA: Record<DemoMonth, DemoMonthlySummary> = {
  apr: {
    label: 'April 2026',
    income: 58500,
    expenses: 28900,
    savings: 5000,
    investing: 9500,
    cashflow: 15100,
    profit: 29600,
    savings_rate: 8.5,
    investment_rate: 16.2,
    comparison: {
      income_delta_pct: -7.6,
      expenses_delta_pct: -7.7,
      savings_delta_pct: 66.7,
      investments_delta_pct: 0,
      profit_delta_pct: -7.5,
      cashflow_delta_pct: -13.7,
    },
    spendingByType: { core: 16500, necessary: 7800, fun: 4600, future: 14500 },
    incomeBreakdown: [
      { category: 'Salary', amount: 52500 },
      { category: 'Freelance', amount: 6000 },
    ],
    dailySpending: [
      { date: 'Apr 1', amount: 14500 }, { date: 'Apr 2', amount: 420 },
      { date: 'Apr 3', amount: 2200 }, { date: 'Apr 4', amount: 890 },
      { date: 'Apr 5', amount: 340 }, { date: 'Apr 6', amount: 0 },
      { date: 'Apr 7', amount: 1200 }, { date: 'Apr 8', amount: 560 },
      { date: 'Apr 9', amount: 990 }, { date: 'Apr 10', amount: 1560 },
      { date: 'Apr 11', amount: 240 }, { date: 'Apr 12', amount: 680 },
      { date: 'Apr 13', amount: 0 }, { date: 'Apr 14', amount: 1350 },
      { date: 'Apr 15', amount: 820 }, { date: 'Apr 16', amount: 310 },
      { date: 'Apr 17', amount: 450 }, { date: 'Apr 18', amount: 1100 },
      { date: 'Apr 19', amount: 280 }, { date: 'Apr 20', amount: 760 },
      { date: 'Apr 21', amount: 1280 }, { date: 'Apr 22', amount: 390 },
      { date: 'Apr 23', amount: 540 }, { date: 'Apr 24', amount: 920 },
      { date: 'Apr 25', amount: 180 }, { date: 'Apr 26', amount: 430 },
      { date: 'Apr 27', amount: 0 }, { date: 'Apr 28', amount: 1640 },
      { date: 'Apr 29', amount: 510 }, { date: 'Apr 30', amount: 290 },
    ],
    byCategory: [
      { name: 'Housing', amount: 14500, color: CATEGORY_COLORS['Housing'] },
      { name: 'Groceries', amount: 4800, color: CATEGORY_COLORS['Groceries'] },
      { name: 'Utilities', amount: 2000, color: CATEGORY_COLORS['Utilities'] },
      { name: 'Transport', amount: 1980, color: CATEGORY_COLORS['Transport'] },
      { name: 'Dining Out', amount: 2840, color: CATEGORY_COLORS['Dining Out'] },
      { name: 'Entertainment', amount: 970, color: CATEGORY_COLORS['Entertainment'] },
      { name: 'Fitness', amount: 990, color: CATEGORY_COLORS['Fitness'] },
      { name: 'Healthcare', amount: 820, color: CATEGORY_COLORS['Healthcare'] },
    ],
  },
  may: {
    label: 'May 2026',
    income: 63200,
    expenses: 31500,
    savings: 5000,
    investing: 9500,
    cashflow: 17200,
    profit: 31700,
    savings_rate: 7.9,
    investment_rate: 15.0,
    comparison: {
      income_delta_pct: 8.0,
      expenses_delta_pct: 9.0,
      savings_delta_pct: 0,
      investments_delta_pct: 0,
      profit_delta_pct: 7.1,
      cashflow_delta_pct: 13.9,
    },
    spendingByType: { core: 17200, necessary: 8500, fun: 5800, future: 14500 },
    incomeBreakdown: [
      { category: 'Salary', amount: 52500 },
      { category: 'Freelance', amount: 10700 },
    ],
    dailySpending: [
      { date: 'May 1', amount: 14500 }, { date: 'May 2', amount: 340 },
      { date: 'May 3', amount: 2180 }, { date: 'May 4', amount: 1240 },
      { date: 'May 5', amount: 560 }, { date: 'May 6', amount: 0 },
      { date: 'May 7', amount: 890 }, { date: 'May 8', amount: 720 },
      { date: 'May 9', amount: 990 }, { date: 'May 10', amount: 1560 },
      { date: 'May 11', amount: 430 }, { date: 'May 12', amount: 580 },
      { date: 'May 13', amount: 0 }, { date: 'May 14', amount: 1820 },
      { date: 'May 15', amount: 640 }, { date: 'May 16', amount: 380 },
      { date: 'May 17', amount: 920 }, { date: 'May 18', amount: 1340 },
      { date: 'May 19', amount: 210 }, { date: 'May 20', amount: 870 },
      { date: 'May 21', amount: 1590 }, { date: 'May 22', amount: 450 },
      { date: 'May 23', amount: 690 }, { date: 'May 24', amount: 1120 },
      { date: 'May 25', amount: 310 }, { date: 'May 26', amount: 680 },
      { date: 'May 27', amount: 0 }, { date: 'May 28', amount: 2100 },
      { date: 'May 29', amount: 730 }, { date: 'May 30', amount: 420 },
      { date: 'May 31', amount: 180 },
    ],
    byCategory: [
      { name: 'Housing', amount: 14500, color: CATEGORY_COLORS['Housing'] },
      { name: 'Groceries', amount: 5200, color: CATEGORY_COLORS['Groceries'] },
      { name: 'Utilities', amount: 2700, color: CATEGORY_COLORS['Utilities'] },
      { name: 'Transport', amount: 2100, color: CATEGORY_COLORS['Transport'] },
      { name: 'Dining Out', amount: 3650, color: CATEGORY_COLORS['Dining Out'] },
      { name: 'Entertainment', amount: 1160, color: CATEGORY_COLORS['Entertainment'] },
      { name: 'Fitness', amount: 990, color: CATEGORY_COLORS['Fitness'] },
      { name: 'Healthcare', amount: 1200, color: CATEGORY_COLORS['Healthcare'] },
    ],
  },
  jun: {
    label: 'June 2026',
    income: 57800,
    expenses: 30200,
    savings: 7000,
    investing: 9500,
    cashflow: 11100,
    profit: 27600,
    savings_rate: 12.1,
    investment_rate: 16.4,
    comparison: {
      income_delta_pct: -8.5,
      expenses_delta_pct: -4.1,
      savings_delta_pct: 40.0,
      investments_delta_pct: 0,
      profit_delta_pct: -12.9,
      cashflow_delta_pct: -35.5,
    },
    spendingByType: { core: 16800, necessary: 8200, fun: 5200, future: 16500 },
    incomeBreakdown: [
      { category: 'Salary', amount: 52500 },
      { category: 'Freelance', amount: 5300 },
    ],
    dailySpending: [
      { date: 'Jun 1', amount: 14500 }, { date: 'Jun 2', amount: 380 },
      { date: 'Jun 3', amount: 2100 }, { date: 'Jun 4', amount: 820 },
      { date: 'Jun 5', amount: 490 }, { date: 'Jun 6', amount: 0 },
      { date: 'Jun 7', amount: 1180 }, { date: 'Jun 8', amount: 640 },
      { date: 'Jun 9', amount: 990 }, { date: 'Jun 10', amount: 1560 },
      { date: 'Jun 11', amount: 320 }, { date: 'Jun 12', amount: 760 },
      { date: 'Jun 13', amount: 0 }, { date: 'Jun 14', amount: 1490 },
      { date: 'Jun 15', amount: 580 }, { date: 'Jun 16', amount: 250 },
      { date: 'Jun 17', amount: 840 }, { date: 'Jun 18', amount: 1230 },
      { date: 'Jun 19', amount: 170 }, { date: 'Jun 20', amount: 920 },
      { date: 'Jun 21', amount: 1380 }, { date: 'Jun 22', amount: 410 },
      { date: 'Jun 23', amount: 630 }, { date: 'Jun 24', amount: 990 },
      { date: 'Jun 25', amount: 280 }, { date: 'Jun 26', amount: 550 },
      { date: 'Jun 27', amount: 0 }, { date: 'Jun 28', amount: 1780 },
      { date: 'Jun 29', amount: 490 }, { date: 'Jun 30', amount: 340 },
    ],
    byCategory: [
      { name: 'Housing', amount: 14500, color: CATEGORY_COLORS['Housing'] },
      { name: 'Groceries', amount: 4900, color: CATEGORY_COLORS['Groceries'] },
      { name: 'Utilities', amount: 2300, color: CATEGORY_COLORS['Utilities'] },
      { name: 'Transport', amount: 1980, color: CATEGORY_COLORS['Transport'] },
      { name: 'Dining Out', amount: 3120, color: CATEGORY_COLORS['Dining Out'] },
      { name: 'Entertainment', amount: 1090, color: CATEGORY_COLORS['Entertainment'] },
      { name: 'Fitness', amount: 990, color: CATEGORY_COLORS['Fitness'] },
      { name: 'Healthcare', amount: 1320, color: CATEGORY_COLORS['Healthcare'] },
    ],
  },
};

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  // January 2026
  { id: 't-1', date: '2026-01-01', notes: 'Monthly salary', category: 'Salary', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 52500 },
  { id: 't-2', date: '2026-01-02', notes: 'Rent January', category: 'Housing', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -14500 },
  { id: 't-3', date: '2026-01-04', notes: 'Electricity & gas', category: 'Utilities', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -2180 },
  { id: 't-4', date: '2026-01-05', notes: 'Weekly groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1240 },
  { id: 't-5', date: '2026-01-07', notes: 'Monthly transport pass', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1560 },
  { id: 't-6', date: '2026-01-10', notes: 'Gym membership', category: 'Fitness', categoryType: 'expense', spendingType: 'Fun', account: 'Main Checking', amount: -990 },
  { id: 't-7', date: '2026-01-12', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -980 },
  { id: 't-8', date: '2026-01-14', notes: 'Restaurant lunch', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -620 },
  { id: 't-9', date: '2026-01-16', notes: 'Freelance project', category: 'Freelance', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 7200 },
  { id: 't-10', date: '2026-01-18', notes: 'Cinema & coffee', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -480 },
  { id: 't-11', date: '2026-01-19', notes: 'Weekly groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1140 },
  { id: 't-12', date: '2026-01-21', notes: 'Doctor visit', category: 'Healthcare', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -850 },
  { id: 't-13', date: '2026-01-25', notes: 'ETF top-up', category: 'Investing', categoryType: 'investment', spendingType: 'Future', account: 'ETF Portfolio', amount: -8000 },
  { id: 't-14', date: '2026-01-26', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1060 },
  { id: 't-15', date: '2026-01-28', notes: 'Emergency fund', category: 'Emergency Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -3000 },
  { id: 't-16', date: '2026-01-29', notes: 'Pension contribution', category: 'Pension', categoryType: 'investment', spendingType: 'Future', account: 'Main Checking', amount: -1500 },
  { id: 't-17', date: '2026-01-30', notes: 'Dinner with friends', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -780 },

  // February 2026
  { id: 't-18', date: '2026-02-01', notes: 'Monthly salary', category: 'Salary', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 52500 },
  { id: 't-19', date: '2026-02-01', notes: 'Rent February', category: 'Housing', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -14500 },
  { id: 't-20', date: '2026-02-03', notes: 'Utilities', category: 'Utilities', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -2050 },
  { id: 't-21', date: '2026-02-05', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1190 },
  { id: 't-22', date: '2026-02-07', notes: 'Transport pass', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1560 },
  { id: 't-23', date: '2026-02-09', notes: 'Gym membership', category: 'Fitness', categoryType: 'expense', spendingType: 'Fun', account: 'Main Checking', amount: -990 },
  { id: 't-24', date: '2026-02-12', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1020 },
  { id: 't-25', date: '2026-02-14', notes: 'Valentine dinner', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -1240 },
  { id: 't-26', date: '2026-02-17', notes: 'Freelance work', category: 'Freelance', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 5400 },
  { id: 't-27', date: '2026-02-19', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -980 },
  { id: 't-28', date: '2026-02-22', notes: 'Streaming services', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -390 },
  { id: 't-29', date: '2026-02-25', notes: 'ETF top-up', category: 'Investing', categoryType: 'investment', spendingType: 'Future', account: 'ETF Portfolio', amount: -8000 },
  { id: 't-30', date: '2026-02-27', notes: 'Vacation fund', category: 'Vacation Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -2000 },

  // March 2026
  { id: 't-31', date: '2026-03-01', notes: 'Monthly salary', category: 'Salary', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 52500 },
  { id: 't-32', date: '2026-03-01', notes: 'Rent March', category: 'Housing', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -14500 },
  { id: 't-33', date: '2026-03-04', notes: 'Electricity bill', category: 'Utilities', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -2310 },
  { id: 't-34', date: '2026-03-05', notes: 'Weekly groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1380 },
  { id: 't-35', date: '2026-03-07', notes: 'Transport pass', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1560 },
  { id: 't-36', date: '2026-03-10', notes: 'Gym', category: 'Fitness', categoryType: 'expense', spendingType: 'Fun', account: 'Main Checking', amount: -990 },
  { id: 't-37', date: '2026-03-13', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1150 },
  { id: 't-38', date: '2026-03-15', notes: 'Freelance project', category: 'Freelance', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 10800 },
  { id: 't-39', date: '2026-03-16', notes: 'Restaurant', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -840 },
  { id: 't-40', date: '2026-03-18', notes: 'Pharmacy', category: 'Healthcare', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -480 },
  { id: 't-41', date: '2026-03-20', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1090 },
  { id: 't-42', date: '2026-03-22', notes: 'Theatre tickets', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -580 },
  { id: 't-43', date: '2026-03-25', notes: 'ETF top-up', category: 'Investing', categoryType: 'investment', spendingType: 'Future', account: 'ETF Portfolio', amount: -8000 },
  { id: 't-44', date: '2026-03-27', notes: 'Emergency fund', category: 'Emergency Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -3000 },
  { id: 't-45', date: '2026-03-28', notes: 'Pension', category: 'Pension', categoryType: 'investment', spendingType: 'Future', account: 'Main Checking', amount: -1500 },
  { id: 't-46', date: '2026-03-29', notes: 'Weekend dinner', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -690 },
  { id: 't-47', date: '2026-03-31', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1120 },

  // April 2026
  { id: 't-48', date: '2026-04-01', notes: 'Monthly salary', category: 'Salary', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 52500 },
  { id: 't-49', date: '2026-04-01', notes: 'Rent April', category: 'Housing', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -14500 },
  { id: 't-50', date: '2026-04-03', notes: 'Utilities', category: 'Utilities', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -2000 },
  { id: 't-51', date: '2026-04-05', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1200 },
  { id: 't-52', date: '2026-04-07', notes: 'Transport pass', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1560 },
  { id: 't-53', date: '2026-04-09', notes: 'Gym', category: 'Fitness', categoryType: 'expense', spendingType: 'Fun', account: 'Main Checking', amount: -990 },
  { id: 't-54', date: '2026-04-10', notes: 'Freelance', category: 'Freelance', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 6000 },
  { id: 't-55', date: '2026-04-12', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1200 },
  { id: 't-56', date: '2026-04-14', notes: 'Lunch out', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -580 },
  { id: 't-57', date: '2026-04-18', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1200 },
  { id: 't-58', date: '2026-04-19', notes: 'Doctor', category: 'Healthcare', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -820 },
  { id: 't-59', date: '2026-04-21', notes: 'Concert', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -970 },
  { id: 't-60', date: '2026-04-24', notes: 'Taxi', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -420 },
  { id: 't-61', date: '2026-04-25', notes: 'ETF top-up', category: 'Investing', categoryType: 'investment', spendingType: 'Future', account: 'ETF Portfolio', amount: -8000 },
  { id: 't-62', date: '2026-04-26', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1200 },
  { id: 't-63', date: '2026-04-27', notes: 'Vacation fund', category: 'Vacation Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -2000 },
  { id: 't-64', date: '2026-04-28', notes: 'Dinner', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -720 },
  { id: 't-65', date: '2026-04-29', notes: 'Emergency fund', category: 'Emergency Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -3000 },
  { id: 't-66', date: '2026-04-30', notes: 'Pension', category: 'Pension', categoryType: 'investment', spendingType: 'Future', account: 'Main Checking', amount: -1500 },

  // May 2026
  { id: 't-67', date: '2026-05-01', notes: 'Monthly salary', category: 'Salary', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 52500 },
  { id: 't-68', date: '2026-05-01', notes: 'Rent May', category: 'Housing', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -14500 },
  { id: 't-69', date: '2026-05-03', notes: 'Utilities', category: 'Utilities', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -2700 },
  { id: 't-70', date: '2026-05-04', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1300 },
  { id: 't-71', date: '2026-05-07', notes: 'Transport pass', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1560 },
  { id: 't-72', date: '2026-05-09', notes: 'Gym', category: 'Fitness', categoryType: 'expense', spendingType: 'Fun', account: 'Main Checking', amount: -990 },
  { id: 't-73', date: '2026-05-11', notes: 'Freelance project', category: 'Freelance', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 10700 },
  { id: 't-74', date: '2026-05-12', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1300 },
  { id: 't-75', date: '2026-05-14', notes: 'Restaurant', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -890 },
  { id: 't-76', date: '2026-05-16', notes: 'Pharmacy', category: 'Healthcare', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1200 },
  { id: 't-77', date: '2026-05-18', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1300 },
  { id: 't-78', date: '2026-05-20', notes: 'Taxi', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -540 },
  { id: 't-79', date: '2026-05-21', notes: 'Dinner with family', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -1240 },
  { id: 't-80', date: '2026-05-23', notes: 'Streaming + games', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -1160 },
  { id: 't-81', date: '2026-05-25', notes: 'ETF top-up', category: 'Investing', categoryType: 'investment', spendingType: 'Future', account: 'ETF Portfolio', amount: -8000 },
  { id: 't-82', date: '2026-05-26', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1300 },
  { id: 't-83', date: '2026-05-27', notes: 'Emergency fund', category: 'Emergency Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -2000 },
  { id: 't-84', date: '2026-05-28', notes: 'Lunch', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -520 },
  { id: 't-85', date: '2026-05-29', notes: 'Pension', category: 'Pension', categoryType: 'investment', spendingType: 'Future', account: 'Main Checking', amount: -1500 },
  { id: 't-86', date: '2026-05-30', notes: 'Vacation fund', category: 'Vacation Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -3000 },

  // June 2026
  { id: 't-87', date: '2026-06-01', notes: 'Monthly salary', category: 'Salary', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 52500 },
  { id: 't-88', date: '2026-06-01', notes: 'Rent June', category: 'Housing', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -14500 },
  { id: 't-89', date: '2026-06-03', notes: 'Utilities', category: 'Utilities', categoryType: 'expense', spendingType: 'Core', account: 'Main Checking', amount: -2300 },
  { id: 't-90', date: '2026-06-04', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1250 },
  { id: 't-91', date: '2026-06-06', notes: 'Transport pass', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1560 },
  { id: 't-92', date: '2026-06-08', notes: 'Gym', category: 'Fitness', categoryType: 'expense', spendingType: 'Fun', account: 'Main Checking', amount: -990 },
  { id: 't-93', date: '2026-06-10', notes: 'Freelance', category: 'Freelance', categoryType: 'income', spendingType: 'Income', account: 'Main Checking', amount: 5300 },
  { id: 't-94', date: '2026-06-11', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1230 },
  { id: 't-95', date: '2026-06-13', notes: 'Brunch', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -680 },
  { id: 't-96', date: '2026-06-15', notes: 'Doctor', category: 'Healthcare', categoryType: 'expense', spendingType: 'Necessary', account: 'Main Checking', amount: -1320 },
  { id: 't-97', date: '2026-06-17', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1230 },
  { id: 't-98', date: '2026-06-18', notes: 'Museum & coffee', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -340 },
  { id: 't-99', date: '2026-06-20', notes: 'Dinner', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -940 },
  { id: 't-100', date: '2026-06-21', notes: 'Taxi', category: 'Transport', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -420 },
  { id: 't-101', date: '2026-06-23', notes: 'Groceries', category: 'Groceries', categoryType: 'expense', spendingType: 'Necessary', account: 'Credit Card', amount: -1190 },
  { id: 't-102', date: '2026-06-24', notes: 'Concert', category: 'Entertainment', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -750 },
  { id: 't-103', date: '2026-06-25', notes: 'ETF top-up', category: 'Investing', categoryType: 'investment', spendingType: 'Future', account: 'ETF Portfolio', amount: -8000 },
  { id: 't-104', date: '2026-06-27', notes: 'Emergency fund', category: 'Emergency Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -4000 },
  { id: 't-105', date: '2026-06-28', notes: 'Pension', category: 'Pension', categoryType: 'investment', spendingType: 'Future', account: 'Main Checking', amount: -1500 },
  { id: 't-106', date: '2026-06-29', notes: 'Vacation fund', category: 'Vacation Fund', categoryType: 'saving', spendingType: 'Future', account: 'Savings Account', amount: -3000 },
  { id: 't-107', date: '2026-06-30', notes: 'Weekend lunch', category: 'Dining Out', categoryType: 'expense', spendingType: 'Fun', account: 'Credit Card', amount: -590 },
];

export const DEMO_MONTHS: { value: DemoMonth; label: string }[] = [
  { value: 'apr', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'jun', label: 'June' },
];
