import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { healthApi } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { UserNav } from '@/components/layout/UserNav';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  ArrowRight,
  CheckCircle,
  Wallet,
} from 'lucide-react';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function formatNumber(value: number, decimals = 0) {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${withThousands}.${decPart}` : withThousands;
}

function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  className,
  delay = 0,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => `${formatNumber(v, decimals)}${suffix}`);

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.4, delay, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, decimals, delay, reduce, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}

const donutSegments = [
  { pct: 51, color: CHART_COLORS.core },
  { pct: 22, color: CHART_COLORS.necessary },
  { pct: 15, color: CHART_COLORS.future },
];

function AnimatedDonut() {
  let cumulative = 0;
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" opacity={0.5} />
      {donutSegments.map((seg, i) => {
        const offset = cumulative / 100;
        cumulative += seg.pct;
        return (
          <motion.circle
            key={seg.color}
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={seg.color}
            strokeWidth="3.5"
            pathOffset={offset}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: seg.pct / 100 }}
            transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: EASE_OUT }}
          />
        );
      })}
    </svg>
  );
}

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

// A bar that fills on load, then a soft highlight drifts across it forever (ambient).
function BarFill({
  width,
  delay = 0,
  className = '',
  style,
}: {
  width: string;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={`relative h-full overflow-hidden rounded-full ${className}`}
      style={style}
      initial={{ width: 0 }}
      animate={{ width }}
      transition={{ duration: 1.1, delay, ease: EASE_OUT }}
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        initial={{ x: '-180%' }}
        animate={{ x: '360%' }}
        transition={{
          duration: 1.9,
          delay: delay + 1.4,
          repeat: Infinity,
          repeatDelay: 3,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

function ProductPreview() {
  const metrics = [
    { label: 'Income', value: 32500, color: CHART_COLORS.income },
    { label: 'Spent', value: 18700, color: CHART_COLORS.expense },
    { label: 'Saved', value: 8000, color: CHART_COLORS.savings },
  ];

  const categories = [
    { name: 'Housing', amount: 9500, pct: 51, color: CHART_COLORS.core },
    { name: 'Groceries', amount: 4200, pct: 22, color: CHART_COLORS.necessary },
    { name: 'Transport', amount: 2800, pct: 15, color: CHART_COLORS.future },
  ];

  return (
    <div className="relative w-full text-left">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-10 top-10 -z-10 rounded-full opacity-60 blur-[90px]"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--primary)/0.22), transparent)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: EASE_OUT }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d0b] shadow-[0_40px_120px_-24px_hsl(var(--primary)/0.28),0_30px_80px_hsl(0_0%_0%/0.5)]">
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Monthly review</p>
              <p className="mt-0.5 text-xs text-white/50">January 2026</p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-x-10 gap-y-8 border-b border-white/10 pb-6 lg:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Cash left this month</p>
                <AnimatedNumber
                  value={5800}
                  suffix=" Kč"
                  delay={0.4}
                  className="mt-3 block text-4xl font-semibold tracking-tight tabular-nums text-white sm:text-5xl"
                />
                <p className="mt-2 text-sm text-white/50">after expenses, savings, and investing</p>

                <div className="mt-6 grid grid-cols-2 gap-6 border-t border-white/10 pt-5">
                  <div>
                    <p className="text-xs text-white/40">Savings rate</p>
                    <AnimatedNumber
                      value={24.6}
                      decimals={1}
                      suffix="%"
                      delay={0.5}
                      className="mt-1.5 block text-sm font-semibold tabular-nums text-white"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Budget status</p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-white">
                      <AnimatedNumber value={1240} suffix=" Kč" delay={0.5} />
                      <span className="font-normal text-white/50"> over</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">This month</p>
                <div className="mt-3 divide-y divide-white/10">
                  {metrics.map((metric, i) => (
                    <div key={metric.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: metric.color }} />
                        <span className="text-sm font-medium text-white">{metric.label}</span>
                      </div>
                      <AnimatedNumber
                        value={metric.value}
                        suffix=" Kč"
                        delay={0.45 + i * 0.1}
                        className="text-sm font-semibold tabular-nums text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Spending by category</p>
                    <p className="text-xs text-white/50">Largest expense groups</p>
                  </div>
                  <AnimatedDonut />
                </div>
                <div className="space-y-3.5">
                  {categories.map((category, i) => (
                    <div key={category.name} className="grid grid-cols-[5.5rem_1fr_4.75rem] items-center gap-3">
                      <span className="truncate text-xs text-white/60">{category.name}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <BarFill
                          width={`${category.pct}%`}
                          delay={0.5 + i * 0.12}
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <AnimatedNumber
                        value={category.amount}
                        suffix=" Kč"
                        delay={0.5 + i * 0.12}
                        className="text-right text-xs tabular-nums text-white/60"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:border-l lg:border-white/10 lg:pl-8">
                <div className="mb-4">
                  <p className="text-sm font-medium text-white">Plan snapshot</p>
                  <p className="text-xs text-white/50">Next month setup</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-xs text-white/50">February baseline</p>
                      <AnimatedNumber
                        value={23000}
                        suffix=" Kč"
                        delay={0.6}
                        className="text-sm font-semibold tabular-nums text-white"
                      />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <BarFill width="82%" delay={0.65} className="bg-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-xs text-white/50">Emergency runway</p>
                      <AnimatedNumber
                        value={4.8}
                        decimals={1}
                        suffix=" mo"
                        delay={0.7}
                        className="text-sm font-semibold tabular-nums text-white"
                      />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <BarFill width="68%" delay={0.75} className="bg-chart-savings" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
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
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div
              className="absolute left-1/2 top-[-180px] h-[560px] w-[min(1100px,130vw)] -translate-x-1/2 rounded-full opacity-[0.55] blur-[130px]"
              style={{ background: 'radial-gradient(closest-side, hsl(var(--primary)/0.42), hsl(24 95% 53%/0.18), transparent)' }}
            />
            <div
              className="absolute left-1/2 top-[140px] h-[320px] w-[760px] -translate-x-1/2 rounded-full opacity-40 blur-[110px]"
              style={{ background: 'radial-gradient(closest-side, hsl(38 92% 50%/0.3), transparent)' }}
            />
          </div>

          <div className="container relative z-10 mx-auto px-4 pb-20 pt-16 text-center sm:pb-24 sm:pt-20 lg:px-8 lg:pt-24">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
              className="mx-auto max-w-3xl"
            >
              <h1 className="text-balance text-5xl font-bold leading-[0.98] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-7xl">
                One tracker for your <span className="text-primary">finances.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Transactions, budgets, savings, and cash flow in one monthly view.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isAuthenticated ? (
                  <Button size="lg" asChild className="shadow-[0_12px_28px_hsl(var(--primary)/0.18)]">
                    <Link to="/dashboard">
                      Open dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild className="shadow-[0_12px_28px_hsl(var(--primary)/0.25)]">
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
                      <Link to="/demo">
                        Try Demo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            <div className="relative mx-auto mt-16 max-w-[1000px]">
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
                  <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Button size="lg" asChild className="shadow-[0_12px_28px_hsl(var(--primary)/0.18)]">
                      <Link to="/auth/register">
                        Create account
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                      <Link to="/demo">
                        or try the demo first
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
