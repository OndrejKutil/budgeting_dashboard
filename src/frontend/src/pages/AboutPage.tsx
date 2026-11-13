import { Link } from 'react-router-dom';
import { PublicLayout, PublicPageTitle } from '@/components/public/PublicLayout';
import { CONTACT_EMAIL, GITHUB_PROFILE } from '@/components/public/PublicFooter';

const inlineLink =
  'text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function AboutPage() {
  return (
    <PublicLayout>
      <PublicPageTitle
        title="About Budgeting Dashboard"
        lead="Budgeting Dashboard is a personal finance analytics project built by Ondřej Kutil. It turns income, expenses, savings, investments and cash flow into a clear monthly picture without hiding the logic behind the numbers."
      />

      <div className="mt-12 grid max-w-[60rem] gap-x-14 gap-y-10 border-t border-border pt-8 md:grid-cols-2">
        <section>
          <h2 className="text-[1.125rem] font-medium">Why it exists</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Many budgeting apps never worked the way I wanted. I wanted clearer control over the calculations, the
            freedom to shape the workflow around my own habits, and the security of understanding exactly how my data
            is stored and used.
          </p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            The app keeps income, expenses, transfers, savings, investments and cash flow separate, so the monthly
            result is easier to understand and trust.
          </p>
        </section>
        <section>
          <h2 className="text-[1.125rem] font-medium">Project status</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            This is a free personal project. It is functional, but it should be treated as an actively developed
            application rather than commercial finance software.
          </p>
          <h2 className="mt-8 text-[1.125rem] font-medium">Contact</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={inlineLink}>
              {CONTACT_EMAIL}
            </a>
            , or find the code on{' '}
            <a href={GITHUB_PROFILE} target="_blank" rel="noreferrer" className={inlineLink}>
              GitHub
            </a>
            . The formulas behind every figure are on{' '}
            <Link to="/how-it-works" className={inlineLink}>
              How it works
            </Link>
            .
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
