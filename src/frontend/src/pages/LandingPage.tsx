import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { UserNav } from '@/components/layout/UserNav';
import {
  TrendingUp,
  PieChart,
  Shield,
  Wallet,
  ArrowRight,
  Sparkles,
  BarChart3,
  PiggyBank,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';

const forYouPoints = [
  "You want a clean monthly overview of income, expenses, and net flow",
  "You’re fine with manual entry or CSV import to stay in control",
  "You want categories + simple analytics that actually explain your spending",
  "You want savings goals (including an emergency fund analysis) in the same dashboard",
];

const notForYouPoints = [
  "You need automatic bank sync (not supported right now)",
  "You want investment/portfolio tracking and performance analytics",
  "You need receipts, invoices, or business expense workflows",
  "You want AI recommendations and coaching-style insights",
];

const features = [
  {
    icon: TrendingUp,
    title: 'Smart Analytics',
    description: 'Get detailed insights into your spending patterns with monthly and yearly analytics.',
  },
  {
    icon: PieChart,
    title: 'Category Tracking',
    description: 'Automatic categorization of transactions to understand where your money goes.',
  },
  {
    icon: PiggyBank,
    title: 'Savings Goals',
    description: 'Set up savings funds and track your progress towards financial goals.',
  },
  {
    icon: Shield,
    title: 'Emergency Fund',
    description: 'Calculate and monitor your emergency fund based on your core expenses.',
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Warm up backend
    healthApi.check().catch(() => {
      // Ignore errors as this is just a warm-up call
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-blurple">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <UserNav />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button asChild className="bg-gradient-blurple transition-all duration-300 ease-out hover:opacity-90">
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 pb-20 pt-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Your personal finance companion
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="mb-6 text-4xl font-bold tracking-tight font-display sm:text-5xl lg:text-6xl"
          >
            Personal Finance,{' '}
            <span className="text-gradient-blurple">Quantified</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground"
          >
            A budgeting app made for those who want to take future
            into their own hands. No more guessing where your money goes.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isAuthenticated ? (
              <Button size="lg" asChild className="bg-gradient-blurple px-8 transition-all duration-300 ease-out hover:opacity-90 glow-blurple">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="bg-gradient-blurple px-8 transition-all duration-300 ease-out hover:opacity-90 glow-blurple">
                  <Link to="/auth/register">
                    Start Building Today
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="transition-all duration-300 ease-out">
                  <Link to="/auth/login">
                    Log in to Dashboard
                  </Link>
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="absolute -inset-4 rounded-2xl bg-gradient-blurple opacity-20 blur-3xl" />
          <div className="relative rounded-xl border border-border/50 bg-card p-2 shadow-2xl">
            <div className="rounded-lg bg-background-secondary p-6">
              {/* Mock dashboard */}
              <div className="mb-6 flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <div className="h-3 w-3 rounded-full bg-warning" />
                <div className="h-3 w-3 rounded-full bg-success" />
                <div className="ml-4 h-4 w-48 rounded bg-muted" />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Income', value: '$8,450', color: 'success' },
                  { label: 'Expenses', value: '$3,240', color: 'destructive' },
                  { label: 'Savings', value: '$2,100', color: 'info' },
                  { label: 'Net Flow', value: '+$3,110', color: 'primary' },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className={`mt-1 text-xl font-bold font-display text-${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="h-48 rounded-lg border border-border bg-card p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Spending by Category
                  </div>
                  <div className="flex h-32 items-end gap-2">
                    {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="h-48 rounded-lg border border-border bg-card p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                    <PieChart className="h-4 w-4 text-primary" />
                    Expense Breakdown
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative h-28 w-28">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r="40" className="fill-none stroke-primary/20" strokeWidth="16" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="fill-none stroke-primary"
                          strokeWidth="16"
                          strokeDasharray="251.2"
                          strokeDashoffset="75"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="fill-none stroke-chart-teal"
                          strokeWidth="16"
                          strokeDasharray="251.2"
                          strokeDashoffset="175"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/50 bg-background-secondary/50 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="mb-4 text-3xl font-bold font-display sm:text-4xl">
              Everything you need to manage your money
            </h2>
            <p className="text-muted-foreground">
              Powerful features designed to give you complete visibility and control over your finances.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 ease-out hover:border-primary/50 hover:shadow-glow-sm hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold font-display">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Is This For Me Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
              <HelpCircle className="h-8 w-8" />
            </div>
            <h2 className="mb-4 text-3xl font-bold font-display sm:text-4xl">
              Is this app for you?
            </h2>
            <p className="text-muted-foreground">
              This is a personal project built for simple tracking and insights
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2"
          >
            {/* For You */}
            <motion.div
              variants={fadeInUp}
              className="rounded-xl border border-success/30 bg-success/5 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-success/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex rounded-lg bg-success/10 p-2 text-success">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold font-display">This app is for you if...</h3>
              </div>
              <ul className="space-y-3">
                {forYouPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Not For You */}
            <motion.div
              variants={fadeInUp}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-destructive/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex rounded-lg bg-destructive/10 p-2 text-destructive">
                  <XCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold font-display">This app is not for you if...</h3>
              </div>
              <ul className="space-y-3">
                {notForYouPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <span className="text-xs sm:text-sm">Built by Ondřej Kutil</span>
          <div className="flex items-center gap-6">
            <Link to="/how-it-works" className="text-xs sm:text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors">
              How it works
            </Link>
            <Link to="/faq" className="text-xs sm:text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors">
              FAQs
            </Link>
            <a
              href="https://github.com/OndrejKutil"
              target="_blank"
              rel="noreferrer"
              className="text-xs sm:text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
