import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FigureParts } from '@/components/data/BigFigure';
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

/**
 * One fund. Left: name, then progress toward the target and the projected date. Right: the
 * saved amount with its 30-day change beneath. A targeted fund gets a progress track under
 * the row; the side line shows the direction of the last 30 days.
 */
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
        'grid grid-cols-[3px_minmax(0,1fr)_auto_2rem] items-start gap-x-3.5 border-b border-border py-5 md:gap-x-5',
        (inactive || pending) && 'opacity-60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'row-span-2 self-stretch rounded-[2px]',
          flow > 0 ? 'bg-success' : flow < 0 ? 'bg-destructive' : 'bg-muted-foreground/30',
        )}
      />

      <div className="min-w-0">
        <h3 className="line-clamp-2 break-words text-base font-medium tracking-[-0.01em] md:line-clamp-1">
          {fund.fund_name}
        </h3>
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
          {projection && <span> · {projection}</span>}
          {inactive && <span> · {t('states.inactive')}</span>}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            'whitespace-nowrap text-[1.125rem] tabular-nums tracking-[-0.01em]',
            saved < 0 ? 'text-destructive' : 'text-foreground',
          )}
        >
          <SensitiveValue>
            <FigureParts parts={formatMoneyParts(saved, currency, 0)} currencyScale="0.7em" />
          </SensitiveValue>
        </p>
        <p
          className={cn(
            'mt-0.5 whitespace-nowrap text-[0.8125rem]',
            flow > 0 ? 'text-success' : flow < 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {flow === 0 ? flowText : <SensitiveValue>{flowText}</SensitiveValue>}
        </p>
      </div>

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

      {/* Progress toward the target: a faint full-width track with the reached part filled. */}
      {targeted && (
        <div aria-hidden="true" className="col-span-2 col-start-2 mt-3 h-[2px] rounded-full bg-foreground/10">
          <div
            className={cn('h-full rounded-full', complete ? 'bg-success' : 'bg-foreground/60')}
            style={{ width: `${lineRatio}%` }}
          />
        </div>
      )}
    </li>
  );
}
