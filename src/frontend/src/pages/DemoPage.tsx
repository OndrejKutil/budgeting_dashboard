import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, Wallet, Tags, PiggyBank,
  BarChart3, Calendar, TrendingUp, TrendingDown, ShieldCheck,
  ListChecks, Landmark, CircleDollarSign, Lock, User,
  ArrowRight, Search, DollarSign, CreditCard, Building,
  ChevronDown, ChevronLeft, Briefcase, Eye, EyeOff,
  Menu,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, Cell, LabelList,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CHART_COLORS, CATEGORY_CHART_COLORS } from '@/lib/chart-colors';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DEMO_ACCOUNTS,
  DEMO_TRANSACTIONS,
  DEMO_MONTHLY_DATA,
  DEMO_MONTHS,
  type DemoMonth,
} from '@/data/demo-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoPageId = 'overview' | 'transactions' | 'accounts' | 'analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCZK(n: number): string {
  return `${Math.abs(n).toLocaleString('cs-CZ')} Kč`;
}

function fmtCZKSigned(n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('cs-CZ')} Kč`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Demo Sidebar ─────────────────────────────────────────────────────────────

const DEMO_NAV: { label: string; icon: typeof Wallet; page: DemoPageId }[] = [
  { label: 'Overview', icon: LayoutDashboard, page: 'overview' },
  { label: 'Transactions', icon: Receipt, page: 'transactions' },
  { label: 'Accounts', icon: Wallet, page: 'accounts' },
];

const LOCKED_NAV = [
  { label: 'Categories', icon: Tags },
  { label: 'Savings Funds', icon: PiggyBank },
];

const LOCKED_ANALYTICS = [
  { label: 'Yearly', icon: TrendingUp },
  { label: 'Emergency Fund', icon: ShieldCheck },
];

interface SidebarProps {
  activePage: DemoPageId;
  onNavigate: (page: DemoPageId) => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

function DemoSidebar({ activePage, onNavigate, collapsed, onToggle, isMobile, onClose }: SidebarProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const wide = !collapsed || isMobile;

  const handleNav = (page: DemoPageId) => {
    onNavigate(page);
    if (isMobile && onClose) onClose();
  };

  const activeClass = 'bg-sidebar-primary text-sidebar-primary-foreground';
  const idleClass = 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
  const lockedClass = 'text-sidebar-foreground/40 cursor-default select-none';

  const itemBase = cn(
    'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all',
    wide ? 'px-3' : 'justify-center px-2'
  );

  return (
    <aside
      className={cn(
        'safe-top safe-bottom fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        isMobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <AnimatePresence mode="wait">
          {wide && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-bold font-display text-foreground"
            >
              Budgeting Dashboard
            </motion.span>
          )}
        </AnimatePresence>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-shrink-0"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Main nav */}
        <div className="space-y-1">
          {DEMO_NAV.map((item) => (
            <div
              key={item.page}
              onClick={() => handleNav(item.page)}
              className={cn(itemBase, 'cursor-pointer', activePage === item.page ? activeClass : idleClass)}
              aria-label={!wide ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {wide && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
          {LOCKED_NAV.map((item) => (
            <div key={item.label} className={cn(itemBase, lockedClass)}>
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {wide && (
                <>
                  <span className="flex-1 whitespace-nowrap">{item.label}</span>
                  <Lock className="h-3 w-3 flex-shrink-0" />
                </>
              )}
            </div>
          ))}
        </div>

        {/* Analytics section */}
        <div className="pt-4">
          {wide ? (
            <>
              <button
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <BarChart3 className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">Analytics</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', analyticsOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {analyticsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-1 space-y-1 overflow-hidden pl-4"
                  >
                    <div
                      onClick={() => handleNav('analytics')}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer',
                        activePage === 'analytics' ? activeClass : idleClass
                      )}
                    >
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Monthly</span>
                    </div>
                    {LOCKED_ANALYTICS.map((item) => (
                      <div key={item.label} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', lockedClass)}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <Lock className="h-3 w-3 flex-shrink-0" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div
              onClick={() => handleNav('analytics')}
              className={cn(itemBase, 'cursor-pointer', activePage === 'analytics' ? activeClass : idleClass)}
              aria-label="Monthly Analytics"
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Locked tools */}
        <div className="space-y-1 pt-4">
          {wide && (
            <div className="px-3 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider mb-2">
              Tools
            </div>
          )}
          <div className={cn(itemBase, lockedClass)}>
            <ListChecks className="h-5 w-5 flex-shrink-0" />
            {wide && (
              <>
                <span className="flex-1">Budget Maker</span>
                <Lock className="h-3 w-3 flex-shrink-0" />
              </>
            )}
          </div>
        </div>

        {/* Locked calculators */}
        <div className="space-y-1 pt-4">
          {wide && (
            <div className="px-3 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider mb-2">
              Calculators
            </div>
          )}
          {[
            { label: 'Investing', icon: Landmark },
            { label: 'Dividends', icon: CircleDollarSign },
          ].map((item) => (
            <div key={item.label} className={cn(itemBase, lockedClass)}>
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {wide && (
                <>
                  <span className="flex-1">{item.label}</span>
                  <Lock className="h-3 w-3 flex-shrink-0" />
                </>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer CTA */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/auth/register"
          className={cn(
            'flex items-center gap-3 rounded-lg bg-primary/10 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors',
            wide ? 'px-3' : 'justify-center px-2'
          )}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {wide && (
            <>
              <span className="flex-1 whitespace-nowrap">Sign up to unlock all</span>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}

// ─── Demo Topbar ──────────────────────────────────────────────────────────────

function DemoTopbar({ onMobileMenuClick }: { onMobileMenuClick: () => void }) {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <header className="safe-top sticky top-0 z-30 flex h-16 box-content items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="lg:hidden min-h-[44px] min-w-[44px]"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="hidden lg:block text-sm text-muted-foreground">
          {getGreeting()},{' '}
          <span className="font-semibold text-foreground">Demo User</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <UITooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePrivacyMode}
              className={cn(
                'min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground',
                isPrivacyMode && 'bg-primary/10 text-primary hover:text-primary'
              )}
              aria-label={isPrivacyMode ? 'Show values' : 'Hide values'}
              aria-pressed={isPrivacyMode}
            >
              {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPrivacyMode ? 'Show values' : 'Hide values'}</p>
          </TooltipContent>
        </UITooltip>

        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link to="/auth/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth/register">
              Sign up free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

const SPARKLINES = {
  income: [59700, 57900, 63300, 58500, 63200, 57800].map((v, idx) => ({ v, idx })),
  expenses: [29800, 27100, 31400, 28900, 31500, 30200].map((v, idx) => ({ v, idx })),
  savings: [7000, 5000, 8000, 5000, 5000, 7000].map((v, idx) => ({ v, idx })),
  investing: [9500, 8000, 9500, 9500, 9500, 9500].map((v, idx) => ({ v, idx })),
};

const MAY = DEMO_MONTHLY_DATA['may'];
const APR = DEMO_MONTHLY_DATA['apr'];

const OVERVIEW_METRICS = [
  { label: 'Total Income', value: MAY.income, icon: TrendingUp, delta: 8.0, sparkData: SPARKLINES.income, invert: false },
  { label: 'Total Expenses', value: MAY.expenses, icon: TrendingDown, delta: 9.0, sparkData: SPARKLINES.expenses, invert: true },
  { label: 'Savings', value: MAY.savings, icon: PiggyBank, delta: 0, sparkData: SPARKLINES.savings, invert: false, extra: '7.9% rate' },
  { label: 'Investments', value: MAY.investing, icon: Briefcase, delta: 0, sparkData: SPARKLINES.investing, invert: false, extra: '15.0% rate' },
] as const;

const LARGEST_TX = DEMO_TRANSACTIONS
  .filter((t) => t.date.startsWith('2026-05'))
  .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  .slice(0, 5);

function DemoOverview() {
  const netCashFlow = MAY.cashflow;
  const netProfit = MAY.profit;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Overview"
        description="May 2026 · Sample data"
        actions={
          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 bg-amber-500/10">
            Demo mode
          </Badge>
        }
      />

      {/* Hero cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { label: 'Net cash flow', value: netCashFlow, delta: APR.cashflow, Icon: Wallet, sub: 'After all outflows this month' },
          { label: 'Net profit', value: netProfit, delta: APR.profit, Icon: DollarSign, sub: 'Income minus direct expenses' },
        ].map(({ label, value, delta, Icon, sub }) => {
          const pct = ((value - delta) / delta) * 100;
          return (
            <div key={label} className="rounded-xl border border-border bg-card p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.06] group-hover:opacity-10 transition-opacity">
                <Icon className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">{label}</h3>
                <div className="flex items-baseline gap-4 flex-wrap">
                  <span className="text-3xl sm:text-5xl font-bold font-display tracking-tight text-foreground">
                    <SensitiveValue>{fmtCZK(value)}</SensitiveValue>
                  </span>
                  <span className="text-sm font-medium text-muted-foreground/60 flex items-center gap-1">
                    <SensitiveValue>{pct >= 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%</SensitiveValue>
                    <span className="text-xs text-muted-foreground/40 ml-1">vs Apr</span>
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground/60">{sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {OVERVIEW_METRICS.map((metric, i) => {
          const isPositive = metric.invert ? metric.delta <= 0 : metric.delta >= 0;
          const strokeColor = isPositive ? CHART_COLORS.income : CHART_COLORS.expense;
          return (
            <div key={i} className="flex flex-col justify-between p-4 rounded-xl border border-border/30 bg-card/30 hover:bg-card/50 transition-colors min-h-[110px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-background-secondary text-muted-foreground">
                      <metric.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.label}</span>
                  </div>
                  {'extra' in metric && metric.extra && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-background/50 border border-border/50 text-primary">
                      <SensitiveValue>{metric.extra}</SensitiveValue>
                    </span>
                  )}
                </div>
                <span className="text-lg font-semibold font-display tracking-tight">
                  <SensitiveValue>{fmtCZK(metric.value)}</SensitiveValue>
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={cn('text-xs font-medium flex items-center gap-1', isPositive ? 'text-success/70' : 'text-destructive/70')}>
                  <SensitiveValue>{metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(1)}%</SensitiveValue>
                  <span className="text-muted-foreground/40 font-normal ml-1">vs Apr</span>
                </span>
                <div className="h-8 w-20 opacity-50">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metric.sparkData}>
                      <defs>
                        <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={1.5} fill={`url(#grad-${i})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Largest transactions + quick stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-lg font-semibold font-display">Largest transactions</h3>
            <p className="text-sm text-muted-foreground">Where the money moved in May</p>
          </div>
          <div className="divide-y divide-border/30">
            {LARGEST_TX.map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.notes}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
                <span className={cn('font-mono font-medium tabular-nums', tx.amount > 0 ? 'text-emerald-500' : 'text-foreground')}>
                  <SensitiveValue>{tx.amount > 0 ? '+' : '−'}{fmtCZK(tx.amount)}</SensitiveValue>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-lg font-semibold font-display">Quick stats</h3>
            <p className="text-sm text-muted-foreground">May 2026 at a glance</p>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Savings rate', value: `${MAY.savings_rate.toFixed(1)}%` },
              { label: 'Investment rate', value: `${MAY.investment_rate.toFixed(1)}%` },
              { label: 'Transactions', value: `${DEMO_TRANSACTIONS.filter(t => t.date.startsWith('2026-05')).length}` },
              { label: 'Largest expense', value: fmtCZK(14500) },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  <SensitiveValue>{stat.value}</SensitiveValue>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

function DemoAnalytics() {
  const [month, setMonth] = useState<DemoMonth>('may');
  const data = DEMO_MONTHLY_DATA[month];
  const cmp = data.comparison;

  const prevLabel = month === 'may' ? 'vs Apr' : month === 'jun' ? 'vs May' : 'vs Mar';

  const spendingTypeData = [
    { name: 'Core', value: data.spendingByType.core },
    { name: 'Necessary', value: data.spendingByType.necessary },
    { name: 'Fun', value: data.spendingByType.fun },
    { name: 'Future', value: data.spendingByType.future },
  ];

  const expenseBarData = [...data.byCategory].sort((a, b) => b.amount - a.amount);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const MetricCell = ({
    icon: Icon,
    label,
    value,
    rate,
    delta,
    deltaPositiveGood = true,
  }: {
    icon: typeof TrendingUp;
    label: string;
    value: number;
    rate?: number;
    delta: number;
    deltaPositiveGood?: boolean;
  }) => {
    const good = deltaPositiveGood ? delta >= 0 : delta <= 0;
    return (
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
          <Icon className="h-3 w-3" />
          {label}
        </p>
        <div className="flex flex-col mt-1">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
              <SensitiveValue>{fmtCZK(value)}</SensitiveValue>
            </p>
            {rate !== undefined && (
              <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm">
                <SensitiveValue>{rate.toFixed(1)}%</SensitiveValue>
              </span>
            )}
          </div>
          <span className={cn('text-[10px] font-medium mt-1', good ? 'text-chart-income' : 'text-destructive')}>
            <SensitiveValue>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</SensitiveValue>{' '}
            <span className="text-muted-foreground/50 font-normal">{prevLabel}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Monthly Analytics"
        description="Spending breakdown by category and type"
        actions={
          <div className="flex gap-2">
            <Select value={month} onValueChange={(v) => setMonth(v as DemoMonth)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMO_MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value="2026" onValueChange={() => {}}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Unified Financial Header */}
      <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm mb-8">
        {/* Core flows */}
        <div className="flex-1 grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:pr-6">
          <MetricCell icon={TrendingUp} label="Income" value={data.income} delta={cmp.income_delta_pct} deltaPositiveGood />
          <MetricCell icon={TrendingDown} label="Expenses" value={data.expenses} delta={cmp.expenses_delta_pct} deltaPositiveGood={false} />
        </div>
        {/* Wealth generation */}
        <div className="flex-[1.2] grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:px-6">
          <MetricCell icon={PiggyBank} label="Savings" value={data.savings} rate={data.savings_rate} delta={cmp.savings_delta_pct} deltaPositiveGood />
          <MetricCell icon={Briefcase} label="Investments" value={data.investing} rate={data.investment_rate} delta={cmp.investments_delta_pct} deltaPositiveGood />
        </div>
        {/* Outcomes */}
        <div className="flex-1 grid grid-cols-2 gap-4 xl:pl-6">
          <MetricCell icon={DollarSign} label="Profit" value={data.profit} delta={cmp.profit_delta_pct} deltaPositiveGood />
          <MetricCell icon={Wallet} label="Cash Flow" value={data.cashflow} delta={cmp.cashflow_delta_pct} deltaPositiveGood />
        </div>
      </div>

      {/* Daily Spending Chart */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Daily spending</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailySpending} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.expense} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.expense} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.6 }}
                dy={10}
                interval={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.6 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [<SensitiveValue key="v">{fmtCZK(value)}</SensitiveValue>, 'Spending']}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="amount" stroke={CHART_COLORS.expense} strokeWidth={3} fill="url(#spendingGradient)" activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income Sources + Spending Type */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Income sources</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.incomeBreakdown} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barCategoryGap={30}>
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 }} dy={10} interval={0} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  formatter={(value: number) => [<SensitiveValue key="v">{fmtCZK(value)}</SensitiveValue>, '']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    fill="hsl(var(--foreground))"
                    fontSize={10}
                    fontWeight={600}
                  />
                  {data.incomeBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS.income} opacity={Math.max(0.35, 0.9 - idx * 0.12)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Spending type breakdown</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTypeData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barCategoryGap={30}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 }} dy={10} interval={0} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  formatter={(value: number) => [<SensitiveValue key="v">{fmtCZK(value)}</SensitiveValue>, '']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    fill="hsl(var(--foreground))"
                    fontSize={10}
                    fontWeight={600}
                  />
                  {spendingTypeData.map((_, idx) => (
                    <Cell key={idx} fill={CATEGORY_CHART_COLORS[idx % CATEGORY_CHART_COLORS.length]} opacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expense categories */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Expense categories</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenseBarData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barCategoryGap={20}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 }} dy={10} interval={0} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                contentStyle={tooltipStyle}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(value: number) => [<SensitiveValue key="v">{fmtCZK(value)}</SensitiveValue>, '']}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="amount"
                  position="top"
                  formatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  fill="hsl(var(--foreground))"
                  fontSize={10}
                  fontWeight={600}
                />
                {expenseBarData.map((_, idx) => (
                  <Cell key={idx} fill={CATEGORY_CHART_COLORS[idx % CATEGORY_CHART_COLORS.length]} opacity={Math.max(0.45, 0.9 - idx * 0.05)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Transactions Page ────────────────────────────────────────────────────────

type TxFilter = 'all' | 'income' | 'expense' | 'saving' | 'investment';
type TxMonthFilter = 'all' | 'apr' | 'may' | 'jun';

const TX_MONTH_PREFIXES: Record<TxMonthFilter, string | null> = {
  all: null,
  apr: '2026-04',
  may: '2026-05',
  jun: '2026-06',
};

const TX_TYPE_DOT: Record<string, string> = {
  income: 'bg-emerald-500',
  saving: 'bg-chart-savings',
  investment: 'bg-chart-investment',
  expense: 'bg-rose-500',
};

const TX_TYPE_STRIPE: Record<string, string> = {
  income: 'bg-emerald-500',
  saving: 'bg-chart-savings',
  investment: 'bg-chart-investment',
  expense: 'bg-rose-500',
};

const ITEMS_PER_PAGE = 20;

function DemoTransactions() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxFilter>('all');
  const [monthFilter, setMonthFilter] = useState<TxMonthFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = DEMO_TRANSACTIONS.filter((t) => {
    if (typeFilter !== 'all' && t.categoryType !== typeFilter) return false;
    const prefix = TX_MONTH_PREFIXES[monthFilter];
    if (prefix && !t.date.startsWith(prefix)) return false;
    const q = search.toLowerCase();
    if (q && !t.notes.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const hasActiveFilter = typeFilter !== 'all' || monthFilter !== 'all' || search;
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(offset, offset + ITEMS_PER_PAGE);
  const hasNext = filtered.length > offset + ITEMS_PER_PAGE;
  const rangeStart = filtered.length === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + ITEMS_PER_PAGE, filtered.length);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setMonthFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Transactions"
        description="January – June 2026 · Sample data"
        actions={
          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 bg-amber-500/10">
            Demo mode
          </Badge>
        }
      />

      {/* Filter bar — matches real TransactionsPage */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 bg-background/50 border-input/50 focus:bg-background transition-colors"
            />
          </div>
          {hasActiveFilter && (
            <Button
              variant="outline"
              onClick={resetFilters}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Reset filters
            </Button>
          )}
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {([
            { label: 'This month (Jun)', action: () => setMonthFilter('jun') },
            { label: 'Last month (May)', action: () => setMonthFilter('may') },
            { label: 'April', action: () => setMonthFilter('apr') },
            { label: 'All months', action: () => setMonthFilter('all') },
          ] as { label: string; action: () => void }[]).map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              onClick={() => { p.action(); setPage(1); }}
              className="h-7 text-xs bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Calendar className="mr-1.5 h-3 w-3" />
              {p.label}
            </Button>
          ))}
        </div>

        {/* Selects row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v as TxMonthFilter); setPage(1); }}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              <SelectItem value="apr">April</SelectItem>
              <SelectItem value="may">May</SelectItem>
              <SelectItem value="jun">June</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as TxFilter); setPage(1); }}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="saving">Saving</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
            </SelectContent>
          </Select>

          <Select value="all" onValueChange={() => {}}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
            </SelectContent>
          </Select>

          <Select value="all" onValueChange={() => {}}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        {pageRows.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="w-32 pl-6 font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Account</TableHead>
                    <TableHead className="text-right pr-6 font-semibold">Amount</TableHead>
                    <TableHead className="w-2 p-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((tx, rowIndex) => (
                    <TableRow
                      key={tx.id}
                      className={cn(
                        'group border-b border-border/40 last:border-0 transition-colors',
                        rowIndex % 2 === 0 ? 'bg-transparent hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'
                      )}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground pl-4">
                        {tx.date}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm text-foreground">{tx.notes}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', TX_TYPE_DOT[tx.categoryType])} />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {tx.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.account}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="font-mono font-medium text-foreground">
                          <SensitiveValue>
                            {tx.amount > 0 ? '+' : '−'}{fmtCZK(tx.amount)}
                          </SensitiveValue>
                        </span>
                      </TableCell>
                      <TableCell className="relative p-0 w-2">
                        <span className={cn('absolute right-0 top-0 bottom-0 w-[2px]', TX_TYPE_STRIPE[tx.categoryType])} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4 p-4">
              {pageRows.map((tx) => (
                <div
                  key={tx.id}
                  className={cn(
                    'p-4 rounded-xl border bg-card shadow-sm space-y-3',
                    tx.categoryType === 'income' ? 'border-emerald-500/30' :
                    tx.categoryType === 'saving' ? 'border-chart-savings/30' :
                    tx.categoryType === 'investment' ? 'border-chart-investment/30' :
                    'border-rose-500/30'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{tx.notes}</p>
                      <p className="text-xs text-muted-foreground mt-1">{tx.date}</p>
                    </div>
                    <p className="font-bold text-foreground">
                      <SensitiveValue>{fmtCZKSigned(tx.amount)}</SensitiveValue>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t text-sm">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      tx.categoryType === 'income' ? 'bg-emerald-500/10 text-emerald-500' :
                      tx.categoryType === 'saving' ? 'bg-chart-savings/10 text-chart-savings' :
                      tx.categoryType === 'investment' ? 'bg-chart-investment/10 text-chart-investment' :
                      'bg-rose-500/10 text-rose-500'
                    )}>
                      {tx.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{tx.account}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{rangeStart}</span>–
                <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
                <span className="font-medium text-foreground">{filtered.length}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 bg-background/50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 bg-background/50"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Accounts Page ────────────────────────────────────────────────────────────

const ACCOUNT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  checking: Wallet,
  savings: Landmark,
  credit: CreditCard,
  investment: Building,
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function DemoAccounts() {
  const netWorth = DEMO_ACCOUNTS.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Accounts"
        description="Current balances across all accounts"
        actions={
          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 bg-amber-500/10">
            Demo mode
          </Badge>
        }
      />

      {/* Summary card — matches real AccountsPage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <p className="text-sm text-muted-foreground">Total active accounts</p>
        <div className="mt-1 text-3xl font-bold font-display">{DEMO_ACCOUNTS.length}</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Combined balance across all asset and liability accounts
        </p>
      </motion.div>

      {/* Account cards — sm:grid-cols-2 lg:grid-cols-3 exactly like real page */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = ACCOUNT_ICONS[account.type] ?? Wallet;
          const isPositive = account.net_flow_30d >= 0;
          return (
            <motion.div
              key={account.id}
              variants={fadeIn}
              className="group rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current balance</p>
                  <p className="text-2xl font-bold font-display">
                    <SensitiveValue>
                      {account.balance < 0 ? '−' : ''}{Math.abs(account.balance).toLocaleString('cs-CZ')} Kč
                    </SensitiveValue>
                  </p>
                </div>

                {/* Sparkline — h-[60px] exactly like real page */}
                <div className="h-[60px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={account.history_30d}>
                      <defs>
                        <linearGradient id={`gradient-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill={`url(#gradient-${account.id})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Net flow 30d */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Net flow 30d</span>
                  <span className={cn('font-medium', isPositive ? 'text-emerald-500' : 'text-destructive')}>
                    {account.net_flow_30d > 0 ? '+' : ''}
                    <SensitiveValue>{fmtCZK(account.net_flow_30d)}</SensitiveValue>
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Net worth summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total net worth</p>
            <p className="text-3xl font-bold font-display tracking-tight text-foreground mt-1">
              <SensitiveValue>{netWorth.toLocaleString('cs-CZ')} Kč</SensitiveValue>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{DEMO_ACCOUNTS.length} accounts · CZK</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Sample data — June 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function DemoPageRoot() {
  const [activePage, setActivePage] = useState<DemoPageId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <DemoSidebar
          activePage={activePage}
          onNavigate={setActivePage}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <DemoSidebar
                activePage={activePage}
                onNavigate={setActivePage}
                collapsed={false}
                onToggle={() => {}}
                isMobile
                onClose={closeMobileMenu}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className={cn('min-h-screen transition-all duration-300', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <DemoTopbar onMobileMenuClick={openMobileMenu} />
        <main id="main-content" className="p-4 pb-24 lg:p-6 lg:pb-6">
          {activePage === 'overview' && <DemoOverview />}
          {activePage === 'analytics' && <DemoAnalytics />}
          {activePage === 'transactions' && <DemoTransactions />}
          {activePage === 'accounts' && <DemoAccounts />}
        </main>
      </div>
    </div>
  );
}
