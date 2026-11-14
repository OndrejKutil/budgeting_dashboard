import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-context';
import type { StatementCommitData } from '@/lib/api/types';
import { pluralKey } from './helpers';
import { UndoImportDialog } from './UndoImportDialog';

interface DoneStepProps {
  result: StatementCommitData;
  accountName: string;
  /** Start over (also called after the import has been undone). */
  onReset: () => void;
}

/** Screen 3: what was imported, with a way to look at it and to take it back. */
export function DoneStep({ result, accountName, onReset }: DoneStepProps) {
  const { t, locale, formatNumber } = useUser();
  const [confirmUndo, setConfirmUndo] = useState(false);
  const fundCount = Object.keys(result.fund_adjustments ?? {}).length;

  return (
    <section className="mt-10 flex flex-col items-start gap-4" aria-live="polite">
      <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
      <p className="text-[1.25rem] tracking-tight">
        {t(pluralKey(locale, result.rows_written, 'pages.statementImport.done'), {
          count: formatNumber(result.rows_written),
          account: accountName,
        })}
      </p>
      {result.balance_adjustment !== null && result.balance_adjustment !== 0 && (
        <p className="max-w-[65ch] text-[0.8125rem] text-muted-foreground">
          {t('pages.statementImport.balanceAdded')}
        </p>
      )}
      {fundCount > 0 && (
        <p className="max-w-[65ch] text-[0.8125rem] text-muted-foreground">
          {t(pluralKey(locale, fundCount, 'pages.statementImport.fundsOpened'), { count: formatNumber(fundCount) })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="h-11 px-5">
          <Link to={`/dashboard/transactions?import=${result.batch.import_batch_id_pk}`}>{t('pages.statementImport.viewThem')}</Link>
        </Button>
        <Button type="button" variant="outline" className="h-11 px-4" onClick={() => setConfirmUndo(true)}>
          {t('pages.statementImport.undoImport')}
        </Button>
        <Button type="button" variant="ghost" className="h-11 px-4" onClick={onReset}>
          {t('pages.statementImport.importAnother')}
        </Button>
      </div>
      <UndoImportDialog
        batch={confirmUndo ? result.batch : null}
        onClose={() => setConfirmUndo(false)}
        onUndone={onReset}
      />
    </section>
  );
}
