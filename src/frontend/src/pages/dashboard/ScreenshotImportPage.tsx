import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  ScanLine,
  Upload,
  ImageIcon,
  Loader2,
  X,
  AlertTriangle,
  ClipboardPaste,
  Trash2,
  CalendarIcon,
  History,
  Info,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrencyFlag, SUPPORTED_CURRENCIES } from '@/lib/currency';
import { AccountSelect } from '@/components/AccountSelect';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import { toast } from '@/hooks/use-toast';
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { screenshotImportApi, accountsApi, categoriesApi, fundsApi, tagsApi } from '@/lib/api/endpoints';
import type { Category, DraftTransaction, FieldSource, NoTransactionsReason, Tag } from '@/lib/api/types';
import type { CreateTransactionRequest } from '@/lib/api/types/requests';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useUser } from '@/contexts/user-context';
import type { DashboardTranslationKey } from '@/lib/i18n';

const FEATURE_KEY = 'screenshot_import';

// Mirrors MAX_UPLOAD_BYTES in the backend router, so an oversized file is rejected before it
// spends the user's bandwidth.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Mirrors MAX_INSTRUCTIONS_CHARS in the backend router.
const MAX_INSTRUCTIONS_CHARS = 1000;

// Select value meaning "no savings fund" -- Radix Select can't use an empty string as a value.
const NO_FUND = 'none';

// Same rules as the transaction form (TransactionsPage.tsx) -- kept local rather than shared
// since this is the only other place a signed-amount input appears.
const DECIMAL_INPUT_PATTERN = '-?[0-9]*([.,][0-9]*)?';

function isNegativeAmountInput(value: string): boolean {
  return value.trim().startsWith('-');
}

function toggleAmountSign(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '-';
  if (trimmedValue.startsWith('-')) return trimmedValue.slice(1);
  return `-${trimmedValue}`;
}

// Same parser as the transaction form -- accepts both "1234.50" and "1234,50".
function parseDecimalInput(value: string): number | null {
  const compactValue = value.trim().replace(/\s/g, '');
  if (!compactValue) return null;

  const lastComma = compactValue.lastIndexOf(',');
  const lastDot = compactValue.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : lastDot >= 0 ? '.' : '';

  let normalizedValue = compactValue;
  if (decimalSeparator) {
    const decimalIndex = decimalSeparator === ',' ? lastComma : lastDot;
    const integerPart = compactValue.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = compactValue.slice(decimalIndex + 1).replace(/[.,]/g, '');
    normalizedValue = `${integerPart}.${decimalPart}`;
  }

  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalizedValue)) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

const CATEGORY_TYPE_ORDER = ['expense', 'income', 'saving', 'investment', 'exclude', 'transfer'] as const;
const CATEGORY_TYPE_LABEL_KEY: Record<string, DashboardTranslationKey> = {
  expense: 'metrics.expenses',
  income: 'metrics.income',
  saving: 'types.saving',
  investment: 'metrics.investments',
  exclude: 'types.exclude',
  transfer: 'types.transfer',
};

// The fields the review UI lets a user fix. Matches the backend's DraftTransactionData -- there
// is no separate merchant field, `notes` carries it instead (see DraftTransactionData docstring).
const REVIEW_FIELDS = ['amount', 'currency', 'date', 'notes', 'account_id_fk', 'category_id_fk'] as const;

// "Keep as is" in the apply-to-all selects.
const KEEP = '';

// What actually has to be filled in to save a draft as a real transaction. Narrower than
// REVIEW_FIELDS -- currency isn't stored on a transaction and notes is optional.
const REQUIRED_FOR_IMPORT = ['amount', 'date', 'account_id_fk', 'category_id_fk'] as const;

/**
 * A draft transaction, flattened into editable strings for form inputs. Seeded from the
 * extraction response; edits here are local until the user imports (or cancels) them.
 */
interface EditableDraft {
  amount: string;
  currency: string;
  date: string;
  account_id_fk: string;
  category_id_fk: string;
  notes: string;
  savings_fund_id_fk: string;
  tags: number[];
  /** Tag names to create at import time (asked for in the instructions, or typed in review). */
  new_tag_names: string[];
  warnings: string[];
  field_sources: Partial<Record<string, FieldSource>>;
}

