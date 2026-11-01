import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          className={cn('w-full justify-start h-auto min-h-10 flex-wrap gap-1 px-3 py-2', className)}
        >
          {hasSelection ? (
            <>
              {selectedTags.map((tag) => (
                <span
                  key={tag.tags_id_pk}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs px-2 py-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((v) => v !== tag.tags_id_pk));
                  }}
                >
                  {tag.tag_name}
                  <X aria-hidden="true" className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                </span>
              ))}
              {pendingNames.map((name) => (
                <span
                  key={`pending-${name}`}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/60 text-xs px-2 py-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPendingNamesChange?.(pendingNames.filter((p) => p !== name));
                  }}
                >
                  {name}
                  {pendingLabel && <span className="text-[10px] text-primary">{pendingLabel}</span>}
                  <X aria-hidden="true" className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                </span>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground text-sm font-normal">
              {placeholder ?? t('pages.transactions.addTags')}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent"
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
