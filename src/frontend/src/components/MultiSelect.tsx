/**
 * A checkbox dropdown for filters that accept more than one value.
 *
 * Radix's Select is single-value by construction, so the filter bar's pickers are built
 * on DropdownMenu instead — but styled as a Select trigger, because visually they are
 * still one row of identical filter controls and swapping half of them for a different
 * shape would read as an inconsistency rather than a feature.
 *
 * Empty selection means "no filter", which is why the trigger says "All accounts" rather
 * than "0 selected": nothing picked is the unfiltered state, not an empty result.
 */

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  /**
   * Trigger text when this is the only pick, where the option's group header is no longer
   * on screen to disambiguate it — "November 2025" rather than a bare "November".
   */
  triggerLabel?: string;
  /** Muted text trailing the label — an account balance, say. */
  hint?: ReactNode;
}

export interface MultiSelectGroup {
  key: string;
  /** Omit on a lone group to render the options without a header. */
  label?: string;
  options: MultiSelectOption[];
}

interface MultiSelectProps {
  groups: MultiSelectGroup[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Trigger text when nothing is selected, e.g. "All accounts". */
  allLabel: string;
  className?: string;
  id?: string;
}

// Matches SelectTrigger so a MultiSelect sits in the filter grid without standing out.
const TRIGGER =
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function MultiSelect({
  groups,
  selected,
  onChange,
  allLabel,
  className,
  id,
}: MultiSelectProps) {
  const { t } = useUser();

  const options = groups.flatMap(group => group.options);
  const chosen = new Set(selected);

  const toggle = (value: string) => {
    const next = chosen.has(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(next);
  };

  // One pick reads better as its own name than as "1 selected"; past that the names stop
  // fitting in a filter-grid cell and a count is the only honest summary.
  const onlyPick = selected.length === 1 ? options.find(o => o.value === selected[0]) : undefined;
  const triggerLabel =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (onlyPick ? (onlyPick.triggerLabel ?? onlyPick.label) : allLabel)
        : t('common.countSelected', { count: selected.length });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger id={id} className={cn(TRIGGER, className)}>
        <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
          {triggerLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 min-w-56 overflow-y-auto"
      >
        <DropdownMenuItem
          disabled={selected.length === 0}
          onSelect={() => onChange([])}
          className="text-muted-foreground"
        >
          {allLabel}
        </DropdownMenuItem>
        {groups.map(group => (
          <div key={group.key}>
            {group.label && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  {group.label}
                </DropdownMenuLabel>
              </>
            )}
            {group.options.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={chosen.has(option.value)}
                // Without this the menu closes on every tick, which defeats multi-select.
                onSelect={event => event.preventDefault()}
                onCheckedChange={() => toggle(option.value)}
                className="gap-4 pr-3"
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
