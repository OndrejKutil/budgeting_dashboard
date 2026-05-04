import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Wallet, ArrowLeft, TrendingUp, TrendingDown, PiggyBank, DollarSign, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Business Logic Data ─── */
const kpiSections = [
    {
        title: "Clean Income",
        icon: TrendingUp,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        description: "We calculate your income based on what you actually earn. Money moved out of savings funds and back into your main account is NOT counted as new income – it's just a transfer. This gives you a true picture of your earnings.",
        formula: "Total Income - Savings Funds Withdrawals"
    },
    {
        title: "True Expenses",
        icon: TrendingDown,
        color: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        description: "Expenses are straightforward: everything you spend. We track everyday spending separately from savings contributions to help you see where your money really goes.",
        formula: "Sum of all Expense transactions"
    },
    {
        title: "Net Savings",
        icon: PiggyBank,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
        description: "Savings are calculated as 'Net Savings'. This means we take the total amount you put into savings and subtract any withdrawals you made from those funds. This reveals your actual savings progress for the period.",
        formula: "Total Savings Contributions - Savings Funds Withdrawals"
    },
    {
        title: "Profit",
        icon: DollarSign,
        color: "text-foreground",
        bg: "bg-foreground/5",
        border: "border-border/50",
        description: "Profit is your financial bottom line. It tells you how much money is left from your earnings after covering all expenses and investments. It represents the money that you still have available (liquid).",
        formula: "Clean Income - Expenses - Investments"
    },
    {
        title: "Cash Flow",
        icon: Activity,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
        description: "Cash Flow represents the actual net change in your main account's balance. It accounts for everything: income, expenses, investments, AND net savings movements.",
        formula: "All Income - All Expenses - All Investments - All Net Savings"
    }
];

/* ─── Animation variants ─── */
const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};
const fadeInUp = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2">

                        <span className="text-xl font-bold font-display tracking-tight text-foreground">Budgeting Dashboard</span>
                    </Link>
                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="relative z-10 container mx-auto max-w-4xl px-4 pb-24 pt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-16"
                >
                    {/* Page Title */}
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-display text-foreground">
                            How It Works
                        </h1>
                        <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
                            Every metric in the dashboard is calculated directly from your raw transaction data. We do not estimate or fabricate any numbers. Here is the exact logic behind your financial flow.
                        </p>
                    </div>

                    {/* Sequential Pipeline */}
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="relative"
                    >
                        {/* Connecting Line */}
                        <div className="absolute left-[31.5px] top-8 bottom-8 w-px bg-border" />

                        <div className="space-y-12">
                            {kpiSections.map((section, index) => (
                                <motion.div 
                                    key={index}
                                    variants={fadeInUp}
                                    className="relative flex items-start gap-6 md:gap-10"
                                >
                                    {/* Icon Node */}
                                    <div className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 ${section.border} bg-background shadow-sm`}>
                                        <div className={`flex h-full w-full items-center justify-center rounded-full ${section.bg}`}>
                                            <section.icon className={`h-6 w-6 ${section.color}`} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-3 pt-2">
                                        <h3 className="text-2xl font-bold font-display text-foreground tracking-tight">
                                            {section.title}
                                        </h3>
                                        <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
                                            {section.description}
                                        </p>
                                        
                                        <div className="inline-flex items-center gap-2 rounded-md bg-muted/30 border border-border/50 px-3 py-2 mt-4 text-sm font-mono text-foreground/80">
                                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Formula:</span>
                                            {section.formula}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
}
