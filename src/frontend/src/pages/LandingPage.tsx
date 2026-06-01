import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '@/lib/api/endpoints';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { UserNav } from '@/components/layout/UserNav';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  PieChart,
  Shield,
  Wallet,
  ArrowRight,
  PiggyBank,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  DollarSign,
} from 'lucide-react';

/* ─── Data ─── */

const outcomes = [
  { num: '01', title: 'Monthly Clarity', desc: 'Know your exact financial position — income, expenses, profit, and cash flow — every single month.' },
  { num: '02', title: 'Resilience Score', desc: 'How many months could you survive on savings? Get a real answer based on your core expenses.' },
  { num: '03', title: 'Budget Planning', desc: "Build next month's budget from real historical data, not wishful thinking." },
];

const specs = [
  {
    icon: BarChart3,
    label: 'Monthly Breakdown',
    detail: 'Income, expenses, savings, and net cash flow — broken down by your categories, every single month.',
  },
  {
    icon: PieChart,
    label: 'Category System',
    detail: 'Define your own spending categories. See exactly where every koruna goes with visual breakdowns.',
  },
  {
    icon: PiggyBank,
    label: 'Savings Tracking',
    detail: 'Create savings funds with targets. Track contributions and withdrawals separately — net savings, not gross.',
  },
  {
    icon: Shield,
    label: 'Emergency Fund',
    detail: 'Calculate your runway based on real core expenses. 3-month and 6-month resilience scores.',
  },
];



const forYouPoints = [
  "You want a clean monthly overview of income, expenses, and net flow",
  "You're fine with manual entry or CSV import to stay in control",
  "You want categories + simple analytics that actually explain your spending",
  "You want savings goals (including an emergency fund analysis) in the same dashboard",
];

const notForYouPoints = [
  "You need automatic bank sync (not supported right now)",
  "You want investment/portfolio tracking and performance analytics",
  "You need receipts, invoices, or business expense workflows",
  "You want AI recommendations and coaching-style insights",
];

/* ─── Animations ─── */

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ─── Mini Dashboard Preview ─── */

