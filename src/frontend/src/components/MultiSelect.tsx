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
import { fieldLine } from '@/components/ui/field-line';
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
  /**
   * `field` matches SelectTrigger (label-over-a-line). `quiet` is the filter-bar look: plain
   * text with a chevron, brighter with an amber underline while a value is picked.
   */
  variant?: 'field' | 'quiet';
  /** Trigger text when nothing is selected but the control is still doing something (e.g. "All of 2026"). */
  idleLabel?: string;
  /** Actions pinned above the options, e.g. quick date ranges. They close the menu. */
  quickActions?: { key: string; label: string; onSelect: () => void }[];
  /** Accessible name for the trigger; falls back to the visible text. */
  ariaLabel?: string;
}

const TRIGGER_FIELD = cn('flex h-[42px] w-full items-center justify-between gap-2 py-0 text-left text-base md:text-[15px]', fieldLine);
const TRIGGER_QUIET =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-sm py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function MultiSelect({
  groups,
  selected,
  onChange,
  allLabel,
  className,
  id,
  variant = 'field',
  idleLabel,
  quickActions,
  ariaLabel,
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
      ? (idleLabel ?? allLabel)
      : selected.length === 1
        ? (onlyPick ? (onlyPick.triggerLabel ?? onlyPick.label) : allLabel)
        : t('common.countSelected', { count: selected.length });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        aria-label={ariaLabel ? `${ariaLabel}: ${triggerLabel}` : undefined}
        className={cn(
          variant === 'quiet' ? TRIGGER_QUIET : TRIGGER_FIELD,
          variant === 'quiet' && selected.length > 0 && 'text-foreground',
          className,
        )}
      >
        {/* The quiet variant draws its amber underline as a border: text-decoration does not
            reach into an inline-flex trigger, and a border is not clipped by `truncate`. */}
        <span
          className={cn(
            'truncate',
            variant === 'field' && selected.length === 0 && 'text-muted-foreground dark:text-muted-foreground/80',
            // Mirrored space above the underline keeps the text centred on the chevron and the row.
            variant === 'quiet' && 'max-w-[12rem] border-y-2 border-t-transparent py-[3px]',
            variant === 'quiet' && (selected.length > 0 ? 'border-b-primary' : 'border-b-transparent'),
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown className={cn('shrink-0 opacity-60', variant === 'quiet' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 min-w-56 overflow-y-auto"
      >
        {quickActions?.map(action => (
          <DropdownMenuItem key={action.key} onSelect={action.onSelect}>
            {action.label}
          </DropdownMenuItem>
        ))}
        {quickActions && quickActions.length > 0 && <DropdownMenuSeparator />}
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
                <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
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
