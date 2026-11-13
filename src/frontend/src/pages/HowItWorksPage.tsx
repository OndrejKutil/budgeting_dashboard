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
    </PublicLayout>
  );
}
