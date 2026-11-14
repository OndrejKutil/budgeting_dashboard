import { useEffect } from 'react';
import { PublicLayout, PublicPageTitle } from '@/components/public/PublicLayout';
import { cn } from '@/lib/utils';

/** Each figure the app shows, with the formula the backend uses for it. */
const FIGURES = [
  {
    title: 'Income',
    description:
      'The money you actually earned in the period. Withdrawals from savings funds are left out, because they move money you already had rather than add new money.',
    formula: 'Income transactions − savings withdrawals',
  },
  {
    title: 'Expenses',
    description:
      'Spending only. Money put into savings and investment purchases are tracked separately, so they do not blur your everyday cost of living.',
    formula: 'Sum of expense transactions',
  },
  {
    title: 'Saved',
    description:
      'Your net savings movement: positive when you put more into savings funds than you took out, negative when withdrawals were higher.',
    formula: 'Savings contributions − savings withdrawals',
  },
  {
    title: 'Profit',
    description:
      'What remains of your income after expenses and investments. It is calculated before savings movements, which is why it can differ from Cash flow.',
    formula: 'Income − Expenses − Investments',
  },
  {
    title: 'Cash flow',
    description:
      'The net change in your everyday money. It includes savings movements: putting money aside lowers it, taking money out of savings raises it.',
    formula: 'Income − Expenses − Investments − Saved',
  },
];

/** The savings-fund guide, step by step. Linked from the Funds page as /how-it-works#savings-funds. */
const FUND_STEPS = [
  {
    title: 'Create a fund',
    description:
      'On the Funds page, choose Create Fund and give it a name, such as Vacation or Emergency reserve. A target amount is optional: set one to see progress towards it, or leave it at 0 for an open-ended fund.',
  },
  {
    title: 'Put money in',
    description:
      'Add a normal transaction with a category of the Saving type, the account the money leaves from, and the fund in the Savings Fund field. The account balance goes down and the fund grows by the same amount.',
  },
  {
    title: 'Take money out',
    description:
      'Add a transaction and switch the entry type to From fund. Pick the fund and the account the money goes back to. It is recorded under the Savings Funds Withdrawal category, so it does not count as new income.',
  },
  {
    title: 'Track progress',
    description:
      'Each fund shows its current amount, how close it is to its target, and how much went in or out over the last 30 days. The fund balance is simply everything put in minus everything taken out.',
  },
  {
    title: 'Retire a fund',
    description:
      'A fund can only be deleted once its balance is 0, so take the money out first. A fund with past transactions is then deactivated instead of deleted, so your history and analytics stay intact; a fund that was never used is deleted for good.',
  },
];

const FUND_TIPS = [
  'A fund is a label on your money, not a separate account. It tracks how much of your money is set aside for a purpose, even when it sits in the same bank account as everything else.',
  'Money in funds still counts towards your Liquid Cash. Moving money into or out of a fund changes account balances, but not your total.',
  'To save automatically, create a recurring template with a Saving category and a fund selected, and turn on Post automatically. Each time it is posted, the fund grows, and you get a notification you can review or ignore.',
  'Keep the Savings Funds Withdrawal and Exclude categories as they are. The app finds them by name, so renaming or deleting them breaks withdrawals and transfers.',
  'Moving money between two of your own accounts is a Transfer, not a saving. It creates two transactions in the Exclude category, which the income, expense and savings figures ignore.',
];

const EXAMPLE_INPUTS = [
  { label: 'Income', value: '30 000 Kč' },
  { label: 'Expenses', value: '18 000 Kč' },
  { label: 'Investments', value: '3 000 Kč' },
  { label: 'Put into savings', value: '5 000 Kč' },
  { label: 'Taken out of savings', value: '2 000 Kč' },
];
const EXAMPLE_RESULTS = [
  { label: 'Saved', value: '3 000 Kč' },
  { label: 'Profit', value: '9 000 Kč' },
  { label: 'Cash flow', value: '6 000 Kč', accent: true },
];

export default function HowItWorksPage() {
  // Lazy-loaded page: redo the browser's jump to #savings-funds once the section exists.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <PublicLayout>
      <PublicPageTitle
        title="How it works"
        lead="Every figure is calculated directly from your transactions. Income, expenses, savings, investments, profit and cash flow are kept apart, so moving money around does not distort the picture."
      />

      <p className="mt-8 max-w-[42rem] border-l-2 border-primary pl-4 text-[0.9375rem] leading-relaxed">
        The core rule: a withdrawal from savings is not new income, and putting money into savings is not an expense.
        Both are savings movements, which is why Saved can be negative.
      </p>

      <ol className="mt-12 max-w-[60rem] border-t border-border">
        {FIGURES.map((figure, index) => (
          <li key={figure.title} className="grid gap-x-8 gap-y-2 border-b border-border py-6 md:grid-cols-[2.5rem_14rem_minmax(0,1fr)]">
            <span className="tabular-nums text-muted-foreground">{index + 1}</span>
            <h2 className="text-[1.25rem] font-normal tracking-[-0.01em]">{figure.title}</h2>
            <div className="min-w-0">
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{figure.description}</p>
              <p className="mt-3 font-mono text-[0.8125rem] text-foreground/85">{figure.formula}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="example-month" className="mt-16 grid max-w-[60rem] gap-x-14 gap-y-6 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 id="example-month" className="text-[1.5rem] font-light tracking-[-0.02em]">Example month</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Here 5 000 Kč went into savings and 2 000 Kč came back out, so Saved is 3 000 Kč. That amount is then
            subtracted from Profit to give the Cash flow.
          </p>
        </div>
        <dl className="text-[0.9375rem]">
          {EXAMPLE_INPUTS.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-border py-2.5 first:border-t">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
          {EXAMPLE_RESULTS.map((row, index) => (
            <div
              key={row.label}
              className={cn('flex justify-between gap-4 border-b border-border py-2.5', index === 0 && 'border-t border-t-foreground/30')}
            >
              <dt>{row.label}</dt>
              <dd className={cn('tabular-nums', row.accent && 'text-primary')}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="savings-funds" aria-labelledby="savings-funds-title" className="mt-20 max-w-[60rem] scroll-mt-8">
        <h2 id="savings-funds-title" className="text-[1.5rem] font-light tracking-[-0.02em]">Using savings funds</h2>
        <p className="mt-2 max-w-[42rem] text-[0.9375rem] leading-relaxed text-muted-foreground">
          Savings funds set money aside for a goal. They are built from ordinary transactions, so every figure above
          already accounts for them.
        </p>

        <ol className="mt-8 border-t border-border">
          {FUND_STEPS.map((step, index) => (
            <li key={step.title} className="grid gap-x-8 gap-y-2 border-b border-border py-6 md:grid-cols-[2.5rem_14rem_minmax(0,1fr)]">
              <span className="tabular-nums text-muted-foreground">{index + 1}</span>
              <h3 className="text-[1.125rem] font-normal tracking-[-0.01em]">{step.title}</h3>
              <p className="min-w-0 text-[0.9375rem] leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-10 text-[1.125rem] font-normal tracking-[-0.01em]">Good to know</h3>
        <ul className="mt-3 max-w-[42rem] list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-muted-foreground">
          {FUND_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </PublicLayout>
  );
}
