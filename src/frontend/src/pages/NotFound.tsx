import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PublicLayout } from '@/components/public/PublicLayout';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <PublicLayout showCta={false}>
      <section className="grid items-end gap-x-[4.5rem] gap-y-8 py-10 lg:grid-cols-[1fr_1.1fr] lg:py-16">
        <p
          aria-hidden="true"
          className="select-none text-[7rem] font-extralight leading-none tracking-[-0.06em] text-foreground/90 sm:text-[10rem]"
        >
          404
        </p>
        <div>
          <h1 className="text-[2rem] font-light leading-tight tracking-[-0.03em] sm:text-[2.5rem]">Page not found</h1>
          <p className="mt-3 text-[1.0625rem] text-muted-foreground">We couldn't find the page you're looking for.</p>
          <p className="mt-1 text-[0.9375rem] text-muted-foreground/70">It must have been cut from this month's budget.</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Go to the home page
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-11 items-center rounded-full border border-foreground/20 px-5 text-sm text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go back
            </button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default NotFound;
