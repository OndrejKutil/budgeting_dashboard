import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, LayoutDashboard, BarChart, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-hero lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-chart-investment/10" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-chart-investment/20 blur-3xl" />

        <div className="relative z-10 p-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-blurple">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </Link>
        </div>

        <div className="relative z-10 p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="mb-4 text-3xl font-bold font-display lg:text-4xl">
              Your financial journey{' '}
              <span className="text-gradient-blurple">starts here</span>
            </h2>
          </motion.div>

          {/* Features List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 space-y-6"
          >
            <h3 className="text-lg font-semibold text-foreground">
              After signing in, you’ll get:
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">A clear monthly summary</div>
                  <div className="text-sm text-muted-foreground">Track your cash flow instantly</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-investment/10 text-chart-investment">
                  <BarChart className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Visual spending analytics</div>
                  <div className="text-sm text-muted-foreground">See where your money goes</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-saving/10 text-chart-saving">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Savings goals in one place</div>
                  <div className="text-sm text-muted-foreground">Plan for your future</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-blurple">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="mb-2 text-2xl font-bold font-display">{title}</h1>
            <p className="mb-8 text-muted-foreground">{subtitle}</p>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
