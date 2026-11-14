import { useEffect } from 'react';
import { PublicLayout, PublicPageTitle } from '@/components/public/PublicLayout';

export default function PrivacyPage() {
  // The page is lazy-loaded, so the browser's own jump to #screenshot-import / #trading212 (linked from
  // the dashboard) fires before the section exists. Redo it once mounted.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <PublicLayout>
      <PublicPageTitle title="Privacy Policy" lead="Last updated: November 14, 2026" />

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
                  <li>If you connect Trading212: your Trading212 API key and secret (encrypted at rest) and the portfolio positions and values synced from it</li>
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
                  <li><strong>Groq:</strong> Runs the AI models behind the optional screenshot import (see section 5).</li>
                  <li><strong>Trading212:</strong> Supplies your portfolio data when you choose to connect it (see section 6).</li>
                </ul>
                <p className="mt-2 text-sm leading-relaxed">
                  These providers have their own strict privacy and security policies governing the data stored on their infrastructure.
                </p>
              </section>

              <section id="screenshot-import">
                <h2>5. Screenshot Import (AI Processing)</h2>
                <p>
                  Screenshot import is optional and only available when enabled for your account. When you use it, the following is sent to <a href="https://groq.com" target="_blank" rel="noreferrer">Groq</a>, which runs the AI models that read the image:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>The screenshot you upload, and then the transactions read from it (merchants, amounts, dates) as text for a second matching step</li>
                  <li>The names of your categories, accounts, savings funds and tags, with basic details such as category type and account type and currency, so the result can be matched to them</li>
                  <li>A few of your past transaction notes that resemble the merchants found, so they are categorised the way you did before</li>
                  <li>Any instructions you type into the import form</li>
                </ul>
                <p className="mt-2">
                  We do not store the screenshot. It is held in memory only for the duration of the request; only the transactions you review and confirm are saved. Groq processes the data under its own terms. According to its <a href="https://console.groq.com/docs/your-data" target="_blank" rel="noreferrer">data documentation</a> and <a href="https://console.groq.com/docs/legal/services-agreement" target="_blank" rel="noreferrer">services agreement</a>, Groq does not use API inputs or outputs to train models, and does not retain inference data by default, except that it may temporarily log requests (for up to 30 days) when troubleshooting errors or investigating abuse. Groq stores data in the United States. These are Groq's own statements, which we cannot independently verify and which Groq may change; see also its <a href="https://groq.com/privacy-policy" target="_blank" rel="noreferrer">privacy policy</a>.
                </p>
                <p className="mt-2">
                  The specific AI models used are third-party models hosted by Groq and may change over time without notice as models are updated or retired. Results are machine-generated and can be wrong, which is why every imported transaction is shown for review before it is saved. Before uploading, we recommend cropping or blurring anything you do not want to share, such as account numbers, balances or other people's names.
                </p>
              </section>

              <section id="statement-import">
                <h2>5a. Importing Your Bank Data</h2>
                <p>
                  Importing your bank data (a CSV or Excel export) is optional and only available when enabled for your account. To suggest a category for each merchant, it sends merchant names and payment messages from your file, without amounts, dates or account numbers, together with the names of your categories, to the same AI provider described in section 5. The file itself is processed in memory and not stored; only the transactions you review and confirm are saved. You can switch the AI suggestions off on the upload screen; categories then come only from how you filed the same merchants before, and nothing is sent to the AI provider. Transfers to or from the account holder's own name are never sent.
                </p>
              </section>

              <section id="trading212">
                <h2>6. Trading212 Integration</h2>
                <p>
                  Connecting Trading212 is optional. We strongly advise creating a <strong>read-only</strong> API key in Trading212 with only the account, portfolio and history permissions, and never one that can place orders or move money. Your key and secret are encrypted before they are stored, and the encryption key is held only by the backend server, never in the database. The Application uses them solely to fetch your portfolio positions and values. You can disconnect at any time, which deletes the stored credentials; you can also revoke the key in Trading212 directly.
                </p>
              </section>

              <section>
                <h2>7. Cookies and Authentication</h2>
                <p>
                  The Application uses JSON Web Tokens (JWTs) stored in your browser's local storage to maintain your logged-in session. It also stores local interface preferences such as theme, privacy mode, URL filters, and OAuth redirect state. We do not use third-party tracking cookies or advertising pixels.
                </p>
              </section>

              <section>
                <h2>8. Data Security Disclaimer</h2>
                <p>
                  While your data is stored in secure PostgreSQL databases with proper row-level security (RLS) rules, this remains an independent portfolio project. We cannot guarantee absolute immunity from data loss, breaches, or service interruptions. You use the application at your own discretion.
                </p>
              </section>

              <section>
                <h2>9. Your Rights & Data Deletion</h2>
                <p>
                  You have full ownership of your data. You can export your transaction data from the profile page. You can also permanently delete your account and associated application records from the profile page or by contacting the developer. Once deleted, your data cannot be recovered.
                </p>
              </section>

              <section>
                <h2>10. Contact</h2>
                <p>
                  If you have any questions or concerns regarding your privacy, please contact <a href="mailto:me@ondrejkutil.com">me@ondrejkutil.com</a> or open an issue on the <a href="https://github.com/OndrejKutil/budgeting_dashboard" target="_blank" rel="noreferrer">GitHub repository</a>.
                </p>
              </section>
      </div>
    </PublicLayout>
  );
}
