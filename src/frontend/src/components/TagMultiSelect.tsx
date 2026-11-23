import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
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

/**
 * How much of the layout viewport the on-screen keyboard (or pinch zoom) currently hides, from the
 * top and from the bottom. iOS doesn't shrink the layout viewport for the keyboard -- only the
 * visual viewport -- so without this the popover is placed as if the keyboard weren't there and
 * ends up underneath it. Both are 0 on desktop.
 */
function useHiddenViewportInsets(active: boolean) {
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;

    const update = () => {
      const top = Math.max(0, Math.round(vv.offsetTop));
      const bottom = Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height));
      setInsets((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);

  return insets;
}

/** Keeps focus (and so the on-screen keyboard) on the search input when a suggestion is tapped. */
const keepInputFocus = (e: MouseEvent) => e.preventDefault();

/** Touch screens get taller suggestion rows; desktop (fine pointer) keeps the compact ones. */
const itemClass = '[@media(pointer:coarse)]:py-2.5';

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
  const fieldRef = useRef<HTMLDivElement>(null);
  const insets = useHiddenViewportInsets(open);

  // The popover is positioned against the field, clamped to the part of the screen the keyboard
  // doesn't cover. On a phone the tag field is near the bottom of the sheet, so once the keyboard
  // is up the field itself is under it; anchoring to the keyboard's top edge keeps the search
  // input and suggestions visible right above it. Without a keyboard this is the field's own rect.
  const anchorRef = useRef({
    get contextElement() {
      return fieldRef.current ?? undefined;
    },
    getBoundingClientRect() {
      const rect = fieldRef.current?.getBoundingClientRect() ?? new DOMRect();
      const vv = window.visualViewport;
      if (!vv) return rect;
      const visibleBottom = vv.offsetTop + vv.height;
      const top = Math.min(rect.top, visibleBottom);
      const bottom = Math.min(rect.bottom, visibleBottom);
      return new DOMRect(rect.left, top, rect.width, bottom - top);
    },
  });

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
    // Stay open with an empty search so the next tag can be typed straight away.
    setSearch('');

    // An existing tag (or an already-pending name) under a different case is the same tag.
    const folded = name.toLocaleLowerCase();
    const existing = tags.find((tag) => tag.tag_name.toLocaleLowerCase() === folded);
    if (existing) {
      if (!value.includes(existing.tags_id_pk)) onChange([...value, existing.tags_id_pk]);
      return;
    }

    if (onPendingNamesChange) {
      if (!pendingNames.some((p) => p.toLocaleLowerCase() === folded)) {
        onPendingNamesChange([...pendingNames, name]);
      }
      return;
    }

    tagsApi
      .create({ tag_name: name })
      .then((res) => {
        const newTag = res.data?.[0];
        if (newTag) {
          queryClient.invalidateQueries({ queryKey: ['tags'] });
          onChange([...value, newTag.tags_id_pk]);
        }
      })
      .catch(() => {
        setSearch((current) => current || name);
        toast({ title: t('pages.transactions.createTagFailed'), variant: 'destructive' });
      });
  };

  const hasSelection = selectedTags.length > 0 || pendingNames.length > 0;

  const query = search.trim();
  const foldedQuery = query.toLocaleLowerCase();
  // Offered whenever the typed name isn't an existing tag yet -- also when it only partly matches
  // one (e.g. "car" while "cardio" exists), which previously left no way to create it.
  const canCreate =
    query !== '' &&
    !tags.some((tag) => tag.tag_name.toLocaleLowerCase() === foldedQuery) &&
    !pendingNames.some((p) => p.toLocaleLowerCase() === foldedQuery);

  const handleKeyDown = (e: KeyboardEvent) => {
    // The return key on a phone keyboard with nothing typed means "done", not "toggle whichever
    // tag happens to be highlighted". Desktop keeps cmdk's Enter-selects-highlighted behaviour.
    if (
      e.key === 'Enter' &&
      !query &&
      !e.nativeEvent.isComposing &&
      window.matchMedia('(pointer: coarse)').matches
    ) {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Selected tags are chips *next to* the combobox button, not children of it: a remove
  // button nested inside another button is invalid HTML and unreachable by keyboard.
  const chipClass =
    'inline-flex max-w-full items-center gap-0.5 rounded-full bg-foreground/[0.08] py-0.5 pl-2.5 pr-1 text-xs text-foreground';
  const removeClass = cn(
    'relative inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    // Invisible 36px hit area around the 20px button on touch screens.
    "[@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:-inset-2 [@media(pointer:coarse)]:after:content-['']",
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverAnchor virtualRef={anchorRef} />
      <div
        ref={fieldRef}
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
      <PopoverContent
        className="group w-[min(24rem,calc(100vw-2rem))] p-0"
        align="start"
        collisionPadding={{ top: insets.top, bottom: insets.bottom }}
        // Portalled outside the dialog, whose scroll lock would otherwise swallow wheel and touch
        // scrolling of the suggestion list.
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* When the popover opens above the field on a touch screen, the input goes at its bottom,
            next to the field and the keyboard, so it doesn't jump around as the list filters. */}
        <Command
          onKeyDown={handleKeyDown}
          className="[@media(pointer:coarse)]:group-data-[side=top]:flex-col-reverse [@media(pointer:coarse)]:group-data-[side=top]:[&_[cmdk-input-wrapper]]:border-b-0 [@media(pointer:coarse)]:group-data-[side=top]:[&_[cmdk-input-wrapper]]:border-t"
        >
          <CommandInput
            placeholder={t('pages.transactions.searchOrCreateTag')}
            value={search}
            onValueChange={setSearch}
            autoCapitalize="none"
            className="text-base md:text-sm"
          />
          <CommandList className="max-h-[min(18.75rem,calc(var(--radix-popover-content-available-height)-2.875rem))] overscroll-contain">
            {!canCreate && <CommandEmpty>{t('pages.transactions.noTagsFound')}</CommandEmpty>}
            <CommandGroup>
              {sortedTags.map((tag) => (
                <CommandItem
                  key={tag.tags_id_pk}
                  value={tag.tag_name}
                  className={itemClass}
                  onMouseDown={keepInputFocus}
                  onSelect={() => {
                    toggle(tag.tags_id_pk);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value.includes(tag.tags_id_pk) ? 'opacity-100' : 'opacity-0')}
                  />
                  {tag.tag_name}
                </CommandItem>
              ))}
            </CommandGroup>
            {/* Always rendered after the matches (forceMount skips cmdk's filtering), so Enter still
                picks the best existing match first and creates the tag when nothing matches. */}
            {canCreate && (
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`create-tag:${query}`}
                  className={itemClass}
                  onMouseDown={keepInputFocus}
                  onSelect={() => createTag(query)}
                >
                  <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {t('pages.transactions.createTag')} "<span className="font-medium">{query}</span>"
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
