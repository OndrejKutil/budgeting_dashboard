import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  User,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Txns', href: '/dashboard/transactions', icon: Receipt },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Funds', href: '/dashboard/funds', icon: PiggyBank },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around px-1 h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/dashboard'}
              className="relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] px-2 py-1 rounded-xl transition-colors"
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}

              <motion.div
                animate={active ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="relative z-10"
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors duration-200',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </motion.div>

              <span
                className={cn(
                  'text-[10px] font-medium transition-colors duration-200 relative z-10',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.name}
              </span>

              {/* Active dot indicator */}
              {active && (
                <motion.div
                  layoutId="bottomNavDot"
                  className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
            </NavLink>
          );
        })}
      </div>
      {/* Spacer for iPhone home indicator */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}

