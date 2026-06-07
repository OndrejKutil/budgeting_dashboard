import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Visual balance */}
      <div className="relative hidden w-[30%] min-w-[320px] overflow-hidden border-r border-border bg-background-secondary lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.08),transparent_34%),linear-gradient(135deg,hsl(var(--background-secondary))_0%,hsl(var(--background))_100%)]" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/20 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-px bg-primary/25" />

        <div className="relative z-20 p-8">
          <Link to="/" className="text-base font-bold font-display text-foreground hover:text-primary">
            Budgeting Dashboard
          </Link>
        </div>

        <div aria-hidden="true" className="relative z-10 flex flex-1 items-center justify-center px-8">
          <div className="relative h-[420px] w-full max-w-[300px]">
            <div className="absolute left-0 top-8 h-56 w-56 rounded-full border border-primary/15" />
            <div className="absolute left-10 top-20 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

            <div className="absolute left-0 top-24 w-64 rounded-xl border border-border/80 bg-card/50 p-4 shadow-[0_20px_50px_hsl(0_0%_0%/0.22)] backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div className="h-2 w-20 rounded-full bg-foreground/22" />
                <div className="h-2 w-8 rounded-full bg-primary/60" />
              </div>
              <div className="mb-5 grid grid-cols-3 gap-2">
                <div className="h-14 rounded-md border border-border/70 bg-background/60" />
                <div className="h-14 rounded-md border border-border/70 bg-background/60" />
                <div className="h-14 rounded-md border border-border/70 bg-primary/10" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_5rem] items-center gap-3">
                  <div className="h-2 rounded-full bg-foreground/16" />
                  <div className="h-2 rounded-full bg-primary/45" />
                </div>
                <div className="grid grid-cols-[1fr_4rem] items-center gap-3">
                  <div className="h-2 rounded-full bg-foreground/12" />
                  <div className="h-2 rounded-full bg-foreground/18" />
                </div>
                <div className="grid grid-cols-[1fr_3rem] items-center gap-3">
                  <div className="h-2 rounded-full bg-foreground/10" />
                  <div className="h-2 rounded-full bg-foreground/14" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-20 right-0 w-44 rounded-xl border border-border/80 bg-background/70 p-4 shadow-[0_18px_44px_hsl(0_0%_0%/0.24)] backdrop-blur">
              <div className="mb-4 h-2 w-16 rounded-full bg-foreground/18" />
              <div className="flex h-24 items-end gap-2">
                <div className="h-8 flex-1 rounded-sm bg-primary/25" />
                <div className="h-14 flex-1 rounded-sm bg-primary/45" />
                <div className="h-11 flex-1 rounded-sm bg-primary/30" />
                <div className="h-20 flex-1 rounded-sm bg-primary/60" />
                <div className="h-12 flex-1 rounded-sm bg-primary/35" />
              </div>
            </div>

            <div className="absolute bottom-4 left-8 flex w-44 items-center gap-3 rounded-xl border border-border/70 bg-card/45 p-3 shadow-[0_14px_36px_hsl(0_0%_0%/0.18)] backdrop-blur">
              <div className="h-10 w-10 rounded-full border border-primary/25 bg-primary/10" />
              <div className="flex-1 space-y-2">
                <div className="h-2 w-20 rounded-full bg-foreground/18" />
                <div className="h-2 w-12 rounded-full bg-foreground/12" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <main id="main-content" className="relative z-10 flex flex-1 flex-col justify-center bg-background px-4 py-12 shadow-[-24px_0_64px_hsl(0_0%_0%/0.20)] sm:px-6 lg:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
            </Link>
          </div>

          <div>
            <h1 className="mb-2 text-2xl font-bold font-display">{title}</h1>
            <p className="mb-8 text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
