import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, ArrowLeft, Mail } from 'lucide-react';
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
            answer: "Yes, this is a personal project designed with privacy in mind. While built with secure tools and modern solutions, it is not a production-grade application. Vulnerabilities may exist."
        },
        {
            question: "Can I connect my bank account?",
            answer: "Currently, we do not support automatic bank synchronization. The dashboard is designed for manual entry or CSV imports to give you full control over your data."
        },
        {
            question: "How do I reset my password?",
            answer: "You can reset your password on the login page. If you need further account assistance, please contact the developer directly."
        },
        {
            question: "Is this free to use?",
            answer: "Yes, this is a free personal finance tool."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-hero">
            {/* Header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-blurple">
                            <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
                    </Link>
                    <Button variant="ghost" asChild>
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto max-w-3xl px-4 pb-16 pt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight font-display">Frequently Asked Questions</h1>
                        <p className="text-muted-foreground text-lg">Common questions about the Budgeting Dashboard.</p>
                    </div>

                    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-left font-medium">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
                        <h2 className="mb-4 text-2xl font-bold font-display">Still have questions?</h2>
                        <p className="mb-6 text-muted-foreground">
                            Feel free to reach out to the developer directly.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors">
                            <Mail className="h-5 w-5" />
                            <a href="mailto:kutil.ondrej@outlook.com" className="font-medium hover:underline">
                                kutil.ondrej@outlook.com
                            </a>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
