import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Wallet, ArrowLeft, TrendingUp, TrendingDown, PiggyBank, DollarSign, Activity,
    Server, Database, Shield, Globe, Cpu, Mic, Bot, Workflow, Mail,
    Upload, LayoutDashboard, PenLine, Play, Image as ImageIcon, Monitor, ArrowDown, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/* ─── Business Logic Data ─── */
const kpiSections = [
    {
        title: "Clean Income",
        icon: TrendingUp,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        description: "We calculate your income based on what you actually earn. Money moved out of savings funds and back into your main account is NOT counted as new income – it's just a transfer. This gives you a true picture of your earnings.",
        formula: "Total Income - Savings Funds Withdrawals"
    },
    {
        title: "True Expenses",
        icon: TrendingDown,
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        description: "Expenses are straightforward: everything you spend. We track everyday spending separately from savings contributions to help you see where your money really goes.",
        formula: "Sum of all Expense transactions"
    },
    {
        title: "Net Savings",
        icon: PiggyBank,
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        description: "Savings are calculated as 'Net Savings'. This means we take the total amount you put into savings and subtract any withdrawals you made from those funds. This reveals your actual savings progress for the period.",
        formula: "Total Savings Contributions - Savings Funds Withdrawals"
    },
    {
        title: "Profit",
        icon: DollarSign,
        color: "text-teal-400",
        bg: "bg-teal-500/10",
        border: "border-teal-500/20",
        description: "Profit is your financial bottom line. It tells you how much money is left from your earnings after covering all expenses and investments. It represents the money that you still have available (liquid).",
        formula: "Clean Income - Expenses - Investments"
    },
    {
        title: "Cash Flow",
        icon: Activity,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        description: "Cash Flow represents the actual net change in your main account's balance. It accounts for everything: income, expenses, investments, AND net savings movements.",
        formula: "All Income - All Expenses - All Investments - All Net Savings"
    }
];

/* ─── System Architecture Data ─── */
const systemNodes = [
    {
        id: "cloudflare",
        title: "Cloudflare",
        subtitle: "Domain, DNS & DDoS Protection",
        icon: Globe,
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
    },
    {
        id: "render-frontend",
        title: "Render — Frontend",
        subtitle: "React + Vite static site",
        icon: Monitor,
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
    },
    {
        id: "render-backend",
        title: "Render — Backend",
        subtitle: "Python FastAPI in Docker",
        icon: Server,
        color: "text-teal-400",
        bg: "bg-teal-500/10",
        border: "border-teal-500/20",
    },
    {
        id: "supabase",
        title: "Supabase",
        subtitle: "PostgreSQL + Auth + Row-Level Security",
        icon: Database,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
    },
    {
        id: "security",
        title: "Security",
        subtitle: "JWT tokens, RLS, unit-tested financial calculations",
        icon: Shield,
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/20",
    },
];

/* ─── Workflow GIF placeholders ─── */
// TODO: Add actual GIF/Video URLs to these workflow objects when ready
const workflows = [
    {
        title: "Import Your Data",
        icon: Upload,
        description: "Upload a CSV export from your bank. Map the columns to the right fields and the app does the rest — categorizing and storing your transactions.",
    },
    {
        title: "Navigate the Dashboard",
        icon: LayoutDashboard,
        description: "Filter by date, drill down into categories, and switch between monthly and yearly analytics to understand your spending patterns.",
    },
    {
        title: "Log a Transaction",
        icon: PenLine,
        description: "Quickly add an expense or income entry manually. Select the account, category, and amount — it takes seconds.",
    },
];

