import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { tagsApi } from '@/lib/api/endpoints';
import type { Tag } from '@/lib/api/types';
import { useUser } from '@/contexts/user-context';

interface TagMultiSelectProps {
  id?: string;
  tags: Tag[];
  /** Selected existing tag ids. */
  value: number[];
  onChange: (ids: number[]) => void;
  /**
   * Tag names chosen but not created yet. When `onPendingNamesChange` is given, "Create tag"
   * adds the typed name here instead of creating it right away -- for flows (screenshot import)
   * where nothing should be written until the user confirms the whole batch.
   */
  pendingNames?: string[];
  onPendingNamesChange?: (names: string[]) => void;
  /** Short marker shown on pending chips, e.g. "new". */
  pendingLabel?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable multi-select for tags, with "create tag" for names that don't exist yet.
 * Shared by the transaction form and the screenshot import review.
 */
export function TagMultiSelect({
  id,
  tags,
  value,
  onChange,
  pendingNames = [],
  onPendingNamesChange,
  pendingLabel,
  placeholder,
  className,
}: TagMultiSelectProps) {
  const { t } = useUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const tagMap = useMemo(() => {
    const map: Record<number, Tag> = {};
    for (const tag of tags) map[tag.tags_id_pk] = tag;
    return map;
  }, [tags]);

  const selectedTags = useMemo(
    () => value.map((tagId) => tagMap[tagId]).filter(Boolean) as Tag[],
    [value, tagMap]
  );

  const sortedTags = useMemo(() => [...tags].sort((a, b) => a.tag_name.localeCompare(b.tag_name)), [tags]);

  const toggle = (tagId: number) => {
    onChange(value.includes(tagId) ? value.filter((v) => v !== tagId) : [...value, tagId]);
  };

  const createTag = (name: string) => {
    const close = () => {
      setSearch('');
      setOpen(false);
    };

    // An existing tag (or an already-pending name) under a different case is the same tag.
    const folded = name.toLocaleLowerCase();
    const existing = tags.find((tag) => tag.tag_name.toLocaleLowerCase() === folded);
    if (existing) {
      if (!value.includes(existing.tags_id_pk)) onChange([...value, existing.tags_id_pk]);
      close();
      return;
    }

    if (onPendingNamesChange) {
      if (!pendingNames.some((p) => p.toLocaleLowerCase() === folded)) {
        onPendingNamesChange([...pendingNames, name]);
      }
      close();
      return;
    }

    tagsApi
      .create({ tag_name: name })
      .then((res) => {
        const newTag = res.data?.[0];
        if (newTag) {
          queryClient.invalidateQueries({ queryKey: ['tags'] });
          onChange([...value, newTag.tags_id_pk]);
          close();
        }
      })
      .catch(() => {
        toast({ title: t('pages.transactions.createTagFailed'), variant: 'destructive' });
      });
  };

  const hasSelection = selectedTags.length > 0 || pendingNames.length > 0;

  // Selected tags are chips *next to* the combobox button, not children of it: a remove
  // button nested inside another button is invalid HTML and unreachable by keyboard.
  const chipClass =
    'inline-flex max-w-full items-center gap-0.5 rounded-full bg-foreground/[0.08] py-0.5 pl-2.5 pr-1 text-xs text-foreground';
  const removeClass =
    'inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            'flex min-h-[42px] flex-wrap items-center gap-1.5 border-b border-foreground/50 py-1 transition-colors hover:border-foreground/70 dark:border-foreground/40 focus-within:border-primary focus-within:shadow-[0_1px_0_0_hsl(var(--primary))]',
            className,
          )}
        >
          {selectedTags.map((tag) => (
            <span key={tag.tags_id_pk} className={chipClass}>
              <span className="truncate">{tag.tag_name}</span>
              <button
                type="button"
                aria-label={t('pages.transactions.removeTag', { name: tag.tag_name })}
                className={removeClass}
                onClick={() => onChange(value.filter((v) => v !== tag.tags_id_pk))}
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {pendingNames.map((name) => (
            <span key={`pending-${name}`} className={cn(chipClass, 'border border-dashed border-primary/60 bg-transparent')}>
              <span className="truncate">{name}</span>
              {pendingLabel && <span className="text-[10px] text-primary">{pendingLabel}</span>}
              <button
                type="button"
                aria-label={t('pages.transactions.removeTag', { name })}
                className={removeClass}
                onClick={() => onPendingNamesChange?.(pendingNames.filter((p) => p !== name))}
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              role="combobox"
              className="flex h-8 min-w-[6rem] flex-1 items-center gap-1 rounded-sm text-left text-base text-muted-foreground transition-colors hover:text-foreground dark:text-muted-foreground/80 focus-visible:outline-none md:text-[15px]"
            >
              {hasSelection ? (
                <>
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>{t('pages.transactions.addTag')}</span>
                </>
              ) : (
                <span>{placeholder ?? t('pages.transactions.addTags')}</span>
              )}
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t('pages.transactions.searchOrCreateTag')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    createTag(search.trim());
                  }}
                >
                  {t('pages.transactions.createTag')} "<span className="font-medium">{search.trim()}</span>"
                </button>
              ) : (
                t('pages.transactions.noTagsFound')
              )}
            </CommandEmpty>
            <CommandGroup>
              {sortedTags.map((tag) => (
                <CommandItem key={tag.tags_id_pk} value={tag.tag_name} onSelect={() => toggle(tag.tags_id_pk)}>
                  <Check
                    className={cn('mr-2 h-4 w-4', value.includes(tag.tags_id_pk) ? 'opacity-100' : 'opacity-0')}
                  />
                  {tag.tag_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