/** The "Apply to all" bar's own form state. KEEP means "leave that field alone". */
interface BulkEdit {
  account_id_fk: string;
  category_id_fk: string;
  savings_fund_id_fk: string;
  tags: number[];
  new_tag_names: string[];
}

const EMPTY_BULK: BulkEdit = {
  account_id_fk: KEEP,
  category_id_fk: KEEP,
  savings_fund_id_fk: KEEP,
  tags: [],
  new_tag_names: [],
};

function toEditableDraft(draft: DraftTransaction): EditableDraft {
  return {
    amount: draft.amount !== null ? String(draft.amount) : '',
    currency: draft.currency ?? '',
    date: draft.date ?? '',
    account_id_fk: draft.account_id_fk ?? '',
    category_id_fk: draft.category_id_fk !== null ? String(draft.category_id_fk) : '',
    notes: draft.notes ?? '',
    savings_fund_id_fk: draft.savings_fund_id_fk ?? '',
    tags: draft.tags ?? [],
    new_tag_names: draft.new_tag_names ?? [],
    warnings: draft.warnings ?? [],
    field_sources: draft.field_sources,
  };
}

function draftNeedsReview(draft: EditableDraft): boolean {
  return REVIEW_FIELDS.some((field) => draft.field_sources[field] === 'none');
}

function draftIsReadyToImport(draft: EditableDraft): boolean {
  return (
    parseDecimalInput(draft.amount) !== null &&
    draft.date !== '' &&
    draft.account_id_fk !== '' &&
    draft.category_id_fk !== ''
  );
}

/** Case-insensitive key for matching tag names ("vacation" is the same tag as "Vacation"). */
function tagKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/**
 * `newTagIds` maps tagKey(name) -> id for the tags created just before import, so each draft's
 * pending names resolve to real ids.
 */
function buildImportPayload(drafts: EditableDraft[], newTagIds: Map<string, number>): CreateTransactionRequest[] {
  return drafts.map((draft) => {
    const tags = [...draft.tags];
    for (const name of draft.new_tag_names) {
      const id = newTagIds.get(tagKey(name));
      if (id !== undefined && !tags.includes(id)) tags.push(id);
    }
    return {
      account_id_fk: draft.account_id_fk,
      category_id_fk: Number(draft.category_id_fk),
      amount: parseDecimalInput(draft.amount) ?? 0,
      date: draft.date,
      notes: draft.notes.trim() || null,
      savings_fund_id_fk: draft.savings_fund_id_fk || null,
      tags,
    };
  });
}

/**
 * Create every pending tag name across the drafts (once each, case-insensitively), reusing any
 * that already exist by now. Throws with the failing name so the caller can abort the import.
 */
async function createPendingTags(drafts: EditableDraft[], existing: Tag[]): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const tag of existing) ids.set(tagKey(tag.tag_name), tag.tags_id_pk);

  const pending = new Map<string, string>();
  for (const draft of drafts) {
    for (const name of draft.new_tag_names) {
      const key = tagKey(name);
      if (key && !ids.has(key) && !pending.has(key)) pending.set(key, name.trim());
    }
  }

  for (const [key, name] of pending) {
    try {
      const created = (await tagsApi.create({ tag_name: name })).data?.[0];
      if (!created) throw new Error('empty response');
      ids.set(key, created.tags_id_pk);
    } catch {
      throw new TagCreateError(name);
    }
  }
  return ids;
}

class TagCreateError extends Error {
  constructor(public tagName: string) {
    super(`Couldn't create tag "${tagName}"`);
  }
}

