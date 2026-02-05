import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '@/lib/api/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase returns tokens in the URL hash: #access_token=...&refresh_token=...
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                // Also check for error in URL
                const errorParam = params.get('error');
                const errorDescription = params.get('error_description');

                if (errorParam) {
                    throw new Error(errorDescription || 'Authentication failed');
                }

                if (!accessToken || !refreshToken) {
                    throw new Error('No authentication tokens received');
                }

                // Decode the JWT to get the user ID
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
                const userId = payload.sub;

                // Store the tokens
                tokenManager.setTokens(accessToken, refreshToken, userId);

                setStatus('success');

                // Clear the URL hash for security
                window.history.replaceState(null, '', window.location.pathname);

                // Redirect to dashboard after a brief delay
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 1500);

            } catch (err: unknown) {
                console.error('OAuth callback error:', err);
                const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
                setError(errorMessage);
                setStatus('error');
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="mx-auto w-full max-w-md px-4">
                <div className="flex flex-col items-center gap-6 rounded-xl border border-border/50 bg-card/50 p-8 text-center backdrop-blur-lg">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <div>
                                <h2 className="text-xl font-semibold">Signing you in...</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Please wait while we complete your authentication.
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                                <CheckCircle className="h-8 w-8 text-success" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Welcome!</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Authentication successful. Redirecting to dashboard...
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Authentication Failed</h2>
                                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                            </div>
                            <Button onClick={() => navigate('/auth/login')} className="mt-4">
                                Back to Login
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