function DashboardPreview() {
  const kpis = [
    { label: 'Income', value: '32 500 Kč', icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Expenses', value: '18 700 Kč', icon: ArrowDownRight, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Savings', value: '8 000 Kč', icon: PiggyBank, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    { label: 'Profit', value: '5 800 Kč', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const categories = [
    { name: 'Rent / Housing', amount: '9 500 Kč', pct: 51, color: CHART_COLORS.core },
    { name: 'Groceries', amount: '4 200 Kč', pct: 22, color: CHART_COLORS.necessary },
    { name: 'Transport', amount: '2 800 Kč', pct: 15, color: CHART_COLORS.future },
    { name: 'Subscriptions', amount: '1 400 Kč', pct: 7, color: CHART_COLORS.fun },
    { name: 'Other', amount: '800 Kč', pct: 5, color: CHART_COLORS.neutral },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-amber-500/5 blur-[60px] rounded-full pointer-events-none" />
      <div className="relative rounded-xl border theme-border-subtle bg-background/90 backdrop-blur-xl overflow-hidden shadow-sm">
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b theme-border-subtle theme-bg-subtle">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-muted dark:bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted dark:bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted dark:bg-white/10" />
          </div>
          <span className="text-[10px] theme-text-muted-30 ml-2 font-medium tracking-wide">Monthly Analytics — January 2026</span>
        </div>
        <div className="p-4 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border theme-border-subtle bg-card/60 dark:bg-white/[0.03] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] theme-text-muted-40 uppercase tracking-wider">{kpi.label}</span>
                  <div className={`p-1 rounded-md ${kpi.bg}`}>
                    <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                  </div>
                </div>
                <span className="text-sm font-semibold theme-text-strong">{kpi.value}</span>
              </div>
            ))}
          </div>
          {/* Category breakdown */}
          <div className="rounded-lg border theme-border-subtle bg-card/60 dark:bg-white/[0.03] p-3">
            <span className="text-[10px] theme-text-muted-40 uppercase tracking-wider block mb-3">Expense Breakdown</span>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-[11px] theme-text-muted-50 w-24 truncate">{cat.name}</span>
                  <div className="flex-1 h-1.5 rounded-full theme-bg-chip overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                  </div>
                  <span className="text-[11px] theme-text-muted-40 w-16 text-right">{cat.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Warm up backend
    healthApi.check().catch(() => {
      // Ignore errors as this is just a warm-up call
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Header */}
      <header className="safe-top fixed left-0 right-0 top-0 z-50 border-b theme-border-subtle bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">

            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <UserNav />
            ) : (
              <>

                <Button variant="ghost" asChild className="theme-text-muted-80 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10">
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button asChild className="border border-amber-500/50 bg-transparent hover:bg-amber-500/10 text-amber-500 transition-all duration-300">
                  <Link to="/auth/register">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
      {/* ─── Hero ─── */}
      <section className="relative z-10 min-h-screen flex items-center pt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
              className="relative z-10 max-w-2xl"
            >
              <motion.p variants={fadeInUp} className="text-xs font-medium tracking-[0.2em] uppercase text-amber-500 mb-6">
                Personal Finance Tool
              </motion.p>

              <motion.h1 variants={fadeInUp} className="mb-8 text-5xl font-display sm:text-6xl lg:text-[4.2rem] leading-[1.1] tracking-tight">
                <span className="font-extrabold theme-text-strong">Know your exact</span>
                <br />
                <span className="font-extrabold theme-text-strong">number.</span>
                <br className="sm:hidden" />
                {' '}
                <span className="font-serif italic font-normal text-amber-400/90 tracking-normal">Every month.</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="mb-10 max-w-xl text-lg theme-text-muted-50 leading-relaxed">
                Not a guess. Not an estimate. Your real income minus your real
                expenses — with savings, investments, and cash flow separated so
                you actually understand what's happening with your money.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4">
                {isAuthenticated ? (
                  <Button size="lg" asChild className="border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-8 transition-all duration-300">
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild className="border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-8 transition-all duration-300">
                      <Link to="/auth/register">
                        Start Your Ledger
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="ghost" asChild className="theme-text-muted-60 hover:text-foreground dark:hover:text-white hover:bg-muted/60 dark:hover:bg-white/5 transition-all duration-300">
                      <Link to="/auth/login">Log in</Link>
                    </Button>
                  </>
                )}
              </motion.div>

              {!isAuthenticated && (
                <motion.div variants={fadeInUp} className="pt-4">
                  <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-sm theme-text-muted-40 hover:text-foreground/70 dark:hover:text-white/70 transition-colors group">
                    <HelpCircle className="h-3.5 w-3.5" />
                    See how it works
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="hidden lg:block"
            >
              <DashboardPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Outcomes Strip ─── */}
      <section className="relative z-10 border-y theme-border-subtle theme-bg-subtle">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border dark:divide-white/10"
          >
            {outcomes.map((o) => (
              <motion.div key={o.num} variants={fadeInUp} className="py-10 px-0 md:px-10 first:pl-0 last:pr-0">
                <span className="text-xs font-mono text-amber-500/60 tracking-widest block mb-3">{o.num}</span>
                <h3 className="text-lg font-semibold font-display theme-text-strong mb-2">{o.title}</h3>
                <p className="text-sm theme-text-muted-40 leading-relaxed">{o.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features: Spec Rows ─── */}
      <section className="relative py-24 overflow-hidden z-10">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <h2 className="mb-4 text-3xl font-display sm:text-4xl tracking-tight">
              <span className="text-hero-thin theme-text-strong-90">What the </span>
              <span className="text-hero-bold text-primary">instrument</span>
              <span className="text-hero-thin theme-text-strong-90"> does.</span>
            </h2>
            <p className="theme-text-muted-50 text-lg">
              Four capabilities for people who want to understand their money — not just see a chart of it.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="border-t theme-border-subtle"
          >
            {specs.map((spec, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="group grid sm:grid-cols-[250px_1fr] gap-4 sm:gap-12 py-8 px-2 sm:px-4 border-b theme-border-subtle hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors duration-300 items-baseline"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center rounded-lg theme-bg-chip p-2 text-amber-500 ring-1 theme-ring-subtle group-hover:ring-amber-500/30 transition-all duration-300">
                    <spec.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold font-display tracking-tight theme-text-strong">{spec.label}</h3>
                </div>
                <p className="text-sm theme-text-muted-50 leading-relaxed group-hover:text-foreground/70 dark:group-hover:text-white/70 transition-colors duration-300">{spec.detail}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>



      {/* ─── Is This For You ─── */}
      <section className="relative z-10 py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-500 mb-4">Fit Check</p>
            <h2 className="text-3xl font-display sm:text-4xl tracking-tight theme-text-strong">Is this for you?</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid lg:grid-cols-[1.4fr_1fr] gap-16 lg:gap-20"
          >
            <motion.div variants={fadeInUp}>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight theme-text-strong">Ideally, you are...</h3>
              </div>
              <ul className="space-y-5">
                {forYouPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-4 group">
                    <CheckCircle className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-base theme-text-muted-50 group-hover:text-foreground/80 dark:group-hover:text-white/80 transition-colors leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <div className="flex items-center gap-3 mb-8 opacity-70">
                <div className="p-2 rounded-full bg-red-500/10 text-red-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight theme-text-muted-60">This is NOT for you if...</h3>
              </div>
              <ul className="space-y-5">
                {notForYouPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-4 theme-text-muted-35">
                    <XCircle className="mt-1 h-4 w-4 flex-shrink-0 text-red-400/40" />
                    <span className="text-base leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      {!isAuthenticated && (
        <section className="relative z-10 py-24 lg:py-32 border-t theme-border-subtle">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-display sm:text-4xl tracking-tight mb-6">
                <span className="text-hero-thin theme-text-strong-90">The best time to start was </span>
                <span className="text-hero-bold text-primary">last month.</span>
              </motion.h2>
              <motion.p variants={fadeInUp} className="theme-text-muted-50 text-lg leading-relaxed mb-10 max-w-xl">
                Open a free account. Set up your categories. Log your first
                transaction. You'll know more about your money by the end of
                this month than most people learn in a year.
              </motion.p>
              <motion.div variants={fadeInUp}>
                <Button size="lg" asChild className="border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-8 transition-all duration-300">
                  <Link to="/auth/register">
                    Start Your Ledger
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t theme-border-subtle py-10">
        <div className="container mx-auto grid gap-10 px-4 text-sm theme-text-muted-50 md:grid-cols-[1.4fr_2fr] lg:px-8">
          <div className="space-y-3">
            <Link to="/" className="inline-flex font-display text-lg font-bold theme-text-strong">
              Budgeting Dashboard
            </Link>
            <p className="max-w-sm text-xs leading-relaxed sm:text-sm">
              Personal finance analytics for income, expenses, savings, and cash flow.
            </p>
            <p className="text-xs sm:text-sm">Built by Ondřej Kutil</p>
          </div>

          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500/80">Product</h2>
              <div className="flex flex-col gap-2">
                <Link to="/how-it-works" className="text-xs sm:text-sm theme-text-muted-50 underline-offset-4 hover:text-foreground dark:hover:text-white hover:underline transition-colors">How it works</Link>
                <Link to="/faq" className="text-xs sm:text-sm theme-text-muted-50 underline-offset-4 hover:text-foreground dark:hover:text-white hover:underline transition-colors">FAQs</Link>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500/80">Project</h2>
              <div className="flex flex-col gap-2">
                <Link to="/about" className="text-xs sm:text-sm theme-text-muted-50 underline-offset-4 hover:text-foreground dark:hover:text-white hover:underline transition-colors">About</Link>
                <a href="https://github.com/OndrejKutil" target="_blank" rel="noreferrer" className="text-xs sm:text-sm theme-text-muted-50 underline-offset-4 hover:text-foreground dark:hover:text-white hover:underline transition-colors">GitHub</a>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500/80">Legal</h2>
              <div className="flex flex-col gap-2">
                <Link to="/privacy" className="text-xs sm:text-sm theme-text-muted-50 underline-offset-4 hover:text-foreground dark:hover:text-white hover:underline transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-xs sm:text-sm theme-text-muted-50 underline-offset-4 hover:text-foreground dark:hover:text-white hover:underline transition-colors">Terms of Service</Link>
              </div>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
