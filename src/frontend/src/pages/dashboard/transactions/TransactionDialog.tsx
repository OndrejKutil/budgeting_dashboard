import { useRef, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FormAlert } from '@/components/ui/field';
import { fieldLine } from '@/components/ui/field-line';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AccountSelect } from '@/components/AccountSelect';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import { useUser } from '@/contexts/user-context';
import { fieldAria, type FormErrors } from '@/hooks/use-form-errors';
import type { Account, Category, SavingsFund, Tag, Transaction } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import {
  CATEGORY_TYPE_LABEL_KEY,
  CATEGORY_TYPE_ORDER,
  DECIMAL_INPUT_PATTERN,
  currencySymbol,
  formatRate,
  isNegativeAmountInput,
  parseDecimalInput,
  toggleAmountSign,
  type TransactionField,
  type TransactionFormData,
  type TransactionMode,
} from './helpers';

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  /** The row being edited; null when creating or copying. */
  selectedTransaction: Transaction | null;
  isCopy: boolean;
  mode: TransactionMode;
  changeMode: (mode: TransactionMode) => void;
  formData: TransactionFormData;
  setFormData: Dispatch<SetStateAction<TransactionFormData>>;
  transferToAccountId: string;
  setTransferToAccountId: (id: string) => void;
  transferDestAmount: string;
  setTransferDestAmount: (value: string) => void;
  errors: FormErrors<TransactionField>;
  clearError: (...keys: TransactionField[]) => void;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
  categories: Category[];
  accounts: Account[];
  accountMap: Record<string, Account>;
  funds: SavingsFund[];
  tags: Tag[];
  onManageTags: () => void;
}

