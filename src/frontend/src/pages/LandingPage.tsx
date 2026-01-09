import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  PieChart,
  Shield,
  Wallet,
  ArrowRight,
  Sparkles,
  BarChart3,
  PiggyBank,
} from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-blurple">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display">FinanceApp</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth/login">Log in</Link>
            </Button>
            <Button asChild className="bg-gradient-blurple hover:opacity-90">
              <Link to="/auth/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
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
            Take Control of Your{' '}
            <span className="text-gradient-blurple">Financial Future</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground"
          >
            Track expenses, analyze spending patterns, and achieve your savings goals with our
            powerful yet simple personal finance dashboard.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="bg-gradient-blurple px-8 hover:opacity-90 glow-blurple">
              <Link to="/auth/register">
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth/login">
                Sign in to Dashboard
              </Link>
            </Button>
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
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-glow-sm"
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

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-12 text-center"
          >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-chart-investment/20 blur-3xl" />
            <div className="relative">
              <h2 className="mb-4 text-3xl font-bold font-display sm:text-4xl">
                Ready to transform your finances?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
                Join thousands of users who have taken control of their financial future. Start tracking today.
              </p>
              <Button size="lg" asChild className="bg-gradient-blurple px-8 hover:opacity-90">
                <Link to="/auth/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span>© 2026 FinanceApp. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
