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
        description: "Clean Income is the money you actually earned in the selected period. Withdrawals from savings funds are removed because they are transfers of money you already had, not new earnings.",
        formula: "Income transactions - Savings withdrawals"
    },
    {
        title: "True Expenses",
        icon: TrendingDown,
        color: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        description: "True Expenses are only spending transactions. Savings contributions and investment purchases are tracked separately, so they do not blur your everyday cost of living.",
        formula: "Sum of Expense transactions"
    },
    {
        title: "Net Savings",
        icon: PiggyBank,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
        description: "Net Savings shows your real savings movement. It can be positive when you saved more than you withdrew, or negative when withdrawals were higher than contributions.",
        formula: "Savings contributions - Savings withdrawals"
    },
    {
        title: "Profit",
        icon: DollarSign,
        color: "text-foreground",
        bg: "bg-foreground/5",
        border: "border-border/50",
        description: "Profit shows what remains from earned income after expenses and investments. It is calculated before savings movements, which is why it can differ from Cash Flow.",
        formula: "Clean Income - True Expenses - Investments"
    },
    {
        title: "Cash Flow",
        icon: Activity,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
        description: "Cash Flow is the net change in your main balance. It includes savings movements, so positive savings reduce cash flow and negative savings increase it.",
        formula: "Clean Income - True Expenses - Investments - Net Savings"
    }
];

const exampleRows = [
    { label: "Clean Income", value: "30 000 Kč" },
    { label: "True Expenses", value: "18 000 Kč" },
    { label: "Investments", value: "3 000 Kč" },
    { label: "Savings contributions", value: "5 000 Kč" },
    { label: "Savings withdrawals", value: "2 000 Kč" },
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
                            Every metric is calculated directly from your transaction data. The dashboard separates
                            income, expenses, savings, investments, profit, and cash flow so transfers do not distort
                            your real financial picture.
                        </p>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-500">
                            Core principle
                        </h2>
                        <p className="text-sm leading-relaxed text-foreground/80">
                            Savings withdrawals are not treated as new income. Savings contributions are not treated
                            as expenses. They are savings movements, which is why Net Savings can be negative.
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

                    <section className="border-t border-border pt-12">
                        <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
                                    Example month
                                </h2>
                                <p className="text-base leading-relaxed text-muted-foreground">
                                    In this example, the user saved 5 000 Kč and withdrew 2 000 Kč, so Net Savings is
                                    3 000 Kč. That amount is then subtracted from Profit to show the actual cash flow.
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card/60 p-5">
                                <div className="space-y-3">
                                    {exampleRows.map((row) => (
                                        <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                                            <span className="text-muted-foreground">{row.label}</span>
                                            <span className="font-mono text-foreground">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="my-4 border-t border-border" />
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                        <span className="font-medium text-foreground">Net Savings</span>
                                        <span className="font-mono text-foreground">3 000 Kč</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                        <span className="font-medium text-foreground">Profit</span>
                                        <span className="font-mono text-foreground">9 000 Kč</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                        <span className="font-medium text-foreground">Cash Flow</span>
                                        <span className="font-mono text-amber-500">6 000 Kč</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </motion.div>
            </main>
        </div>
    );
}
