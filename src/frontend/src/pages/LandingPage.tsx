import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '@/lib/api/endpoints';
import { useAuth } from '@/contexts/auth-context';
import { PublicLayout } from '@/components/public/PublicLayout';
import { cn } from '@/lib/utils';

/**
 * Sample month shown beside the headline. Static on purpose: it must render signed out, never
 * blur in hide-amounts mode, and cost nothing to load. The numbers reconcile the way the app
 * computes them: profit = income − spent; cash flow = profit − saved.
 */
const SAMPLE = {
  income: 32491,
  spent: 18679,
  saved: 7975,
};
const SAMPLE_PROFIT = SAMPLE.income - SAMPLE.spent;
const SAMPLE_CASH_FLOW = SAMPLE_PROFIT - SAMPLE.saved;

const sampleNumber = (value: number) => new Intl.NumberFormat('cs-CZ').format(Math.abs(value));

const EXPLANATIONS = [
  { title: 'Cash flow and profit', body: 'Every month in plain numbers.' },
  { title: 'Where it went', body: 'Categories against your own average.' },
  { title: "Next month's budget", body: "Built from last month's real figures." },
];

function Amount({ value, size }: { value: number; size: 'lg' | 'row' }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      {sampleNumber(value)}
      <span className={cn('ml-[0.25em] text-muted-foreground', size === 'lg' ? 'text-[0.55em]' : 'text-[0.8em]')}>Kč</span>
    </span>
  );
}

function SampleMonth() {
  const total = SAMPLE.income;
  const segments = [
    { key: 'spent', label: 'Spent', value: SAMPLE.spent, className: 'bg-foreground/35' },
    { key: 'saved', label: 'Saved', value: SAMPLE.saved, className: 'bg-foreground/[0.14]' },
    { key: 'cash', label: 'Cash flow', value: SAMPLE_CASH_FLOW, className: 'bg-primary' },
  ];
  const share = (value: number) => `${Math.round((value / total) * 100)} %`;

  return (
    <figure aria-label="Sample month, not real data" className="min-w-0">
      <figcaption className="text-[0.8125rem] text-muted-foreground">January 2026 · sample data</figcaption>

      <div className="mt-3 grid grid-cols-2 gap-x-8">
        {[
          { label: 'Cash flow', value: SAMPLE_CASH_FLOW },
          { label: 'Profit', value: SAMPLE_PROFIT },
        ].map((figure) => (
          <div key={figure.label} className="min-w-0 border-t border-border pt-3">
            <div className="text-[0.8125rem] text-muted-foreground">{figure.label}</div>
            <div className="mt-1 text-[2rem] font-light leading-[1.15] tracking-[-0.03em] sm:text-[2.75rem]">
              <Amount value={figure.value} size="lg" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7" aria-hidden="true">
        <div className="flex h-2 gap-[0.1875rem]">
          {segments.map((segment) => (
            <i key={segment.key} className={cn('block h-full rounded-[2px]', segment.className)} style={{ flexGrow: segment.value, flexBasis: 0 }} />
          ))}
        </div>
        <div className="mt-2 flex gap-[0.1875rem] text-[0.8125rem]">
          {segments.map((segment) => (
            <span
              key={segment.key}
              className={cn('min-w-0', segment.key === 'cash' ? 'text-primary' : 'text-muted-foreground')}
              style={{ flexGrow: segment.value, flexBasis: 0 }}
            >
              <span className="block truncate">{segment.label}</span>
              <b className="block text-[0.9375rem] font-medium tabular-nums text-foreground">{share(segment.value)}</b>
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-7 text-[0.9375rem]">
        {[
          { label: 'Income', value: SAMPLE.income, sign: '+', tone: 'text-success' },
          { label: 'Spent', value: SAMPLE.spent, sign: '−', tone: 'text-destructive' },
          { label: 'Saved', value: SAMPLE.saved, sign: '−', tone: 'text-muted-foreground' },
        ].map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:border-t">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className={cn('tabular-nums', row.tone)}>
              {row.sign}
              {sampleNumber(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  // Wake the backend while the visitor reads, so the first sign-in is not a cold start.
  useEffect(() => {
    healthApi.check().catch(() => {
      // Warm-up only.
    });
  }, []);

  const primaryButton =
    'inline-flex h-12 items-center rounded-full bg-primary px-6 text-[0.9375rem] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
  const secondaryButton =
    'inline-flex h-12 items-center rounded-full border border-foreground/20 px-6 text-[0.9375rem] text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <PublicLayout>
      <section className="grid items-center gap-x-[4.5rem] gap-y-14 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
        <div className="min-w-0">
          <h1 className="text-balance text-[2.75rem] font-light leading-[0.98] tracking-[-0.04em] sm:text-[3.75rem] lg:text-[4.25rem]">
            Know your cash flow <span className="text-primary">before</span> the month ends.
          </h1>
          <p className="mt-6 text-[1.125rem] text-muted-foreground lg:text-[1.1875rem]">
            Your whole month in one review. No bank sync.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {isAuthenticated ? (
              <Link to="/dashboard" className={primaryButton}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth/register" className={primaryButton}>
                  Create account
                </Link>
                <Link to="/how-it-works" className={secondaryButton}>
                  See how it works
                </Link>
              </>
            )}
          </div>
        </div>

        <SampleMonth />
      </section>

      <section aria-label="What it shows" className="mt-20 grid gap-y-8 border-t border-border pt-8 md:grid-cols-3 lg:mt-24">
        {EXPLANATIONS.map((item, index) => (
          <div key={item.title} className={cn('min-w-0 md:px-8', index === 0 ? 'md:pl-0' : 'md:border-l md:border-border')}>
            <h2 className="text-[1.0625rem] font-medium">{item.title}</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

    </PublicLayout>
  );
}
