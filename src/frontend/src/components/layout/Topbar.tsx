import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { MobileSidebarTrigger } from './AppSidebar';
import { UserNav } from './UserNav';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopbarProps {
  onMobileMenuClick: () => void;
}

function getGreetingKey(): 'topbar.goodMorning' | 'topbar.goodAfternoon' | 'topbar.goodEvening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'topbar.goodMorning';
  if (hour < 18) return 'topbar.goodAfternoon';
  return 'topbar.goodEvening';
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const queryClient = useQueryClient();
  const { profile, t } = useUser();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, [isRefreshing, queryClient]);

  const firstName = profile?.user_metadata?.full_name?.split(' ')[0]
    || profile?.email?.split('@')[0]
    || null;

  return (
    <header className="safe-top sticky top-0 z-30 flex h-16 box-content items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        <MobileSidebarTrigger onClick={onMobileMenuClick} />
        {firstName && (
          <span className="hidden lg:block text-sm text-muted-foreground">
            {t(getGreetingKey())},{' '}
            <span className="font-semibold text-foreground">{firstName}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePrivacyMode}
              className={cn(
                "min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground",
                isPrivacyMode && "bg-primary/10 text-primary hover:text-primary"
              )}
              aria-label={isPrivacyMode ? t('common.showSensitiveValues') : t('common.hideSensitiveValues')}
              aria-pressed={isPrivacyMode}
            >
              {isPrivacyMode ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPrivacyMode ? t('common.showSensitiveValues') : t('common.hideSensitiveValues')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Mobile refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="lg:hidden min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
          aria-label={t('common.refreshData')}
        >
          <RefreshCw className={cn(
            "h-4 w-4 transition-transform",
            isRefreshing && "animate-spin"
          )} />
        </Button>

        {/* User menu */}
        <UserNav />
      </div>
    </header>
  );
}

