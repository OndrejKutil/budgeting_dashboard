import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 pb-16 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <h1 className="mb-6 text-3xl font-bold font-display">Privacy Policy</h1>
            <p className="mb-4 text-sm text-muted-foreground">Last updated: May 4, 2026</p>

            <div className="space-y-6 text-foreground/90">
              <section>
                <h2 className="mb-3 text-xl font-semibold text-amber-500">Notice</h2>
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                  <p className="text-sm">
                    <strong>This is a personal student project.</strong> While we respect your privacy and utilize secure modern infrastructure, we recommend against storing highly sensitive, irreplaceable financial data here.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
                <p className="text-sm leading-relaxed">
                  This Privacy Policy describes how Budgeting Dashboard ("the Application") handles information when you use our services.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">2. Information We Collect</h2>
                <p className="text-sm leading-relaxed">
                  When you use the Application, we collect and store:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Email address (for account registration and authentication)</li>
                  <li>Name (optional, for profile personalization)</li>
                  <li>Authentication credentials (securely hashed via our auth provider)</li>
                  <li>Financial data you actively input (transactions, accounts, categories, savings goals)</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">3. How We Use Information</h2>
                <p className="text-sm leading-relaxed">
                  The data collected is used strictly to provide the core functionality of the Application. We do not:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Sell your data to any third parties</li>
                  <li>Use your data for marketing or advertising purposes</li>
                  <li>Share your data with external tracking or advertising networks</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">4. Third-Party Infrastructure</h2>
                <p className="text-sm leading-relaxed">
                  To provide a secure and reliable experience, the Application relies on industry-standard third-party providers:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li><strong>Supabase:</strong> Handles secure user authentication, database storage, and backend logic via PostgreSQL.</li>
                  <li><strong>Render:</strong> Hosts the application services and APIs.</li>
                </ul>
                <p className="mt-2 text-sm leading-relaxed">
                  These providers have their own strict privacy and security policies governing the data stored on their infrastructure.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">5. Cookies and Authentication</h2>
                <p className="text-sm leading-relaxed">
                  The Application uses JSON Web Tokens (JWTs) and secure HTTP-only cookies to maintain your logged-in session. We do not use third-party tracking cookies or advertising pixels.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">6. Data Security Disclaimer</h2>
                <p className="text-sm leading-relaxed">
                  While your data is stored in secure PostgreSQL databases with proper row-level security (RLS) rules, this remains an independent portfolio project. We cannot guarantee absolute immunity from data loss, breaches, or service interruptions. You use the application at your own discretion.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">7. Your Rights & Data Deletion</h2>
                <p className="text-sm leading-relaxed">
                  You have full ownership of your data. If you wish to permanently delete your account and all associated financial records, you can do so through the application settings or by contacting the developer. Once deleted, your data cannot be recovered.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">8. Contact</h2>
                <p className="text-sm leading-relaxed">
                  If you have any questions or concerns regarding your privacy, please contact <a href="mailto:me@ondrejkutil.com" className="text-amber-500 hover:underline">me@ondrejkutil.com</a> or open an issue on the <a href="https://github.com/OndrejKutil/budgeting_dashboard" target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">GitHub repository</a>.
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:text-sm">
          <span>Built by Ondřej Kutil</span>
          <a
            href="https://github.com/OndrejKutil"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
