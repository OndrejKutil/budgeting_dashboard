import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Github,
    Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
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

            <main className="relative z-10 container mx-auto max-w-5xl px-4 pb-24 pt-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-14"
                >
                    <section className="space-y-5">
                        <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber-500">
                            About
                        </p>
                        <h1 className="text-4xl font-display tracking-tight theme-text-strong sm:text-5xl">
                            About Budgeting Dashboard
                        </h1>
                        <p className="max-w-2xl text-lg leading-relaxed theme-text-muted-60">
                            Budgeting Dashboard is a personal finance analytics project built by Ondřej Kutil.
                            It turns income, expenses, savings, investments, and cash flow into a clear monthly
                            picture without hiding the logic behind the numbers.
                        </p>
                    </section>

                    <section className="grid gap-12 border-t theme-border-subtle pt-12 lg:grid-cols-2">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-display tracking-tight theme-text-strong">Why it exists</h2>
                            <p className="text-base leading-relaxed theme-text-muted-60">
                                Many budgeting apps never worked the way I wanted. I wanted clearer control over the
                                calculations, the freedom to shape the workflow around my own habits, and the security
                                of understanding exactly how my data is stored and used.
                            </p>
                            <p className="text-base leading-relaxed theme-text-muted-60">
                                The app keeps income, expenses, transfers, savings, investments, and liquid cash flow
                                separate so the monthly result is easier to understand and trust.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-2xl font-display tracking-tight theme-text-strong">Project status</h2>
                            <p className="text-base leading-relaxed theme-text-muted-60">
                                This is a free personal project. It is functional, but it should be treated as an
                                actively developed application rather than commercial finance software.
                            </p>
                        </div>
                    </section>

                    <section className="flex flex-col gap-4 border-t theme-border-subtle pt-10 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                            <Link to="/how-it-works" className="text-amber-500 transition-colors hover:text-amber-400 hover:underline">
                                How it works
                            </Link>
                            <a href="https://github.com/OndrejKutil" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-amber-500 transition-colors hover:text-amber-400 hover:underline">
                                <Github className="h-4 w-4" />
                                GitHub
                            </a>
                        </div>
                        <a href="mailto:me@ondrejkutil.com" className="inline-flex items-center gap-2 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400 hover:underline">
                            <Mail className="h-4 w-4" />
                            me@ondrejkutil.com
                        </a>
                    </section>
                </motion.div>
            </main>
        </div>
    );
}
