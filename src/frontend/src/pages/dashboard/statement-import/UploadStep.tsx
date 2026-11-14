import { useCallback, useRef, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { AccountSelect } from '@/components/AccountSelect';
import { useUser } from '@/contexts/user-context';
import type { Account } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { MAX_UPLOAD_BYTES } from './helpers';

interface UploadStepProps {
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  useAi: boolean;
  onUseAiChange: (value: boolean) => void;
  onContinue: () => void;
  isReading: boolean;
  /** Why the last attempt failed (the backend's `detail`). */
  errorMessage: string | null;
}

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];

/** Screen 1: the file, and the account it belongs to. */
export function UploadStep({
  accounts,
  accountId,
  onAccountChange,
  file,
  onFileChange,
  useAi,
  onUseAiChange,
  onContinue,
  isReading,
  errorMessage,
}: UploadStepProps) {
  const { t } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // A rejected file is reported at the dropzone it was dropped on, not in a toast.
  const [fileError, setFileError] = useState<string | null>(null);

  const acceptFile = useCallback(
    (candidate: File | null | undefined) => {
      if (!candidate) return;
      const name = candidate.name.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
        setFileError(t('pages.statementImport.wrongType'));
        return;
      }
      if (candidate.size > MAX_UPLOAD_BYTES) {
        setFileError(t('pages.statementImport.tooLarge'));
        return;
      }
      setFileError(null);
      onFileChange(candidate);
    },
    [onFileChange, t],
  );

  if (isReading) {
    return (
      <div role="status" aria-live="polite" className="mt-10 flex min-h-[14rem] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-[1.0625rem]">{t('pages.statementImport.reading')}</p>
        <p className="max-w-sm text-[0.8125rem] text-muted-foreground">{t('pages.statementImport.readingHint')}</p>
      </div>
    );
  }

  // With no accounts yet the account is created after the file is read (see the page), so the
  // account field is only shown when there is something to choose from.
  const needsAccount = accounts.length > 0;
  const canContinue = file !== null && (!needsAccount || accountId !== '');

  return (
    <section aria-label={t('pages.statementImport.dropTitle')} className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : fileError ? 'border-destructive' : 'border-foreground/20',
        )}
      >
        {file ? (
          <div className="flex w-full max-w-sm items-center gap-3 text-left">
            <FileSpreadsheet className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem]">{file.name}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} kB</p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              aria-label={t('pages.statementImport.removeFile')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[1.0625rem]">{t('pages.statementImport.dropTitle')}</p>
            <p className="mt-1.5 max-w-sm text-[0.8125rem] text-muted-foreground">{t('pages.statementImport.dropDescription')}</p>
          </>
        )}

        {fileError && (
          <p role="alert" className="mt-4 flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {fileError}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" className="mt-5 h-10 px-4" onClick={() => inputRef.current?.click()}>
          <Upload aria-hidden="true" />
          {file ? t('pages.statementImport.replace') : t('pages.statementImport.choose')}
        </Button>
      </div>

      <div className="flex min-w-0 flex-col">
        {needsAccount ? (
          <Field htmlFor="statement-account" label={t('pages.statementImport.accountLabel')} hint={t('pages.statementImport.accountHint')}>
            <AccountSelect
              id="statement-account"
              accounts={accounts}
              value={accountId}
              onValueChange={onAccountChange}
              placeholder={t('pages.transactions.selectAccount')}
            />
          </Field>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">{t('pages.statementImport.noAccountsHint')}</p>
        )}
        <div className="mt-6 flex items-start gap-3">
          <Switch id="statement-use-ai" checked={useAi} onCheckedChange={onUseAiChange} aria-describedby="statement-use-ai-hint" />
          <div className="min-w-0">
            <label htmlFor="statement-use-ai" className="block cursor-pointer text-[0.9375rem]">
              {t('pages.statementImport.useAi')}
            </label>
            <p id="statement-use-ai-hint" className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {t('pages.statementImport.useAiHint')}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button type="button" className="h-11 px-5" disabled={!canContinue} onClick={onContinue}>
            {t('pages.statementImport.continue')}
          </Button>
        </div>
        {errorMessage && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
