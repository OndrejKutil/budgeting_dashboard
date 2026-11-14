import { SelectGroup, SelectItem, SelectLabel } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { useUser } from '@/contexts/user-context';
import type { Category } from '@/lib/api/types';
import type { DashboardTranslationKey } from '@/lib/i18n';

const CATEGORY_TYPE_ORDER = ['expense', 'income', 'saving', 'investment', 'exclude', 'transfer'] as const;
const CATEGORY_TYPE_LABEL_KEY: Record<string, DashboardTranslationKey> = {
  expense: 'metrics.expenses',
  income: 'metrics.income',
  saving: 'types.saving',
  investment: 'metrics.investments',
  exclude: 'types.exclude',
  transfer: 'types.transfer',
};

/** Active categories grouped by type, as `<SelectItem>`s. Shared by the screenshot and statement imports. */
export function CategorySelectItems({ categories, t }: { categories: Category[]; t: ReturnType<typeof useUser>['t'] }) {
  return (
    <>
      {CATEGORY_TYPE_ORDER.map((type) => ({
        type,
        cats: categories
          .filter((c) => c.is_active !== false && c.type === type)
          .sort((a, b) => a.category_name.localeCompare(b.category_name)),
      }))
        .filter((g) => g.cats.length > 0)
        .map((g, gi) => (
          <SelectGroup key={g.type}>
            <SelectLabel
              className={cn(
                'px-2 pb-1 text-xs font-normal text-muted-foreground',
                gi > 0 && 'mt-1 border-t border-border pt-2'
              )}
            >
              {t(CATEGORY_TYPE_LABEL_KEY[g.type])}
            </SelectLabel>
            {g.cats.map((cat) => (
              <SelectItem key={cat.categories_id_pk} value={cat.categories_id_pk.toString()}>
                {cat.category_name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
    </>
  );
}
