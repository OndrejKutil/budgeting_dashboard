import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/contexts/user-context';
import { tokenManager } from '@/lib/api/client';
import { authApi, exportApi } from '@/lib/api/endpoints';
import { LOCALE_LABELS, LOCALES } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Calendar, LogOut, Loader2, Globe, CreditCard, Link as LinkIcon, Check, Download, Upload, Database, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// GitHub icon component
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const CURRENCIES = ['CZK', 'USD', 'EUR', 'GBP'];
const OAUTH_REDIRECT_TARGET_KEY = 'oauth_redirect_target';

export default function ProfilePage() {
  const { logout, userId } = useAuth();
  const { profile, currency, locale, updateProfile, isLoading, t } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGitHubLinking, setIsGitHubLinking] = useState(false);
  const [isGoogleLinking, setIsGoogleLinking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

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

  const handleLocaleChange = async (newLocale: AppLocale) => {
    setIsUpdating(true);
    try {
      await updateProfile({ locale: newLocale });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLinkGitHub = async () => {
    setIsGitHubLinking(true);
    try {
      const accessToken = tokenManager.getAccessToken();
      if (!accessToken) throw new Error('Not authenticated');

      const response = await authApi.linkGitHub(accessToken);
      // Redirect to GitHub OAuth
      sessionStorage.setItem(OAUTH_REDIRECT_TARGET_KEY, '/dashboard/profile?linked=github');
      window.location.href = response.url;
    } catch (error) {
      console.error('Failed to link GitHub:', error);
      toast({
        title: t('profile.linkingFailed'),
        description: t('profile.githubLinkingFailedDescription'),
        variant: 'destructive',
      });
      setIsGitHubLinking(false);
    }
  };

  const handleLinkGoogle = async () => {
    setIsGoogleLinking(true);
    try {
      const accessToken = tokenManager.getAccessToken();
      if (!accessToken) throw new Error('Not authenticated');

      const response = await authApi.linkGoogle(accessToken);
      sessionStorage.setItem(OAUTH_REDIRECT_TARGET_KEY, '/dashboard/profile?linked=google');
      window.location.href = response.url;
    } catch (error) {
      console.error('Failed to link Google:', error);
      toast({
        title: t('profile.linkingFailed'),
        description: t('profile.googleLinkingFailedDescription'),
        variant: 'destructive',
      });
      setIsGoogleLinking(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportApi.downloadTransactionsCSV();
      toast({
        title: t('profile.exportComplete'),
        description: t('profile.exportCompleteDescription'),
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: t('profile.exportFailed'),
        description: t('profile.exportFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isGitHubConnected = profile?.identities?.some(
    (identity) => identity.provider === 'github'
  );
  const isGoogleConnected = profile?.identities?.some(
    (identity) => identity.provider === 'google'
  );

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
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-12 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <Avatar className="h-24 w-24 border-2 border-background shadow-sm ring-1 ring-border">
              <AvatarImage src={profile?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-bold text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 mt-3 sm:mt-2">
              <h2 className="text-3xl font-bold tracking-tight font-display">{getDisplayName()}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="mt-4 inline-flex items-center rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                {t('profile.memberSince', { year: getMemberSince() })}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('profile.signOut')}
          </Button>
        </div>

        <div className="space-y-12 pt-4">
          {/* Account Details Section */}
          <section className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <h3 className="text-lg font-semibold font-display tracking-tight flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {t('profile.accountDetails')}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t('profile.accountDetailsDescription')}
              </p>
            </div>
            
            <div className="md:col-span-2 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('profile.fullName')}</label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
                  <span className="font-medium text-foreground">{getDisplayName()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('profile.emailAddress')}</label>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
                  <span className="font-medium text-foreground">{profile?.email}</span>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t('profile.systemId')}</label>
                <div className="font-mono text-xs text-muted-foreground break-all bg-muted/50 p-3 rounded-lg border border-border/50 select-all shadow-inner">
                  {profile?.id}
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" />

          {/* Preferences Section */}
          <section className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <h3 className="text-lg font-semibold font-display tracking-tight flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('profile.preferences')}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t('profile.preferencesDescription')}
              </p>
            </div>
            
            <div className="md:col-span-2 space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('profile.defaultCurrency')}</label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('profile.defaultCurrencyDescription')}
                </p>
                <Select
                  value={currency}
                  onValueChange={handleCurrencyChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full bg-card border-border h-12 rounded-lg shadow-sm">
                    <SelectValue placeholder={t('profile.selectCurrency')} />
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

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-foreground">{t('profile.language')}</label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('profile.languageDescription')}
                </p>
                <Select
                  value={locale}
                  onValueChange={(value) => handleLocaleChange(value as AppLocale)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full bg-card border-border h-12 rounded-lg shadow-sm">
                    <SelectValue placeholder={t('profile.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((localeOption) => (
                      <SelectItem key={localeOption} value={localeOption}>
                        <span className="font-medium">{LOCALE_LABELS[localeOption]}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-foreground">{t('profile.theme')}</label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('profile.themeDescription')}
                </p>
                <div className="grid w-28 grid-cols-2 rounded-lg border border-border bg-muted/50 p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    disabled={!themeMounted}
                    aria-label={t('profile.useDarkTheme')}
                    className={`flex h-9 items-center justify-center rounded-md transition-colors ${
                      resolvedTheme !== 'light'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    disabled={!themeMounted}
                    aria-label={t('profile.useLightTheme')}
                    className={`flex h-9 items-center justify-center rounded-md transition-colors ${
                      resolvedTheme === 'light'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" />

          {/* Connected Accounts */}
          <section className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <h3 className="text-lg font-semibold font-display tracking-tight flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                {t('profile.connectedAccounts')}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t('profile.connectedAccountsDescription')}
              </p>
            </div>
            
            <div className="md:col-span-2 max-w-md space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border shadow-sm">
                    <GitHubIcon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium leading-none text-foreground text-base">GitHub</p>
                    <p className="text-xs text-muted-foreground">
                      {isGitHubConnected ? t('profile.githubConnected') : t('profile.githubNotConnected')}
                    </p>
                  </div>
                </div>
                {isGitHubConnected ? (
                  <div className="flex items-center text-success text-sm font-medium bg-success/10 px-3 py-1.5 rounded-full">
                    <Check className="mr-1.5 h-4 w-4" />
                    {t('common.connected')}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleLinkGitHub}
                    disabled={isGitHubLinking}
                    className="h-9 px-4"
                  >
                    {isGitHubLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('common.connect')}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border shadow-sm">
                    <GoogleIcon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium leading-none text-foreground text-base">Google</p>
                    <p className="text-xs text-muted-foreground">
                      {isGoogleConnected ? t('profile.googleConnected') : t('profile.googleNotConnected')}
                    </p>
                  </div>
                </div>
                {isGoogleConnected ? (
                  <div className="flex items-center text-success text-sm font-medium bg-success/10 px-3 py-1.5 rounded-full">
                    <Check className="mr-1.5 h-4 w-4" />
                    {t('common.connected')}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleLinkGoogle}
                    disabled={isGoogleLinking}
                    className="h-9 px-4"
                  >
                    {isGoogleLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('common.connect')}
                  </Button>
                )}
              </div>
            </div>
          </section>

          <div className="h-px bg-border/50" />

          {/* Data Management */}
          <section className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <h3 className="text-lg font-semibold font-display tracking-tight flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                {t('profile.dataManagement')}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t('profile.dataManagementDescription')}
              </p>
            </div>
            
            <div className="md:col-span-2 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">
                <div className="space-y-2">
                  <h4 className="text-base font-medium text-foreground">{t('profile.exportTransactions')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.exportDescription')}
                  </p>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  variant="outline"
                  className="w-full bg-background h-10"
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isExporting ? t('profile.exporting') : t('profile.exportCsv')}
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm opacity-50">
                <div className="space-y-2">
                  <h4 className="text-base font-medium text-foreground">{t('profile.importTransactions')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.importDescription')}
                  </p>
                </div>
                <Button disabled variant="outline" className="w-full bg-background h-10">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('common.comingSoon')}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
