import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { UserNav } from '@/components/layout/UserNav';
import { cn } from '@/lib/utils';

const PUBLIC_NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
] as const;

const pillItem =
  'inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-[0.4375rem] text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const pillItemActive = 'bg-foreground/10 text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.16)]';

/** The public top bar: brand, a glass pill with the public pages, and the sign-in actions. */
export function PublicHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="safe-top sticky top-0 z-40 bg-gradient-to-b from-background from-60% to-transparent pb-3">
      <div className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 pt-3 sm:px-5 lg:grid-cols-[1fr_auto_1fr] lg:px-8 lg:pt-5">
        <Link
          to="/"
          className="justify-self-start whitespace-nowrap rounded-md text-base font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Budgeting Dashboard
        </Link>

        <nav aria-label="Main" className="glass hidden items-center gap-0.5 rounded-full p-[0.3125rem] lg:flex">
          {PUBLIC_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn(pillItem, isActive && pillItemActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Open dashboard
              </Link>
              <UserNav />
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="whitespace-nowrap rounded-sm px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Log in
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Below the desktop breakpoint the pages are a plain row of links under the bar. */}
      <nav aria-label="Main" className="mt-2 flex gap-x-5 overflow-x-auto px-4 text-sm sm:px-5 lg:hidden">
        {PUBLIC_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap border-b-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
