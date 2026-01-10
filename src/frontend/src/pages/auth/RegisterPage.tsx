import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLongLoading, setIsLongLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    fullName?: string;
    password?: string;
    general?: string;
  }>({});

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setIsLongLoading(true), 3000);
    } else {
      setIsLongLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await register(email, password, fullName || undefined);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start your journey to better financial management"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errors.general}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name (optional)</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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

          {/* Password requirements */}
          <div className="mt-3 space-y-2">
            {passwordRequirements.map((req, i) => {
              const passed = req.test(password);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 text-xs transition-colors',
                    passed ? 'text-success' : 'text-muted-foreground'
                  )}
                >
                  {passed ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  {req.label}
                </div>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-blurple hover:opacity-90"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>

        {isLongLoading && (
          <p className="text-center text-xs text-muted-foreground animate-pulse">
            The server is waking up from its nap... 😴 <br />
            This might take a few seconds!
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link to="/terms" className="text-primary hover:underline">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
