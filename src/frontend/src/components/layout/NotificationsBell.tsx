import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AutoPostedList } from '@/components/recurring/AutoPostedList';
import { useRecurringNotifications } from '@/hooks/use-recurring-notifications';
import { useUser } from '@/contexts/user-context';
import { RECURRING_PATH } from './nav-config';

/**
 * Top-bar bell for transactions the daily job auto-posted from recurring templates. Hidden
 * entirely while there is nothing to review, so it never becomes permanent chrome.
 */
export function NotificationsBell() {
  const { t } = useUser();
  const [open, setOpen] = useState(false);
  const { notifications, dismissAll } = useRecurringNotifications();
  const count = notifications.length;

  if (count === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative min-h-[2.75rem] min-w-[2.75rem] text-muted-foreground hover:text-foreground"
          aria-label={t('pages.recurring.notifications.bellLabel', { count })}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-none text-primary-foreground"
          >
            {count > 9 ? '9+' : count}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-[0.9375rem] font-medium">{t('pages.recurring.notifications.title')}</h2>
          <button
            type="button"
            onClick={() => { dismissAll(); setOpen(false); }}
            className="text-[0.8125rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('pages.recurring.notifications.keepAll')}
          </button>
        </div>
        <p className="px-4 pt-3 text-[0.8125rem] text-muted-foreground">{t('pages.recurring.notifications.description')}</p>
        <AutoPostedList onNavigate={() => setOpen(false)} className="max-h-[22rem] overflow-y-auto px-4" />
        <div className="border-t border-border px-4 py-2.5">
          <Link
            to={RECURRING_PATH}
            onClick={() => setOpen(false)}
            className="text-[0.8125rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('pages.recurring.notifications.manage')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
