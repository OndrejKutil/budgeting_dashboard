import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/contexts/user-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Calendar, LogOut, Loader2, Globe, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

const CURRENCIES = ['CZK', 'USD', 'EUR', 'GBP'];

export default function ProfilePage() {
  const { logout, userId } = useAuth();
  const { profile, currency, updateProfile, isLoading } = useUser();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setIsUpdating(true);
    try {
      await updateProfile({ currency: newCurrency });
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = () => {
    if (!profile) return 'U';
    const fullName = profile.user_metadata?.full_name;
    if (fullName) {
      return fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.email ? profile.email[0].toUpperCase() : 'U';
  };

  const getDisplayName = () => {
    if (!profile) return 'User';
    return profile.user_metadata?.full_name || profile.email?.split('@')[0] || 'User';
  };

  const getMemberSince = () => {
    if (!profile?.created_at) return new Date().getFullYear();
    return new Date(profile.created_at).getFullYear();
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader title="Profile" description="Manage your identity and preferences" />

      {/* Identity Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center md:items-start gap-8 p-8 rounded-2xl border border-border bg-card shadow-sm"
      >
        <Avatar className="h-24 w-24 border-4 border-background shadow-sm ring-1 ring-border">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-bold text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight font-display">{getDisplayName()}</h2>
            <p className="text-muted-foreground">{profile?.email}</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
            <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Member since {getMemberSince()}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Account Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <CreditCard className="h-5 w-5 text-primary" />
                Account Details
              </CardTitle>
              <CardDescription>Your personal account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="font-medium text-foreground">{getDisplayName()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <span className="font-medium text-foreground">{profile?.email}</span>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System ID</label>
                <div className="font-mono text-xs text-muted-foreground break-all bg-muted p-2 rounded border border-border/50 select-all">
                  {profile?.id}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Globe className="h-5 w-5 text-primary" />
                Preferences
              </CardTitle>
              <CardDescription>Customize your dashboard experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-primary">Default Currency</label>
                  <p className="text-xs text-muted-foreground">
                    This currency will be used for all aggregations and totals across your dashboard.
                  </p>
                </div>

                <Select
                  value={currency}
                  onValueChange={handleCurrencyChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full bg-background border-primary/20 ring-offset-primary/10 focus:ring-primary/30 h-11">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="font-medium">{c}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border p-5 space-y-4 opacity-70 pointer-events-none grayscale">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dark Mode</span>
                  <div className="h-5 w-9 rounded-full bg-primary/20" />
                </div>
                <p className="text-xs text-muted-foreground">Theme settings coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
