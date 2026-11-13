import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

export const CONTACT_EMAIL = 'me@ondrejkutil.com';
export const GITHUB_PROFILE = 'https://github.com/OndrejKutil';
export const GITHUB_REPO = 'https://github.com/OndrejKutil/budgeting_dashboard';

const linkClass =
  'rounded-sm py-1 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="mb-2.5 text-[0.8125rem] font-normal text-muted-foreground/70">{title}</h2>
      <ul className="flex flex-col gap-1 text-[0.875rem]">{children}</ul>
    </div>
  );
}

const external = { target: '_blank', rel: 'noreferrer' } as const;

/**
 * Footer of the landing page and every public page: a panel within the page width (darker
 * background, rounded top, sitting on the bottom edge) with a closing call to action for signed-out visitors, the link
 * columns with contact, and the legal line.
 */
export function PublicFooter({ showCta = true }: { showCta?: boolean }) {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();
  const cta = showCta && !isAuthenticated;

  return (
    <footer className="mx-auto w-full max-w-[82rem] px-2 sm:px-3 lg:px-8">
      <div className="rounded-t-[1.75rem] border border-b-0 border-foreground/10 bg-background-secondary px-5 pt-12 sm:px-8 lg:px-12 lg:pt-14">
        {cta && (
          <div className="flex flex-col gap-6 border-b border-border pb-12 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-[2.25rem] font-light leading-none tracking-[-0.04em] sm:text-[3rem]">Start with this month.</p>
            <Link
              to="/auth/register"
              className="inline-flex h-11 shrink-0 items-center self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:self-auto"
            >
              Create account
            </Link>
          </div>
        )}

        <nav
          aria-label="Footer"
          className={
            'grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1.3fr] ' + (cta ? 'mt-12' : '')
          }
        >
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link
              to="/"
              className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Budgeting Dashboard
            </Link>
            <p className="mt-2 text-[0.875rem] text-muted-foreground">Your money, month by month.</p>
          </div>
          <Column title="Product">
            <li><Link to="/how-it-works" className={linkClass}>How it works</Link></li>
            <li><Link to="/faq" className={linkClass}>FAQ</Link></li>
          </Column>
          <Column title="Project">
            <li><Link to="/about" className={linkClass}>About</Link></li>
            <li><a href={GITHUB_REPO} {...external} className={linkClass}>Source on GitHub</a></li>
            <li><a href={`${GITHUB_REPO}/blob/main/LICENSE.md`} {...external} className={linkClass}>MIT licence</a></li>
          </Column>
          <Column title="Legal">
            <li><Link to="/privacy" className={linkClass}>Privacy Policy</Link></li>
            <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
          </Column>
          <Column title="Contact">
            <li><a href={`mailto:${CONTACT_EMAIL}`} className={`${linkClass} break-all`}>{CONTACT_EMAIL}</a></li>
            <li><a href={GITHUB_PROFILE} {...external} className={linkClass}>GitHub</a></li>
          </Column>
        </nav>

        <div className="mt-12 flex flex-col gap-1.5 border-t border-border py-6 text-[0.8125rem] text-muted-foreground/80 lg:flex-row lg:justify-between lg:gap-8">
          <p>Not a bank or financial adviser. Nothing here is financial advice.</p>
          <p className="lg:text-right">
            © {year} Ondřej Kutil · Data on Supabase · hosted on Render
          </p>
        </div>
      </div>
    </footer>
  );
}
