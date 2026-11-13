import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { categoriesApi } from '@/lib/api/endpoints';
import { Category, CreateCategoryRequest } from '@/lib/api/types';
import { isOptimistic, markOptimistic, optimisticList, patchById, tempNumericId, withoutId } from '@/lib/optimistic';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { fieldAria, useFormErrors } from '@/hooks/use-form-errors';
import { AlertCircle, Lock, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import type { DashboardTranslationKey } from '@/lib/i18n';

const CATEGORY_TYPES = [
  { value: 'exclude' },
  { value: 'expense' },
  { value: 'income' },
  { value: 'investment' },
  { value: 'saving' },
] as const;

const SPENDING_TYPES = [
  { value: 'Core' },
  { value: 'Fun' },
  { value: 'Future' },
  { value: 'Income' },
  { value: 'Necessary' },
] as const;

/** Display order of the type groups; any other type found in the data follows these. */
const GROUP_ORDER = ['income', 'expense', 'saving', 'investment', 'exclude'];

/**
 * Categories the app finds by name: transfers post to `Exclude`, fund withdrawals to
 * `Savings Funds Withdrawal`, and the backend's income, saving and cash-flow figures single the
 * latter out. Renaming, retyping or deleting them would silently break those features.
 */
const SYSTEM_CATEGORIES: Record<string, DashboardTranslationKey> = {
  Exclude: 'pages.categories.systemTransfers',
  'Savings Funds Withdrawal': 'pages.categories.systemWithdrawals',
};

const initialFormData = {
  category_name: '',
  type: 'expense',
  spending_type: 'Core',
  is_active: true,
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { t } = useUser();
  const categoryTypeLabel = (type: string) => ({
    exclude: t('types.exclude'),
    expense: t('types.expense'),
    income: t('types.income'),
    investment: t('types.investment'),
    saving: t('types.saving'),
  }[type] ?? type);
  const spendingTypeLabel = (type: string) => ({
    Core: t('types.core'),
    Necessary: t('types.necessary'),
    Fun: t('types.fun'),
    Future: t('types.future'),
    Income: t('metrics.income'),
  }[type] ?? type);

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll();
      return response.data;
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ─── Modal helpers ──────────────────────────────────────────
  const handleOpenModal = (category?: Category) => {
    if (category) {
      setSelectedCategory(category);
      setFormData({
        category_name: category.category_name,
        type: category.type,
        spending_type: category.spending_type || 'Core',
        is_active: category.is_active !== false,
      });
    } else {
      setSelectedCategory(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const { errors: formErrors, show: showFormErrors, clear: clearFormError, reset: resetFormErrors } = useFormErrors<'name'>();

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetFormErrors();
    setSelectedCategory(null);
    setFormData(initialFormData);
  };

  // ─── Optimistic cache writes ────────────────────────────────
  const optimisticCreate = optimisticList<Category, CreateCategoryRequest>(
    queryClient,
    ['categories'],
    (prev, payload) => [
      ...prev,
      markOptimistic<Category>({
        // Real PKs are positive serials, so a negative id can never collide.
        categories_id_pk: tempNumericId(),
        category_name: payload.category_name,
        type: payload.type as Category['type'],
        spending_type: (payload.spending_type ?? null) as Category['spending_type'],
        is_active: payload.is_active ?? true,
        created_at: null,
      }),
    ]
  );

  const optimisticUpdate = optimisticList<Category, { id: number; data: Record<string, unknown> }>(
    queryClient,
    ['categories'],
    (prev, vars) => patchById(prev, 'categories_id_pk', vars.id, vars.data as Partial<Category>)
  );

  // Categories are conditionally soft-deleted server-side when transactions reference them;
  // either way the row leaves this list, and a soft-deleted one returns marked inactive.
  const optimisticDelete = optimisticList<Category, number>(
    queryClient,
    ['categories'],
    (prev, id) => withoutId(prev, 'categories_id_pk', id)
  );

  // ─── Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onMutate: optimisticCreate.onMutate,
    onSuccess: () => {
      toast({ title: t('pages.categories.created') });
    },
    onError: (err: Error | ApiError, _payload, context) => {
      optimisticCreate.rollback(context);
      const message = getErrorMessage(err, t('pages.categories.createFailed'));
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    },
    onSettled: optimisticCreate.onSettled,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; data: Record<string, unknown> }) =>
      categoriesApi.update(data.id, data.data),
    onMutate: optimisticUpdate.onMutate,
    onSuccess: () => {
      toast({ title: t('pages.categories.updated') });
    },
    onError: (err: Error | ApiError, _vars, context) => {
      optimisticUpdate.rollback(context);
      const message = getErrorMessage(err, t('pages.categories.updateFailed'));
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    },
    onSettled: optimisticUpdate.onSettled,
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onMutate: (categoryId: number) => {
      setDeleteConfirmId(null);
      return optimisticDelete.onMutate(categoryId);
    },
    onSuccess: () => {
      // The backend response message tells us whether it was soft-deleted or hard-deleted
      toast({ title: t('pages.categories.removed') });
    },
    onError: (err: Error | ApiError, _categoryId, context) => {
      optimisticDelete.rollback(context);
      const message = getErrorMessage(err, t('pages.categories.deleteFailed'));
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    },
    onSettled: optimisticDelete.onSettled,
  });

  // ─── Form Submit ────────────────────────────────────────────
  const handleSubmit = () => {
    if (!showFormErrors(formData.category_name.trim() ? {} : { name: t('pages.categories.nameRequired') })) return;

    const payload = {
      category_name: formData.category_name.trim(),
      type: formData.type,
      spending_type: formData.spending_type,
      is_active: formData.is_active,
    };

    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.categories_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }

    // Optimistic write is already in the cache — close rather than hold a spinner.
    handleCloseModal();
  };

  // ─── Group categories by type ───────────────────────────────
  // Active first, then by name; types outside GROUP_ORDER are listed after it rather than hidden.
  const sorted = categories
    .slice()
    .sort(
      (a, b) =>
        Number(a.is_active === false) - Number(b.is_active === false) ||
        a.category_name.localeCompare(b.category_name),
    );
  const types = [...GROUP_ORDER, ...[...new Set(categories.map((c) => c.type))].filter((type) => !GROUP_ORDER.includes(type))];
  const groups = types
    .map((type) => ({ type, items: sorted.filter((c) => c.type === type) }))
    .filter((group) => group.items.length > 0);

  const systemNote = (category: Category) => {
    const key = SYSTEM_CATEGORIES[category.category_name];
    return key ? t(key) : null;
  };
  const editingSystem = selectedCategory ? systemNote(selectedCategory) !== null : false;

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
          {t('pages.categories.title')}
        </h1>
        {!isLoading && !error && (
          <span className="text-sm tabular-nums text-muted-foreground">{categories.length}</span>
        )}
      </div>
      <Button variant="outline" onClick={() => handleOpenModal()} className="h-11 px-4">
        <Plus aria-hidden="true" />
        {t('pages.categories.add')}
      </Button>
    </header>
  );

  // ─── Error state ────────────────────────────────────────────
  if (error && !isLoading && categories.length === 0) {
    return (
      <div>
        {header}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.categories.failedToLoad')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('common.unknownError')}
            </p>
          </div>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['categories'] })}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const renderRow = (category: Category) => {
    // Temp id until the server row arrives — actions would 404, so disable them.
    const pending = isOptimistic(category);
    const inactive = category.is_active === false;
    const system = systemNote(category);
    const meta = [
      category.spending_type ? spendingTypeLabel(category.spending_type) : null,
      inactive ? t('states.inactive') : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <li
        key={category.categories_id_pk}
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-x-3 border-b border-border py-3',
          (inactive || pending) && 'opacity-60',
        )}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[0.9375rem]">{category.category_name}</span>
            {system && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </div>
          {system && <div className="truncate text-[0.75rem] text-muted-foreground">{system}</div>}
        </div>
        <span className="whitespace-nowrap text-right text-[0.8125rem] text-muted-foreground">{meta}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`${t('common.actions')}: ${category.category_name}`}
              className="h-8 w-8 text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenModal(category)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            {inactive && (
              <DropdownMenuItem
                onClick={() => updateMutation.mutate({ id: category.categories_id_pk, data: { is_active: true } })}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.activate')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={system !== null}
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteConfirmId(category.categories_id_pk)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  };

  return (
    <div>
      {header}
      <p className="mt-3 max-w-[65ch] text-[0.8125rem] text-muted-foreground">{t('pages.categories.info')}</p>

      {isLoading ? (
        <div className="mt-10 space-y-10" aria-busy="true">
          {[0, 1, 2].map((group) => (
            <div key={group} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.type} aria-labelledby={`category-group-${group.type}`} className="mt-12 first-of-type:mt-10">
            <div className="flex items-baseline gap-2.5 border-b border-foreground/30 pb-3">
              <h2 id={`category-group-${group.type}`} className="text-[1.125rem] font-medium tracking-[-0.01em]">
                {categoryTypeLabel(group.type)}
              </h2>
              <span className="text-[0.8125rem] tabular-nums text-muted-foreground">{group.items.length}</span>
            </div>
            <ul className="grid gap-x-10 lg:grid-cols-2">{group.items.map(renderRow)}</ul>
          </section>
        ))
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? t('pages.categories.editTitle') : t('pages.categories.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
          <div className="space-y-5 py-4">
            {editingSystem && selectedCategory && (
              <p className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('pages.categories.systemLocked', { note: systemNote(selectedCategory) ?? '' })}
              </p>
            )}
            <Field htmlFor="category-name" label={t('common.name')} error={formErrors.name}>
              <Input
                id="category-name"
                disabled={editingSystem}
                placeholder={t('pages.categories.namePlaceholder')}
                value={formData.category_name}
                onChange={(e) => {
                  setFormData({ ...formData, category_name: e.target.value });
                  clearFormError('name');
                }}
                {...fieldAria('category-name', formErrors.name)}
              />
            </Field>
            <Field htmlFor="category-type" label={t('common.type')}>
              <Select
                value={formData.type}
                disabled={editingSystem}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="category-type">
                  <SelectValue placeholder={t('common.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {categoryTypeLabel(t.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field htmlFor="spending-type" label={t('pages.categories.spendingType')}>
              <Select
                value={formData.spending_type}
                onValueChange={(value) => setFormData({ ...formData, spending_type: value })}
              >
                <SelectTrigger id="spending-type">
                  <SelectValue placeholder={t('common.selectSpendingType')} />
                </SelectTrigger>
                <SelectContent>
                  {SPENDING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {spendingTypeLabel(t.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            {/* Optimistic write + immediate close, so no pending gate is needed. */}
            <Button type="submit">
              {selectedCategory ? t('common.save') : t('pages.categories.add')}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pages.categories.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t('pages.categories.deleteDescription')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