/* ─── Animation variants ─── */
const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeInUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ─── Component ─── */
export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-gradient-hero relative overflow-hidden">

            {/* Header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600">
                            <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold font-display">Budgeting Dashboard</span>
                    </Link>
                    <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="relative z-10 container mx-auto max-w-5xl px-4 pb-16 pt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                >
                    {/* Page Title */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl tracking-tight font-display">
                            <span className="text-hero-thin text-white/90">HOW IT </span>
                            <span className="text-hero-bold text-gradient-teal">WORKS</span>
                        </h1>
                        <p className="mx-auto max-w-2xl text-lg text-white/60">
                            Understand what the numbers mean, explore the technology behind the app, and see how everything fits together.
                        </p>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="logic" className="w-full">
                        <TabsList className="w-full flex bg-white/5 border border-white/10 rounded-xl p-1 h-auto flex-wrap gap-1">
                            <TabsTrigger
                                value="logic"
                                className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-teal-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 data-[state=active]:border text-white/60 rounded-lg py-2.5 text-sm font-medium transition-all"
                            >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Business Logic
                            </TabsTrigger>
                            <TabsTrigger
                                value="tech"
                                className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-violet-400 data-[state=active]:border-violet-500/30 data-[state=active]:border text-white/60 rounded-lg py-2.5 text-sm font-medium transition-all"
                            >
                                <Cpu className="mr-2 h-4 w-4" />
                                Tech Stack
                            </TabsTrigger>
                            <TabsTrigger
                                value="ai"
                                className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30 data-[state=active]:border text-white/60 rounded-lg py-2.5 text-sm font-medium transition-all"
                            >
                                <Bot className="mr-2 h-4 w-4" />
                                AI & Integrations
                            </TabsTrigger>
                            <TabsTrigger
                                value="workflows"
                                className="flex-1 min-w-[120px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-green-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 data-[state=active]:border text-white/60 rounded-lg py-2.5 text-sm font-medium transition-all"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                Workflows
                            </TabsTrigger>
                        </TabsList>

                        {/* ─── TAB 1: Business Logic ─── */}
                        <TabsContent value="logic" className="mt-8">
                            <motion.div
                                initial="hidden"
                                animate="show"
                                variants={staggerContainer}
                                className="space-y-8"
                            >
                                {/* Intro */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                                    <h2 className="text-lg font-bold font-display text-white mb-2">Understanding Your Numbers</h2>
                                    <p className="text-white/60 leading-relaxed">
                                        Every metric in the dashboard is calculated from your raw transaction data. We do not estimate or fabricate any numbers.
                                        Below are the five key performance indicators (KPIs) that power the dashboard — each with its formula and explanation of what it means for your finances.
                                    </p>
                                </motion.div>

                                {/* KPI Cards */}
                                <div className="grid gap-5">
                                    {kpiSections.map((section, index) => (
                                        <motion.div
                                            key={index}
                                            variants={fadeInUp}
                                            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-sm transition-all hover:bg-white/10 hover:border-white/20"
                                        >
                                            <div className={`absolute left-0 top-0 h-full w-1 ${section.bg.replace('/10', '')}`} />
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                                                <div className={`mt-1 rounded-xl p-3 ${section.bg} ${section.color}`}>
                                                    <section.icon className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <h3 className="text-xl font-bold font-display text-white">{section.title}</h3>
                                                    <p className="text-white/60 leading-relaxed">{section.description}</p>
                                                    <div className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-white/50">
                                                        <span className="mr-2 font-semibold text-white/80">Formula:</span>
                                                        {section.formula}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Data Sources callout */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-sm p-6">
                                    <h3 className="text-lg font-bold font-display text-cyan-400 mb-2">Where does the data come from?</h3>
                                    <p className="text-white/60 leading-relaxed">
                                        All data is entered by you — either through <strong className="text-white/80">manual entry</strong> or <strong className="text-white/80">CSV import</strong> from your bank.
                                        The app categorizes each transaction based on your own category rules. There is no external data source, no scraping, and no third-party bank connections.
                                        You own and control 100% of the data.
                                    </p>
                                </motion.div>
                            </motion.div>
                        </TabsContent>

                        {/* ─── TAB 2: Tech Stack ─── */}
                        <TabsContent value="tech" className="mt-8">
                            <motion.div
                                initial="hidden"
                                animate="show"
                                variants={staggerContainer}
                                className="space-y-8"
                            >
                                {/* Intro */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                                    <h2 className="text-lg font-bold font-display text-white mb-2">System Architecture</h2>
                                    <p className="text-white/60 leading-relaxed">
                                        A full-stack application with clear separation of concerns. The entire codebase is{' '}
                                        <a href="https://github.com/OndrejKutil/budgeting_dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
                                            open-source on GitHub
                                        </a>.
                                    </p>
                                </motion.div>

                                {/* Architecture Diagram */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 md:p-10">
                                    <div className="flex flex-col items-center gap-0">

                                        {/* User / Browser */}
                                        <div className="text-center mb-2">
                                            <span className="text-xs font-medium text-white/40 uppercase tracking-widest">User</span>
                                        </div>

                                        {/* Arrow down */}
                                        <ArrowDown className="h-5 w-5 text-white/20 my-1" />

                                        {/* Cloudflare */}
                                        {(() => {
                                            const node = systemNodes[0];
                                            return (
                                                <div className={`w-full max-w-md rounded-xl border ${node.border} ${node.bg} p-5 flex items-center gap-4 transition-all hover:bg-white/10`}>
                                                    <div className={`rounded-lg p-2.5 ${node.bg} ${node.color}`}>
                                                        <node.icon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold font-display text-white">{node.title}</h3>
                                                        <p className="text-sm text-white/50">{node.subtitle}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Arrow down */}
                                        <ArrowDown className="h-5 w-5 text-white/20 my-1" />

                                        {/* Render Row — Frontend + Backend side by side */}
                                        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                            <div className="text-center mb-4">
                                                <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Render — Hosting</span>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {systemNodes.slice(1, 3).map((node) => (
                                                    <div key={node.id} className={`rounded-xl border ${node.border} ${node.bg} p-5 flex items-center gap-4 transition-all hover:bg-white/10`}>
                                                        <div className={`rounded-lg p-2.5 ${node.bg} ${node.color}`}>
                                                            <node.icon className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold font-display text-white">{node.title.replace('Render — ', '')}</h3>
                                                            <p className="text-sm text-white/50">{node.subtitle}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Arrow down */}
                                        <ArrowDown className="h-5 w-5 text-white/20 my-1" />

                                        {/* Supabase */}
                                        {(() => {
                                            const node = systemNodes[3];
                                            return (
                                                <div className={`w-full max-w-md rounded-xl border ${node.border} ${node.bg} p-5 flex items-center gap-4 transition-all hover:bg-white/10`}>
                                                    <div className={`rounded-lg p-2.5 ${node.bg} ${node.color}`}>
                                                        <node.icon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold font-display text-white">{node.title}</h3>
                                                        <p className="text-sm text-white/50">{node.subtitle}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </motion.div>

                                {/* Security callout */}
                                {(() => {
                                    const node = systemNodes[4];
                                    return (
                                        <motion.div variants={fadeInUp} className={`rounded-xl border ${node.border} ${node.bg} backdrop-blur-sm p-6 flex items-start gap-4`}>
                                            <div className={`rounded-lg p-2.5 ${node.bg} ${node.color} mt-0.5`}>
                                                <node.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold font-display text-white mb-1">{node.title}</h3>
                                                <p className="text-sm text-white/50 leading-relaxed">{node.subtitle}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })()}
                            </motion.div>
                        </TabsContent>

                        {/* ─── TAB 3: AI & Integrations ─── */}
                        <TabsContent value="ai" className="mt-8">
                            <motion.div
                                initial="hidden"
                                animate="show"
                                variants={staggerContainer}
                                className="space-y-8"
                            >
                                {/* n8n Voice Input */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm p-8 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg p-2.5 bg-amber-500/10 text-amber-400">
                                            <Mic className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold font-display text-white">Voice Input via AI</h2>
                                    </div>
                                    <p className="text-white/60 leading-relaxed text-lg">
                                        Log expenses on the go by speaking naturally. A custom <strong className="text-white/80">n8n workflow</strong> captures your voice, sends it to an LLM for processing, and the AI creates the transaction entry for you — no typing required.
                                    </p>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        {[
                                            { icon: Mic, title: "Voice Capture", desc: "Speak naturally — \"I spent 15 euros on lunch\"" },
                                            { icon: Bot, title: "LLM Processing", desc: "AI extracts amount, category, and date from your words" },
                                            { icon: Workflow, title: "n8n Automation", desc: "The workflow orchestrates everything end-to-end" },
                                        ].map((step, i) => (
                                            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                                                <step.icon className="h-5 w-5 text-amber-400" />
                                                <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                                                <p className="text-xs text-white/50 leading-relaxed">{step.desc}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-base font-semibold text-white/80">Context-Aware</h3>
                                        <p className="text-white/50 text-sm leading-relaxed">
                                            The AI knows your personal categories, accounts, and spending patterns. It uses this context to accurately categorize new entries — so when you say "coffee", it knows which category and account to use based on your history.
                                        </p>
                                    </div>
                                </motion.div>

                                {/* CTA */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-cyan-500/10 p-8 text-center space-y-4">
                                    <h3 className="text-xl font-bold font-display text-white">Want this for your setup?</h3>
                                    <p className="text-white/60 max-w-lg mx-auto">
                                        The AI voice workflow is a custom n8n integration tailored to each user's categories and context. If you're interested in having something similar set up for you, get in touch.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-amber-400 hover:text-amber-300 transition-colors pt-2">
                                        <Mail className="h-5 w-5" />
                                        <a href="mailto:me@kutilondrej.com" className="font-medium hover:underline underline-offset-2">
                                            me@ondrejkutil.com
                                        </a>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </TabsContent>

                        {/* ─── TAB 4: Workflows ─── */}
                        <TabsContent value="workflows" className="mt-8">
                            <motion.div
                                initial="hidden"
                                animate="show"
                                variants={staggerContainer}
                                className="space-y-8"
                            >
                                {/* Intro */}
                                <motion.div variants={fadeInUp} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                                    <h2 className="text-lg font-bold font-display text-white mb-2">See It in Action</h2>
                                    <p className="text-white/60 leading-relaxed">
                                        Short visual guides showing the core workflows of the app. GIFs and recordings will be added here soon — placeholders are shown below.
                                    </p>
                                </motion.div>

                                {/* Workflow cards with GIF placeholders */}
                                <div className="grid gap-6">
                                    {workflows.map((wf, index) => (
                                        <motion.div
                                            key={index}
                                            variants={fadeInUp}
                                            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden transition-all hover:bg-white/10 hover:border-white/20"
                                        >
                                            <div className="grid md:grid-cols-[1fr_1.5fr] gap-0">
                                                {/* Text */}
                                                <div className="p-6 flex flex-col justify-center space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-400">
                                                            <wf.icon className="h-5 w-5" />
                                                        </div>
                                                        <h3 className="text-lg font-bold font-display text-white">{wf.title}</h3>
                                                    </div>
                                                    <p className="text-white/60 text-sm leading-relaxed">{wf.description}</p>
                                                </div>

                                                {/* GIF Placeholder */}
                                                {/* TODO: Replace this placeholder with <img src={wf.gifUrl} /> or a Video component once assets are ready */}
                                                <div className="border-t md:border-t-0 md:border-l border-white/10 bg-white/[0.02] min-h-[200px] flex flex-col items-center justify-center gap-3 p-6">
                                                    <div className="rounded-full bg-white/5 p-4 border border-dashed border-white/15">
                                                        <ImageIcon className="h-8 w-8 text-white/20" />
                                                    </div>
                                                    <p className="text-xs text-white/30 font-medium">GIF / Recording coming soon</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </main>
        </div>
    );
}
