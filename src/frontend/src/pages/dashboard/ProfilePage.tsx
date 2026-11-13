import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Download, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/contexts/user-context';
import { getErrorMessage, tokenManager } from '@/lib/api/client';
import { authApi, exportApi, profileApi } from '@/lib/api/endpoints';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { LOCALE_LABELS, LOCALES, type AppLocale } from '@/lib/i18n';
import { getProfileAvatarUrl } from '@/lib/user-avatar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

const OAUTH_REDIRECT_TARGET_KEY = 'oauth_redirect_target';

/** A settings section: heading over a strong hairline, then its rows. */
function Section({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description: string;
  tone?: 'danger';
  children: ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="border-b border-foreground/30 pb-3">
        <h2 className={cn('text-[1.125rem] font-medium tracking-[-0.01em]', tone === 'danger' && 'text-destructive')}>
          {title}
        </h2>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** One setting: label (and an optional hint) on the left, its value or control on the right. */
function Row({
  label,
  hint,
  icon,
  children,
  muted,
}: {
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8',
        muted && 'opacity-60',
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[0.9375rem]">{label}</div>
          {hint && <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children !== undefined && <div className="min-w-0 shrink-0 sm:max-w-[60%] sm:text-right">{children}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const { logout, clearLocalSession } = useAuth();
  const { profile, currency, locale, updateProfile, refreshProfile, isLoading, t } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isGitHubLinking, setIsGitHubLinking] = useState(false);
  const [isGoogleLinking, setIsGoogleLinking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [themeMounted, setThemeMounted] = useState(false);

  // Accounts created through GitHub/Google have no password, so they cannot re-authenticate with
  // one; they confirm deletion by typing their email instead. Mirrors the backend's own check.
  const usesPasswordAuth = profile?.identities?.some((identity) => identity.provider === 'email') ?? false;

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // updateProfile shows its own success and failure toasts and then rethrows; the rethrow is
  // only swallowed here so it does not surface as an unhandled rejection.
  const savePreference = async (data: { currency?: string; locale?: AppLocale }) => {
    setIsUpdating(true);
    try {
      await updateProfile(data);
    } catch {
      /* already reported by updateProfile */
    } finally {
      setIsUpdating(false);
    }
  };

  const startLink = async (provider: 'github' | 'google') => {
    const setLinking = provider === 'github' ? setIsGitHubLinking : setIsGoogleLinking;
    setLinking(true);
    try {
      const accessToken = tokenManager.getAccessToken();
      if (!accessToken) throw new Error('Not authenticated');
      const response = provider === 'github' ? await authApi.linkGitHub(accessToken) : await authApi.linkGoogle(accessToken);
      sessionStorage.setItem(OAUTH_REDIRECT_TARGET_KEY, `/dashboard/profile?linked=${provider}`);
      window.location.href = response.url;
    } catch (error) {
      console.error(`Failed to link ${provider}:`, error);
      toast({
        title: t('profile.linkingFailed'),
        description: t(provider === 'github' ? 'profile.githubLinkingFailedDescription' : 'profile.googleLinkingFailedDescription'),
        variant: 'destructive',
      });
      setLinking(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportApi.downloadTransactionsCSV();
      toast({ title: t('profile.exportComplete'), description: t('profile.exportCompleteDescription') });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: t('profile.exportFailed'), description: t('profile.exportFailedDescription'), variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await profileApi.deleteAccount(
        usesPasswordAuth ? { password: deleteConfirmation } : { email_confirmation: deleteConfirmation },
      );
      toast({ title: t('profile.deleteAccountComplete'), description: t('profile.deleteAccountCompleteDescription') });
      // The account no longer exists, so there is no session left to revoke server-side —
      // just drop the local one.
      clearLocalSession();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Account deletion failed:', error);
      // A rejected password or mismatched email comes back as 400/401 with a usable message.
      toast({
        title: t('profile.deleteAccountFailed'),
        description: getErrorMessage(error, t('profile.deleteAccountFailedDescription')),
        variant: 'destructive',
      });
      setDeleteConfirmation('');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setIsRetrying(false);
    }
  };

  const hasProvider = (provider: string) => profile?.identities?.some((identity) => identity.provider === provider) ?? false;
  const avatarUrl = getProfileAvatarUrl(profile);
  const fullName: string = profile?.user_metadata?.full_name || '';
  const displayName = fullName || profile?.email?.split('@')[0] || t('common.user');
  const initials = fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? 'U';
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

  const title = (
    <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">{t('profile.title')}</h1>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl" aria-busy="true">
        {title}
        <div className="mt-10 flex items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        {[0, 1, 2].map((section) => (
          <div key={section} className="mt-14 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl">
        {title}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <p className="font-medium">{t('profile.loadFailed')}</p>
          <Button variant="outline" onClick={() => void handleRetry()} disabled={isRetrying}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const connected = (
    <span className="inline-flex items-center gap-1.5 text-sm text-success">
      <Check className="h-4 w-4" aria-hidden="true" />
      {t('common.connected')}
    </span>
  );

  const themeOptions = [
    { value: 'dark', label: t('profile.themeDark'), aria: t('profile.useDarkTheme'), active: resolvedTheme !== 'light' },
    { value: 'light', label: t('profile.themeLight'), aria: t('profile.useLightTheme'), active: resolvedTheme === 'light' },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {title}

      {/* Identity */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />
            <AvatarFallback className="bg-primary/15 text-xl font-medium text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[1.5rem] font-medium tracking-[-0.02em]">{displayName}</p>
            <p className="truncate text-[0.875rem] text-muted-foreground">
              {profile.email}
              <span aria-hidden="true"> · </span>
              {t('profile.memberSince', { year: memberSince })}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void handleLogout()} className="h-11 px-4">
          <LogOut aria-hidden="true" />
          {t('profile.signOut')}
        </Button>
      </div>

      <Section title={t('profile.accountDetails')} description={t('profile.accountDetailsDescription')}>
        <Row label={t('profile.fullName')}>
          <span className="block truncate text-[0.9375rem]">{displayName}</span>
        </Row>
        <Row label={t('profile.emailAddress')}>
          <span className="block truncate text-[0.9375rem]">{profile.email}</span>
        </Row>
        <Row label={t('profile.systemId')}>
          <span className="block select-all break-all font-mono text-xs text-muted-foreground">{profile.id}</span>
        </Row>
      </Section>

      <Section title={t('profile.preferences')} description={t('profile.preferencesDescription')}>
        <Row label={t('profile.defaultCurrency')} hint={t('profile.defaultCurrencyDescription')}>
          <Select value={currency} onValueChange={(value) => void savePreference({ currency: value })} disabled={isUpdating}>
            <SelectTrigger aria-label={t('profile.defaultCurrency')} className="w-full sm:w-[10rem]">
              <SelectValue placeholder={t('profile.selectCurrency')} />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label={t('profile.language')} hint={t('profile.languageDescription')}>
          <Select
            value={locale}
            onValueChange={(value) => void savePreference({ locale: value as AppLocale })}
            disabled={isUpdating}
          >
            <SelectTrigger aria-label={t('profile.language')} className="w-full sm:w-[10rem]">
              <SelectValue placeholder={t('profile.selectLanguage')} />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((option) => (
                <SelectItem key={option} value={option}>
                  {LOCALE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label={t('profile.theme')} hint={t('profile.themeDescription')}>
          <div role="group" aria-label={t('profile.theme')} className="flex gap-5 text-[0.9375rem]">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.aria}
                aria-pressed={option.active}
                disabled={!themeMounted}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'rounded-sm py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  option.active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className={cn('border-b-2 pb-[0.1875rem]', option.active ? 'border-primary' : 'border-transparent')}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title={t('profile.connectedAccounts')} description={t('profile.connectedAccountsDescription')}>
        <Row
          icon={<GitHubIcon className="h-5 w-5" />}
          label="GitHub"
          hint={hasProvider('github') ? t('profile.githubConnected') : t('profile.githubNotConnected')}
        >
          {hasProvider('github') ? (
            connected
          ) : (
            <Button variant="outline" onClick={() => void startLink('github')} disabled={isGitHubLinking} className="h-9 px-4">
              {isGitHubLinking && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t('common.connect')}
            </Button>
          )}
        </Row>
        <Row
          icon={<GoogleIcon className="h-5 w-5" />}
          label="Google"
          hint={hasProvider('google') ? t('profile.googleConnected') : t('profile.googleNotConnected')}
        >
          {hasProvider('google') ? (
            connected
          ) : (
            <Button variant="outline" onClick={() => void startLink('google')} disabled={isGoogleLinking} className="h-9 px-4">
              {isGoogleLinking && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t('common.connect')}
            </Button>
          )}
        </Row>
      </Section>

      <Section title={t('profile.dataManagement')} description={t('profile.dataManagementDescription')}>
        <Row label={t('profile.exportTransactions')} hint={t('profile.exportDescription')}>
          <Button variant="outline" onClick={() => void handleExport()} disabled={isExporting} className="h-10 px-4">
            {isExporting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            {isExporting ? t('profile.exporting') : t('profile.exportCsv')}
          </Button>
        </Row>
        <Row label={t('profile.importTransactions')} hint={t('profile.importDescription')} muted>
          <span className="text-[0.8125rem] text-muted-foreground">{t('common.comingSoon')}</span>
        </Row>
      </Section>

      <Section title={t('profile.deleteAccount')} description={t('profile.deleteAccountDescription')} tone="danger">
        <Row label={t('profile.deleteAccount')} hint={t('profile.deleteAccountHint')}>
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) setDeleteConfirmation('');
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 border-destructive/40 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {t('profile.deleteAccount')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('profile.deleteAccountTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('profile.deleteAccountDescription')}</AlertDialogDescription>
              </AlertDialogHeader>

              {/* Deletion is irreversible, so it requires proof of identity. OAuth-only
                  accounts have no password and confirm with their email address instead. */}
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (deleteConfirmation.trim() && !isDeletingAccount) void handleDeleteAccount();
                }}
              >
                <Field
                  htmlFor="delete-confirmation"
                  label={usesPasswordAuth ? t('profile.deleteAccountPasswordLabel') : t('profile.deleteAccountEmailLabel')}
                >
                  <Input
                    id="delete-confirmation"
                    type={usesPasswordAuth ? 'password' : 'email'}
                    autoComplete={usesPasswordAuth ? 'current-password' : 'off'}
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={usesPasswordAuth ? undefined : profile.email ?? undefined}
                    disabled={isDeletingAccount}
                    aria-describedby="delete-confirmation-hint"
                  />
                </Field>
                <p id="delete-confirmation-hint" className="mt-1.5 text-[0.8125rem] text-muted-foreground">
                  {usesPasswordAuth ? t('profile.deleteAccountPasswordHint') : t('profile.deleteAccountEmailHint')}
                </p>
              </form>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingAccount}>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDeleteAccount();
                  }}
                  disabled={isDeletingAccount || deleteConfirmation.trim().length === 0}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingAccount && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {isDeletingAccount ? t('profile.deletingAccount') : t('profile.deleteAccountConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </Section>
    </div>
  );
}
