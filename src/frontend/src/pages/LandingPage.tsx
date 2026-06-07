import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { UserNav } from '@/components/layout/UserNav';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  ArrowRight,
  CheckCircle,
  CircleDot,
  HelpCircle,
  PieChart,
  Wallet,
} from 'lucide-react';

const reviewItems = [
  {
    label: 'Monthly cash flow',
    detail: 'See what came in, what went out, and what was left after saving and investing.',
  },
  {
    label: 'Category pressure',
    detail: 'Spot the few categories that changed the month instead of scanning every transaction.',
  },
  {
    label: 'Next budget',
    detail: 'Use the last month as the starting point for limits, funds, and savings goals.',
  },
];

const workflowSteps = [
  { title: 'Import or enter records', detail: 'Bring in the transactions you want to review.' },
  { title: 'Categorize the month', detail: 'Map spending, savings, funds, and accounts to your own structure.' },
  { title: 'Plan from the result', detail: 'Turn the review into the next budget without rebuilding everything manually.' },
];

function ProductPreview() {
  const metrics = [
    { label: 'Income', value: '32 500 Kč', detail: 'salary and refunds', color: CHART_COLORS.income },
    { label: 'Spent', value: '18 700 Kč', detail: 'regular expenses', color: CHART_COLORS.expense },
    { label: 'Saved', value: '8 000 Kč', detail: 'funds and investing', color: CHART_COLORS.savings },
  ];

  const categories = [
    { name: 'Housing', amount: '9 500 Kč', pct: 51, color: CHART_COLORS.core },
    { name: 'Groceries', amount: '4 200 Kč', pct: 22, color: CHART_COLORS.necessary },
    { name: 'Transport', amount: '2 800 Kč', pct: 15, color: CHART_COLORS.future },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[820px] lg:mx-0">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d0b] shadow-[0_28px_70px_hsl(0_0%_0%/0.34)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Monthly review</p>
            <p className="text-xs text-white/50">January 2026</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
            <CircleDot className="h-3.5 w-3.5 text-primary" />
            Manual tracking
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid gap-5 border-b border-white/10 pb-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs text-white/50">Cash left this month</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="text-5xl font-semibold tracking-tight text-white">5 800 Kč</p>
                <p className="pb-1 text-sm text-white/50">after expenses, savings, and investing</p>
              </div>
              <div className="mt-5 grid max-w-md grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-xs text-white/40">Savings rate</p>
                  <p className="mt-1 font-semibold tabular-nums text-white">24.6%</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Budget status</p>
                  <p className="mt-1 font-semibold tabular-nums text-white">1 240 Kč over</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10 lg:border-y-0">
              {metrics.map((metric) => (
                <div key={metric.label} className="grid grid-cols-[1fr_auto] items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: metric.color }} />
                    <div>
                      <p className="text-sm font-medium text-white">{metric.label}</p>
                      <p className="text-xs text-white/40">{metric.detail}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Spending by category</p>
                  <p className="text-xs text-white/50">Largest expense groups</p>
                </div>
                <PieChart className="h-4 w-4 text-white/45" />
              </div>
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.name} className="grid grid-cols-[5.75rem_1fr_4.75rem] items-center gap-3">
                    <span className="truncate text-xs text-white/60">{category.name}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${category.pct}%`, backgroundColor: category.color }}
                      />
                    </div>
                  <span className="text-right text-xs tabular-nums text-white/60">{category.amount}</span>
                </div>
              ))}
              </div>
            </div>

            <div className="border-y border-white/10 py-4">
              <p className="text-sm font-medium text-white">Plan snapshot</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-xs text-white/50">February baseline</p>
                    <p className="text-sm font-semibold tabular-nums text-white">23 000 Kč</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div className="h-full w-[82%] rounded-full bg-primary" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-xs text-white/50">Emergency runway</p>
                    <p className="text-sm font-semibold tabular-nums text-white">4.8 mo</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div className="h-full w-[68%] rounded-full bg-chart-savings" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    healthApi.check().catch(() => {
      // Warm-up only.
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="safe-top sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-4 lg:px-8">
          <Link to="/" className="text-base font-bold sm:text-xl">
            Budgeting Dashboard
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <UserNav />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth/register">
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-secondary))_100%)]">
          <div className="container mx-auto px-4 pb-32 pt-16 sm:pb-40 sm:pt-20 lg:px-8 lg:pb-48 lg:pt-24">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(560px,1.3fr)] xl:grid-cols-[minmax(0,0.62fr)_minmax(680px,1.38fr)] xl:gap-16">
              <div className="max-w-xl">
                <h1 className="max-w-[10ch] text-5xl font-bold leading-[0.96] tracking-[-0.035em] text-balance text-foreground sm:text-6xl lg:text-7xl">
                  One tracker for your finances.
                </h1>
                <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                  Transactions, budgets, savings, and cash flow in one monthly view.
                </p>

                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                  {isAuthenticated ? (
                    <Button size="lg" asChild className="shadow-[0_12px_28px_hsl(var(--primary)/0.18)]">
                      <Link to="/dashboard">
                        Open dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" asChild className="shadow-[0_12px_28px_hsl(var(--primary)/0.18)]">
                        <Link to="/auth/register">
                          Create account
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        asChild
                        className="border-border bg-card text-foreground shadow-sm hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"
                      >
                        <Link to="/how-it-works">
                          See how it works
                          <HelpCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background py-16 lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
              <div>
                <h2 className="max-w-sm text-3xl font-semibold tracking-tight text-foreground">
                  A monthly review without the spreadsheet hunt.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  The landing page does not need to explain every screen. The product is about answering the same few money questions clearly.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {reviewItems.map((item) => (
                  <div key={item.label} className="border-t border-border pt-5">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background-secondary/80 py-16 shadow-[0_1px_0_hsl(0_0%_100%/0.03)_inset] lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:gap-16">
              <div>
                <h2 className="max-w-md text-3xl font-semibold tracking-tight text-foreground">
                  Built for manual control.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  No bank sync and no automated advice. You choose the records, categories, and budgets, then the dashboard keeps the review organized.
                </p>
                <Button
                  variant="outline"
                  asChild
                  className="mt-7 border-border bg-card text-foreground shadow-sm hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"
                >
                  <Link to="/how-it-works">View details</Link>
                </Button>
              </div>

              <div className="divide-y divide-border border-y border-border">
                {workflowSteps.map((step) => (
                  <div key={step.title} className="flex gap-4 py-5">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {!isAuthenticated && (
          <section className="relative overflow-hidden border-b border-border py-16 lg:py-20">
            <div className="container relative mx-auto px-4 lg:px-8">
              <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-end">
                <div>
                  <Wallet className="mb-5 h-8 w-8 text-primary" />
                  <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground">
                    Start with this month.
                  </h2>
                </div>
                <div>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    Create an account, set up categories, and log the first transactions you want to review.
                  </p>
                  <div className="mt-8">
                    <Button size="lg" asChild className="shadow-[0_12px_28px_hsl(var(--primary)/0.18)]">
                      <Link to="/auth/register">
                        Create account
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="py-10">
        <div className="container mx-auto grid gap-8 px-4 text-sm text-muted-foreground md:grid-cols-[1.2fr_2fr] lg:px-8">
          <div className="space-y-3">
            <Link to="/" className="inline-flex text-base font-bold text-foreground">
              Budgeting Dashboard
            </Link>
            <p className="max-w-sm leading-6">
              Personal finance analytics for income, expenses, savings, budgets, and cash flow.
            </p>
            <p>Built by Ondrej Kutil</p>
          </div>

          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-primary">Product</h2>
              <div className="flex flex-col gap-2">
                <Link to="/how-it-works" className="underline-offset-4 hover:text-foreground hover:underline">How it works</Link>
                <Link to="/faq" className="underline-offset-4 hover:text-foreground hover:underline">FAQs</Link>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-primary">Project</h2>
              <div className="flex flex-col gap-2">
                <Link to="/about" className="underline-offset-4 hover:text-foreground hover:underline">About</Link>
                <a href="https://github.com/OndrejKutil" target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">GitHub</a>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-primary">Legal</h2>
              <div className="flex flex-col gap-2">
                <Link to="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">Privacy Policy</Link>
                <Link to="/terms" className="underline-offset-4 hover:text-foreground hover:underline">Terms of Service</Link>
              </div>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
