import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  User,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
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
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/dashboard'}
              className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors"
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
      {/* Spacer for iPhone home indicator */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}
