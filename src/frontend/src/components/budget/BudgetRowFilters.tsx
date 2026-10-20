import { useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import type { Category, Tag } from '@/lib/api/types/base';
import type { BudgetGroup } from './budget-rows';

interface Props {
    group: BudgetGroup;
    categoryIds: number[];
    tagIds: number[];
    categories: Category[];
    tags: Tag[];
    onChange: (next: { category_ids?: number[]; tags?: number[] }) => void;
}

const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

/** One picker for both categories and tags; chips double as the trigger and are removable in place. */
export function BudgetRowFilters({ group, categoryIds, tagIds, categories, tags, onChange }: Props) {
    const { t } = useUser();
    const [open, setOpen] = useState(false);

    const groupCategories = useMemo(
        () => categories
            .filter(c => c.is_active !== false && c.type === group)
            .sort((a, b) => a.category_name.localeCompare(b.category_name)),
        [categories, group],
    );
    const sortedTags = useMemo(() => [...tags].sort((a, b) => a.tag_name.localeCompare(b.tag_name)), [tags]);

    const selectedCats = categoryIds
        .map(id => categories.find(c => c.categories_id_pk === id))
        .filter((c): c is Category => !!c);
    const selectedTags = tagIds
        .map(id => tags.find(tg => tg.tags_id_pk === id))
        .filter((tg): tg is Tag => !!tg);
    const hasAny = selectedCats.length + selectedTags.length > 0;

    const chip = (key: string, label: string, kind: 'cat' | 'tag', onRemove: () => void) => (
        <span
            key={key}
            className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs',
                kind === 'cat' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground',
            )}
        >
            {kind === 'tag' && <span aria-hidden="true">#</span>}
            {label}
            <button
                type="button"
                aria-label={`${t('common.delete')} ${label}`}
                className="rounded-sm text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <X className="h-3 w-3" />
            </button>
        </span>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="flex flex-wrap items-center gap-1 min-h-8">
                {selectedCats.map(c => chip(`c${c.categories_id_pk}`, c.category_name, 'cat',
                    () => onChange({ category_ids: categoryIds.filter(id => id !== c.categories_id_pk) })))}
                {selectedTags.map(tg => chip(`t${tg.tags_id_pk}`, tg.tag_name, 'tag',
                    () => onChange({ tags: tagIds.filter(id => id !== tg.tags_id_pk) })))}
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                            // Keep the empty state discoverable; once there are chips, only show on row hover.
                            hasAny && 'md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100',
                            open && 'opacity-100',
                        )}
                    >
                        <Plus className="h-3 w-3" />
                        {!hasAny && t('pages.budgetMaker.addFilter')}
                    </button>
                </PopoverTrigger>
            </div>
            <PopoverContent className="w-64 p-0" align="start">
                <Command>
                    <CommandInput placeholder={t('pages.budgetMaker.searchFilters')} />
                    <CommandList>
                        <CommandEmpty>{t('pages.budgetMaker.noFilterMatches')}</CommandEmpty>
                        {groupCategories.length > 0 && (
                            <CommandGroup heading={t('pages.budgetMaker.categories')}>
                                {groupCategories.map(c => (
                                    <CommandItem
                                        key={`c${c.categories_id_pk}`}
                                        value={`category ${c.category_name} ${c.categories_id_pk}`}
                                        onSelect={() => onChange({ category_ids: toggle(categoryIds, c.categories_id_pk) })}
                                    >
                                        <Check className={cn('mr-2 h-3.5 w-3.5', categoryIds.includes(c.categories_id_pk) ? 'opacity-100' : 'opacity-0')} />
                                        {c.category_name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        {groupCategories.length > 0 && sortedTags.length > 0 && <CommandSeparator />}
                        {sortedTags.length > 0 && (
                            <CommandGroup heading={t('pages.budgetMaker.tags')}>
                                {sortedTags.map(tg => (
                                    <CommandItem
                                        key={`t${tg.tags_id_pk}`}
                                        value={`tag ${tg.tag_name} ${tg.tags_id_pk}`}
                                        onSelect={() => onChange({ tags: toggle(tagIds, tg.tags_id_pk) })}
                                    >
                                        <Check className={cn('mr-2 h-3.5 w-3.5', tagIds.includes(tg.tags_id_pk) ? 'opacity-100' : 'opacity-0')} />
                                        <span className="text-muted-foreground mr-0.5">#</span>{tg.tag_name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
