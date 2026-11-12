import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AccountBalance } from '@/components/AccountSelect';
import { MultiSelect, type MultiSelectGroup } from '@/components/MultiSelect';
import { accountLabel, useAccountSections } from '@/hooks/use-account-sections';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/user-context';
import type { Account, Category, SavingsFund, Tag } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import {
  CATEGORY_TYPE_LABEL_KEY,
  CATEGORY_TYPE_ORDER,
  DECIMAL_INPUT_PATTERN,
  monthsAgo,
  parseFilter,
  serializeFilter,
} from './helpers';

interface TransactionFiltersProps {
  categories: Category[];
  accounts: Account[];
  funds: SavingsFund[];
  tags: Tag[];
  years: string[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  accountFilter: string;
  setAccountFilter: (value: string) => void;
  fundFilter: string;
  setFundFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  monthFilter: string;
  setMonthFilter: (value: string) => void;
  selectedMonths: string[];
  anyFilterActive: boolean;
  onReset: () => void;
}

/**
 * The filter row: search, the four always-visible filters as quiet text triggers, and a
 * "More" control for the rest (category, fund, amount range, year). Every control reads and
 * writes the same URL-backed state the page queries with, so nothing here owns a filter.
 */
export function TransactionFilters(props: TransactionFiltersProps) {
  const {
    categories, accounts, funds, tags, years,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    accountFilter, setAccountFilter,
    fundFilter, setFundFilter,
    typeFilter, setTypeFilter,
    tagFilter, setTagFilter,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    yearFilter, setYearFilter,
    monthFilter, setMonthFilter,
    selectedMonths, anyFilterActive, onReset,
  } = props;
  const { t, formatMonth } = useUser();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  // Option groups for the multi-select filters. Accounts reuse the picker's sectioning so
  // the filter and the form never order the same accounts differently; inactive accounts
  // stay listed here because their past transactions are still in the ledger.
  const accountSections = useAccountSections(accounts, { includeInactive: true });
  const accountOptionGroups: MultiSelectGroup[] = accountSections.map(section => ({
    key: section.key,
    label: accountSections.length > 1 ? section.label : undefined,
    options: section.items.map(acc => ({
      value: acc.accounts_id_pk,
      label: accountLabel(acc),
      hint: <AccountBalance account={acc} />,
    })),
  }));

  const categoryOptionGroups: MultiSelectGroup[] = CATEGORY_TYPE_ORDER
    .map(type => ({
      key: type,
      label: t(CATEGORY_TYPE_LABEL_KEY[type]),
      options: categories
        .filter(c => c.type === type)
        .sort((a, b) => a.category_name.localeCompare(b.category_name))
        .map(c => ({ value: c.categories_id_pk.toString(), label: c.category_name })),
    }))
    .filter(group => group.options.length > 0);

  const typeOptionGroups: MultiSelectGroup[] = [{
    key: 'type',
    options: (['income', 'expense', 'saving', 'investment'] as const)
      .map(type => ({ value: type, label: t(`types.${type}`) })),
  }];

  const fundOptionGroups: MultiSelectGroup[] = [{
    key: 'fund',
    options: [
      // 'none' is the unassigned sentinel the backend turns into an IS NULL check.
      { value: 'none', label: t('pages.transactions.notAssigned') },
      ...funds
        .slice()
        .sort((a, b) => a.fund_name.localeCompare(b.fund_name))
        .map(f => ({ value: f.savings_funds_id_pk, label: f.fund_name })),
    ],
  }];

  const tagOptionGroups: MultiSelectGroup[] = [{
    key: 'tag',
    options: tags
      .slice()
      .sort((a, b) => a.tag_name.localeCompare(b.tag_name))
      .map(tag => ({ value: tag.tags_id_pk.toString(), label: tag.tag_name })),
  }];

  // Months are listed under year headers so a span like Nov + Dec + Jan can be selected as
  // one thing. Same year range the Year select offers — a second, different range would
  // just raise the question of why they disagree.
  const monthOptionGroups: MultiSelectGroup[] = years.map(year => ({
    key: year,
    label: year,
    options: [...Array(12)].map((_, i) => ({
      value: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: formatMonth(i),
      // In the menu the year header carries the year; on the trigger there is no header,
      // and a bare "November" would not say which year it came from.
      triggerLabel: `${formatMonth(i)} ${year}`,
    })),
  }));

  const datePresets = [
    {
      key: 'this-month',
      label: t('pages.transactions.thisMonth'),
      onSelect: () => setMonthFilter(serializeFilter([monthsAgo(0)])),
    },
    {
      key: 'last-month',
      label: t('pages.transactions.lastMonth'),
      onSelect: () => setMonthFilter(serializeFilter([monthsAgo(1)])),
    },
    {
      key: 'last-3-months',
      label: t('pages.transactions.last3Months'),
      onSelect: () => setMonthFilter(serializeFilter([monthsAgo(2), monthsAgo(1), monthsAgo(0)])),
    },
    {
      // The only preset with no months: clearing them is what hands the date range
      // back to the Year select.
      key: 'this-year',
      label: t('pages.transactions.thisYear'),
      onSelect: () => {
        setYearFilter(new Date().getFullYear().toString());
        setMonthFilter('all');
      },
    },
  ];

  // Filters that live behind "More". The year only counts once it differs from the default.
  const hiddenActiveCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (fundFilter !== 'all' ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (yearFilter !== new Date().getFullYear().toString() ? 1 : 0);

  const moreFields = (
    <div className="grid gap-5">
      <Field htmlFor="filter-category" label={t('common.category')}>
        <MultiSelect
          id="filter-category"
          groups={categoryOptionGroups}
          selected={parseFilter(categoryFilter)}
          onChange={values => setCategoryFilter(serializeFilter(values))}
          allLabel={t('pages.transactions.allCategories')}
        />
      </Field>
      <Field htmlFor="filter-fund" label={t('pages.transactions.fund')}>
        <MultiSelect
          id="filter-fund"
          groups={fundOptionGroups}
          selected={parseFilter(fundFilter)}
          onChange={values => setFundFilter(serializeFilter(values))}
          allLabel={t('pages.transactions.allFunds')}
        />
      </Field>
      <div className="grid grid-cols-2 gap-5">
        <Field htmlFor="filter-min" label={t('pages.transactions.minAmount')}>
          <Input
            id="filter-min"
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_INPUT_PATTERN}
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
          />
        </Field>
        <Field htmlFor="filter-max" label={t('pages.transactions.maxAmount')}>
          <Input
            id="filter-max"
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_INPUT_PATTERN}
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
          />
        </Field>
      </div>
      {/* Picked months carry their own year, so the Year select has nothing left to say
          while any are selected. */}
      <Field htmlFor="filter-year" label={t('common.year')}>
        <Select value={yearFilter} onValueChange={setYearFilter} disabled={selectedMonths.length > 0}>
          <SelectTrigger id="filter-year"><SelectValue placeholder={t('common.year')} /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );

