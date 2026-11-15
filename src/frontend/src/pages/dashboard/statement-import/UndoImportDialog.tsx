import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-context';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { statementImportApi } from '@/lib/api/endpoints';
import type { ImportBatchData } from '@/lib/api/types';
import { invalidateTransactionData } from '@/lib/query-invalidation';
import { pluralKey } from './helpers';

interface UndoImportDialogProps {
  /** The import to undo; null keeps the dialog closed. */
  batch: ImportBatchData | null;
  onClose: () => void;
  onUndone: (batch: ImportBatchData) => void;
}

/** Confirmation for undoing an import. Shared by the done screen and the past-imports list. */
export function UndoImportDialog({ batch, onClose, onUndone }: UndoImportDialogProps) {
  const { t, locale, formatNumber } = useUser();
  const queryClient = useQueryClient();

  const undoMutation = useMutation({
    mutationFn: (id: string) => statementImportApi.undo(id),
    onSuccess: (body, id) => {
      invalidateTransactionData(queryClient);
      queryClient.invalidateQueries({ queryKey: ['statement-import', 'batches'] });
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      toast({
        title: t('pages.statementImport.undone'),
        description: t(pluralKey(locale, body.data.transactions_deleted, 'pages.statementImport.undoneDescription'), {
          count: formatNumber(body.data.transactions_deleted),
        }),
      });
      if (batch && batch.import_batch_id_pk === id) onUndone(batch);
    },
    onError: (err) => {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('pages.statementImport.undoFailed')),
        variant: 'destructive',
      });
    },
  });

  return (
    <AlertDialog open={batch !== null} onOpenChange={(open) => { if (!open && !undoMutation.isPending) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('pages.statementImport.undoTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {batch &&
              t(pluralKey(locale, batch.row_count, 'pages.statementImport.undoDescription'), {
                count: formatNumber(batch.row_count),
              })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={undoMutation.isPending}>{t('common.cancel')}</AlertDialogCancel>
          {/* A plain Button rather than AlertDialogAction: the dialog must stay open until the request is done. */}
          <Button
            type="button"
            variant="destructive"
            disabled={undoMutation.isPending}
            onClick={() => batch && undoMutation.mutate(batch.import_batch_id_pk, { onSettled: onClose })}
          >
            {undoMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t('pages.statementImport.undoConfirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
