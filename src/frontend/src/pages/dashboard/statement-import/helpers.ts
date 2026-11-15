import type { Category, FieldSource, StatementDraftRow } from '@/lib/api/types';
import type { DashboardTranslationKey } from '@/lib/i18n';

/** Mirrors MAX_UPLOAD_BYTES in the backend router. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Rows shown at once inside an expanded line, so a line with hundreds of rows stays responsive. */
export const ROWS_PER_PAGE = 50;

/** Merchants seen at most this often, with no suggestion, fall into "Everything else". */
export const EVERYTHING_ELSE_MAX_ROWS = 2;

export type Direction = 'out' | 'in';

/** The reviewer's edits to one draft row. `category` is '' until one is chosen. */
export interface RowState {
  category: string;
  /** The user chose this row's category individually; line pickers no longer overwrite it. */
  manual: boolean;
  notes: string;
  included: boolean;
}

/** One merchant + direction: the unit the review screen shows. */
export interface MerchantGroup {
  key: string;
  name: string;
  direction: Direction;
  /** Indexes into the preview's `rows`. */
  indexes: number[];
  /** The category the app suggested for this merchant (history or model), as a select value. */
  suggestedCategory: string | null;
  suggestedSource: FieldSource | undefined;
}

export interface Grouping {
  /** Transfers between the user's own accounts (detected, or moved here): not imported by default. */
  own: number[];
  /** The merchant lines the user moved into `own` (they can be moved back). */
  ownMerchants: MerchantGroup[];
  /** Merchant lines that get their own picker, most rows first. */
  lines: MerchantGroup[];
  /** Rows of the small, unsuggested merchants, by direction. */
  elseIndexes: Record<Direction, number[]>;
  /** Rows already in the ledger. */
  duplicates: number[];
  /** Rows that could not be read; left out. */
  errorCount: number;
}

export const directionOf = (amount: number | null): Direction => ((amount ?? 0) < 0 ? 'out' : 'in');

const isSuggested = (source: FieldSource) => source === 'rule' || source === 'model';

/** Key of the merchant line a row belongs to (the unit the user can move into own transfers). */
export const merchantLineKey = (row: StatementDraftRow) => `${row.merchant_key}|${directionOf(row.amount)}`;

export function buildGrouping(rows: StatementDraftRow[], movedKeys: ReadonlySet<string> = new Set(),
): Grouping {
  const groups = new Map<string, MerchantGroup>();
  const own: number[] = [];
  const duplicates: number[] = [];
  let errorCount = 0;

  rows.forEach((row, index) => {
    if (row.error) {
      errorCount += 1;
      return;
    }
    if (row.duplicate) {
      duplicates.push(index);
      return;
    }
    const direction = directionOf(row.amount);
    if (row.own_transfer) {
      own.push(index);
      return;
    }
    const key = `${row.merchant_key}|${direction}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, name: row.merchant, direction, indexes: [], suggestedCategory: null, suggestedSource: undefined };
      groups.set(key, group);
    }
    group.indexes.push(index);
    if (!group.suggestedCategory && isSuggested(row.category_source) && row.category_id_fk !== null) {
      group.suggestedCategory = String(row.category_id_fk);
      group.suggestedSource = row.category_source;
    }
  });

  const lines: MerchantGroup[] = [];
  const moved: MerchantGroup[] = [];
  const elseIndexes: Record<Direction, number[]> = { out: [], in: [] };
  for (const group of groups.values()) {
    if (movedKeys.has(group.key)) {
      moved.push(group);
      own.push(...group.indexes);
    } else if (group.indexes.length <= EVERYTHING_ELSE_MAX_ROWS && !group.suggestedCategory) {
      elseIndexes[group.direction].push(...group.indexes);
    } else {
      lines.push(group);
    }
  }
  lines.sort((a, b) => b.indexes.length - a.indexes.length || a.name.localeCompare(b.name));
  elseIndexes.out.sort((a, b) => a - b);
  elseIndexes.in.sort((a, b) => a - b);

  moved.sort((a, b) => b.indexes.length - a.indexes.length || a.name.localeCompare(b.name));
  own.sort((a, b) => a - b);

  return { own, ownMerchants: moved, lines, elseIndexes, duplicates, errorCount };
}

/** The user's active category with this name (case-insensitive), as a select value, or ''. */
export function findCategoryId(categories: Category[], name: string): string {
  const wanted = name.trim().toLocaleLowerCase();
  const match = categories.find((c) => c.is_active !== false && c.category_name.trim().toLocaleLowerCase() === wanted);
  return match ? String(match.categories_id_pk) : '';
}

/**
 * Starting state of every row: the suggested category where there is one, the "everything else"
 * default for the small merchants, nothing otherwise. Duplicates and unreadable rows start excluded.
 */
export function initialRowStates(
  rows: StatementDraftRow[],
  grouping: Grouping,
  defaults: Record<Direction, string>,
  ownDefault: string,
): RowState[] {
  const states: RowState[] = rows.map((row) => ({
    category: row.category_id_fk !== null ? String(row.category_id_fk) : '',
    manual: false,
    notes: row.notes,
    included: !row.duplicate && !row.error,
  }));
  // Transfers between the user's own accounts are not imported unless the user brings one back.
  for (const index of grouping.own) {
    states[index].included = false;
    states[index].category = ownDefault;
  }
  for (const direction of ['out', 'in'] as const) {
    for (const index of grouping.elseIndexes[direction]) {
      if (!states[index].category) states[index].category = defaults[direction];
    }
  }
  // A duplicate the user brings back should not block the import for want of a category.
  for (const index of grouping.duplicates) {
    if (!states[index].category) states[index].category = defaults[directionOf(rows[index].amount)];
  }
  return states;
}

/** What a line's picker shows: the shared category, or '' with `mixed` when rows differ. */
export function sharedCategory(indexes: number[], states: RowState[]): { value: string; mixed: boolean } {
  let value: string | null = null;
  for (const index of indexes) {
    const category = states[index].category;
    if (value === null) value = category;
    else if (value !== category) return { value: '', mixed: true };
  }
  return { value: value ?? '', mixed: false };
}

/** Sum of the amounts of the included rows among `indexes`. */
export function includedTotal(indexes: number[], rows: StatementDraftRow[], states: RowState[]): { count: number; sum: number } {
  let count = 0;
  let sum = 0;
  for (const index of indexes) {
    if (!states[index].included) continue;
    count += 1;
    sum += rows[index].amount ?? 0;
  }
  return { count, sum };
}

/** Which "...One / ...Few / ...Many" string fits this count in this locale. */
export function pluralKey(locale: string, count: number, prefix: string): DashboardTranslationKey {
  const category = new Intl.PluralRules(locale).select(count);
  const suffix = category === 'one' ? 'One' : category === 'few' ? 'Few' : 'Many';
  return `${prefix}${suffix}` as DashboardTranslationKey;
}

/** "+1 200,00 Kč" / "-640,00 Kč": the sign is always explicit on a statement line. */
export function signedMoney(amount: number, format: (amount: number) => string): string {
  return `${amount > 0 ? '+' : ''}${format(amount)}`;
}

/** The user's first active `exclude`-type category (the default for an own transfer), or ''. */
export function firstExcludeCategory(categories: Category[]): string {
  const first = categories.find((c) => c.is_active !== false && c.type === 'exclude');
  return first ? String(first.categories_id_pk) : '';
}
