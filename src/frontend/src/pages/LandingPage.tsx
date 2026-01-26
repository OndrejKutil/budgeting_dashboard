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

          {/* Living Graph - Option B (Refined: No Glow, Updated Labels) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
            className="flex-1 relative w-full lg:w-auto min-h-[400px] flex items-center justify-center p-8"
          >
            <div className="relative z-10 w-full max-w-[500px] aspect-square">
              {/* Abstract Flow Visualization */}
              <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                <defs>
                  <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity="0.5" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Central "System" Node */}
                <circle cx="200" cy="200" r="45" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" className="drop-shadow-lg" />
                <foreignObject x="155" y="180" width="90" height="40">
                  <div className="flex items-center justify-center h-full text-xs font-mono text-primary font-bold tracking-tight">SYSTEM</div>
                </foreignObject>

                {/* Left Nodes (Income) */}
                <g>
                  {[
                    { y: 140, label: "Salary" },
                    { y: 200, label: "Family" },
                    { y: 260, label: "Yield" }
                  ].map((item, i) => (
                    <g key={`in-${i}`}>
                      {/* Label */}
                      <text x="40" y={item.y + 4} textAnchor="end" className="text-[10px] font-medium fill-muted-foreground/80 font-mono tracking-wide">{item.label}</text>

                      {/* Node */}
                      <circle cx="55" cy={item.y} r="6" fill="hsl(var(--success))" className="animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />

                      {/* Paths to Center */}
                      <motion.path
                        d={`M 65 ${item.y} C 120 ${item.y}, 120 200, 155 200`}
                        fill="none"
                        stroke="url(#flowGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      />
                    </g>
                  ))}
                </g>

                {/* Right Nodes (Distribution) */}
                <g>
                  {[
                    { y: 120, label: "Needs", color: "hsl(var(--muted-foreground))" },
                    { y: 170, label: "Safety", color: "hsl(var(--info))" },
                    { y: 230, label: "Invest", color: "hsl(var(--primary))" },
                    { y: 280, label: "Fun", color: "hsl(var(--muted-foreground))" }
                  ].map((item, i) => (
                    <g key={`out-${i}`}>
                      {/* Paths from Center */}
                      <motion.path
                        d={`M 245 200 C 280 200, 280 ${item.y}, 335 ${item.y}`}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={i === 1 || i === 2 ? 2 : 1}
                        strokeLinecap="round"
                        opacity={0.4}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.5 }}
                        transition={{ duration: 2.5, delay: 1 + (i * 0.2), repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      />

                      {/* Node */}
                      <circle cx="345" cy={item.y} r={i === 1 || i === 2 ? 8 : 4} fill={item.color} />

                      {/* Label */}
                      <text x="360" y={item.y + 3} textAnchor="start" className="text-[10px] font-medium fill-muted-foreground/80 font-mono tracking-wide">{item.label}</text>
                    </g>
                  ))}
                </g>

                {/* Orbiting Particles around system */}
                <motion.circle
                  cx="200" cy="200" r="60"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  style={{ opacity: 0.2 }}
                />
              </svg>
            </div>
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
