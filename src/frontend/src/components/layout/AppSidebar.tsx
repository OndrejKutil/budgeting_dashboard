import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const mainNavItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Categories', href: '/dashboard/categories', icon: Tags },
  { name: 'Savings Funds', href: '/dashboard/funds', icon: PiggyBank },
];

const analyticsItems = [
  { name: 'Monthly', href: '/dashboard/analytics/monthly', icon: Calendar },
  { name: 'Yearly', href: '/dashboard/analytics/yearly', icon: TrendingUp },
  { name: 'Emergency Fund', href: '/dashboard/analytics/emergency-fund', icon: ShieldCheck },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile, onClose }: SidebarProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const location = useLocation();

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
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-blurple">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold font-display text-foreground">FinanceApp</span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && !isMobile && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-blurple">
            <Wallet className="h-4 w-4 text-white" />
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
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
          {mainNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/dashboard'}
              onClick={handleNavClick}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active || isActive(item.href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground glow-blurple-sm'
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
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </div>

        {/* Analytics section */}
        <div className="pt-4">
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed && 'justify-center'
            )}
          >
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Analytics</span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', analyticsOpen && 'rotate-180')}
                />
              </>
            )}
          </button>
          <AnimatePresence>
            {analyticsOpen && !collapsed && (
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
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground glow-blurple-sm'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Profile link */}
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/dashboard/profile"
          onClick={handleNavClick}
          className={({ isActive: active }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground glow-blurple-sm'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Profile</span>}
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
      className="lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
