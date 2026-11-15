import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CircleDollarSign,
  FileSpreadsheet,
  GitFork,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  PiggyBank,
  Receipt,
  Repeat,
  ScanLine,
  ShieldCheck,
  Tags,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { DashboardTranslationKey } from '@/lib/i18n';

export interface NavItem {
  labelKey: DashboardTranslationKey;
  href: string;
  icon: LucideIcon;
  /** Feature flag that must be enabled for this user before the item is shown. */
  flag?: string;
}

export interface NavGroup {
  id: 'analytics' | 'plan' | 'tools';
  labelKey: DashboardTranslationKey;
  items: readonly NavItem[];
}

export const TRANSACTIONS_PATH = '/dashboard/transactions';
export const RECURRING_PATH = '/dashboard/recurring';
export const PROFILE_PATH = '/dashboard/profile';
export const STATEMENT_IMPORT_PATH = '/dashboard/import/statement';

export const overviewItem: NavItem = { labelKey: 'nav.overview', href: '/dashboard', icon: LayoutDashboard };
export const transactionsItem: NavItem = { labelKey: 'nav.transactions', href: TRANSACTIONS_PATH, icon: Receipt };
export const accountsItem: NavItem = { labelKey: 'nav.accounts', href: '/dashboard/accounts', icon: Wallet };
export const fundsItem: NavItem = { labelKey: 'nav.savingsFundsShort', href: '/dashboard/funds', icon: PiggyBank };

/** Top-level links shown directly in the desktop bar. */
export const primaryNavItems: readonly NavItem[] = [
  overviewItem,
  transactionsItem,
  accountsItem,
  fundsItem,
];

export const navGroups: readonly NavGroup[] = [
  {
    id: 'analytics',
    labelKey: 'nav.analytics',
    items: [
      { labelKey: 'nav.monthly', href: '/dashboard/analytics/monthly', icon: Calendar },
      { labelKey: 'nav.yearly', href: '/dashboard/analytics/yearly', icon: TrendingUp },
      { labelKey: 'nav.cashFlow', href: '/dashboard/analytics/cashflow', icon: GitFork },
      { labelKey: 'nav.emergencyFund', href: '/dashboard/analytics/emergency-fund', icon: ShieldCheck },
    ],
  },
  {
    id: 'plan',
    labelKey: 'nav.plan',
    items: [
      { labelKey: 'nav.budgetMaker', href: '/dashboard/budget-maker', icon: ListChecks },
      { labelKey: 'nav.recurring', href: RECURRING_PATH, icon: Repeat },
      { labelKey: 'nav.categories', href: '/dashboard/categories', icon: Tags },
    ],
  },
  {
    id: 'tools',
    labelKey: 'nav.tools',
    items: [
      // Gated items only appear when their feature flag is on for this user.
      { labelKey: 'nav.screenshotImport', href: '/dashboard/import/screenshot', icon: ScanLine, flag: 'screenshot_import' },
      { labelKey: 'nav.statementImport', href: STATEMENT_IMPORT_PATH, icon: FileSpreadsheet, flag: 'statement_import' },
      { labelKey: 'nav.trading212', href: '/dashboard/trading212', icon: LineChart, flag: 't212_integration' },
      { labelKey: 'nav.investingCalculator', href: '/dashboard/investing-calculator', icon: Landmark },
      { labelKey: 'nav.dividendCalculator', href: '/dashboard/dividend-calculator', icon: CircleDollarSign },
    ],
  },
];

export function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname.startsWith(href);
}
