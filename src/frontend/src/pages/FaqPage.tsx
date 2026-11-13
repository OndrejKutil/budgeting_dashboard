import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PublicLayout, PublicPageTitle } from '@/components/public/PublicLayout';
import { CONTACT_EMAIL } from '@/components/public/PublicFooter';

const FAQS = [
  {
    question: 'Is my data safe?',
    answer:
      'The app uses modern infrastructure and authentication, but it is a personal project rather than audited commercial finance software. Avoid storing irreplaceable or highly sensitive financial records.',
  },
  {
    question: 'Can I connect my bank account?',
    answer:
      'No. There is no automatic bank synchronisation: you enter the records yourself, which keeps you in full control of what is stored.',
  },
  {
    question: 'Why can savings be negative?',
    answer:
      'Saved is a net figure: money put into savings funds minus money taken out. If you withdraw more than you put in during a period, it is negative.',
  },
  {
    question: 'Why are savings not counted as expenses?',
    answer:
      'Saving money is moving it to another purpose, not spending it. Keeping savings separate makes your everyday expenses easier to understand.',
  },
  {
    question: 'Why are savings withdrawals not counted as income?',
    answer:
      'A withdrawal from savings does not create new money. It moves money you already had back into your main balance, so it raises Cash flow instead of Income.',
  },
  {
    question: 'Why is Profit different from Cash flow?',
    answer:
      'Profit is what remains of your income after expenses and investments. Cash flow also takes savings into account: putting money into savings lowers it and taking money out raises it.',
  },
  {
    question: 'Are investments counted as expenses?',
    answer: 'No. Investments are tracked separately so normal spending and investing do not get mixed together.',
  },
  {
    question: 'Can I get my data out, or delete it?',
    answer:
      'Yes. Profile has an export of your transactions, categories, accounts and funds as CSV, and a button that deletes your account and all its data.',
  },
  {
    question: 'How do I reset my password?',
    answer: 'Use the "Forgot password" link on the login page and follow the instructions in the email.',
  },
  {
    question: 'Is this free to use?',
    answer: 'Yes, this is a free personal finance tool.',
  },
  {
    question: 'Do you have a mobile app?',
    answer:
      'There is no separate mobile app. For the best experience on a phone, add the website to your home screen and use it as a web app.',
  },
];

export default function FaqPage() {
  return (
    <PublicLayout>
      <PublicPageTitle title="Frequently asked questions" lead="Common questions about Budgeting Dashboard." />

      <Accordion type="single" collapsible className="mt-10 max-w-[48rem] border-t border-border">
        {FAQS.map((faq, index) => (
          <AccordionItem key={faq.question} value={`item-${index}`} className="border-b border-border">
            <AccordionTrigger className="py-4 text-left text-[1rem] font-normal hover:no-underline">{faq.question}</AccordionTrigger>
            <AccordionContent className="max-w-[65ch] pb-5 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <section className="mt-12 max-w-[48rem]">
        <h2 className="text-[1.125rem] font-medium">Still have a question, a feature request or a bug?</h2>
        <p className="mt-1 text-[0.9375rem] text-muted-foreground">
          Write to the developer at{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </PublicLayout>
  );
}
