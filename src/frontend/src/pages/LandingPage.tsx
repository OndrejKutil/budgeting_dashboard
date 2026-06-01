import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { UserNav } from '@/components/layout/UserNav';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  CircleDot,
  HelpCircle,
  PieChart,
  PiggyBank,
  Shield,
  Wallet,
  XCircle,
} from 'lucide-react';

const reviewItems = [
  { label: 'Income and expenses', detail: 'See what came in, what went out, and how the month changed your balance.' },
  { label: 'Savings and investments', detail: 'Keep savings contributions and investment amounts separate from daily spending.' },
  { label: 'Net cash flow', detail: 'Review the real monthly difference after spending, saving, and investing.' },
  { label: 'Category spending', detail: 'Compare housing, groceries, transport, subscriptions, and custom categories.' },
  { label: 'Budget variance', detail: 'Use past transactions to plan the next month and check planned versus actual totals.' },
  { label: 'Emergency runway', detail: 'Estimate how long your savings cover core monthly expenses.' },
];

const workflowSteps = [
  { title: 'Add transactions', detail: 'Enter records manually or bring data in from CSV when you want more control.' },
  { title: 'Categorize spending', detail: 'Assign categories and transaction types so the month has a clear structure.' },
  { title: 'Review the month', detail: 'Check income, costs, savings, investments, profit, and cash flow in one place.' },
  { title: 'Plan the next budget', detail: 'Use the previous month as the baseline for spending limits and savings goals.' },
];

const forYouPoints = [
  'You want a monthly overview of income, expenses, savings, and cash flow.',
  'You are comfortable with manual entry or CSV import.',
  'You want categories and budgets based on your own financial structure.',
  'You want savings funds and emergency fund analysis in the same workspace.',
];

const notForYouPoints = [
  'You need automatic bank sync.',
  'You want portfolio performance analytics.',
  'You need receipts, invoices, or business expense workflows.',
  'You want AI coaching or automated financial recommendations.',
];