function CategorySelectItems({ categories, t }: { categories: Category[]; t: ReturnType<typeof useUser>['t'] }) {
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
                'px-2 pb-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 pl-2',
                gi > 0 && 'mt-1 border-t border-border/40 pt-2'
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

function fieldRingClass(source: FieldSource | undefined): string {
  return source === 'none' ? 'border-destructive/60 focus-visible:ring-destructive/40' : '';
}

/**
 * Small provenance indicator shown next to a field's label -- silent when the model resolved
 * the field normally, since that's the expected case and doesn't need calling out. Clears once
 * the user edits the field (see `updateDraft`), so a fixed field doesn't stay flagged forever.
 */
function FieldStatus({
  source,
  needsInputLabel,
  defaultedLabel,
  fromHistoryLabel,
  fromHistoryHint,
}: {
  source: FieldSource | undefined;
  needsInputLabel: string;
  defaultedLabel: string;
  fromHistoryLabel?: string;
  fromHistoryHint?: string;
}) {
  if (source === 'rule' && fromHistoryLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[10px] font-normal text-primary">
            <History className="h-2.5 w-2.5" />
            {fromHistoryLabel}
          </Badge>
        </TooltipTrigger>
        {fromHistoryHint && (
          <TooltipContent>
            <p>{fromHistoryHint}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }
  if (source === 'none') {
    return <span className="text-[10px] font-medium text-destructive">{needsInputLabel}</span>;
  }
  if (source === 'default') {
    return (
      <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground">
        {defaultedLabel}
      </Badge>
    );
  }
  return null;
}

export default function ScreenshotImportPage() {
  const { t, formatDate } = useUser();
  const { enabled, isLoading: flagLoading } = useFeatureFlag(FEATURE_KEY);
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [inferenceModel, setInferenceModel] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<NoTransactionsReason | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [bulk, setBulk] = useState<BulkEdit>(EMPTY_BULK);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Instructions belong to one screenshot: once they've been used for an extraction, the next
  // screenshot starts with an empty box. Text typed before the first extraction is kept.
  const instructionsUsedRef = useRef(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await accountsApi.getAll()).data || [],
    enabled,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.getAll()).data || [],
    enabled,
  });
  const { data: funds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => (await fundsApi.getAll()).data || [],
    enabled,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await tagsApi.getAll()).data || [],
    enabled,
  });
  const activeFunds = funds
    .filter((f) => f.fund_is_active !== false)
    .sort((a, b) => a.fund_name.localeCompare(b.fund_name));

  // Object URLs leak until revoked; tie each one's lifetime to the file it previews.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetResults = () => {
    setExtracted(false);
    setDrafts([]);
    setInferenceModel(null);
    setEmptyReason(null);
    setErrorMessage(null);
    setBulk(EMPTY_BULK);
  };

  const acceptFile = useCallback(
    (candidate: File | null | undefined) => {
      if (!candidate) return;

      if (!candidate.type.startsWith('image/')) {
        toast({
          title: t('common.validationError'),
          description: t('pages.screenshotImport.notAnImage'),
          variant: 'destructive',
        });
        return;
      }

      if (candidate.size > MAX_UPLOAD_BYTES) {
        toast({
          title: t('common.validationError'),
          description: t('pages.screenshotImport.tooLarge'),
          variant: 'destructive',
        });
        return;
      }

      setFile(candidate);
      resetResults();
      if (instructionsUsedRef.current) {
        setInstructions('');
        instructionsUsedRef.current = false;
      }
    },
    [t]
  );

  // Paste is the shortest path on desktop: Win+Shift+S then Ctrl+V, no file ever hits the disk.
  useEffect(() => {
    if (!enabled) return;

    const onPaste = (event: ClipboardEvent) => {
      const pastedFile = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/')
      );
      if (pastedFile) {
        event.preventDefault();
        acceptFile(pastedFile);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [enabled, acceptFile]);

  const extractMutation = useMutation({
    mutationFn: screenshotImportApi.extract,
    onSuccess: (body) => {
      instructionsUsedRef.current = true;
      setExtracted(true);
      setDrafts((body.data?.drafts ?? []).map(toEditableDraft));
      setInferenceModel(body.data?.inference_model ?? null);
      setEmptyReason(body.data?.reason ?? null);
      setErrorMessage(null);
      toast({ title: t('pages.screenshotImport.extracted') });
    },
    onError: (err) => {
      // A 429 here is the inference provider's per-minute limit, not ours, and it clears on its
      // own -- so it gets translated copy telling the user to retry the same image. Everything
      // else falls through to the backend's `detail`, which is English-only by design.
      const message =
        err instanceof ApiError && err.status === 429
          ? t('pages.screenshotImport.rateLimited')
          : getErrorMessage(err, t('pages.screenshotImport.extractFailed'));
      setExtracted(false);
      setDrafts([]);
      setInferenceModel(null);
      setEmptyReason(null);
      setErrorMessage(message);
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (toImport: EditableDraft[]) => {
      const hasPendingTags = toImport.some((d) => d.new_tag_names.length > 0);
      const newTagIds = hasPendingTags ? await createPendingTags(toImport, tags) : new Map<string, number>();
      if (hasPendingTags) queryClient.invalidateQueries({ queryKey: ['tags'] });
      return screenshotImportApi.import(buildImportPayload(toImport, newTagIds));
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      toast({
        title: t('pages.screenshotImport.importSuccess', { count: body.data?.length ?? drafts.length }),
      });
      clearSelection();
    },
    onError: (err) => {
      const message =
        err instanceof TagCreateError
          ? t('pages.screenshotImport.createTagFailed', { name: err.tagName })
          : getErrorMessage(err, t('pages.screenshotImport.importFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
  });

  const clearSelection = () => {
    setFile(null);
    resetResults();
    setInstructions('');
    instructionsUsedRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateDraft = (index: number, patch: Partial<EditableDraft>) => {
    setDrafts((prev) =>
      prev.map((draft, i) => {
        if (i !== index) return draft;
        // Once the user touches a field, its old provenance no longer describes the current
        // value -- clear it so the "needs input" / "defaulted" markers go away immediately.
        const field_sources = { ...draft.field_sources };
        for (const field of Object.keys(patch)) {
          delete field_sources[field];
        }
        return { ...draft, ...patch, field_sources };
      })
    );
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const bulkIsEmpty =
    bulk.account_id_fk === KEEP &&
    bulk.category_id_fk === KEEP &&
    bulk.savings_fund_id_fk === KEEP &&
    bulk.tags.length === 0 &&
    bulk.new_tag_names.length === 0;

  const applyBulk = () => {
    setDrafts((prev) =>
      prev.map((draft) => {
        const next: EditableDraft = { ...draft, field_sources: { ...draft.field_sources } };
        if (bulk.account_id_fk !== KEEP) {
          next.account_id_fk = bulk.account_id_fk;
          delete next.field_sources.account_id_fk;
        }
        if (bulk.category_id_fk !== KEEP) {
          next.category_id_fk = bulk.category_id_fk;
          delete next.field_sources.category_id_fk;
        }
        if (bulk.savings_fund_id_fk !== KEEP) {
          next.savings_fund_id_fk = bulk.savings_fund_id_fk === NO_FUND ? '' : bulk.savings_fund_id_fk;
        }
        next.tags = [...new Set([...draft.tags, ...bulk.tags])];
        const pendingKeys = new Set(draft.new_tag_names.map(tagKey));
        next.new_tag_names = [
          ...draft.new_tag_names,
          ...bulk.new_tag_names.filter((name) => !pendingKeys.has(tagKey(name))),
        ];
        return next;
      })
    );
    toast({ title: t('pages.screenshotImport.applyToAllDone', { count: drafts.length }) });
    setBulk(EMPTY_BULK);
  };

  if (flagLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('pages.screenshotImport.title')}
          description={t('pages.screenshotImport.description')}
        />
        <EmptyState
          icon={<ScanLine className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.screenshotImport.notEnabledTitle')}
          description={t('pages.screenshotImport.notEnabledDescription')}
        />
      </div>
    );
  }

  const needsReviewCount = drafts.filter(draftNeedsReview).length;
  const allReadyToImport = drafts.length > 0 && drafts.every(draftIsReadyToImport);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <PageHeader
          title={t('pages.screenshotImport.title')}
          description={t('pages.screenshotImport.description')}
        />
        {inferenceModel && (
          <p className="font-mono text-xs text-muted-foreground/70">
            {t('pages.screenshotImport.inferenceModelLabel')}: {inferenceModel}
          </p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background/50'
          )}
        >
          {previewUrl ? (
            <div className="w-full space-y-4">
              <div className="relative mx-auto max-w-md">
                <img
                  src={previewUrl}
                  alt={t('pages.screenshotImport.previewAlt')}
                  className="max-h-80 w-full rounded-lg border border-border object-contain"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={clearSelection}
                  className="absolute right-2 top-2 h-8 w-8"
                  aria-label={t('pages.screenshotImport.clear')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {file?.name} · {Math.round((file?.size ?? 0) / 1024)} kB
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-muted p-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground font-display">
                {t('pages.screenshotImport.dropTitle')}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {t('pages.screenshotImport.dropDescription')}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClipboardPaste className="h-3.5 w-3.5" />
                {t('pages.screenshotImport.pasteHint')}
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {file ? t('pages.screenshotImport.replace') : t('pages.screenshotImport.choose')}
            </Button>

            <Button
              type="button"
              disabled={!file || extractMutation.isPending}
              onClick={() => file && extractMutation.mutate({ file, instructions })}
            >
              {extractMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="mr-2 h-4 w-4" />
              )}
              {t('pages.screenshotImport.extract')}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="screenshot-instructions">{t('pages.screenshotImport.instructionsLabel')}</Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {instructions.length}/{MAX_INSTRUCTIONS_CHARS}
            </span>
          </div>
          <Textarea
            id="screenshot-instructions"
            value={instructions}
            maxLength={MAX_INSTRUCTIONS_CHARS}
            rows={2}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t('pages.screenshotImport.instructionsPlaceholder')}
            className="resize-y bg-background/50"
          />
          <p className="text-xs text-muted-foreground">{t('pages.screenshotImport.instructionsHint')}</p>
        </div>
      </motion.div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {extracted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground font-display">
              {t('pages.screenshotImport.reviewTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('pages.screenshotImport.reviewSubtitle', {
                count: drafts.length,
                needsReview: needsReviewCount,
              })}
            </p>
          </div>

          {drafts.length === 0 ? (
            <EmptyState
              icon={<ScanLine className="h-8 w-8 text-muted-foreground" />}
              title={t('pages.screenshotImport.noTransactionsFound')}
              description={t(
                emptyReason
                  ? `pages.screenshotImport.reason.${emptyReason}`
                  : 'pages.screenshotImport.reason.generic'
              )}
            />
          ) : (
            <div className="space-y-3">
              {drafts.length > 1 && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      {t('pages.screenshotImport.applyToAllTitle')}
                    </h4>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">{t('pages.screenshotImport.applyToAllHint')}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-account">{t('common.account')}</Label>
                      <AccountSelect
                        id="bulk-account"
                        accounts={accounts}
                        value={bulk.account_id_fk}
                        onValueChange={(value) => setBulk((b) => ({ ...b, account_id_fk: value }))}
                        placeholder={t('pages.screenshotImport.keepAsIs')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-category">{t('common.category')}</Label>
                      <Select
                        value={bulk.category_id_fk}
                        onValueChange={(value) => setBulk((b) => ({ ...b, category_id_fk: value }))}
                      >
                        <SelectTrigger id="bulk-category">
                          <SelectValue placeholder={t('pages.screenshotImport.keepAsIs')} />
                        </SelectTrigger>
                        <SelectContent>
                          <CategorySelectItems categories={categories} t={t} />
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-fund">{t('pages.transactions.savingsFundOptional')}</Label>
                      <Select
                        value={bulk.savings_fund_id_fk}
                        onValueChange={(value) => setBulk((b) => ({ ...b, savings_fund_id_fk: value }))}
                      >
                        <SelectTrigger id="bulk-fund">
                          <SelectValue placeholder={t('pages.screenshotImport.keepAsIs')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FUND}>{t('common.none')}</SelectItem>
                          {activeFunds.map((fund) => (
                            <SelectItem key={fund.savings_funds_id_pk} value={fund.savings_funds_id_pk}>
                              {fund.fund_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-tags">{t('pages.transactions.tags')}</Label>
                      <TagMultiSelect
                        id="bulk-tags"
                        tags={tags}
                        value={bulk.tags}
                        onChange={(ids) => setBulk((b) => ({ ...b, tags: ids }))}
                        pendingNames={bulk.new_tag_names}
                        onPendingNamesChange={(names) => setBulk((b) => ({ ...b, new_tag_names: names }))}
                        pendingLabel={t('pages.screenshotImport.newTag')}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={bulkIsEmpty}
                      onClick={() => setBulk(EMPTY_BULK)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button type="button" size="sm" disabled={bulkIsEmpty} onClick={applyBulk}>
                      {t('pages.screenshotImport.applyToAllButton')}
                    </Button>
                  </div>
                </div>
              )}

              {drafts.map((draft, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border bg-card p-4 shadow-sm transition-colors',
                    draftNeedsReview(draft) ? 'border-destructive/30' : 'border-border'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {draftNeedsReview(draft) && (
                        <Badge variant="destructive" className="text-[10px]">
                          {t('pages.screenshotImport.needsInput')}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDraft(i)}
                      aria-label={t('pages.screenshotImport.removeDraft')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {draft.warnings.length > 0 && (
                    <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <p className="mb-1 flex items-center gap-1.5 font-medium">
                        <Info className="h-3.5 w-3.5" />
                        {t('pages.screenshotImport.warningsTitle')}
                      </p>
                      <ul className="list-disc space-y-0.5 pl-5">
                        {draft.warnings.map((warning, wi) => (
                          <li key={wi}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`notes-${i}`}>{t('common.notes')}</Label>
                        <FieldStatus
                          source={draft.field_sources.notes}
                          needsInputLabel={t('pages.screenshotImport.needsInput')}
                          defaultedLabel={t('pages.screenshotImport.defaulted')}
                        />
                      </div>
                      <Input
                        id={`notes-${i}`}
                        value={draft.notes}
                        onChange={(e) => updateDraft(i, { notes: e.target.value })}
                        placeholder={t('pages.transactions.notesPlaceholder')}
                        className={cn(fieldRingClass(draft.field_sources.notes))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`amount-${i}`}>{t('common.amount')}</Label>
                        <FieldStatus
                          source={draft.field_sources.amount}
                          needsInputLabel={t('pages.screenshotImport.needsInput')}
                          defaultedLabel={t('pages.screenshotImport.defaulted')}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={
                                isNegativeAmountInput(draft.amount)
                                  ? t('pages.transactions.setAmountPositive')
                                  : t('pages.transactions.setAmountNegative')
                              }
                              onClick={() => updateDraft(i, { amount: toggleAmountSign(draft.amount) })}
                              className={cn(
                                'h-10 w-10 shrink-0 bg-background/50 text-base font-semibold tabular-nums',
                                isNegativeAmountInput(draft.amount) &&
                                  'border-destructive/60 text-destructive hover:text-destructive'
                              )}
                            >
                              {isNegativeAmountInput(draft.amount) ? '-' : '+'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {isNegativeAmountInput(draft.amount)
                                ? t('pages.transactions.setAmountPositive')
                                : t('pages.transactions.setAmountNegative')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <Input
                          id={`amount-${i}`}
                          type="text"
                          inputMode="decimal"
                          pattern={DECIMAL_INPUT_PATTERN}
                          value={draft.amount}
                          onChange={(e) => updateDraft(i, { amount: e.target.value })}
                          className={cn('min-w-0 text-[16px] tabular-nums', fieldRingClass(draft.field_sources.amount))}
                        />
                        <Select
                          value={draft.currency}
                          onValueChange={(value) => updateDraft(i, { currency: value })}
                        >
                          <SelectTrigger className={cn('w-24 shrink-0', fieldRingClass(draft.field_sources.currency))}>
                            <SelectValue placeholder={t('common.currency')} />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {getCurrencyFlag(currency)} {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`date-${i}`}>{t('common.date')}</Label>
                        <FieldStatus
                          source={draft.field_sources.date}
                          needsInputLabel={t('pages.screenshotImport.needsInput')}
                          defaultedLabel={t('pages.screenshotImport.defaulted')}
                        />
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id={`date-${i}`}
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-start pl-3 text-left font-normal bg-background/50 border-input/50',
                              !draft.date && 'text-muted-foreground',
                              fieldRingClass(draft.field_sources.date)
                            )}
                          >
                            {draft.date ? (
                              formatDate(draft.date, { dateStyle: 'long' })
                            ) : (
                              <span>{t('pages.transactions.pickDate')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={draft.date ? new Date(draft.date) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Adjust for timezone offset to prevent date shifting when converting to string
                                const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                                updateDraft(i, { date: offsetDate.toISOString().split('T')[0] });
                              }
                            }}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`account-${i}`}>{t('common.account')}</Label>
                        <FieldStatus
                          source={draft.field_sources.account_id_fk}
                          needsInputLabel={t('pages.screenshotImport.needsInput')}
                          defaultedLabel={t('pages.screenshotImport.defaulted')}
                          fromHistoryLabel={t('pages.screenshotImport.fromHistory')}
                          fromHistoryHint={t('pages.screenshotImport.fromHistoryHint')}
                        />
                      </div>
                      <AccountSelect
                        id={`account-${i}`}
                        accounts={accounts}
                        value={draft.account_id_fk}
                        onValueChange={(value) => updateDraft(i, { account_id_fk: value })}
                        placeholder={t('pages.transactions.selectAccount')}
                        className={cn(fieldRingClass(draft.field_sources.account_id_fk))}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`category-${i}`}>{t('common.category')}</Label>
                        <FieldStatus
                          source={draft.field_sources.category_id_fk}
                          needsInputLabel={t('pages.screenshotImport.needsInput')}
                          defaultedLabel={t('pages.screenshotImport.defaulted')}
                          fromHistoryLabel={t('pages.screenshotImport.fromHistory')}
                          fromHistoryHint={t('pages.screenshotImport.fromHistoryHint')}
                        />
                      </div>
                      <Select
                        value={draft.category_id_fk}
                        onValueChange={(value) => updateDraft(i, { category_id_fk: value })}
                      >
                        <SelectTrigger id={`category-${i}`} className={cn(fieldRingClass(draft.field_sources.category_id_fk))}>
                          <SelectValue placeholder={t('pages.transactions.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          <CategorySelectItems categories={categories} t={t} />
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`fund-${i}`}>{t('pages.transactions.savingsFundOptional')}</Label>
                      <Select
                        value={draft.savings_fund_id_fk || NO_FUND}
                        onValueChange={(value) =>
                          updateDraft(i, { savings_fund_id_fk: value === NO_FUND ? '' : value })
                        }
                      >
                        <SelectTrigger id={`fund-${i}`}>
                          <SelectValue placeholder={t('pages.transactions.selectFund')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FUND}>{t('common.none')}</SelectItem>
                          {activeFunds.map((fund) => (
                            <SelectItem key={fund.savings_funds_id_pk} value={fund.savings_funds_id_pk}>
                              {fund.fund_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tags-${i}`}>{t('pages.transactions.tags')}</Label>
                      <TagMultiSelect
                        id={`tags-${i}`}
                        tags={tags}
                        value={draft.tags}
                        onChange={(ids) => updateDraft(i, { tags: ids })}
                        pendingNames={draft.new_tag_names}
                        onPendingNamesChange={(names) => updateDraft(i, { new_tag_names: names })}
                        pendingLabel={t('pages.screenshotImport.newTag')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4">
            {drafts.length > 0 && !allReadyToImport && (
              <p className="text-xs text-muted-foreground">{t('pages.screenshotImport.importHint')}</p>
            )}
            <Button type="button" variant="outline" onClick={clearSelection} disabled={importMutation.isPending}>
              {t('common.cancel')}
            </Button>
            {drafts.length > 0 && (
              <Button
                type="button"
                disabled={!allReadyToImport || importMutation.isPending}
                onClick={() => importMutation.mutate(drafts)}
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('pages.screenshotImport.importButton', { count: drafts.length })}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
