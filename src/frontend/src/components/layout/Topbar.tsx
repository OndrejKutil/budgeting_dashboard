import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserNav } from './UserNav';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { isPathActive, primaryNavItems, RECURRING_PATH, type NavGroup } from './nav-config';
import { useDueRecurringCount, useVisibleNavGroups } from './use-nav';

const pillItemClass =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[0.4375rem] text-sm xl:px-3.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const pillItemActiveClass =
  'bg-foreground/10 text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.16)]';

function NavMenu({ group, dueCount }: { group: NavGroup; dueCount: number }) {
  const { pathname } = useLocation();
  const { t } = useUser();
  const active = group.items.some((item) => isPathActive(pathname, item.href));
  const showDot = group.id === 'plan' && dueCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(pillItemClass, 'data-[state=open]:text-foreground', active && pillItemActiveClass)}
        data-active={active || undefined}
      >
        {t(group.labelKey)}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        {showDot && <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="min-w-[14rem] text-sm"
      >
        {group.items.map((item) => {
          const itemActive = isPathActive(pathname, item.href);
          const showDue = item.href === RECURRING_PATH && dueCount > 0;
          return (
            <DropdownMenuItem
              key={item.href}
              asChild
              className={cn('cursor-pointer rounded-[0.6875rem] px-3 py-2.5 text-sm', itemActive && 'bg-foreground/10')}
            >
              <Link to={item.href} aria-current={itemActive ? 'page' : undefined} className="flex items-center justify-between gap-3">
                <span>{t(item.labelKey)}</span>
                {showDue && (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.625rem] font-semibold leading-none text-destructive-foreground"
                    aria-label={t('nav.recurringDue', { count: dueCount })}
                  >
                    {dueCount > 9 ? '9+' : dueCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const { t } = useUser();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const groups = useVisibleNavGroups();
  const dueCount = useDueRecurringCount();

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, [isRefreshing, queryClient]);

  return (
    <header className="safe-top sticky top-0 z-40 bg-gradient-to-b from-background from-60% to-transparent pb-3">
      {/* Full window width: brand at the left edge, actions at the right edge. The equal 1fr
          side columns keep the nav pill centred, in line with the centred content column. */}
      <div className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-4 pt-3 sm:px-5 lg:grid-cols-[1fr_auto_1fr] lg:px-8 lg:pt-5">
        <Link
          to="/dashboard"
          className="justify-self-start whitespace-nowrap rounded-md text-base font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('appName')}
        </Link>

        <nav aria-label={t('nav.mainNavigation')} className="glass hidden items-center gap-0.5 rounded-full p-[0.3125rem] lg:flex">
          {primaryNavItems.map((item) => {
            const active = isPathActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(pillItemClass, active && pillItemActiveClass)}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
          {groups.map((group) => (
            <NavMenu key={group.id} group={group} dueCount={dueCount} />
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1 lg:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePrivacyMode}
                className={cn(
                  'min-h-[2.75rem] min-w-[2.75rem] text-muted-foreground hover:text-foreground',
                  isPrivacyMode && 'bg-primary/10 text-primary hover:text-primary',
                )}
                aria-label={isPrivacyMode ? t('common.showSensitiveValues') : t('common.hideSensitiveValues')}
                aria-pressed={isPrivacyMode}
              >
                {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPrivacyMode ? t('common.showSensitiveValues') : t('common.hideSensitiveValues')}</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[2.75rem] min-w-[2.75rem] text-muted-foreground hover:text-foreground"
            aria-label={t('common.refreshData')}
          >
            <RefreshCw className={cn('h-4 w-4 transition-transform', isRefreshing && 'animate-spin')} />
          </Button>

          <UserNav />
        </div>
      </div>
    </header>
  );
}
