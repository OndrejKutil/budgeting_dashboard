import { PublicLayout, PublicPageTitle } from '@/components/public/PublicLayout';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <PublicPageTitle title="Privacy Policy" lead="Last updated: May 31, 2026" />

      <div className="mt-10 max-w-[42rem] [&_section]:border-t [&_section]:border-border [&_section]:py-6 [&_h2]:mb-2 [&_h2]:text-[1.125rem] [&_h2]:font-medium [&_h2]:text-foreground [&_p]:text-[0.9375rem] [&_p]:leading-relaxed [&_p]:text-foreground/85 [&_li]:text-[0.9375rem] [&_li]:leading-relaxed [&_li]:text-foreground/85 [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/30 [&_a]:underline-offset-4">
            <section>
              <h2>Notice</h2>
              <div className="border-l-2 border-primary pl-4">
                <p>
                  <strong>This is a personal student project.</strong> While we respect your privacy and utilize secure modern infrastructure, we recommend against storing highly sensitive, irreplaceable financial data here.
                </p>
              </div>
            </section>

              <section>
                <h2>1. Introduction</h2>
                <p>
                  This Privacy Policy describes how Budgeting Dashboard ("the Application") handles information when you use our services.
                </p>
              </section>

              <section>
                <h2>2. Information We Collect</h2>
                <p>
                  When you use the Application, we collect and store:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Email address (for account registration and authentication)</li>
                  <li>Name (optional, for profile personalization)</li>
                  <li>Authentication credentials (securely hashed via our auth provider)</li>
                  <li>Basic OAuth profile information when you choose to sign in with a provider such as Google or GitHub</li>
                  <li>Financial data you actively input, including transactions, accounts, categories, savings funds, budgets, and dividend portfolio settings</li>
                  <li>Profile preferences such as currency, language, theme, and privacy-mode display preference</li>
                  <li>Technical account metadata such as account creation time, last sign-in time, and linked identity provider records</li>
                </ul>
              </section>

              <section>
                <h2>3. How We Use Information</h2>
                <p>
                  The data collected is used strictly to provide the core functionality of the Application. We do not:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Sell your data to any third parties</li>
                  <li>Use your data for marketing or advertising purposes</li>
                  <li>Share your data with external tracking or advertising networks</li>
                </ul>
              </section>

              <section>
                <h2>4. Third-Party Infrastructure</h2>
                <p>
                  To provide a secure and reliable experience, the Application relies on industry-standard third-party providers:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li><strong>Supabase:</strong> Handles secure user authentication, database storage, and backend logic via PostgreSQL.</li>
                  <li><strong>Google:</strong> Provides optional Google account sign-in when you choose that authentication method.</li>
                  <li><strong>GitHub:</strong> Provides optional GitHub account sign-in when you choose that authentication method.</li>
                  <li><strong>Render:</strong> Hosts the application services and APIs.</li>
                </ul>
                <p className="mt-2 text-sm leading-relaxed">
                  These providers have their own strict privacy and security policies governing the data stored on their infrastructure.
                </p>
              </section>

              <section>
                <h2>5. Cookies and Authentication</h2>
                <p>
                  The Application uses JSON Web Tokens (JWTs) stored in your browser's local storage to maintain your logged-in session. It also stores local interface preferences such as theme, privacy mode, URL filters, and OAuth redirect state. We do not use third-party tracking cookies or advertising pixels.
                </p>
              </section>

              <section>
                <h2>6. Data Security Disclaimer</h2>
                <p>
                  While your data is stored in secure PostgreSQL databases with proper row-level security (RLS) rules, this remains an independent portfolio project. We cannot guarantee absolute immunity from data loss, breaches, or service interruptions. You use the application at your own discretion.
                </p>
              </section>

              <section>
                <h2>7. Your Rights & Data Deletion</h2>
                <p>
                  You have full ownership of your data. You can export your transaction data from the profile page. You can also permanently delete your account and associated application records from the profile page or by contacting the developer. Once deleted, your data cannot be recovered.
                </p>
              </section>

              <section>
                <h2>8. Contact</h2>
                <p>
                  If you have any questions or concerns regarding your privacy, please contact <a href="mailto:me@ondrejkutil.com">me@ondrejkutil.com</a> or open an issue on the <a href="https://github.com/OndrejKutil/budgeting_dashboard" target="_blank" rel="noreferrer">GitHub repository</a>.
                </p>
              </section>
      </div>
    </PublicLayout>
  );
}
