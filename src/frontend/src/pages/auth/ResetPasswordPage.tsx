import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/client';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; general?: string }>({});

    const navigate = useNavigate();

    // Extract access token from URL hash on mount
    useEffect(() => {
        // Supabase sends tokens in the URL hash: #access_token=...&refresh_token=...&type=recovery
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const token = params.get('access_token');
        const type = params.get('type');

        if (token && type === 'recovery') {
            setAccessToken(token);
        } else if (!token) {
            setErrors({ general: 'Invalid or missing reset link. Please request a new password reset.' });
        }
    }, []);

    const validate = () => {
        const newErrors: typeof errors = {};

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !accessToken) return;

        setIsLoading(true);
        setErrors({});

        try {
            await authApi.resetPassword(accessToken, password);
            setIsSuccess(true);

            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname);
        } catch (error: unknown) {
            let message = 'Failed to reset password. The link may have expired.';
            if (error instanceof Error) {
                message = error.message;
            } else if (typeof error === 'object' && error !== null && 'message' in error) {
                message = String((error as { message: unknown }).message);
            }

            setErrors({
                general: message
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <AuthLayout
                title="Password reset successful"
                subtitle="Your password has been updated"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                            <CheckCircle className="h-8 w-8 text-success" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            You can now log in with your new password.
                        </p>
                    </div>

                    <Button
                        className="w-full"
                        onClick={() => navigate('/auth/login')}
                    >
                        Go to login
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    if (!accessToken && errors.general) {
        return (
            <AuthLayout
                title="Invalid reset link"
                subtitle="This password reset link is invalid or has expired"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Please request a new password reset link.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            className="w-full"
                            onClick={() => navigate('/auth/forgot-password')}
                        >
                            Request new reset link
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
            title="Reset your password"
            subtitle="Enter your new password below"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {errors.general}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={cn(
                                'pr-10',
                                errors.password && 'border-destructive focus-visible:ring-destructive'
                            )}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={cn(
                                'pr-10',
                                errors.confirmPassword && 'border-destructive focus-visible:ring-destructive'
                            )}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-xs text-destructive">{errors.confirmPassword}</p>
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
                            Resetting password...
                        </>
                    ) : (
                        'Reset password'
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
