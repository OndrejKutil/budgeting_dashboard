import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/user-context';
import { statementImportApi } from '@/lib/api/endpoints';
import type { Account, ImportBatchData } from '@/lib/api/types';
import { pluralKey } from './helpers';
import { UndoImportDialog } from './UndoImportDialog';

/** Past imports, newest first, each with Undo. Renders nothing when there are none. */
export function PastImports({ accounts }: { accounts: Account[] }) {
  const { t, locale, formatDate, formatNumber } = useUser();
  const [undoing, setUndoing] = useState<ImportBatchData | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['statement-import', 'batches'],
    queryFn: async () => (await statementImportApi.batches()).data ?? [],
  });

  if (isLoading) return <Skeleton className="mt-14 h-24 w-full" />;
  if (batches.length === 0) return null;

  const accountName = (id: string) => accounts.find((a) => a.accounts_id_pk === id)?.account_name ?? t('common.unknown');

  return (
    <section aria-labelledby="past-imports" className="mt-14">
      <h2 id="past-imports" className="border-b border-foreground/30 pb-3 text-[1.125rem] font-medium tracking-[-0.01em]">
        {t('pages.statementImport.pastTitle')}
      </h2>
      <ul>
        {batches.map((batch) => (
          <li key={batch.import_batch_id_pk} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border py-3">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem]">{batch.file_name || t('pages.statementImport.unnamedFile')}</p>
              <p className="text-[0.8125rem] text-muted-foreground">
                {accountName(batch.account_id_fk)}
                {' · '}
                {t(pluralKey(locale, batch.row_count, 'pages.statementImport.pastRows'), { count: formatNumber(batch.row_count) })}
                {batch.date_from && batch.date_to && (
                  <>
                    {' · '}
                    {formatDate(batch.date_from, { dateStyle: 'medium' })} – {formatDate(batch.date_to, { dateStyle: 'medium' })}
                  </>
                )}
                {batch.created_at && (
                  <>
                    {' · '}
                    {t('pages.statementImport.importedOn', { date: formatDate(batch.created_at, { dateStyle: 'medium' }) })}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" className="h-9 px-3">
                <Link to={`/dashboard/transactions?import=${batch.import_batch_id_pk}`}>{t('pages.statementImport.viewThem')}</Link>
              </Button>
              <Button type="button" variant="ghost" className="h-9 px-3 text-destructive hover:text-destructive" onClick={() => setUndoing(batch)}>
                {t('pages.statementImport.undo')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <UndoImportDialog batch={undoing} onClose={() => setUndoing(null)} onUndone={() => setUndoing(null)} />
    </section>
  );
}
