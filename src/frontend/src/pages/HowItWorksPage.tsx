import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, PiggyBank, DollarSign, Activity } from 'lucide-react';

export default function HowItWorksPage() {
    const sections = [
        {
            title: "Clean Income",
            icon: TrendingUp,
            color: "text-success",
            bg: "bg-success/10",
            border: "border-success/20",
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
            color: "text-info",
            bg: "bg-info/10",
            border: "border-info/20",
            description: "Savings are calculated as 'Net Savings'. This means we take the total amount you put into savings and subtract any withdrawals you made from those funds. This reveals your actual savings progress for the period.",
            formula: "Total Savings Contributions - Savings Funds Withdrawals"
        },
        {
            title: "Profit",
            icon: DollarSign,
            color: "text-primary",
            bg: "bg-primary/10",
            border: "border-primary/20",
            description: "Profit is your financial bottom line. It tells you how much money is left from your earnings after covering all expenses and investments. It represents the money that you still have avaliable (liquid).",
            formula: "Clean Income - Expenses - Investments"
        },
        {
            title: "Cash Flow",
            icon: Activity,
            color: "text-warning",
            bg: "bg-warning/10",
            border: "border-warning/20",
            description: "Cash Flow represents the actual net change in your main account's balance. It accounts for everything: income, expenses, investments, AND net savings movements.",
            formula: "All Income - All Expenses - All Investments - All Net Savings"
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

            <main className="container mx-auto max-w-4xl px-4 pb-16 pt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                >
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight font-display">How It Works</h1>
                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                            Understanding your finances shouldn't be complicated. Here is how we calculate your key performance indicators to give you the most accurate financial picture.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {sections.map((section, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm transition-all hover:shadow-lg"
                            >
                                <div className={`absolute left-0 top-0 h-full w-1 ${section.bg.replace('/10', '')}`} />
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                                    <div className={`mt-1 rounded-xl p-3 ${section.bg} ${section.color}`}>
                                        <section.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold font-display">{section.title}</h2>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {section.description}
                                        </p>
                                        <div className="mt-2 inline-flex items-center rounded-md border border-border bg-background/50 px-3 py-1 text-xs font-mono text-muted-foreground">
                                            <span className="mr-2 font-semibold text-foreground">Formula:</span>
                                            {section.formula}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
