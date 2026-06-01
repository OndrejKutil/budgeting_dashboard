import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Database, LayoutDashboard, Settings2 } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const accessItems = [
    { label: 'Dashboard', detail: 'Monthly totals and cash-flow view', icon: LayoutDashboard },
    { label: 'Transactions', detail: 'Income, expenses, transfers, and categories', icon: Database },
    { label: 'Analytics', detail: 'Spending trends, savings, and investments', icon: BarChart3 },
    { label: 'Settings', detail: 'Profile, privacy mode, exports, and account access', icon: Settings2 },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden border-r border-border bg-background-secondary lg:flex lg:flex-col">
        <div className="absolute inset-y-0 right-0 w-px bg-primary/30" />

        <div className="relative z-10 p-8">
          <Link to="/" className="flex items-center gap-2">

            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 items-center p-12">
          <section className="w-full max-w-xl space-y-8">
            <div className="space-y-4">
              <h2 className="max-w-lg text-3xl font-bold leading-tight font-display lg:text-4xl">
                Open your protected finance workspace.
              </h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Sign in to work with saved transactions, budgets, analytics, and preferences tied to your account.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Workspace areas</h3>
                  <p className="text-sm text-muted-foreground">Available after authentication</p>
                </div>
              </div>

              <div className="divide-y divide-border">
                {accessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.label}</div>
                        <div className="text-sm text-muted-foreground">{item.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-4 text-sm text-muted-foreground">
              Privacy mode remains available inside the app when you need to review finances while sharing your screen.
            </div>
          </section>
        </div>
      </div>

      {/* Right side - Form */}
      <main id="main-content" className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-2">

              <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
            </Link>
          </div>

          <div>
            <h1 className="mb-2 text-2xl font-bold font-display">{title}</h1>
            <p className="mb-8 text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
