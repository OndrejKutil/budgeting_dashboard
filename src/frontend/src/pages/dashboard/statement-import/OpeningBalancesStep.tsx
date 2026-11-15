import { useState } from 'react';
import { AlertCircle, Info, Loader2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
import { toast } from '@/hooks/use-toast';
import { tokenManager, getErrorMessage } from '@/lib/api/client';
import { fundsApi } from '@/lib/api/endpoints';
import type { SavingsFund } from '@/lib/api/types';
import { DECIMAL_INPUT_PATTERN, parseDecimalInput } from '../transactions/helpers';
import { BalanceField } from './BalanceField';
import { FundBalancesField } from './FundBalancesField';
import { pluralKey } from './helpers';

interface OpeningBalancesStepProps {
  dateTo: string | null;
  currency: string;
  balance: string;
  onBalanceChange: (value: string) => void;
  balanceInvalid: boolean;
  funds: SavingsFund[];
  fundBalances: Record<string, string>;
  onFundBalanceChange: (fundId: string, value: string) => void;
  fundBalancesInvalid: boolean;
  importCount: number;
  isPending: boolean;
  onBack: () => void;
  onCommit: () => void;
}

/** Inline form that creates a savings fund and gives it a starting balance. */
function AddFundForm({
  onCreated,
  onCancel,
}: {
  onCreated: (fundId: string, balance: string) => void;
  onCancel: () => void;
}) {
  const { t } = useUser();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('0');
  const [balance, setBalance] = useState('');
  const [busy, setBusy] = useState(false);

  const targetOk = /^\d+$/.test(target.trim());
  const balanceOk = balance.trim() === '' || parseDecimalInput(balance) !== null;
  const valid = name.trim() !== '' && targetOk && balanceOk;

  const create = async () => {
    const userId = tokenManager.getUserId();
    if (!userId || !valid) return;
    setBusy(true);
    try {
      const response = await fundsApi.create({
        user_id_fk: userId,
        fund_name: name.trim(),
        target_amount: parseInt(target.trim(), 10),
      });
      const created = response.data?.[0];
      // The fund exists now; a failed refresh of the list must not be reported as a failed create.
      await queryClient.invalidateQueries({ queryKey: ['funds'] }).catch(() => undefined);
      if (created) onCreated(created.savings_funds_id_pk, balance.trim());
      else onCancel();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('pages.statementImport.newFundFailed')),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 max-w-sm space-y-3 rounded-lg border border-border p-4">
      <div>
        <label htmlFor="new-fund-name" className="mb-1.5 block text-[0.8125rem]">{t('pages.statementImport.newFundName')}</label>
        <Input id="new-fund-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      </div>
      <div>
        <label htmlFor="new-fund-target" className="mb-1.5 block text-[0.8125rem]">{t('pages.statementImport.newFundTarget')}</label>
        <Input
          id="new-fund-target"
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          aria-invalid={!targetOk}
          className="tabular-nums"
        />
      </div>
      <div>
        <label htmlFor="new-fund-balance" className="mb-1.5 block text-[0.8125rem]">{t('pages.statementImport.newFundBalance')}</label>
        <Input
          id="new-fund-balance"
          inputMode="decimal"
          pattern={DECIMAL_INPUT_PATTERN}
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder={t('pages.statementImport.balancePlaceholder')}
          aria-invalid={!balanceOk}
          className="tabular-nums"
        />
      </div>
      {!valid && (name.trim() !== '' || target !== '0' || balance !== '') && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('pages.statementImport.newFundInvalid')}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" className="h-9 px-4" disabled={!valid || busy} onClick={create}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t('pages.statementImport.newFundCreate')}
        </Button>
        <Button type="button" variant="ghost" className="h-9 px-3" disabled={busy} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

/** Last step: what the account and the savings funds held on the last day of the file. */
export function OpeningBalancesStep({
  dateTo,
  currency,
  balance,
  onBalanceChange,
  balanceInvalid,
  funds,
  fundBalances,
  onFundBalanceChange,
  fundBalancesInvalid,
  importCount,
  isPending,
  onBack,
  onCommit,
}: OpeningBalancesStepProps) {
  const { t, locale, formatDate, formatNumber } = useUser();
  const [adding, setAdding] = useState(false);
  const date = dateTo ? formatDate(dateTo, { dateStyle: 'medium' }) : t('pages.statementImport.endOfFile');

  return (
    <section aria-labelledby="statement-opening" className="mt-10">
      <h2 id="statement-opening" className="text-[1.0625rem]">
        {t('pages.statementImport.openingTitle')}
      </h2>
      <p className="mt-2 flex max-w-[65ch] gap-2 rounded-lg bg-muted/50 p-3 text-[0.8125rem] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('pages.statementImport.openingDisclaimer', { date })}</span>
      </p>

      <div className="mt-6">
        <BalanceField value={balance} onChange={onBalanceChange} dateTo={dateTo} currency={currency} />
        {balanceInvalid && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('pages.statementImport.balanceInvalid')}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-[0.9375rem]">{t('pages.statementImport.fundBalancesTitle')}</h3>
        <p className="mt-1 max-w-sm text-[0.8125rem] text-muted-foreground">{t('pages.statementImport.fundBalancesHint')}</p>
        <div className="max-w-sm">
          <FundBalancesField funds={funds} values={fundBalances} onChange={onFundBalanceChange} dateTo={dateTo} currency={currency} />
        </div>
        {adding ? (
          <AddFundForm
            onCancel={() => setAdding(false)}
            onCreated={(fundId, value) => {
              if (value) onFundBalanceChange(fundId, value);
              setAdding(false);
            }}
          />
        ) : (
          <Button type="button" variant="outline" className="mt-4 h-9 px-3" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            {t('pages.statementImport.addFund')}
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack} disabled={isPending}>
          {t('pages.statementImport.backToReview')}
        </Button>
        <Button type="button" className="h-11 px-5" disabled={balanceInvalid || fundBalancesInvalid || isPending} onClick={onCommit}>
          {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t(pluralKey(locale, importCount, 'pages.statementImport.importButton'), { count: formatNumber(importCount) })}
        </Button>
      </div>
    </section>
  );
}
