import type { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

/**
 * Shell of every public page: the public top bar, the content column (same width as the app)
 * and the footer. `showCta` hides the footer's "Start with this month." block where the page
 * already ends with its own call to action.
 */
export function PublicLayout({ children, showCta = true }: { children: ReactNode; showCta?: boolean }) {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main id="main-content" className="mx-auto w-full max-w-[82rem] flex-1 px-4 pb-24 pt-6 sm:px-5 lg:px-14 lg:pb-28 lg:pt-10">
        {children}
      </main>
      {/* A panel of its own, not part of the content column, so the footer reads as separate from the page. */}
      <PublicFooter showCta={showCta} />
    </div>
  );
}

/** Heading block for the text pages (FAQ, About, Terms, Privacy, How it works). */
export function PublicPageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="max-w-[42rem]">
      <h1 className="text-[2.25rem] font-light leading-[1.05] tracking-[-0.035em] sm:text-[3rem]">{title}</h1>
      {lead && <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted-foreground">{lead}</p>}
    </header>
  );
}
