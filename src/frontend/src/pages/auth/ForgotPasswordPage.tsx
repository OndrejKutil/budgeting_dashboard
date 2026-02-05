import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; general?: string }>({});

    const validate = () => {
        const newErrors: typeof errors = {};
        if (!email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setErrors({});

        try {
            await authApi.forgotPassword(email);
            setIsSubmitted(true);
        } catch (error) {
            // Still show success to prevent email enumeration
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <AuthLayout
                title="Check your email"
                subtitle="We've sent you a password reset link"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <CheckCircle className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                If an account exists for <span className="font-medium text-foreground">{email}</span>,
                                you will receive a password reset link shortly.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                The link will expire in 1 hour.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsSubmitted(false)}
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Try a different email
                        </Button>

                        <Link
                            to="/auth/login"
                            className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Forgot password?"
            subtitle="Enter your email address and we'll send you a reset link"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {errors.general}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
                        disabled={isLoading}
                    />
                    {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending reset link...
                        </>
                    ) : (
                        'Send reset link'
                    )}
                </Button>

                <Link
                    to="/auth/login"
                    className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                </Link>
            </form>
        </AuthLayout>
    );
}
