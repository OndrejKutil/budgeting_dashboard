import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Info, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateAccountDialog } from '@/components/CreateAccountDialog';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useUser } from '@/contexts/user-context';
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { accountsApi, categoriesApi, statementImportApi } from '@/lib/api/endpoints';
import type { StatementCommitData, StatementMapping, StatementPreviewData } from '@/lib/api/types';
import { DoneStep } from './statement-import/DoneStep';
import { MappingStep } from './statement-import/MappingStep';
import { PastImports } from './statement-import/PastImports';
import { ReviewStep } from './statement-import/ReviewStep';
import { UploadStep } from './statement-import/UploadStep';

const FEATURE_KEY = 'statement_import';
const USE_AI_STORAGE_KEY = 'statement-import-use-ai';

const readStoredUseAi = () => {
  try {
    return localStorage.getItem(USE_AI_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

type Phase = 'upload' | 'mapping' | 'review' | 'done';

export default function StatementImportPage() {
  const { t } = useUser();
  const { enabled, isLoading: flagLoading } = useFeatureFlag(FEATURE_KEY);
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('upload');
  const [file, setFile] = useState<File | null>(null);
  // '' = not chosen. Preselected below when the user has exactly one active account.
  const [chosenAccountId, setChosenAccountId] = useState('');
  const [preview, setPreview] = useState<StatementPreviewData | null>(null);
  // The mapping the user sent from the mapping screen, kept so re-running the preview (for a
  // just-created account) reads the file the same way.
  const [sentMapping, setSentMapping] = useState<StatementMapping | null>(null);
  // The account the preview was run for (the user's choice, or the one just created).
  const [previewAccountId, setPreviewAccountId] = useState('');
  // "Suggest categories with AI": remembered between visits.
  const [useAi, setUseAi] = useState(readStoredUseAi);
  const [createOpen, setCreateOpen] = useState(false);
  const [result, setResult] = useState<StatementCommitData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await accountsApi.getAll()).data || [],
    enabled,
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.getAll()).data || [],
    enabled,
  });

  const activeAccounts = useMemo(() => accounts.filter((a) => a.account_is_active !== false), [accounts]);
  const accountId = chosenAccountId || (activeAccounts.length === 1 ? activeAccounts[0].accounts_id_pk : '');
  const reviewAccount = accounts.find((a) => a.accounts_id_pk === previewAccountId);

  const changeUseAi = (value: boolean) => {
    setUseAi(value);
    try {
      localStorage.setItem(USE_AI_STORAGE_KEY, String(value));
    } catch {
      // Storage unavailable: the choice just is not remembered.
    }
  };

  const reset = () => {
    setPhase('upload');
    setFile(null);
    setPreview(null);
    setSentMapping(null);
    setPreviewAccountId('');
    setResult(null);
    setErrorMessage(null);
    setCreateOpen(false);
  };

  const previewMutation = useMutation({
    mutationFn: (vars: { accountId: string; mapping: StatementMapping | null }) =>
      statementImportApi.preview({ file: file as File, accountId: vars.accountId || undefined, mapping: vars.mapping, useAi }),
    onSuccess: (body, vars) => {
      const data = body.data;
      setErrorMessage(null);
      setPreview(data);
      setSentMapping(vars.mapping);
      setPreviewAccountId(vars.accountId);
      if (data.needs_mapping) {
        setPhase('mapping');
      } else if (!vars.accountId) {
        // A user with no account: the file is read, now the account gets created from what it said.
        setPhase('upload');
        setCreateOpen(true);
      } else {
        setPhase('review');
      }
    },
    onError: (err) => {
      // The backend's `detail` is plain English and says what to fix (wrong currency, mixed
      // accounts, too many rows...), so it is shown as is.
      setErrorMessage(
        err instanceof ApiError && err.status === 429
          ? t('pages.statementImport.rateLimited')
          : getErrorMessage(err, t('pages.statementImport.readFailed')),
      );
    },
  });

  const readFile = (mapping: StatementMapping | null) => {
    setErrorMessage(null);
    previewMutation.mutate({ accountId, mapping });
  };

  /** The account the user just created: find it and re-run the preview against it. */
  const onAccountCreated = async (newAccountId: string | null) => {
    setCreateOpen(false);
    const fresh = (await accountsApi.getAll()).data || [];
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    const created =
      (newAccountId ? fresh.find((a) => a.accounts_id_pk === newAccountId) : undefined) ??
      fresh.find((a) => a.account_is_active !== false && a.account_name === (preview?.preset?.name ?? '')) ??
      fresh.find((a) => a.account_is_active !== false);
    if (!created) return;
    setChosenAccountId(created.accounts_id_pk);
    previewMutation.mutate({ accountId: created.accounts_id_pk, mapping: sentMapping });
  };

  const title = (
    <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
      {t('pages.statementImport.title')}
    </h1>
  );

  if (flagLoading) {
    return (
      <div aria-busy="true">
        {title}
        <Skeleton className="mt-10 h-64 w-full" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div>
        {title}
        <EmptyState
          icon={<FileSpreadsheet className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.statementImport.notEnabledTitle')}
          description={t('pages.statementImport.notEnabledDescription')}
        />
      </div>
    );
  }

  const loadingData = accountsLoading || categoriesLoading;
  const isReading = previewMutation.isPending && phase !== 'mapping';

  return (
    <div>
      <header className="grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:items-start">
        <div>
          {title}
          <p className="mt-1 max-w-[65ch] text-[0.8125rem] text-muted-foreground">{t('pages.statementImport.description')}</p>
          <p className="mt-3 flex max-w-[65ch] gap-2 text-[0.8125rem] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {t('pages.statementImport.dataNotice')}{' '}
              <a href="/privacy#statement-import" target="_blank" rel="noreferrer" className="text-foreground underline decoration-foreground/30 underline-offset-4">
                {t('pages.statementImport.dataNoticeLink')}
              </a>
            </span>
          </p>
        </div>
        {/* Why the import simplifies things, shown before any work; the opening-balances step
            repeats it with the actual date, next to the fields it explains. */}
        {phase === 'upload' && (
          <aside className="flex gap-2.5 rounded-lg bg-muted/50 p-3.5 text-[0.8125rem]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">{t('pages.statementImport.startNoticeTitle')}</p>
              <p className="mt-1 text-muted-foreground">{t('pages.statementImport.startNotice')}</p>
              <p className="mt-2 text-muted-foreground">{t('pages.statementImport.startNoticeResult')}</p>
            </div>
          </aside>
        )}
      </header>

      {loadingData ? (
        <Skeleton className="mt-10 h-64 w-full" />
      ) : (
        <>
          {phase === 'upload' && (
            <>
              <UploadStep
                accounts={activeAccounts}
                accountId={accountId}
                onAccountChange={setChosenAccountId}
                file={file}
                onFileChange={(next) => {
                  setFile(next);
                  setErrorMessage(null);
                }}
                useAi={useAi}
                onUseAiChange={changeUseAi}
                onContinue={() => readFile(null)}
                isReading={isReading}
                errorMessage={errorMessage}
              />
              {!isReading && <PastImports accounts={accounts} />}
            </>
          )}

          {phase === 'mapping' && preview && (
            <MappingStep
              preview={preview}
              onSubmit={(mapping) => previewMutation.mutate({ accountId: previewAccountId, mapping })}
              onBack={() => {
                setPhase('upload');
                setPreview(null);
                setErrorMessage(null);
              }}
              isPending={previewMutation.isPending}
              errorMessage={errorMessage}
            />
          )}

          {phase === 'review' && preview && reviewAccount && file && (
            <ReviewStep
              // A fresh preview (another file, another account) must start from fresh row state.
              key={`${file.name}:${file.size}:${previewAccountId}:${preview.rows.length}`}
              preview={preview}
              account={reviewAccount}
              fileName={file.name}
              categories={categories}
              onBack={reset}
              onCommitted={(data) => {
                setResult(data);
                setPhase('done');
              }}
            />
          )}

          {phase === 'done' && result && (
            <DoneStep result={result} accountName={reviewAccount?.account_name ?? ''} onReset={reset} />
          )}
        </>
      )}

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          // Closing without creating leaves the file chosen, so the user can try again.
          if (!open) setPreview(null);
        }}
        initialName={preview?.preset?.name ?? ''}
        initialCurrency={preview?.currency}
        onCreated={onAccountCreated}
      />
    </div>
  );
}
