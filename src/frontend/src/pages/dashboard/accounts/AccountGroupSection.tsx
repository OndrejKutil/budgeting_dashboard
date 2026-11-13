import { useId, type ReactNode } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import type { AccountGroup } from '@/lib/api/types';
import { FlowText } from './FlowText';
import { MoneyFigure } from './MoneyFigure';

interface AccountGroupSectionProps {
  title: string;
  caption?: string;
  /** Total in the base currency; null when no member has a usable base value. */
  total: number | null;
  /** This month's combined flow in the base currency; null when unknown. */
  flow: number | null;
  /** Present for real groups only: rename / delete live behind a quiet menu in the heading. */
  group?: AccountGroup;
  onRename?: (group: AccountGroup) => void;
  onDelete?: (groupId: string) => void;
  children: ReactNode;
}

/** A group (or "Other accounts") as a real heading with its total, and its rows indented beneath. */
export function AccountGroupSection({
  title,
  caption,
  total,
  flow,
  group,
  onRename,
  onDelete,
  children,
}: AccountGroupSectionProps) {
  const { t, currency } = useUser();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="mt-10 first:mt-0">
      <div className="flex items-baseline gap-x-3.5 border-b border-foreground/30 pb-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3.5 gap-y-0.5">
          <h2 id={headingId} className="min-w-0 truncate text-[1.375rem] font-medium tracking-[-0.02em]">
            {title}
          </h2>
          {caption && <span className="text-[0.8125rem] text-muted-foreground">{caption}</span>}
        </div>
        <div className="shrink-0 text-right lg:mr-[0.625rem]">
          <div className="text-[1.375rem] tracking-[-0.02em]">
            {total === null ? (
              <span className="text-muted-foreground" aria-label={t('metrics.totalBalance')}>
                —
              </span>
            ) : (
              <>
                <span className="sr-only">{t('metrics.totalBalance')}: </span>
                <MoneyFigure amount={total} currency={currency} />
              </>
            )}
          </div>
          {flow !== null && <FlowText value={flow} currency={currency} className="text-[0.8125rem]" />}
        </div>
        <div className="-mr-2 h-8 w-8 shrink-0 self-start lg:mr-0">
          {group && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('common.actions')}: ${group.group_name}`}
                  className="h-8 w-8 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRename?.(group)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('pages.accounts.renameGroup')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete?.(group.account_groups_id_pk)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('pages.accounts.deleteGroup')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <ul>{children}</ul>
    </section>
  );
}
