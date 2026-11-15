import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeftRight, Info, Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelectItems } from '@/components/import/CategorySelectItems';
import { SuggestionMarker } from '@/components/import/SuggestionMarker';
import { useUser } from '@/contexts/user-context';
import { toast } from '@/hooks/use-toast';
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { fundsApi, statementImportApi } from '@/lib/api/endpoints';
import type { Account, Category, FieldSource, StatementCommitData, StatementPreviewData } from '@/lib/api/types';
import { invalidateTransactionData } from '@/lib/query-invalidation';
import { cn } from '@/lib/utils';
import { parseDecimalInput } from '../transactions/helpers';
import { OpeningBalancesStep } from './OpeningBalancesStep';
import {
  buildGrouping,
  directionOf,
  findCategoryId,
  firstExcludeCategory,
  initialRowStates,
  pluralKey,
  sharedCategory,
  type Direction,
  type MerchantGroup,
  type RowState,
} from './helpers';
import { MerchantLine } from './MerchantLine';

interface ReviewStepProps {
  preview: StatementPreviewData;
  account: Account;
  fileName: string;
  categories: Category[];
  onBack: () => void;
  onCommitted: (data: StatementCommitData) => void;
}

/** The category picker of a line. `placeholder` explains an empty / mixed value. */
function CategoryPicker({
  value,
  onChange,
  categories,
  placeholder,
  label,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  placeholder: string;
  label: string;
  invalid?: boolean;
}) {
  const { t } = useUser();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn('h-9 w-[13rem] text-sm', invalid && 'border-destructive')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <CategorySelectItems categories={categories} t={t} />
      </SelectContent>
    </Select>
  );
}

