import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-blurple">
              <Wallet className="h-5 w-5 text-white" />
            </div>
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
            <h1 className="mb-6 text-3xl font-bold font-display">Terms of Service</h1>
            <p className="mb-4 text-sm text-muted-foreground">Last updated: January 9, 2026</p>

            <div className="space-y-6 text-foreground/90">
              <section>
                <h2 className="mb-3 text-xl font-semibold text-destructive">⚠️ Important Disclaimer</h2>
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm">
                    <strong>This application is provided strictly for educational and learning purposes only.</strong> It is NOT production-ready software and should NOT be used for managing real financial data or making actual financial decisions.
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
                  This Application is a demonstration and learning project. It is designed to showcase web development concepts and is not intended for commercial use or production deployment. The Application:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>May contain bugs, errors, and security vulnerabilities</li>
                  <li>Is not audited or certified for security compliance</li>
                  <li>May experience downtime, data loss, or service interruptions</li>
                  <li>Is provided on an "as-is" and "as-available" basis</li>
                  <li>May be discontinued at any time without notice</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">3. No Financial Advice</h2>
                <p className="text-sm leading-relaxed">
                  The Application does not provide financial, investment, tax, legal, or accounting advice. Any information displayed is for illustrative purposes only. You should consult with qualified professionals for any financial decisions.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">4. User Responsibility</h2>
                <p className="text-sm leading-relaxed">
                  You understand and agree that:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>All data you enter into the Application is entirely at your own risk</li>
                  <li>You are solely responsible for any data you input or store</li>
                  <li>You should not enter sensitive personal information, real financial data, or any information you would not want to lose or have exposed</li>
                  <li>Any reliance on the Application is strictly at your own risk</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">5. Limitation of Liability</h2>
                <p className="text-sm leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPER(S) OF THIS APPLICATION SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Loss of data or corruption of data</li>
                  <li>Financial losses of any kind</li>
                  <li>Unauthorized access to your information</li>
                  <li>Service interruptions or failures</li>
                  <li>Bugs, errors, or inaccuracies in the Application</li>
                  <li>Any damages resulting from the use or inability to use the Application</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">6. No Warranty</h2>
                <p className="text-sm leading-relaxed">
                  THE APPLICATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. THE DEVELOPER(S) MAKE NO WARRANTY THAT THE APPLICATION WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">7. Data Handling</h2>
                <p className="text-sm leading-relaxed">
                  We make no guarantees regarding the security, backup, or persistence of any data you enter. Data may be lost, corrupted, or exposed at any time. Do not use this Application for storing any data you cannot afford to lose.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">8. Indemnification</h2>
                <p className="text-sm leading-relaxed">
                  You agree to indemnify and hold harmless the developer(s) from any claims, damages, losses, or expenses arising from your use of the Application or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">9. Changes to Terms</h2>
                <p className="text-sm leading-relaxed">
                  These Terms may be modified at any time without prior notice. Continued use of the Application constitutes acceptance of any modified terms.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">10. Contact</h2>
                <p className="text-sm leading-relaxed">
                  If you have any questions about these Terms, you can reach out through the project repository or contact information provided there.
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