  const moreTriggerClass = cn(
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm py-2 text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    hiddenActiveCount > 0 ? 'text-foreground' : 'text-muted-foreground',
  );
  const moreTriggerContent = (
    <>
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      <span className={cn('border-b-2 pb-[3px]', hiddenActiveCount > 0 ? 'border-primary' : 'border-transparent')}>
        {t('pages.transactions.more')}
      </span>
      {hiddenActiveCount > 0 && (
        <span
          aria-label={t('pages.transactions.moreActiveCount', { count: hiddenActiveCount })}
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums"
        >
          {hiddenActiveCount}
        </span>
      )}
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="relative min-w-[200px] flex-1 basis-full md:basis-0">
          <Search
            className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t('pages.transactions.searchLabel')}
            placeholder={t('pages.transactions.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-7 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-0">
          <MultiSelect
            variant="quiet"
            ariaLabel={t('pages.transactions.dateFilter')}
            groups={monthOptionGroups}
            selected={selectedMonths}
            onChange={values => setMonthFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allMonths')}
            idleLabel={t('pages.transactions.allOfYear', { year: yearFilter })}
            quickActions={datePresets}
          />
          <MultiSelect
            variant="quiet"
            ariaLabel={t('common.account')}
            groups={accountOptionGroups}
            selected={parseFilter(accountFilter)}
            onChange={values => setAccountFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allAccounts')}
          />
          <MultiSelect
            variant="quiet"
            ariaLabel={t('common.type')}
            groups={typeOptionGroups}
            selected={parseFilter(typeFilter)}
            onChange={values => setTypeFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allTypes')}
          />
          <MultiSelect
            variant="quiet"
            ariaLabel={t('pages.transactions.tags')}
            groups={tagOptionGroups}
            selected={parseFilter(tagFilter)}
            onChange={values => setTagFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allTags')}
          />

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMoreOpen(open => !open)}
              aria-expanded={moreOpen}
              aria-controls="transaction-more-filters"
              className={moreTriggerClass}
            >
              {moreTriggerContent}
            </button>
          ) : (
            <Popover>
              <PopoverTrigger className={moreTriggerClass} aria-label={hiddenActiveCount > 0
                  ? t('pages.transactions.moreFiltersActive', { count: hiddenActiveCount })
                  : t('pages.transactions.moreFilters')}>
                {moreTriggerContent}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-5">
                {moreFields}
              </PopoverContent>
            </Popover>
          )}

          {anyFilterActive && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-sm py-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('pages.transactions.resetFilters')}
            </button>
          )}
        </div>
      </div>

      {isMobile && moreOpen && (
        <div id="transaction-more-filters" className="mt-3 border-t border-border pt-4">
          {moreFields}
        </div>
      )}
    </div>
  );
}
