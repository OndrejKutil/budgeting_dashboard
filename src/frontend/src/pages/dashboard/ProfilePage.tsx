import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Calendar, Shield, LogOut, Loader2, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

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

    // Try to get initials from full name
    const fullName = profile.user_metadata?.full_name;
    if (fullName) {
      return fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    // Fallback to email
    if (profile.email) {
      return profile.email[0].toUpperCase();
    }

    return 'U';
  };

  const getDisplayName = () => {
    if (!profile) return 'User';
    return profile.user_metadata?.full_name || profile.email?.split('@')[0] || 'User';
  };

  const getMemberSince = () => {
    if (!profile?.created_at) return 'Recently';
    return formatDate(profile.created_at);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your account settings" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-gradient-blurple text-2xl font-bold text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold font-display">{getDisplayName()}</h2>
            <p className="text-sm text-muted-foreground">Personal Account</p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium">{profile?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{profile?.id || userId || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{getMemberSince()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Preferred Currency</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select your default currency for all financial data
                  </p>
                  <Select
                    value={currency}
                    onValueChange={handleCurrencyChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-full max-w-[200px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
