import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recurringApi, transactionsApi } from '@/lib/api/endpoints';
import type { RecurringNotification } from '@/lib/api/types';
import { getErrorMessage } from '@/lib/api/client';
import { invalidateTransactionData } from '@/lib/query-invalidation';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { TRANSACTIONS_PATH } from '@/components/layout/nav-config';

export const RECURRING_NOTIFICATIONS_KEY = ['recurring-notifications'] as const;

/** Location state that asks TransactionsPage to open its edit dialog on a given transaction. */
export interface OpenEditState {
  editTransaction?: RecurringNotification['transaction'];
  /** Dismiss this auto-post notification once the edit is saved. */
  ackPostingId?: string;
}

/**
 * The auto-post notification feed (transactions the daily job posted from auto_post templates)
 * plus its three actions: edit (opens the normal transaction dialog), delete (removes the
 * transaction, which cascades the notification away) and dismiss (keep it as posted).
 * Unhandled notifications expire on the backend after 7 days.
 */
export function useRecurringNotifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useUser();

  const query = useQuery({
    queryKey: RECURRING_NOTIFICATIONS_KEY,
    queryFn: async () => (await recurringApi.getNotifications()).data,
    staleTime: 5 * 60 * 1000,
  });

  const removeFromCache = (postingId: string) =>
    queryClient.setQueryData<RecurringNotification[]>(RECURRING_NOTIFICATIONS_KEY, (prev) =>
      prev?.filter((n) => n.posting_id !== postingId),
    );

  const onError = (fallback: string) => (err: unknown) => {
    queryClient.invalidateQueries({ queryKey: RECURRING_NOTIFICATIONS_KEY });
    toast({ title: t('common.error'), description: getErrorMessage(err, fallback), variant: 'destructive' });
  };

  const dismiss = useMutation({
    mutationFn: (postingId: string) => recurringApi.ackNotification(postingId),
    onMutate: removeFromCache,
    onError: onError(t('pages.recurring.notifications.dismissFailed')),
  });

  const dismissAll = useMutation({
    mutationFn: () => recurringApi.ackAllNotifications(),
    onMutate: () => queryClient.setQueryData<RecurringNotification[]>(RECURRING_NOTIFICATIONS_KEY, []),
    onError: onError(t('pages.recurring.notifications.dismissFailed')),
  });

  const remove = useMutation({
    mutationFn: (n: RecurringNotification) => transactionsApi.delete(n.transaction_id),
    onMutate: (n) => removeFromCache(n.posting_id),
    onSuccess: () => {
      invalidateTransactionData(queryClient);
      toast({ title: t('pages.recurring.notifications.deleted') });
    },
    onError: onError(t('pages.transactions.deleteFailed')),
  });

  const edit = useCallback(
    (n: RecurringNotification) => {
      const state: OpenEditState = { editTransaction: n.transaction, ackPostingId: n.posting_id };
      navigate(TRANSACTIONS_PATH, { state });
    },
    [navigate],
  );

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    dismiss: dismiss.mutate,
    dismissAll: dismissAll.mutate,
    remove: remove.mutate,
    edit,
  };
}
