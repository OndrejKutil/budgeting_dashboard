import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { interpolate } from '@/components/data/interpolate';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUser } from '@/contexts/user-context';
import type { SavingsFund } from '@/lib/api/types';
import { formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { isOptimistic } from '@/lib/optimistic';
import { cn } from '@/lib/utils';
import { flowOf, hasTarget, progressOf, savedOf } from './helpers';

interface FundRowProps {
  fund: SavingsFund;
  onEdit: (fund: SavingsFund) => void;
  onActivate: (fund: SavingsFund) => void;
  onDelete: (fund: SavingsFund) => void;
}

/** Whole-amount figure with the currency set small and muted beside the number. */
function SavedAmount({ value, currency }: { value: number; currency: string }) {
  return (
    <SensitiveValue className="whitespace-nowrap">
      {formatMoneyParts(value, currency, 0).map((part, index, parts) => {
        if (part.type === 'currency') {
          return (
            <span
              key={index}
              className={cn('text-[0.5em] text-muted-foreground', index === 0 ? 'mr-1.5' : 'ml-1.5')}
            >
              {part.value}
            </span>
          );
        }
        const neighbourIsCurrency = parts[index - 1]?.type === 'currency' || parts[index + 1]?.type === 'currency';
        if (part.type === 'literal' && neighbourIsCurrency) return null;
        return <span key={index}>{part.value}</span>;
      })}
    </SensitiveValue>
  );
}

export function FundRow({ fund, onEdit, onActivate, onDelete }: FundRowProps) {
  const { t, formatNumber, formatDate, currency } = useUser();

  const saved = savedOf(fund);
  const flow = flowOf(fund);
  const targeted = hasTarget(fund);
  const progress = progressOf(fund);
  const complete = targeted && progress >= 100;
  const inactive = fund.fund_is_active === false;
  // Temp id until the server row arrives: actions would 404, so they stay disabled.
  const pending = isOptimistic(fund);
  const lineRatio = targeted ? Math.max(0, Math.min(progress, 100)) : 0;

  // Below the goal the percent is cut, never rounded up, so "100%" only appears once the goal is
  // reached; `|| 0` turns -0 (tiny negative progress) into 0.
  const shownPercent = (complete ? Math.round(progress) : Math.trunc(progress)) || 0;
  const percent = formatNumber(shownPercent / 100, { style: 'percent', maximumFractionDigits: 0 });

  let projection: string | null = null;
  if (targeted && !complete && flow !== 0) {
    if (flow > 0) {
      const monthsToGo = Math.ceil((fund.target_amount - saved) / flow);
      const projected = new Date();
      projected.setMonth(projected.getMonth() + monthsToGo);
      projection = t('pages.funds.projection', { date: formatDate(projected, { month: 'short', year: 'numeric' }) });
    } else {
      projection = t('states.netOutflowHint');
    }
  }

  const flowText =
    flow === 0
      ? t('pages.funds.flowNone')
      : t('pages.funds.flowIn', { amount: `${flow > 0 ? '+' : '−'}${formatMoneyWhole(Math.abs(flow), currency)}` });

  return (
    <li
      className={cn(
        'group relative grid grid-cols-[3px_minmax(6rem,1fr)_auto_2rem] items-center gap-x-3.5 gap-y-1 border-b border-border py-4',
        'md:grid-cols-[3px_minmax(0,1fr)_11.875rem_auto_2rem] md:gap-x-[1.375rem]',
        (inactive || pending) && 'opacity-60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'col-start-1 row-span-2 self-stretch rounded-[2px] md:row-span-1',
          flow > 0 ? 'bg-success' : flow < 0 ? 'bg-destructive' : 'bg-muted-foreground/40',
        )}
      />

      <div className="col-start-2 row-start-1 min-w-0">
        <h3 className="line-clamp-2 break-words text-base font-medium tracking-[-0.01em] sm:text-lg md:line-clamp-1">{fund.fund_name}</h3>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          {targeted ? (
            <SensitiveValue>
              {interpolate(t('pages.funds.progressOf'), {
                percent,
                target: formatMoneyWhole(fund.target_amount, currency),
              })}
            </SensitiveValue>
          ) : (
            t('pages.funds.noTarget')
          )}
          {complete && <span className="whitespace-nowrap text-success"> · {t('pages.funds.goalReached')}</span>}
          {inactive && <span> · {t('states.inactive')}</span>}
        </p>
        {projection && <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{projection}</p>}
      </div>

      <p
        className={cn(
          'col-span-2 col-start-2 row-start-2 min-w-0 truncate text-[0.8125rem] md:col-span-1 md:col-start-3 md:row-start-1 md:text-right md:text-[0.84375rem]',
          flow > 0 ? 'text-success' : flow < 0 ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {flow === 0 ? flowText : <SensitiveValue>{flowText}</SensitiveValue>}
      </p>

      <p
        className={cn(
          'col-start-3 row-start-1 shrink-0 whitespace-nowrap text-right text-xl font-normal min-[400px]:text-2xl tracking-[-0.03em] tabular-nums md:col-start-4 md:text-[2.125rem]',
          saved < 0 ? 'text-destructive' : 'text-foreground',
          // After the size classes: tailwind-merge drops a leading class that precedes a text-size one.
          'leading-none',
        )}
      >
        <SavedAmount value={saved} currency={currency} />
      </p>

      <div className="col-start-4 row-start-1 md:col-start-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`${t('common.actions')}: ${fund.fund_name}`}
              className="-mr-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(fund)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            {inactive && (
              <DropdownMenuItem onClick={() => onActivate(fund)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.activate')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(fund)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {lineRatio > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px pl-[1.0625rem] md:pl-[1.5625rem]"
        >
          <span
            className="block h-px bg-foreground/55"
            style={{ width: `${lineRatio}%` }}
          />
        </span>
      )}
    </li>
  );
}
