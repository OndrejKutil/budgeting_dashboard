import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

export default function FaqPage() {
    const faqs = [
        {
            question: "Is my data safe?",
            answer: "The app uses modern infrastructure and authentication, but it is a personal project rather than audited commercial finance software. Avoid storing irreplaceable or highly sensitive financial records."
        },
        {
            question: "Can I connect my bank account?",
            answer: "Currently, we do not support automatic bank synchronization. The dashboard is designed for manual entry or CSV imports to give you full control over your data."
        },
        {
            question: "Why can savings be negative?",
            answer: "Savings are shown as Net Savings. If you withdraw more from savings funds than you contribute during a selected period, the result is negative."
        },
        {
            question: "Why are savings not counted as expenses?",
            answer: "Saving money is a transfer to another purpose, not spending. Keeping savings separate makes your everyday expenses easier to understand."
        },
        {
            question: "Why are savings withdrawals not counted as income?",
            answer: "A withdrawal from savings does not create new money. It moves existing money back into your main balance, so it affects Cash Flow instead of Clean Income."
        },
        {
            question: "Why is Profit different from Cash Flow?",
            answer: "Profit shows what remains after income, expenses, and investments. Cash Flow also includes savings movements, so contributions lower cash flow and withdrawals raise it."
        },
        {
            question: "Are investments counted as expenses?",
            answer: "No. Investments are tracked separately so normal spending and investing do not get mixed together."
        },
        {
            question: "How do I reset my password?",
            answer: "Use the forgot-password link on the login page and follow the email instructions."
        },
        {
            question: "Is this free to use?",
            answer: "Yes, this is a free personal finance tool."
        },
        {
            question: "Do you have a mobile app?",
            answer: "There is no separate mobile app. For the best mobile experience on iPhone, add the website to your home screen and use it as a web app."
        },
        {
            question: "What if I need help, have a feature request, or found a bug?",
            answer: "Feel free to reach out to the developer directly at me@ondrejkutil.com"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-hero relative overflow-hidden">


            {/* Header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b theme-border-subtle bg-background/80 backdrop-blur-xl">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2">

                        <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
                    </Link>
                    <Button variant="ghost" asChild className="theme-text-muted-80 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="relative z-10 container mx-auto max-w-3xl px-4 pb-16 pt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl tracking-tight font-display">
                            <span className="text-hero-thin theme-text-strong-90">FREQUENTLY ASKED </span>
                            <span className="text-hero-bold text-gradient-primary">QUESTIONS</span>
                        </h1>
                        <p className="theme-text-muted-60 text-lg">Common questions about the Budgeting Dashboard.</p>
                    </div>

                    <div className="rounded-xl border theme-border-subtle theme-bg-panel backdrop-blur-sm p-6 shadow-sm">
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`} className="theme-border-subtle">
                                    <AccordionTrigger className="text-left font-medium theme-text-strong hover:text-foreground/80 dark:hover:text-white/80">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="theme-text-muted-60">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                    <div className="rounded-xl border theme-border-subtle theme-bg-panel p-8 text-center shadow-sm">
                        <h2 className="mb-4 text-2xl font-bold font-display theme-text-strong">Still have questions?</h2>
                        <p className="mb-6 theme-text-muted-60">
                            Feel free to reach out to the developer directly.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-amber-500 hover:text-amber-400 transition-colors">
                            <Mail className="h-5 w-5" />
                            <a href="mailto:me@ondrejkutil.com" className="font-medium hover:underline">
                                me@ondrejkutil.com
                            </a>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

