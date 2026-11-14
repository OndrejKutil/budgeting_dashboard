import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser } from '@/contexts/user-context';
import type { StatementMapping, StatementPreviewData } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface MappingStepProps {
  preview: StatementPreviewData;
  onSubmit: (mapping: StatementMapping) => void;
  onBack: () => void;
  isPending: boolean;
  errorMessage: string | null;
}

/** Select value meaning "nothing" -- Radix Select can't use an empty string as an item value. */
const NONE = '__none__';

type AmountMode = 'single' | 'split';

/**
 * Only for a file the backend did not recognise: the first rows as a table and the three
 * questions (date, amount, description), with the detected answers preselected.
 */
export function MappingStep({ preview, onSubmit, onBack, isPending, errorMessage }: MappingStepProps) {
  const { t } = useUser();
  const guess = preview.mapping;
  const headers = preview.headers.filter((h) => h !== '');

  const [dateColumn, setDateColumn] = useState(guess?.date_column ?? '');
  const [amountMode, setAmountMode] = useState<AmountMode>(
    guess && !guess.amount_column && (guess.debit_column || guess.credit_column) ? 'split' : 'single',
  );
  const [amountColumn, setAmountColumn] = useState(guess?.amount_column ?? '');
  const [debitColumn, setDebitColumn] = useState(guess?.debit_column ?? '');
  const [creditColumn, setCreditColumn] = useState(guess?.credit_column ?? '');
  const [merchantColumn, setMerchantColumn] = useState(guess?.merchant_columns[0] ?? '');
  const [decimalSeparator, setDecimalSeparator] = useState<',' | '.'>(guess?.decimal_separator ?? ',');

  const amountReady = amountMode === 'single' ? amountColumn !== '' : debitColumn !== '' || creditColumn !== '';
  const canSubmit = dateColumn !== '' && amountReady && !isPending;

  const submit = () => {
    onSubmit({
      date_column: dateColumn,
      date_format: null,
      amount_column: amountMode === 'single' ? amountColumn : null,
      debit_column: amountMode === 'split' && debitColumn ? debitColumn : null,
      credit_column: amountMode === 'split' && creditColumn ? creditColumn : null,
      decimal_separator: decimalSeparator,
      currency_column: guess?.currency_column ?? null,
      // Keep any other merchant columns the guess found behind the one the user picked.
      merchant_columns: merchantColumn
        ? [merchantColumn, ...(guess?.merchant_columns ?? []).filter((c) => c !== merchantColumn)]
        : [],
      message_columns: guess?.message_columns ?? [],
      own_account_column: guess?.own_account_column ?? null,
    });
  };

  /** Which role(s) the current choices give a column, shown under its header. */
  const roleOf = (header: string): string[] => {
    const roles: string[] = [];
    if (header === dateColumn) roles.push(t('pages.statementImport.roleDate'));
    if (amountMode === 'single' && header === amountColumn) roles.push(t('pages.statementImport.roleAmount'));
    if (amountMode === 'split' && header === debitColumn) roles.push(t('pages.statementImport.roleDebit'));
    if (amountMode === 'split' && header === creditColumn) roles.push(t('pages.statementImport.roleCredit'));
    if (header === merchantColumn) roles.push(t('pages.statementImport.roleDescription'));
    return roles;
  };

  const columnSelect = (id: string, value: string, onChange: (v: string) => void, optional = false) => (
    <Select value={value === '' && optional ? NONE : value} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('pages.statementImport.chooseColumn')} />
      </SelectTrigger>
      <SelectContent>
        {optional && <SelectItem value={NONE}>{t('common.none')}</SelectItem>}
        {headers.map((header) => (
          <SelectItem key={header} value={header}>
            {header}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <section aria-labelledby="statement-mapping" className="mt-10">
      <div className="border-b border-foreground/30 pb-3">
        <h2 id="statement-mapping" className="text-[1.125rem] font-medium tracking-[-0.01em]">
          {t('pages.statementImport.mappingTitle')}
        </h2>
        <p className="mt-0.5 max-w-[65ch] text-[0.8125rem] text-muted-foreground">{t('pages.statementImport.mappingDescription')}</p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => {
                const roles = roleOf(header);
                return (
                  <TableHead key={header} className="whitespace-nowrap align-top">
                    <span className={cn(roles.length > 0 && 'text-foreground')}>{header}</span>
                    {roles.length > 0 && <span className="block text-xs font-normal text-primary">{roles.join(' · ')}</span>}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.sample_rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {preview.headers.map((header, columnIndex) =>
                  header === '' ? null : (
                    <TableCell key={columnIndex} className="max-w-[16rem] truncate whitespace-nowrap text-muted-foreground">
                      {row[columnIndex] ?? ''}
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        <Field htmlFor="map-date" label={t('pages.statementImport.questionDate')}>
          {columnSelect('map-date', dateColumn, setDateColumn)}
        </Field>
        <Field htmlFor="map-merchant" label={t('pages.statementImport.questionDescription')}>
          {columnSelect('map-merchant', merchantColumn, setMerchantColumn, true)}
        </Field>
        <Field htmlFor="map-decimal" label={t('pages.statementImport.questionDecimal')}>
          <Select value={decimalSeparator} onValueChange={(v) => setDecimalSeparator(v as ',' | '.')}>
            <SelectTrigger id="map-decimal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=",">{t('pages.statementImport.decimalComma')}</SelectItem>
              <SelectItem value=".">{t('pages.statementImport.decimalDot')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field htmlFor="map-amount-mode" label={t('pages.statementImport.questionAmount')}>
          <Select value={amountMode} onValueChange={(v) => setAmountMode(v as AmountMode)}>
            <SelectTrigger id="map-amount-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t('pages.statementImport.amountSingle')}</SelectItem>
              <SelectItem value="split">{t('pages.statementImport.amountSplit')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {amountMode === 'single' ? (
          <Field htmlFor="map-amount" label={t('pages.statementImport.amountColumn')}>
            {columnSelect('map-amount', amountColumn, setAmountColumn)}
          </Field>
        ) : (
          <>
            <Field htmlFor="map-debit" label={t('pages.statementImport.debitColumn')}>
              {columnSelect('map-debit', debitColumn, setDebitColumn, true)}
            </Field>
            <Field htmlFor="map-credit" label={t('pages.statementImport.creditColumn')}>
              {columnSelect('map-credit', creditColumn, setCreditColumn, true)}
            </Field>
          </>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onBack} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="button" className="h-11 px-5" disabled={!canSubmit} onClick={submit}>
          {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t('pages.statementImport.useMapping')}
        </Button>
      </div>
    </section>
  );
}
