import { Link } from 'react-router-dom';
import { GITHUB_REPO } from '@/components/public/PublicFooter';

const link =
  'text-foreground underline decoration-foreground/40 underline-offset-[0.2em] transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const FEATURES = [
  { name: 'Transactions', description: 'One ledger for every account, so you stop guessing where the money went.' },
  {
    name: 'Budget',
    description: 'A plan for each category with your real spending beside it, so you notice a drift before it becomes a habit.',
  },
  {
    name: 'Savings funds',
    description: 'Money for a goal is tracked apart from spending money, so you do not spend the holiday by accident.',
  },
  {
    name: 'Recurring',
    description: 'Rent, salary and subscriptions post themselves, so most of the month is filled in before you open the app.',
  },
  {
    name: 'Analytics',
    description:
      'Each month sits beside your six-month average, so you can tell a one-off from a trend, and see how long your emergency fund would last.',
  },
];

export function Inside() {
  return (
    <section
      aria-labelledby="landing-inside"
      className="mt-24 grid gap-x-8 gap-y-8 lg:mt-32 lg:grid-cols-[minmax(0,36fr)_minmax(0,64fr)] lg:items-start"
    >
      <div>
        <h2 id="landing-inside" className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[2rem]">
          What it does for you
        </h2>
        <p className="mt-3 max-w-[26rem] text-[1rem] leading-relaxed text-muted-foreground">
          Built by Ondřej Kutil as a{' '}
          <Link to="/about" className={link}>
            personal project
          </Link>
          . The code is on{' '}
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className={link}>
            GitHub
          </a>{' '}
          under the MIT licence.
        </p>
      </div>

      <dl className="divide-y divide-border border-y border-border">
        {FEATURES.map((feature) => (
          <div key={feature.name} className="grid gap-1 py-[1.0625rem] sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6">
            <dt className="text-[1.0625rem] font-medium text-foreground">{feature.name}</dt>
            <dd className="text-[1rem] text-muted-foreground">{feature.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
