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
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
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

      {/* Hero Section - Full height with container-based positioning */}
      <section className="relative z-10 min-h-screen flex items-center">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="relative z-10 text-left max-w-4xl"
          >
            <motion.h1
              variants={fadeInUp}
              className="mb-8 text-5xl font-display sm:text-6xl lg:text-8xl leading-[1.05]"
            >
              <span className="text-hero-bold text-white">Personal Finance,</span>
              <br />
              <span className="text-hero-bold text-gradient-teal">Quantified.</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mb-10 max-w-xl text-lg text-white/60 leading-relaxed"
            >
              A budgeting app made for those who want to take the future
              into their own hands. No more guessing where your money goes.
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
                      Start Building Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="ghost" asChild className="text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300">
                    <Link to="/auth/login">
                      Log in
                    </Link>
                  </Button>
                </>
              )}
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 overflow-hidden z-10">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <h2 className="mb-4 text-3xl font-display sm:text-4xl tracking-tight">
              <span className="text-hero-thin text-white/90">A system for </span>
              <span className="text-hero-bold text-gradient-teal">deliberate</span>
              <span className="text-hero-thin text-white/90"> spending.</span>
            </h2>
            <p className="text-white/60 text-lg">
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
                <div className="absolute -top-6 left-0 right-0 h-px bg-white/10 group-hover:bg-cyan-400/30 transition-colors duration-500">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-cyan-400/40 group-hover:bg-cyan-400 transition-colors duration-500" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-cyan-400/40 group-hover:bg-cyan-400 transition-colors duration-500" />
                </div>

                <div className="pt-2">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-cyan-400 ring-1 ring-white/10">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold font-display tracking-tight text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Is This For Me Section - Asymmetric & Opinionated */}
      <section className="relative z-10 py-32 bg-white/5 border-y border-white/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="grid lg:grid-cols-[1.4fr_1fr] gap-0 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* For You - Wider, Elevated, Editorial */}
            <div className="p-10 lg:p-16 bg-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold font-display tracking-tight text-white">Ideally, you are...</h3>
                </div>

                <ul className="space-y-6">
                  {forYouPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-4 group">
                      <CheckCircle className="mt-1.5 h-4 w-4 flex-shrink-0 text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-lg text-white/60 group-hover:text-white transition-colors leading-relaxed font-medium">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Not For You - Narrower, flatter, muted */}
            <div className="p-10 lg:p-16 bg-[hsl(var(--background))]/80 border-t lg:border-t-0 lg:border-l border-white/10 relative">
              <div className="absolute inset-0 bg-dotted-pattern opacity-20 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8 opacity-80">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-400">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold font-display tracking-tight text-white/60">This is NOT for you if...</h3>
                </div>

                <ul className="space-y-6">
                  {notForYouPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-4 text-white/40">
                      <XCircle className="mt-1 h-4 w-4 flex-shrink-0 text-red-400/50" />
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