export function ReviewStep({ preview, account, fileName, categories, onBack, onCommitted }: ReviewStepProps) {
  const { t, locale, formatDate, formatNumber } = useUser();
  const queryClient = useQueryClient();
  const { rows } = preview;
  const currency = preview.currency ?? account.currency ?? 'CZK';

  // Merchant lines the user moved into "transfers between your own accounts" (not imported).
  const [movedKeys, setMovedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const grouping = useMemo(() => buildGrouping(rows, movedKeys), [rows, movedKeys]);
  const { data: allFunds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => (await fundsApi.getAll()).data || [],
  });
  const funds = useMemo(() => allFunds.filter((f) => f.fund_is_active !== false), [allFunds]);
  const [fundBalances, setFundBalances] = useState<Record<string, string>>({});
  const defaults = useMemo<Record<Direction, string>>(
    () => ({ out: findCategoryId(categories, 'Other expenses'), in: findCategoryId(categories, 'Other Income') }),
    [categories],
  );
  const ownDefault = useMemo(() => firstExcludeCategory(categories), [categories]);
  const [states, setStates] = useState<RowState[]>(() => initialRowStates(rows, grouping, defaults, ownDefault));
  const [balance, setBalance] = useState('');
  const [step, setStep] = useState<'review' | 'balances'>('review');

  const updateRow = (index: number, patch: Partial<RowState>) =>
    setStates((prev) => prev.map((state, i) => (i === index ? { ...state, ...patch } : state)));

  /** A line's picker writes to every row of the line the user has not set individually. */
  const setLineCategory = (indexes: number[], category: string) => {
    const targets = new Set(indexes);
    setStates((prev) => prev.map((state, i) => (targets.has(i) && !state.manual ? { ...state, category } : state)));
  };

  const moveToOwnTransfer = (group: MerchantGroup) => {
    setMovedKeys((prev) => new Set(prev).add(group.key));
    const targets = new Set(group.indexes);
    setStates((prev) =>
      prev.map((state, i) =>
        targets.has(i) ? { ...state, included: false, category: state.manual && state.category ? state.category : ownDefault } : state,
      ),
    );
  };

  const moveBack = (group: MerchantGroup) => {
    setMovedKeys((prev) => {
      const next = new Set(prev);
      next.delete(group.key);
      return next;
    });
    // Back to what the app suggested; small unsuggested merchants land in "Everything else",
    // so they get that bucket's default rather than an empty category.
    const targets = new Set(group.indexes);
    setStates((prev) =>
      prev.map((state, i) =>
        targets.has(i)
          ? {
              ...state,
              included: true,
              category: state.manual
                ? state.category
                : rows[i].category_id_fk !== null
                  ? String(rows[i].category_id_fk)
                  : defaults[directionOf(rows[i].amount)],
            }
          : state,
      ),
    );
  };

  const included = rows.flatMap((row, index) => (states[index].included && !row.error ? [index] : []));
  const missingCategory = included.filter((index) => !states[index].category).length;
  const balanceValue = parseDecimalInput(balance);
  const balanceInvalid = balance.trim() !== '' && balanceValue === null;
  const fundBalanceList = funds.flatMap((fund) => {
    const raw = (fundBalances[fund.savings_funds_id_pk] ?? '').trim();
    return raw === '' ? [] : [{ savings_fund_id_fk: fund.savings_funds_id_pk, balance: parseDecimalInput(raw) }];
  });
  const fundBalancesInvalid = fundBalanceList.some((entry) => entry.balance === null);

  const commitMutation = useMutation({
    mutationFn: () =>
      statementImportApi.commit({
        account_id: account.accounts_id_pk,
        file_name: fileName,
        preset: preview.preset?.key ?? null,
        mapping: preview.mapping,
        rows: included.map((index) => ({
          date: rows[index].date as string,
          amount: rows[index].amount as number,
          notes: states[index].notes.trim() || null,
          category_id_fk: Number(states[index].category),
        })),
        closing_balance: balanceValue,
        balance_date: preview.date_to,
        fund_balances: fundBalanceList.flatMap((entry) =>
          entry.balance === null ? [] : [{ savings_fund_id_fk: entry.savings_fund_id_fk, balance: entry.balance }],
        ),
      }),
    onSuccess: (body) => {
      invalidateTransactionData(queryClient);
      queryClient.invalidateQueries({ queryKey: ['statement-import', 'batches'] });
      // The starting-balance adjustment may have created a "Starting Balance" category.
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Fund opening balances change fund balances.
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      onCommitted(body.data);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError && err.status === 429
          ? t('pages.statementImport.rateLimited')
          : getErrorMessage(err, t('pages.statementImport.importFailed'));
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    },
  });

  const readable = rows.length - grouping.errorCount;
  const dateText = (date: string | null) => (date ? formatDate(date, { dateStyle: 'medium' }) : '');
  const needs = (indexes: number[]) => indexes.some((i) => states[i].included && !states[i].category);

  const linePicker = (indexes: number[], suggested: { category: string | null; source: FieldSource | undefined }) => {
    const { value, mixed } = sharedCategory(indexes, states);
    return (
      <>
        {suggested.category !== null && value === suggested.category && (
          <SuggestionMarker
            source={suggested.source}
            label={t('pages.statementImport.suggested')}
            historyLabel={t('pages.statementImport.fromHistory')}
          />
        )}
        <CategoryPicker
          value={value}
          onChange={(v) => setLineCategory(indexes, v)}
          categories={categories}
          placeholder={mixed ? t('pages.statementImport.severalCategories') : t('pages.statementImport.chooseCategory')}
          label={t('common.category')}
          invalid={needs(indexes) && !mixed}
        />
      </>
    );
  };

  const elseAll = [...grouping.elseIndexes.out, ...grouping.elseIndexes.in].sort((a, b) => a - b);
  const lineProps = { rows, states, categories, currency, onChange: updateRow };

  if (step === 'balances') {
    return (
      <OpeningBalancesStep
        dateTo={preview.date_to}
        currency={currency}
        balance={balance}
        onBalanceChange={setBalance}
        balanceInvalid={balanceInvalid}
        funds={funds}
        fundBalances={fundBalances}
        onFundBalanceChange={(fundId, value) => setFundBalances((prev) => ({ ...prev, [fundId]: value }))}
        fundBalancesInvalid={fundBalancesInvalid}
        importCount={included.length}
        isPending={commitMutation.isPending}
        onBack={() => setStep('review')}
        onCommit={() => commitMutation.mutate()}
      />
    );
  }

  return (
    <section aria-labelledby="statement-review" className="mt-10">
      <h2 id="statement-review" className="sr-only">
        {t('pages.statementImport.reviewTitle')}
      </h2>
      <div className="border-b border-foreground/30 pb-3">
        <p className="text-[1.0625rem]">
          {t('pages.statementImport.summary', {
            count: formatNumber(readable),
            from: dateText(preview.date_from),
            to: dateText(preview.date_to),
          })}
          {grouping.duplicates.length > 0 && (
            <>
              {' '}
              {t(pluralKey(locale, grouping.duplicates.length, 'pages.statementImport.duplicatesSummary'), {
                count: formatNumber(grouping.duplicates.length),
              })}
            </>
          )}
        </p>
        {grouping.errorCount > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-warning">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(pluralKey(locale, grouping.errorCount, 'pages.statementImport.unreadable'), {
              count: formatNumber(grouping.errorCount),
            })}
          </p>
        )}
        {preview.ai_skipped && (
          <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('pages.statementImport.aiOff')}
          </p>
        )}
        {!preview.suggestions_available && !preview.ai_skipped && (
          <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('pages.statementImport.noSuggestions')}
          </p>
        )}
      </div>

      <ul>
        {grouping.lines.map((group) => (
          <MerchantLine
            key={group.key}
            title={group.name || t('pages.statementImport.unknownMerchant')}
            indexes={group.indexes}
            needsCategory={needs(group.indexes)}
            controls={
              <>
                {linePicker(group.indexes, { category: group.suggestedCategory, source: group.suggestedSource })}
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => moveToOwnTransfer(group)}>
                  <ArrowLeftRight aria-hidden="true" />
                  {t('pages.statementImport.markOwnTransfer')}
                </Button>
              </>
            }
            {...lineProps}
          />
        ))}

        {elseAll.length > 0 && (
          <MerchantLine
            title={t('pages.statementImport.everythingElse')}
            indexes={elseAll}
            showSum={false}
            needsCategory={needs(elseAll)}
            controls={(['out', 'in'] as const).map((direction) => {
              const indexes = grouping.elseIndexes[direction];
              if (indexes.length === 0) return null;
              const { value, mixed } = sharedCategory(indexes, states);
              const label = t(direction === 'out' ? 'pages.statementImport.moneyOut' : 'pages.statementImport.moneyIn');
              return (
                <div key={direction} className="flex items-center gap-2">
                  <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
                  <CategoryPicker
                    value={value}
                    onChange={(v) => setLineCategory(indexes, v)}
                    categories={categories}
                    placeholder={mixed ? t('pages.statementImport.severalCategories') : t('pages.statementImport.chooseCategory')}
                    label={label}
                    invalid={needs(indexes) && !mixed}
                  />
                </div>
              );
            })}
            {...lineProps}
          />
        )}

        {grouping.own.length > 0 && (
          <MerchantLine
            title={t('pages.statementImport.ownTransfersLine')}
            indexes={grouping.own}
            countLabel={t(pluralKey(locale, grouping.own.length, 'pages.statementImport.ownCount'), {
              count: formatNumber(grouping.own.length),
            })}
            showSum={false}
            needsCategory={needs(grouping.own)}
            footer={
              grouping.ownMerchants.length > 0 && (
                <ul className="mb-4 ml-6 space-y-1 text-[0.8125rem]">
                  {grouping.ownMerchants.map((group) => (
                    <li key={group.key} className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">{group.name || t('pages.statementImport.unknownMerchant')}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => moveBack(group)}>
                        <Undo2 aria-hidden="true" />
                        {t('pages.statementImport.notOwnTransfer')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )
            }
            {...lineProps}
          />
        )}

        {grouping.duplicates.length > 0 && (
          <MerchantLine
            title={t('pages.statementImport.duplicatesLine')}
            indexes={grouping.duplicates}
            countLabel={t(pluralKey(locale, grouping.duplicates.length, 'pages.statementImport.duplicatesCount'), {
              count: formatNumber(grouping.duplicates.length),
            })}
            showSum={false}
            needsCategory={needs(grouping.duplicates)}
            {...lineProps}
          />
        )}
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        {missingCategory > 0 && (
          <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(pluralKey(locale, missingCategory, 'pages.statementImport.needCategory'), {
              count: formatNumber(missingCategory),
            })}
          </p>
        )}
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          className="h-11 px-5"
          disabled={included.length === 0 || missingCategory > 0}
          onClick={() => setStep('balances')}
        >
          {t('pages.statementImport.continueToBalances')}
        </Button>
      </div>
    </section>
  );
}
