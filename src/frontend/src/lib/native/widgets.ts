/**
 * Builds the snapshot the iOS widgets show and hands it to the native side.
 * Mirrors `WidgetSnapshot` in src/mobile/ios/App/Shared/WidgetSnapshot.swift; keep them in sync.
 */
import type { DashboardTranslationKey } from '@/lib/i18n';
import { BudgetNative } from '@/lib/native/budgetNative';
import type { NativeData, UpcomingPayment } from '@/lib/native/data';

type Translate = (key: DashboardTranslationKey, params?: Record<string, string | number>) => string;

export interface WidgetSnapshot {
  version: 1;
  generatedAt: string;
  locale: string;
  currency: string;
  privacyMode: boolean;
  month: {
    year: number;
    month: number;
    spent: number;
    income: number;
    cashFlow: number;
    usualSpent: number | null;
    cumulative: number[];
    usualCumulative: number[];
  };
  upcoming: UpcomingPayment[];
  labels: Record<string, string>;
}

/** Widget strings, taken from the app's translations so the widgets match its language. */
const LABEL_KEYS: Record<string, DashboardTranslationKey> = {
  spent: 'profile.widgetSpent',
  vsUsual: 'profile.widgetVsUsual',
  daysLeft: 'profile.widgetDaysLeft',
  cashFlow: 'profile.widgetCashFlow',
  cashFlowShort: 'profile.widgetCashFlowShort',
  ofIncome: 'profile.widgetOfIncome',
  perDay: 'profile.widgetPerDay',
  perDayShort: 'profile.widgetPerDayShort',
  upcoming: 'profile.widgetUpcoming',
  nextPayment: 'profile.widgetNextPayment',
  noUpcoming: 'profile.widgetNoUpcoming',
  autoPost: 'profile.widgetAutoPost',
  today: 'profile.widgetToday',
  tomorrow: 'profile.widgetTomorrow',
  pace: 'profile.widgetPace',
  aboveUsual: 'profile.widgetAboveUsual',
  belowUsual: 'profile.widgetBelowUsual',
  thisMonth: 'profile.widgetThisMonth',
  sixMonthAverage: 'profile.widgetSixMonthAverage',
  openApp: 'profile.widgetOpenApp',
  asOf: 'profile.widgetAsOf',
};

/** Placeholders the native side fills in; passed through `t` unchanged. */
const PLACEHOLDERS = { count: '{count}', rate: '{rate}', amount: '{amount}', time: '{time}' };

export async function syncWidgets(
  data: NativeData,
  options: { t: Translate; locale: string; privacyMode: boolean },
): Promise<void> {
  const { summary } = data;
  if (!summary) return; // keep the previous snapshot rather than blanking the widgets
  const now = new Date();
  const snapshot: WidgetSnapshot = {
    version: 1,
    generatedAt: now.toISOString(),
    locale: options.locale,
    currency: data.currency,
    privacyMode: options.privacyMode,
    month: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      spent: summary.total_expense,
      income: summary.total_income,
      cashFlow: summary.net_cash_flow,
      usualSpent: summary.six_month_average?.expense ?? null,
      cumulative: summary.daily_cumulative_expense,
      usualCumulative: summary.average_daily_cumulative_expense,
    },
    upcoming: data.upcoming.slice(0, 5),
    labels: Object.fromEntries(
      Object.entries(LABEL_KEYS).map(([name, key]) => [name, options.t(key, PLACEHOLDERS)]),
    ),
  };
  await BudgetNative.setWidgetData({ snapshot: JSON.stringify(snapshot) });
}

/** Logout: the widgets show "open Budget" instead of the previous user's numbers. */
export async function clearWidgets(): Promise<void> {
  await BudgetNative.setWidgetData({});
}
