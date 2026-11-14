import { useQuery } from '@tanstack/react-query';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { accountsApi, categoriesApi } from '@/lib/api/endpoints';
import type { RecurringNotification } from '@/lib/api/types';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { useRecurringNotifications } from '@/hooks/use-recurring-notifications';

interface AutoPostedListProps {
  /** Called after an action that leaves the current view (Edit navigates away). */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Transactions the daily job posted from auto_post templates, each with Edit / Delete / Dismiss.
 * Shared by the top-bar bell and the Recurring page; renders nothing when there are none.
 */
export function AutoPostedList({ onNavigate, className }: AutoPostedListProps) {
  const { t, formatDate, currency: userCurrency } = useUser();
  const { notifications, dismiss, remove, edit } = useRecurringNotifications();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await accountsApi.getAll()).data || [],
    enabled: notifications.length > 0,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.getAll()).data || [],
    enabled: notifications.length > 0,
  });

  if (notifications.length === 0) return null;

  const renderItem = (n: RecurringNotification) => {
    const tx = n.transaction;
    const account = accounts.find((a) => a.accounts_id_pk === tx.account_id_fk);
    const category = categories.find((c) => c.categories_id_pk === tx.category_id_fk)?.category_name;
    const title = tx.notes || category || '—';
    const details = [
      tx.notes ? category : null,
      account?.account_name,
      formatDate(new Date(`${tx.date}T12:00:00`), { day: 'numeric', month: 'short' }),
    ].filter(Boolean).join(' · ');
    const amount = Number(tx.amount);

    return (
      <li key={n.posting_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.9375rem]">{title}</div>
          <div className="truncate text-[0.8125rem] text-muted-foreground">{details}</div>
        </div>
        <div className={cn('whitespace-nowrap tabular-nums', amount > 0 && 'text-success')}>
          <SensitiveValue>{`${amount > 0 ? '+' : ''}${formatMoney(amount, account?.currency || userCurrency)}`}</SensitiveValue>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => { edit(n); onNavigate?.(); }}
            aria-label={`${t('common.edit')}: ${title}`}
            title={t('common.edit')}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => remove(n)}
            aria-label={`${t('common.delete')}: ${title}`}
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => dismiss(n.posting_id)}
            aria-label={`${t('pages.recurring.notifications.keep')}: ${title}`}
            title={t('pages.recurring.notifications.keep')}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </li>
    );
  };

  return <ul className={className}>{notifications.map(renderItem)}</ul>;
}
