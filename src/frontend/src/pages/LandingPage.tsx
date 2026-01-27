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
        <div className="flex h-16 w-full items-center justify-between px-4 lg:px-8">
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
      <section className="container mx-auto px-4 pt-20 pb-20 lg:pt-32 lg:pb-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Content - Left Aligned */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="flex-1 text-left max-w-2xl"
          >
            <motion.div variants={fadeInUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Your personal finance companion
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="mb-8 text-4xl font-bold tracking-tighter font-display sm:text-5xl lg:text-7xl leading-[1.1]"
            >
              Personal Finance,{' '}
              <br />
              <span className="text-gradient-blurple">Quantified</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mb-10 max-w-lg text-lg text-muted-foreground leading-relaxed"
            >
              A budgeting app made for those who want to take the future
              into their own hands. No more guessing where your money goes.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4">
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
                      Log in
                    </Link>
                  </Button>
                </>
              )}
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12 flex items-center gap-4 text-xs font-mono text-muted-foreground/60">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Built for my own use first
              </span>
            </motion.div>
          </motion.div>

          {/* Dashboard Mockup - Stylized */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateY: 10, y: 70 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0, y: 50 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="flex-1 relative w-full lg:w-auto min-h-[400px] flex items-center justify-center lg:justify-end perspective-1000"
          >
            {/* Dashboard Mockup Container */}
            <div className="relative z-10 w-full max-w-[600px] bg-card/95 backdrop-blur rounded-xl border border-border/50 shadow-2xl overflow-hidden">
              {/* Fake Window Header */}
              <div className="h-8 bg-muted/30 border-b border-border/50 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 grid gap-6">
                {/* Top Row: Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-lg bg-muted/10 border border-border/50 p-3 flex flex-col justify-between">
                      <div className="w-8 h-8 rounded bg-primary/10 mb-2" />
                      <div className="w-16 h-2 rounded bg-muted-foreground/20" />
                      <div className="w-24 h-4 rounded bg-foreground/10" />
                    </div>
                  ))}
                </div>

                {/* Middle: Main Chart */}
                <div className="h-48 rounded-lg bg-muted/5 border border-border/50 p-4 relative overflow-hidden">
                  {/* Grid Lines */}
                  <div className="absolute inset-4 flex flex-col justify-between opacity-10">
                    <div className="w-full h-px bg-foreground" />
                    <div className="w-full h-px bg-foreground" />
                    <div className="w-full h-px bg-foreground" />
                    <div className="w-full h-px bg-foreground" />
                  </div>

                  {/* Area Chart Path */}
                  <svg className="w-full h-full absolute inset-0 pt-8 px-4 pb-4 overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="mockGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M 0 150 C 50 140, 80 100, 120 110 C 160 120, 190 60, 240 70 C 290 80, 320 40, 380 50 L 380 200 L 0 200 Z"
                      fill="url(#mockGradient)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                    <motion.path
                      d="M 0 150 C 50 140, 80 100, 120 110 C 160 120, 190 60, 240 70 C 290 80, 320 40, 380 50"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                  </svg>
                </div>

                {/* Bottom: Recent Trans & Categories */}
                <div className="grid grid-cols-2 gap-4 h-32">
                  <div className="rounded-lg bg-muted/10 border border-border/50 p-3 space-y-2">
                    <div className="w-full h-8 rounded bg-card/50" />
                    <div className="w-full h-8 rounded bg-card/50 opacity-60" />
                    <div className="w-full h-8 rounded bg-card/50 opacity-30" />
                  </div>
                  <div className="rounded-lg bg-muted/10 border border-border/50 p-3 relative">
                    {/* Donut Chart Mock */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-20 h-20 rotate-[-90deg]">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" opacity="0.2" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--success))" strokeWidth="12" strokeDasharray="180 250" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeDasharray="60 250" strokeDashoffset="-180" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EXTERNAL FLOATING TOOLTIPS */}

            {/* 1. KPI Callout (Top Left) */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 20 }}
              transition={{ delay: 1.2 }}
              className="absolute -left-24 top-24 flex items-center gap-3 z-30"
            >
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-foreground font-display">KPIs</span>
                <span className="text-[10px] text-muted-foreground font-mono">Track important metrics</span>
              </div>
              {/* Connector */}
              <div className="w-12 h-px bg-border/100" />
            </motion.div>

            {/* 2. Chart Callout (Top Right) */}
            <motion.div
              initial={{ opacity: 0, x: 100, y: -10 }}
              animate={{ opacity: 1, x: 80, y: -10 }}
              transition={{ delay: 1.4 }}
              className="absolute -right-8 top-40 flex items-center gap-3 z-30"
            >
              <div className="w-12 h-px bg-border/100" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground font-display">Charts</span>
                <span className="text-[10px] text-muted-foreground font-mono">Real-time Tracking</span>
              </div>
            </motion.div>

            {/* 3. Donut Callout (Bottom Right) */}
            <motion.div
              initial={{ opacity: 0, x: 80, y: -30 }}
              animate={{ opacity: 1, x: 80, y: -30 }}
              transition={{ delay: 1.6 }}
              className="absolute -right-4 bottom-20 flex items-center gap-3 z-30"
            >
              <div className="w-12 h-px bg-border/100" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground font-display">Spending</span>
                <span className="text-[10px] text-muted-foreground font-mono">Track categories</span>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Subtle Grid Background to break scroll monotony */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <h2 className="mb-4 text-3xl font-bold font-display sm:text-4xl tracking-tight">
              A system for <span className="text-primary">deliberate</span> spending.
            </h2>
            <p className="text-muted-foreground text-lg">
              No AI magic. No automatic categorization that gets it wrong. Just you and your numbers.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-12 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group relative"
              >
                {/* Horizontal Divider with Tick - Non-Card Visual System */}
                <div className="absolute -top-6 left-0 right-0 h-px bg-border/40 group-hover:bg-primary/30 transition-colors duration-500">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-primary/40 group-hover:bg-primary transition-colors duration-500" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-primary/40 group-hover:bg-primary transition-colors duration-500" />
                </div>

                <div className="pt-2">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-background-secondary p-2 text-primary ring-1 ring-white/5">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold font-display tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Is This For Me Section - Asymmetric & Opinionated */}
      <section className="py-32 bg-background-secondary/20 border-y border-white/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="grid lg:grid-cols-[1.4fr_1fr] gap-0 border border-border/40 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* For You - Wider, Elevated, Editorial */}
            <div className="p-10 lg:p-16 bg-card relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-full bg-success/10 text-success">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">Ideally, you are...</h3>
                </div>

                <ul className="space-y-6">
                  {forYouPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-4 group">
                      <CheckCircle className="mt-1.5 h-4 w-4 flex-shrink-0 text-success/70 group-hover:text-success transition-colors" />
                      <span className="text-lg text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed font-medium">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Not For You - Narrower, flatter, muted */}
            <div className="p-10 lg:p-16 bg-background/50 border-t lg:border-t-0 lg:border-l border-border/40 relative">
              <div className="absolute inset-0 bg-dotted-pattern opacity-30 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8 opacity-80">
                  <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold font-display tracking-tight text-muted-foreground">This is NOT for you if...</h3>
                </div>

                <ul className="space-y-6">
                  {notForYouPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-4 text-muted-foreground/60">
                      <XCircle className="mt-1 h-4 w-4 flex-shrink-0 text-destructive/50" />
                      <span className="text-base leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