function ProductPreview() {
  const metrics = [
    { label: 'Income', value: '32 500 Kc', color: CHART_COLORS.income },
    { label: 'Expenses', value: '18 700 Kc', color: CHART_COLORS.expense },
    { label: 'Savings', value: '8 000 Kc', color: CHART_COLORS.savings },
    { label: 'Cash flow', value: '5 800 Kc', color: CHART_COLORS.cashFlow },
  ];

  const categories = [
    { name: 'Housing', amount: '9 500 Kc', pct: 51, color: CHART_COLORS.core },
    { name: 'Groceries', amount: '4 200 Kc', pct: 22, color: CHART_COLORS.necessary },
    { name: 'Transport', amount: '2 800 Kc', pct: 15, color: CHART_COLORS.future },
    { name: 'Subscriptions', amount: '1 400 Kc', pct: 7, color: CHART_COLORS.fun },
  ];

  const recent = [
    { name: 'Rent', type: 'Housing', amount: '-9 500 Kc' },
    { name: 'Salary', type: 'Income', amount: '+32 500 Kc' },
    { name: 'Emergency fund', type: 'Savings', amount: '-5 000 Kc' },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-3xl" />
      <div className="absolute inset-x-10 -bottom-8 h-16 rounded-full bg-black/35 blur-2xl" />
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-[0_24px_80px_hsl(0_0%_0%/0.34),0_1px_0_hsl(0_0%_100%/0.06)_inset]">
      <div className="flex flex-col gap-3 border-b border-border bg-card-elevated/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Monthly review</p>
          <p className="text-sm text-muted-foreground">January 2026</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
          <CircleDot className="h-3.5 w-3.5 text-primary" />
          Manual tracking
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/80 bg-background/80 p-3 shadow-[0_1px_0_hsl(0_0%_100%/0.04)_inset]">
                <div className="mb-3 h-1 w-8 rounded-full" style={{ backgroundColor: metric.color }} />
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-border/80 bg-background/80 p-4 shadow-[0_1px_0_hsl(0_0%_100%/0.04)_inset]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Expense categories</p>
                <p className="text-xs text-muted-foreground">Share of monthly spending</p>
              </div>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.name} className="grid grid-cols-[6rem_1fr_5rem] items-center gap-3">
                  <span className="truncate text-xs text-muted-foreground">{category.name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${category.pct}%`, backgroundColor: category.color }}
                    />
                  </div>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">{category.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-background/30 p-4">
          <div className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-[0_1px_0_hsl(0_0%_100%/0.04)_inset]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Recent records</p>
                <p className="text-xs text-muted-foreground">Last updated today</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {recent.map((record) => (
                <div key={record.name} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{record.name}</p>
                    <p className="text-xs text-muted-foreground">{record.type}</p>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-foreground">{record.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/80 bg-background/80 p-4 shadow-[0_1px_0_hsl(0_0%_100%/0.04)_inset]">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-chart-savings" />
              <p className="text-sm font-medium text-foreground">Emergency fund</p>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">4.8 months</p>
                <p className="text-xs text-muted-foreground">Based on core expenses</p>
              </div>
              <div className="h-16 w-24 rounded-md border border-border bg-muted p-2">
                <div className="h-full rounded-sm bg-chart-savings/70" />
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
        <section className="relative overflow-hidden border-b border-border pt-24 pb-16 lg:pt-28 lg:pb-20">
          <div className="container relative mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Budgeting Dashboard
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                A monthly finance workspace for income, expenses, savings, budgets, and cash flow.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isAuthenticated ? (
                  <Button size="lg" asChild className="shadow-[0_12px_30px_hsl(var(--primary)/0.22),0_1px_0_hsl(0_0%_100%/0.24)_inset]">
                    <Link to="/dashboard">
                      Open dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild className="shadow-[0_12px_30px_hsl(var(--primary)/0.22),0_1px_0_hsl(0_0%_100%/0.24)_inset]">
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

            <div className="mx-auto mt-14 max-w-6xl">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background-secondary/80 py-16 shadow-[0_1px_0_hsl(0_0%_100%/0.03)_inset] lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  What you can review each month
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  The dashboard keeps the recurring finance questions close together, so a monthly review does not turn into a spreadsheet hunt.
                </p>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-[0_18px_50px_hsl(0_0%_0%/0.18),0_1px_0_hsl(0_0%_100%/0.04)_inset]">
                {reviewItems.map((item) => (
                  <div key={item.label} className="grid gap-2 p-4 sm:grid-cols-[12rem_1fr] sm:gap-6 sm:p-5">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-16 lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  How a monthly review works
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  The flow is intentionally manual and transparent. You keep control of the records, categories, and interpretation.
                </p>
              </div>
              <Button
                variant="outline"
                asChild
                className="border-border bg-card text-foreground shadow-sm hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"
              >
                <Link to="/how-it-works">View details</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-border bg-card p-5 shadow-[0_10px_32px_hsl(0_0%_0%/0.14),0_1px_0_hsl(0_0%_100%/0.04)_inset]">
                  <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold text-primary shadow-[0_1px_0_hsl(0_0%_100%/0.08)_inset]">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background-secondary/80 py-16 shadow-[0_1px_0_hsl(0_0%_100%/0.03)_inset] lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Good fit</h2>
                </div>
                <ul className="space-y-4">
                  {forYouPoints.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <CheckCircle className="mt-1 h-4 w-4 flex-shrink-0 text-success" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="mb-6 flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Not the right fit</h2>
                </div>
                <ul className="space-y-4">
                  {notForYouPoints.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <XCircle className="mt-1 h-4 w-4 flex-shrink-0 text-destructive" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {!isAuthenticated && (
          <section className="relative overflow-hidden border-b border-border py-16 lg:py-20">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(ellipse_at_left,hsl(var(--primary)/0.08),transparent_68%)]" />
            <div className="container relative mx-auto px-4 lg:px-8">
              <div className="max-w-2xl">
                <Wallet className="mb-5 h-8 w-8 text-primary" />
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Start tracking this month
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Create an account, set up categories, and log the first transactions you want to review. The dashboard becomes useful as soon as the month has real records in it.
                </p>
                <div className="mt-8">
                  <Button size="lg" asChild className="shadow-[0_12px_30px_hsl(var(--primary)/0.22),0_1px_0_hsl(0_0%_100%/0.24)_inset]">
                    <Link to="/auth/register">
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
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