export function TransactionDialog({
  open,
  onClose,
  selectedTransaction,
  isCopy,
  mode,
  changeMode,
  formData,
  setFormData,
  transferToAccountId,
  setTransferToAccountId,
  transferDestAmount,
  setTransferDestAmount,
  errors,
  clearError,
  submitError,
  isSaving,
  onSubmit,
  categories,
  accounts,
  accountMap,
  funds,
  tags,
  onManageTags,
}: TransactionDialogProps) {
  const { t, formatDate, formatNumber } = useUser();
  const isTransfer = mode === 'transfer';
  const isWithdrawal = mode === 'withdrawal';
  const modeRefs = useRef<Partial<Record<TransactionMode, HTMLButtonElement | null>>>({});

  const modeOptions: { value: TransactionMode; label: string; help: string | null }[] = [
    { value: 'standard', label: t('pages.transactions.modeStandard'), help: null },
    { value: 'transfer', label: t('pages.transactions.modeTransfer'), help: t('pages.transactions.transferHelp') },
    { value: 'withdrawal', label: t('pages.transactions.modeWithdrawal'), help: t('pages.transactions.withdrawalHelp') },
  ];
  const modeHelp = modeOptions.find(option => option.value === mode)?.help;
  // An existing row cannot be turned into the two rows a transfer needs.
  const isModeDisabled = (value: TransactionMode) => value === 'transfer' && !!selectedTransaction;

  // Radio-group keyboard model: the checked option is the single tab stop, arrows move the
  // selection (skipping disabled options) and wrap around.
  const handleModeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = modeOptions.filter(option => !isModeDisabled(option.value));
    const index = enabled.findIndex(option => option.value === mode);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % enabled.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = enabled.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = enabled[next];
    if (!target) return;
    changeMode(target.value);
    modeRefs.current[target.value]?.focus();
  };

  const isAmountNegative = isNegativeAmountInput(formData.amount);
  const amountSignActionLabel = isAmountNegative
    ? t('pages.transactions.setAmountPositive')
    : t('pages.transactions.setAmountNegative');

  const sourceCurrency = accountMap[formData.account_id_fk]?.currency;
  const destCurrency = accountMap[transferToAccountId]?.currency;
  const isCrossCurrency = isTransfer && !!transferToAccountId && !!sourceCurrency && !!destCurrency && sourceCurrency !== destCurrency;

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {selectedTransaction
              ? t('pages.transactions.editTitle')
              : isCopy
                ? t('pages.transactions.copyTitle')
                : t('pages.transactions.addTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedTransaction
              ? t('pages.transactions.editDescription')
              : isCopy
                ? t('pages.transactions.copyDescription')
                : t('pages.transactions.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={e => {
            e.preventDefault();
            if (!isSaving) onSubmit();
          }}
        >
          <div className="space-y-[18px]">
            <FormAlert>{submitError}</FormAlert>

            {/* What kind of entry this is: underlined text tabs. One control instead of two
                checkboxes that silently cancelled each other; the help sits under it because
                a tooltip is unreachable on touch. */}
            <div className="space-y-2">
              <div
                role="radiogroup"
                aria-label={t('pages.transactions.modeLabel')}
                onKeyDown={handleModeKeyDown}
                className="flex gap-6 border-b border-border"
              >
                {modeOptions.map(({ value, label }) => {
                  const selected = mode === value;
                  return (
                    <button
                      key={value}
                      ref={el => { modeRefs.current[value] = el; }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      disabled={isModeDisabled(value)}
                      onClick={() => changeMode(value)}
                      className={cn(
                        'relative -mb-px min-h-11 whitespace-nowrap rounded-sm text-sm transition-colors sm:text-[14.5px]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-40',
                        selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block border-b-2 py-2.5',
                          selected ? 'border-primary' : 'border-transparent',
                        )}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {modeHelp && <p className="text-xs text-muted-foreground">{modeHelp}</p>}
            </div>

            {/* The amount is the headline of the form. */}
            <Field htmlFor="amount" label={t('common.amount')} error={errors.amount}>
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={amountSignActionLabel}
                      aria-pressed={isAmountNegative}
                      onClick={() => setFormData(prev => ({ ...prev, amount: toggleAmountSign(prev.amount) }))}
                      className={cn(
                        'h-10 w-10 shrink-0 text-lg font-medium tabular-nums',
                        isAmountNegative && 'border-destructive/60 text-destructive hover:text-destructive',
                      )}
                    >
                      {isAmountNegative ? '−' : '+'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{amountSignActionLabel}</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  pattern={DECIMAL_INPUT_PATTERN}
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder={formatNumber(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  value={formData.amount}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, amount: e.target.value }));
                    clearError('amount');
                  }}
                  className={cn(
                    'h-16 min-w-0 flex-1 text-4xl font-light leading-none tracking-[-0.04em] tabular-nums sm:text-[56px] md:text-[56px]',
                    isAmountNegative && 'text-destructive',
                  )}
                  {...fieldAria('amount', errors.amount)}
                />
                {sourceCurrency && (
                  <span className="shrink-0 text-xl text-muted-foreground sm:text-2xl" aria-hidden="true">
                    {currencySymbol(sourceCurrency)}
                  </span>
                )}
              </div>
            </Field>

            <Field htmlFor="notes" label={t('common.notes')}>
              <Input
                id="notes"
                autoComplete="off"
                placeholder={t('pages.transactions.notesPlaceholder')}
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2">
              <Field htmlFor="date" label={t('common.date')}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      id="date"
                      type="button"
                      className={cn(
                        'flex h-[42px] w-full items-center justify-between gap-2 py-0 text-left text-base md:text-[15px]',
                        fieldLine,
                        !formData.date && 'text-muted-foreground dark:text-muted-foreground/80',
                      )}
                    >
                      <span className="truncate">
                        {formData.date
                          ? formatDate(formData.date, { dateStyle: 'medium' })
                          : t('pages.transactions.pickDate')}
                      </span>
                      <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={date => {
                        if (date) {
                          // Adjust for timezone offset to prevent date shifting when converting to string
                          const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                          setFormData(prev => ({ ...prev, date: offsetDate.toISOString().split('T')[0] }));
                        }
                      }}
                      disabled={date => {
                        // Allow future dates (up to a year) so prepaid costs can be booked to the month they belong to
                        const maxDate = new Date();
                        maxDate.setFullYear(maxDate.getFullYear() + 1);
                        return date > maxDate || date < new Date('1900-01-01');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field
                htmlFor="account"
                label={isTransfer ? t('pages.transactions.fromAccount') : t('common.account')}
                error={errors.account}
              >
                <AccountSelect
                  id="account"
                  accounts={accounts}
                  value={formData.account_id_fk}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, account_id_fk: value }));
                    clearError('account');
                  }}
                  placeholder={t('pages.transactions.selectAccount')}
                  {...fieldAria('account', errors.account)}
                />
              </Field>
            </div>

            {isTransfer && (
              <Field htmlFor="to-account" label={t('pages.transactions.toAccount')} error={errors.toAccount}>
                <AccountSelect
                  id="to-account"
                  accounts={accounts}
                  excludeIds={[formData.account_id_fk]}
                  value={transferToAccountId}
                  onValueChange={value => {
                    setTransferToAccountId(value);
                    setTransferDestAmount('');
                    clearError('toAccount', 'destAmount');
                  }}
                  placeholder={t('pages.transactions.selectDestinationAccount')}
                  {...fieldAria('to-account', errors.toAccount)}
                />
              </Field>
            )}

            {isCrossCurrency && (
              <Field
                htmlFor="dest-amount"
                label={`${t('pages.transactions.receivedAmount')} (${destCurrency})`}
                error={errors.destAmount}
                hint={t('pages.transactions.crossCurrencyNote')}
              >
                <Input
                  id="dest-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={transferDestAmount}
                  onChange={e => {
                    setTransferDestAmount(e.target.value);
                    clearError('destAmount');
                  }}
                  className="tabular-nums"
                  {...fieldAria('dest-amount', errors.destAmount)}
                />
                {transferDestAmount && parseDecimalInput(formData.amount) && parseDecimalInput(transferDestAmount) && (() => {
                  // Both directions, always. Which one reads naturally depends on the pair
                  // (1 EUR = 25 CZK is obvious; 1 CZK = 0.04 EUR is not), and which side you
                  // sent from is an accident of the transfer, not of how you think about
                  // the rate — so we never make the user flip it in their head.
                  const rate = parseDecimalInput(transferDestAmount)! / Math.abs(parseDecimalInput(formData.amount)!);
                  return (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t('pages.transactions.impliedRate')}:{' '}
                      <span className="tabular-nums">1 {sourceCurrency} = {formatRate(rate)} {destCurrency}</span>
                      {' · '}
                      <span className="tabular-nums">1 {destCurrency} = {formatRate(1 / rate)} {sourceCurrency}</span>
                    </p>
                  );
                })()}
              </Field>
            )}

            {mode === 'standard' && (
              <Field htmlFor="category" label={t('common.category')} error={errors.category}>
                <Select
                  value={formData.category_id_fk}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, category_id_fk: value }));
                    clearError('category');
                  }}
                >
                  <SelectTrigger id="category" {...fieldAria('category', errors.category)}>
                    <SelectValue placeholder={t('pages.transactions.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_TYPE_ORDER
                      .map(type => ({
                        type,
                        cats: categories
                          .filter(c => c.is_active !== false && c.type === type)
                          .sort((a, b) => a.category_name.localeCompare(b.category_name)),
                      }))
                      .filter(g => g.cats.length > 0)
                      .map((g, i) => (
                        <SelectGroup key={g.type}>
                          <SelectLabel
                            className={cn(
                              'pb-1 pl-2 pr-2 text-xs font-normal text-muted-foreground',
                              i > 0 && 'mt-1 border-t border-border pt-2',
                            )}
                          >
                            {t(CATEGORY_TYPE_LABEL_KEY[g.type])}
                          </SelectLabel>
                          {g.cats.map(cat => (
                            <SelectItem key={cat.categories_id_pk} value={cat.categories_id_pk.toString()}>
                              {cat.category_name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {!isTransfer && (
              <Field
                htmlFor="fund"
                label={isWithdrawal ? t('pages.transactions.savingsFund') : t('pages.transactions.savingsFundOptional')}
                error={errors.fund}
                hint={isWithdrawal ? undefined : t('pages.transactions.fundHelp')}
              >
                <Select
                  value={formData.savings_fund_id_fk || 'none'}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, savings_fund_id_fk: value === 'none' ? '' : value }));
                    clearError('fund');
                  }}
                >
                  <SelectTrigger id="fund" {...fieldAria('fund', errors.fund)}>
                    <SelectValue placeholder={t('pages.transactions.selectFund')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none')}</SelectItem>
                    {funds
                      .filter(f => f.fund_is_active !== false)
                      .sort((a, b) => a.fund_name.localeCompare(b.fund_name))
                      .map(fund => (
                        <SelectItem key={fund.savings_funds_id_pk} value={fund.savings_funds_id_pk}>
                          {fund.fund_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {!isTransfer && (
              <Field
                htmlFor="tags"
                label={t('pages.transactions.tags')}
                labelAction={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onManageTags}
                  >
                    {t('pages.transactions.manageTags')}
                  </Button>
                }
              >
                <TagMultiSelect
                  id="tags"
                  tags={tags}
                  value={formData.tags}
                  onChange={ids => setFormData(prev => ({ ...prev, tags: ids }))}
                />
              </Field>
            )}
          </div>

          <DialogFooter className="mt-6 sm:space-x-0 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {selectedTransaction
                ? t('common.save')
                : isTransfer
                  ? t('pages.transactions.addTransfer')
                  : t('pages.transactions.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
