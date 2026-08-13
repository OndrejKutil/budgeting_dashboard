import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { recurringApi } from '@/lib/api/endpoints';
import { daysDiff } from '@/lib/dates';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Tags,
  PiggyBank,
  BarChart3,
  User,
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Menu,
  Landmark,
  ListChecks,
  CircleDollarSign,
  Repeat,
  GitFork,
  ScanLine,
  LineChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-context';
import { useFeatureFlags } from '@/hooks/use-feature-flag';

const mainNavItems = [
  { labelKey: 'nav.overview', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.transactions', href: '/dashboard/transactions', icon: Receipt },
  { labelKey: 'nav.recurring', href: '/dashboard/recurring', icon: Repeat },
  { labelKey: 'nav.accounts', href: '/dashboard/accounts', icon: Wallet },
  { labelKey: 'nav.categories', href: '/dashboard/categories', icon: Tags },
  { labelKey: 'nav.savingsFunds', href: '/dashboard/funds', icon: PiggyBank },
] as const;

const analyticsItems = [
  { labelKey: 'nav.monthly', href: '/dashboard/analytics/monthly', icon: Calendar },
  { labelKey: 'nav.yearly', href: '/dashboard/analytics/yearly', icon: TrendingUp },
  { labelKey: 'nav.emergencyFund', href: '/dashboard/analytics/emergency-fund', icon: ShieldCheck },
  { labelKey: 'nav.cashFlow', href: '/dashboard/analytics/cashflow', icon: GitFork },
] as const;

const toolsItems = [
  { labelKey: 'nav.budgetMaker', href: '/dashboard/budget-maker', icon: ListChecks },
] as const;

// Tools that only appear when their feature flag is on for this user. Kept separate from
// `toolsItems` so the ungated arrays stay plain data.
const featureGatedToolsItems = [
  { labelKey: 'nav.screenshotImport', href: '/dashboard/import/screenshot', icon: ScanLine, flag: 'screenshot_import' },
  { labelKey: 'nav.trading212', href: '/dashboard/trading212', icon: LineChart, flag: 'trading212' },
] as const;

const calculatorsItems = [
  { labelKey: 'nav.investingCalculator', href: '/dashboard/investing-calculator', icon: Landmark },
  { labelKey: 'nav.dividendCalculator', href: '/dashboard/dividend-calculator', icon: CircleDollarSign },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile, onClose }: SidebarProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const location = useLocation();
  const { t, currency: userCurrency } = useUser();

  const { data: recurringData } = useQuery({
    queryKey: ['recurring', userCurrency],
    queryFn: async () => recurringApi.getAll({ base_currency: userCurrency }),
    staleTime: 5 * 60 * 1000,
  });
  const dueRecurringCount = (recurringData?.data ?? []).filter((r) => daysDiff(r.next_date) <= 0).length;

  const { data: featureFlags } = useFeatureFlags();
  const enabledFlags = new Set(
    (featureFlags ?? []).filter((f) => f.is_enabled).map((f) => f.feature_key)
  );
  const visibleToolsItems = [
    ...toolsItems,
    ...featureGatedToolsItems.filter((item) => enabledFlags.has(item.flag)),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const handleNavClick = () => {
    if (isMobile && onClose) onClose();
  };

  return (
    <aside
      className={cn(
        'safe-top safe-bottom fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        isMobile && 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-lg font-bold font-display text-foreground">{t('appName')}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && !isMobile && (
          null
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('nav.closeSidebar')}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Main nav */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const showDueBadge = item.href === '/dashboard/recurring' && dueRecurringCount > 0;
            const dueLabel = dueRecurringCount > 9 ? '9+' : String(dueRecurringCount);
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/dashboard'}
                onClick={handleNavClick}
                aria-label={
                  collapsed
                    ? `${t(item.labelKey)}${showDueBadge ? ` (${dueRecurringCount})` : ''}`
                    : undefined
                }
                className={({ isActive: active }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all',
                    collapsed ? 'justify-center px-2' : 'px-3',
                    active || isActive(item.href)
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )
                }
              >
                <span className="relative flex-shrink-0">
                  <item.icon className="h-5 w-5" />
                  {showDueBadge && collapsed && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-destructive-foreground">
                      {dueLabel}
                    </span>
                  )}
                </span>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {showDueBadge && !collapsed && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                    {dueLabel}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Analytics section */}
        <div className="pt-4">
          {!collapsed ? (
            <>
              <button
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <BarChart3 className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{t('nav.analytics')}</span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', analyticsOpen && 'rotate-180')}
                />
              </button>
              <AnimatePresence>
                {analyticsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-1 space-y-1 overflow-hidden pl-4"
                  >
                    {analyticsItems.map((item) => (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={handleNavClick}
                        className={({ isActive: active }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            active
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.labelKey)}</span>
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="space-y-1">
              {analyticsItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={handleNavClick}
                  aria-label={t(item.labelKey)}
                  className={({ isActive: active }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg justify-center px-2 py-2.5 text-sm font-medium transition-all',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Tools section */}
        <div className="space-y-1 pt-4">
          <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
            {!collapsed && t('nav.tools')}
          </div>
          {visibleToolsItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/dashboard'}
              onClick={handleNavClick}
              aria-label={collapsed ? t(item.labelKey) : undefined}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all',
                  collapsed ? 'justify-center px-2' : 'px-3',
                  active || isActive(item.href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {t(item.labelKey)}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </div>

        {/* Calculators section */}
        <div className="space-y-1 pt-4">
          <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
            {!collapsed && t('nav.calculators')}
          </div>
          {calculatorsItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/dashboard'}
              onClick={handleNavClick}
              aria-label={collapsed ? t(item.labelKey) : undefined}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all',
                  collapsed ? 'justify-center px-2' : 'px-3',
                  active || isActive(item.href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {t(item.labelKey)}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Profile link */}
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/dashboard/profile"
          onClick={handleNavClick}
          aria-label={collapsed ? t('nav.profile') : undefined}
          className={({ isActive: active }) =>
            cn(
              'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all',
              collapsed ? 'justify-center px-2' : 'px-3',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>{t('nav.profile')}</span>}
        </NavLink>
      </div>
    </aside>
  );
}

export function MobileSidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="lg:hidden min-h-[44px] min-w-[44px]"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
