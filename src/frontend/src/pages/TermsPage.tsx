import { PublicLayout, PublicPageTitle } from '@/components/public/PublicLayout';

export default function TermsPage() {
  return (
    <PublicLayout>
      <PublicPageTitle title="Terms of Service" lead="Last updated: May 4, 2026" />

      <div className="mt-10 max-w-[42rem] [&_section]:border-t [&_section]:border-border [&_section]:py-6 [&_h2]:mb-2 [&_h2]:text-[1.125rem] [&_h2]:font-medium [&_h2]:text-foreground [&_p]:text-[0.9375rem] [&_p]:leading-relaxed [&_p]:text-foreground/85 [&_li]:text-[0.9375rem] [&_li]:leading-relaxed [&_li]:text-foreground/85 [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/30 [&_a]:underline-offset-4">
            <section>
              <h2>Notice</h2>
              <div className="border-l-2 border-primary pl-4">
                <p>
                  <strong>Budgeting Dashboard is a personal student project.</strong> While it is fully functional, it is provided "as-is" without the warranties or guarantees typical of commercial software.
                </p>
              </div>
            </section>

              <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing or using Budgeting Dashboard ("the Application"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Application.
                </p>
              </section>

              <section>
                <h2>2. Nature of the Application</h2>
                <p>
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
                <h2>3. No Financial Advice</h2>
                <p>
                  The Application does not provide financial, investment, tax, legal, or accounting advice. Any analytics or metrics displayed are calculated strictly based on the data you provide. You remain entirely responsible for your own financial decisions.
                </p>
              </section>

              <section>
                <h2>4. User Responsibility</h2>
                <p>
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
                <h2>5. Limitation of Liability</h2>
                <p>
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
                <h2>6. No Warranty</h2>
                <p>
                  THE APPLICATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </section>

              <section>
                <h2>7. Data Handling</h2>
                <p>
                  While the Application utilizes modern infrastructure (Supabase, Render) to store data securely, we make no absolute guarantees regarding the long-term persistence or invulnerability of your data.
                </p>
              </section>

              <section>
                <h2>8. Changes to Terms</h2>
                <p>
                  These Terms may be modified at any time. Continued use of the Application constitutes acceptance of any modified terms.
                </p>
              </section>

              <section>
                <h2>9. Contact</h2>
                <p>
                  If you have any questions or encounter issues, please reach out via email at <a href="mailto:me@ondrejkutil.com">me@ondrejkutil.com</a> or open an issue on the <a href="https://github.com/OndrejKutil/budgeting_dashboard" target="_blank" rel="noreferrer">GitHub repository</a>.
                </p>
              </section>
      </div>
    </PublicLayout>
  );
}
