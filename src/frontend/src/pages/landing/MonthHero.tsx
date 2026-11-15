import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { SankeyChart } from '@/components/analytics/SankeyChart';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { useAuth } from '@/contexts/auth-context';
import { cashFlow, formatKc, income, sankeyInput, SAMPLE_MONTH } from './sample-data';

const primaryButton =
  'inline-flex h-12 items-center rounded-full bg-primary px-6 text-[0.9375rem] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const secondaryButton =
  'inline-flex h-12 items-center rounded-full border border-foreground/20 px-6 text-[0.9375rem] text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const SANKEY_LABELS = { income: 'Income', expenses: 'Expenses', savings: 'Savings', investments: 'Investments', cashFlow: 'Cash flow' };
const REVEAL_SECONDS = 1.4;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const ariaLabel =
  `Flow of a sample ${SAMPLE_MONTH.name} ${SAMPLE_MONTH.year}: income of ${formatKc(income)} splits into spending, savings ` +
  `and ${formatKc(cashFlow)} of cash flow left over.`;

/** The same flow as ranked rows, which is what the app shows on phones. */
const rowsFor = (record: Record<string, number>): LineRow[] => {
  const entries = Object.entries(record).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const largest = entries[0]?.[1] ?? 0;
  return entries.map(([name, value]) => ({
    key: name,
    label: name,
    detail: `${Math.round((value / total) * 100)} %`,
    amount: formatKc(value),
    ratio: value / largest,
  }));
};
const PHONE_GROUPS = [
  { key: 'income', title: 'Income', rows: rowsFor(sankeyInput.income_by_category), bar: 'bg-success' },
  { key: 'expenses', title: 'Expenses', rows: rowsFor(sankeyInput.expense_by_category), bar: 'bg-foreground/50' },
  { key: 'savings', title: 'Savings', rows: rowsFor(sankeyInput.saving_by_category), bar: 'bg-foreground/35' },
];

export function MonthHero() {
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();
  const revealRef = useRef<HTMLDivElement>(null);

  return (
    <section
      aria-labelledby="landing-title"
      className="grid items-center gap-x-8 gap-y-12 xl:min-h-[calc(100svh-10rem)] xl:grid-cols-[minmax(0,36fr)_minmax(0,64fr)]"
    >
      <div>
        <h1
          id="landing-title"
          className="text-balance text-[clamp(2.5rem,3.8vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em]"
        >
          See where your money goes, every month.
        </h1>
        <p className="mt-6 max-w-[30rem] text-[1.125rem] leading-relaxed text-muted-foreground">
          Budgeting Dashboard turns your income and spending into one clear picture of the month. You know what is left
          before it is gone.
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

      {/* The chart may use the page's right padding from xl up: its labels need 23rem of the width. */}
      <div className="min-w-0 xl:-mr-14">
        {/* Like CashFlowPage, the Sankey is replaced by ranked rows below md: it cannot be read that narrow. */}
        <motion.div
          ref={revealRef}
          className="hidden md:block"
          initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: REVEAL_SECONDS, ease: EASE_OUT }}
          // Remove the clip entirely once revealed, so the tooltip is never cut off.
          onAnimationComplete={() => {
            if (revealRef.current) revealRef.current.style.clipPath = 'none';
          }}
        >
          <SankeyChart data={sankeyInput} ariaLabel={ariaLabel} formatValue={formatKc} labels={SANKEY_LABELS} ignorePrivacy minHeightRem={20} collapsible={false} />
        </motion.div>

        <div className="space-y-8 md:hidden" role="group" aria-label={ariaLabel}>
          {PHONE_GROUPS.map((group) => (
            <div key={group.key}>
              <h3 className="mb-1.5 text-[0.8125rem] font-normal text-muted-foreground">{group.title}</h3>
              <LineRows rows={group.rows} barClassName={group.bar} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
