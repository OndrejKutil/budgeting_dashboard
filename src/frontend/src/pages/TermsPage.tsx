import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b theme-border-subtle bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
          </Link>
          <Button variant="ghost" asChild className="theme-text-muted-80 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="container mx-auto max-w-3xl px-4 pb-20 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-500">Legal</p>
            <h1 className="text-4xl font-bold font-display tracking-tight theme-text-strong sm:text-5xl">
              Terms of Service
            </h1>
            <p className="text-sm theme-text-muted-60">Last updated: May 4, 2026</p>
          </div>

          <div className="space-y-8 text-foreground/90">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-amber-500">Notice</h2>
              <div className="border-l-2 border-amber-500/70 bg-amber-500/10 py-3 pl-4 pr-3">
                <p className="text-sm">
                  <strong>Budgeting Dashboard is a personal student project.</strong> While it is fully functional, it is provided "as-is" without the warranties or guarantees typical of commercial software.
                </p>
              </div>
            </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">1. Acceptance of Terms</h2>
                <p className="text-sm leading-relaxed">
                  By accessing or using Budgeting Dashboard ("the Application"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Application.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">2. Nature of the Application</h2>
                <p className="text-sm leading-relaxed">
                  This Application is an independent portfolio and learning project. While we strive to maintain a high-quality experience, the Application:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>May contain bugs or unhandled edge cases</li>
                  <li>Is not audited for commercial compliance or security standards</li>
                  <li>Is provided on an "as-is" and "as-available" basis</li>
                  <li>May experience downtime or service changes without prior notice</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">3. No Financial Advice</h2>
                <p className="text-sm leading-relaxed">
                  The Application does not provide financial, investment, tax, legal, or accounting advice. Any analytics or metrics displayed are calculated strictly based on the data you provide. You remain entirely responsible for your own financial decisions.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">4. User Responsibility</h2>
                <p className="text-sm leading-relaxed">
                  You understand and agree that:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>All data you enter into the Application is at your own discretion and risk</li>
                  <li>You are solely responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You should maintain your own independent records or backups of critical financial data</li>
                  <li>Any reliance on the Application's calculations or storage is strictly at your own risk</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">5. Limitation of Liability</h2>
                <p className="text-sm leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPER(S) SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Loss or corruption of data</li>
                  <li>Financial losses of any kind resulting from app usage or calculation errors</li>
                  <li>Unauthorized access to your information</li>
                  <li>Service interruptions or hosting failures</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">6. No Warranty</h2>
                <p className="text-sm leading-relaxed">
                  THE APPLICATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">7. Data Handling</h2>
                <p className="text-sm leading-relaxed">
                  While the Application utilizes modern infrastructure (Supabase, Render) to store data securely, we make no absolute guarantees regarding the long-term persistence or invulnerability of your data.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">8. Changes to Terms</h2>
                <p className="text-sm leading-relaxed">
                  These Terms may be modified at any time. Continued use of the Application constitutes acceptance of any modified terms.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">9. Contact</h2>
                <p className="text-sm leading-relaxed">
                  If you have any questions or encounter issues, please reach out via email at <a href="mailto:me@ondrejkutil.com" className="text-amber-500 hover:underline">me@ondrejkutil.com</a> or open an issue on the <a href="https://github.com/OndrejKutil/budgeting_dashboard" target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">GitHub repository</a>.
                </p>
              </section>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t theme-border-subtle py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:text-sm">
          <span>Built by Ondřej Kutil</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="underline-offset-4 hover:text-foreground hover:underline transition-colors">
              Privacy Policy
            </Link>
            <a
              href="https://github.com/OndrejKutil"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:text-foreground hover:underline transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
