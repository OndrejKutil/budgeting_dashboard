import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { UserNav } from '@/components/layout/UserNav';
import {
  TrendingUp,
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
  Landmark,
  BarChart3,
  DollarSign,
} from 'lucide-react';

/* ─── Data ─── */

const principles = [
  { num: '01', title: 'Manual Entry', desc: "You type every number. That's the point." },
  { num: '02', title: 'Your Categories', desc: 'You define the system. The app follows.' },
  { num: '03', title: 'Honest Math', desc: 'No estimates. No rounding. Your data, verified.' },
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
    detail: 'Define your own spending categories. No AI guessing what "Groceries" means. You decide.',
  },
  {
    icon: PiggyBank,
    label: 'Savings Tracking',
    detail: 'Create savings funds with targets. Track contributions and withdrawals separately.',
  },
  {
    icon: Shield,
    label: 'Emergency Fund',
    detail: 'Calculate your runway based on real core expenses. 3-month and 6-month resilience scores.',
  },
];

const toolSpecs = [
  { label: 'Data Entry', value: 'Manual + CSV Import' },
  { label: 'Bank Sync', value: 'None — by design' },
  { label: 'Auto-Categorization', value: 'None — you decide' },
  { label: 'AI Features', value: 'Voice input only (opt-in)' },
  { label: 'Data Ownership', value: '100% yours' },
  { label: 'Price', value: 'Free' },
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
    { label: 'Expenses', value: '18 700 Kč', icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Savings', value: '8 000 Kč', icon: PiggyBank, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Profit', value: '5 800 Kč', icon: DollarSign, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  ];

  const categories = [
    { name: 'Rent / Housing', amount: '9 500 Kč', pct: 51 },
    { name: 'Groceries', amount: '4 200 Kč', pct: 22 },
    { name: 'Transport', amount: '2 800 Kč', pct: 15 },
    { name: 'Subscriptions', amount: '1 400 Kč', pct: 7 },
    { name: 'Other', amount: '800 Kč', pct: 5 },
  ];

  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="absolute -inset-4 bg-cyan-500/5 blur-[60px] rounded-full pointer-events-none" />

      <div className="relative rounded-2xl border border-white/10 bg-[hsl(var(--background))]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Fake window bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <span className="text-[10px] text-white/30 ml-2 font-medium tracking-wide">Monthly Analytics — January 2026</span>
        </div>

        <div className="p-4 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">{kpi.label}</span>
                  <div className={`p-1 rounded-md ${kpi.bg}`}>
                    <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">{kpi.value}</span>
              </div>
            ))}
          </div>

          {/* Mini category breakdown */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-3">Expense Breakdown</span>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-24 truncate">{cat.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/40 w-16 text-right">{cat.amount}</span>
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
      <header className="safe-top fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <UserNav />
            ) : (
              <>
                <Button variant="ghost" asChild className="text-white/60 hover:text-white hover:bg-white/10 hidden sm:inline-flex">
                  <Link to="/how-it-works">How It Works</Link>
                </Button>
                <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button asChild className="border border-cyan-400/50 bg-transparent hover:bg-cyan-400/10 text-cyan-400 transition-all duration-300">
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

      {/* ─── Hero ─── */}
      <section className="relative z-10 min-h-screen flex items-center pt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
            {/* Left — Copy */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
              className="relative z-10 max-w-2xl"
            >
              <motion.p
                variants={fadeInUp}
                className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-400 mb-6"
              >
                Personal Finance Tool
              </motion.p>

              <motion.h1
                variants={fadeInUp}
                className="mb-8 text-4xl font-display sm:text-5xl lg:text-6xl leading-[1.1]"
              >
                <span className="text-hero-bold text-white">Every transaction.</span>
                <br />
                <span className="text-hero-bold text-white">Entered by hand.</span>
                <br />
                <span className="text-hero-bold text-gradient-teal">Understood completely.</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mb-10 max-w-xl text-lg text-white/50 leading-relaxed"
              >
                No bank sync. No auto-categorization. Just a clean ledger,
                honest math, and the clarity that comes from entering the
                numbers yourself.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4">
                {isAuthenticated ? (
                  <Button size="lg" asChild className="border border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-8 transition-all duration-300">
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild className="border border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-8 transition-all duration-300">
                      <Link to="/auth/register">
                        Start Your Ledger
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="ghost" asChild className="text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300">
                      <Link to="/auth/login">Log in</Link>
                    </Button>
                  </>
                )}
              </motion.div>

              {!isAuthenticated && (
                <motion.div variants={fadeInUp} className="pt-4">
                  <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors group">
                    <HelpCircle className="h-3.5 w-3.5" />
                    See how it works
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </motion.div>
              )}
            </motion.div>

            {/* Right — Dashboard Preview */}
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

      {/* ─── Philosophy Strip ─── */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10"
          >
            {principles.map((p) => (
              <motion.div
                key={p.num}
                variants={fadeInUp}
                className="py-10 px-0 md:px-10 first:pl-0 last:pr-0"
              >
                <span className="text-xs font-mono text-cyan-400/60 tracking-widest block mb-3">{p.num}</span>
                <h3 className="text-lg font-semibold font-display text-white mb-2">{p.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{p.desc}</p>
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
              <span className="text-hero-thin text-white/90">What the </span>
              <span className="text-hero-bold text-gradient-teal">instrument</span>
              <span className="text-hero-thin text-white/90"> does.</span>
            </h2>
            <p className="text-white/50 text-lg">
              Four capabilities for people who want to understand their money — not hand it over to an algorithm.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="border-t border-white/10"
          >
            {specs.map((spec, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="group grid sm:grid-cols-[250px_1fr] gap-4 sm:gap-12 py-8 px-2 sm:px-4 border-b border-white/10 hover:bg-white/[0.02] transition-colors duration-300 items-baseline"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-cyan-400 ring-1 ring-white/10 group-hover:ring-cyan-400/30 transition-all duration-300">
                    <spec.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold font-display tracking-tight text-white">{spec.label}</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors duration-300">{spec.detail}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Manual Entry Is the Point ─── */}
      <section className="relative z-10 py-24 lg:py-32 bg-white/[0.03] border-y border-white/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-start"
          >
            {/* Left — Copy */}
            <div>
              <motion.p variants={fadeInUp} className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-400 mb-4">
                Philosophy
              </motion.p>
              <motion.h2 variants={fadeInUp} className="text-3xl font-display sm:text-4xl tracking-tight text-white mb-8">
                Manual entry is the point.
              </motion.h2>
              <div className="space-y-6 text-white/50 leading-relaxed">
                <motion.p variants={fadeInUp}>
                  Budgeting apps that sync your bank account give you a rearview
                  mirror — you see what already happened. This app gives you a
                  steering wheel.
                </motion.p>
                <motion.p variants={fadeInUp}>
                  When you type the number yourself, you feel it. 200&nbsp;Kč on
                  groceries hits different when your fingers press every digit.
                  That friction is what separates people who{' '}
                  <em className="text-white/80 italic">track</em> their money
                  from people who{' '}
                  <em className="text-white/80 italic">control</em> it.
                </motion.p>
                <motion.p variants={fadeInUp}>
                  We didn't skip bank sync because we couldn't build it. We
                  skipped it because the act of entering — of{' '}
                  <em className="text-white/80 italic">deciding</em> what each
                  transaction means — is where financial awareness actually
                  starts.
                </motion.p>
              </div>
            </div>

            {/* Right — Tool Spec Card */}
            <motion.div variants={fadeInUp}>
              <div className="rounded-2xl border border-white/10 bg-[hsl(var(--card))]/80 backdrop-blur-lg p-8 lg:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-8">
                    <Landmark className="h-4 w-4 text-cyan-400/60" />
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-white/30">Tool Specifications</span>
                  </div>
                  <div className="space-y-0">
                    {toolSpecs.map((row, i) => (
                      <div
                        key={i}
                        className={`flex justify-between items-baseline gap-4 py-4 ${i < toolSpecs.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                      >
                        <span className="text-sm text-white/40">{row.label}</span>
                        <span className="text-sm font-medium text-white/80 text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
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
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan-400 mb-4">
              Fit Check
            </p>
            <h2 className="text-3xl font-display sm:text-4xl tracking-tight text-white">
              Is this for you?
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid lg:grid-cols-[1.4fr_1fr] gap-16 lg:gap-20"
          >
            {/* For You */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight text-white">Ideally, you are...</h3>
              </div>
              <ul className="space-y-5">
                {forYouPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-4 group">
                    <CheckCircle className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-base text-white/50 group-hover:text-white/80 transition-colors leading-relaxed">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Not For You */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center gap-3 mb-8 opacity-70">
                <div className="p-2 rounded-full bg-red-500/10 text-red-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-display tracking-tight text-white/60">This is NOT for you if...</h3>
              </div>
              <ul className="space-y-5">
                {notForYouPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-4 text-white/35">
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
        <section className="relative z-10 py-24 lg:py-32 border-t border-white/10">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-display sm:text-4xl tracking-tight mb-6">
                <span className="text-hero-thin text-white/90">The best time to start was </span>
                <span className="text-hero-bold text-gradient-teal">last month.</span>
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-white/50 text-lg leading-relaxed mb-10 max-w-xl">
                Open a free account. Set up your categories. Log your first
                transaction. You'll know more about your money by the end of
                this month than most people learn in a year.
              </motion.p>
              <motion.div variants={fadeInUp}>
                <Button size="lg" asChild className="border border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-8 transition-all duration-300">
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

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-white/50 sm:flex-row">
          <span className="text-xs sm:text-sm">Built by Ondřej Kutil</span>
          <div className="flex items-center gap-6">
            <Link to="/how-it-works" className="text-xs sm:text-sm text-white/50 underline-offset-4 hover:text-white hover:underline transition-colors">
              How it works
            </Link>
            <Link to="/faq" className="text-xs sm:text-sm text-white/50 underline-offset-4 hover:text-white hover:underline transition-colors">
              FAQs
            </Link>
            <a
              href="https://github.com/OndrejKutil"
              target="_blank"
              rel="noreferrer"
              className="text-xs sm:text-sm text-white/50 underline-offset-4 hover:text-white hover:underline transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
