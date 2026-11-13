import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

/**
 * Sign-in, registration and password pages: a centred narrow column with the brand on top,
 * the title, and the form. No card around the form, no decoration.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-background text-foreground">
      <header className="safe-top px-4 pt-5 sm:px-5 lg:px-8">
        <Link
          to="/"
          className="rounded-md text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Budgeting Dashboard
        </Link>
      </header>

      <main id="main-content" className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-[26rem]">
          <h1 className="text-[2rem] font-light leading-tight tracking-[-0.03em]">{title}</h1>
          <p className="mb-9 mt-2 text-[0.9375rem] text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </main>

      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 pb-6 text-[0.8125rem] text-muted-foreground">
        <Link to="/privacy" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Privacy Policy
        </Link>
        <Link to="/terms" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}
