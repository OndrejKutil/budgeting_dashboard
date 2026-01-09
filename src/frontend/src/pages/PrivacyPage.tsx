import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
            <h1 className="mb-6 text-3xl font-bold font-display">Privacy Policy</h1>
            <p className="mb-4 text-sm text-muted-foreground">Last updated: January 9, 2026</p>

            <div className="space-y-6 text-foreground/90">
              <section>
                <h2 className="mb-3 text-xl font-semibold text-destructive">⚠️ Important Notice</h2>
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm">
                    <strong>This is a demonstration application for educational purposes only.</strong> It is not production-ready and may contain security vulnerabilities. Do NOT enter any real personal or financial information that you would not want to be exposed or lost.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
                <p className="text-sm leading-relaxed">
                  This Privacy Policy describes how Budgeting Dashboard ("the Application") handles information when you use our demo application. This application is created for learning and demonstration purposes and is not intended for production use.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">2. Information We Collect</h2>
                <p className="text-sm leading-relaxed">
                  When you use the Application, you may provide information including but not limited to:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Email address (for account registration)</li>
                  <li>Name (optional)</li>
                  <li>Password (stored in hashed form)</li>
                  <li>Financial data you choose to enter (transactions, accounts, categories, etc.)</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">3. How We Use Information</h2>
                <p className="text-sm leading-relaxed">
                  Any information collected is used solely for the purpose of demonstrating the functionality of the Application. We do not:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Sell your data to third parties</li>
                  <li>Use your data for marketing purposes</li>
                  <li>Share your data with advertisers</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">4. Data Security Disclaimer</h2>
                <p className="text-sm leading-relaxed">
                  <strong>THIS IS A LEARNING PROJECT AND NOT PRODUCTION SOFTWARE.</strong> As such:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Security measures may not meet industry standards</li>
                  <li>The application may contain security vulnerabilities</li>
                  <li>Data may be stored insecurely or transmitted without proper encryption</li>
                  <li>There are no guarantees against unauthorized access</li>
                  <li>Data breaches may occur without detection or notification</li>
                </ul>
                <p className="mt-2 text-sm font-medium text-destructive">
                  DO NOT enter any sensitive personal information, real financial data, passwords you use elsewhere, or any information you cannot afford to have exposed.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">5. Data Retention</h2>
                <p className="text-sm leading-relaxed">
                  Data may be retained indefinitely or deleted at any time without notice. We make no guarantees about:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>How long your data will be stored</li>
                  <li>Whether backups are maintained</li>
                  <li>Your ability to retrieve or export your data</li>
                  <li>Notification of data deletion</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">6. Data Loss</h2>
                <p className="text-sm leading-relaxed">
                  You acknowledge and accept that:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Data loss may occur at any time without warning</li>
                  <li>There is no disaster recovery or backup system guaranteed</li>
                  <li>The developer(s) are not responsible for any data loss</li>
                  <li>You should not rely on this Application for storing important information</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">7. Third-Party Services</h2>
                <p className="text-sm leading-relaxed">
                  The Application may use third-party services for hosting, analytics, or other purposes. These services have their own privacy policies and data handling practices over which we have no control.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">8. Your Rights</h2>
                <p className="text-sm leading-relaxed">
                  Due to the nature of this demonstration application, we may not be able to fully accommodate requests regarding:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Access to your personal data</li>
                  <li>Correction of inaccurate data</li>
                  <li>Deletion of your data</li>
                  <li>Data portability</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">9. Children's Privacy</h2>
                <p className="text-sm leading-relaxed">
                  This Application is not intended for use by children under the age of 18. We do not knowingly collect personal information from children.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">10. Changes to This Policy</h2>
                <p className="text-sm leading-relaxed">
                  This Privacy Policy may be updated at any time without notice. Continued use of the Application after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">11. Consent</h2>
                <p className="text-sm leading-relaxed">
                  By using this Application, you consent to this Privacy Policy and acknowledge that you understand the risks associated with using a demonstration/learning application for any purpose.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">12. Contact</h2>
                <p className="text-sm leading-relaxed">
                  For questions about this Privacy Policy, please reach out through the project repository or contact information provided there.
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
