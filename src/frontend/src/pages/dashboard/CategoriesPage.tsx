import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { categoriesApi, ApiError } from '@/lib/api/client';
import { Category } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Film,
  Briefcase,
  PiggyBank,
  TrendingUp,
  Zap,
  CreditCard,
  Loader2,
  AlertCircle,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Info,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Housing: Home,
  Rent: Home,
  Transport: Car,
  Transportation: Car,
  Food: Utensils,
  Groceries: Utensils,
  Entertainment: Film,
  Shopping: ShoppingCart,
  Utilities: Zap,
  Income: TrendingUp,
  Salary: TrendingUp,
  Investment: Briefcase,
  Investments: Briefcase,
  Savings: PiggyBank,
  Other: CreditCard,
};

const spendingTypeColors: Record<string, string> = {
  Core: 'bg-primary/10 text-primary border-primary/30',
  Necessary: 'bg-info/10 text-info border-info/30',
  Fun: 'bg-warning/10 text-warning border-warning/30',
  Future: 'bg-chart-investment/10 text-chart-investment border-chart-investment/30',
  Income: 'bg-success/10 text-success border-success/30',
};

const CATEGORY_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'saving', label: 'Saving' },
  { value: 'investment', label: 'Investment' },
  { value: 'exclude', label: 'Exclude' },
] as const;

const SPENDING_TYPES = [
  { value: 'Core', label: 'Core' },
  { value: 'Necessary', label: 'Necessary' },
  { value: 'Fun', label: 'Fun' },
  { value: 'Future', label: 'Future' },
  { value: 'Income', label: 'Income' },
] as const;

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function CategorySkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-11 w-11 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

const initialFormData = {
  category_name: '',
  type: 'expense',
  spending_type: '',
  is_active: true,
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();

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
        spending_type: category.spending_type || '',
        is_active: category.is_active !== false,
      });
    } else {
      setSelectedCategory(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setFormData(initialFormData);
  };

  // ─── Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category created successfully' });
      handleCloseModal();
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string'
        ? err.detail : 'Failed to create category';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; data: Record<string, unknown> }) =>
      categoriesApi.update(data.id, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category updated successfully' });
      handleCloseModal();
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string'
        ? err.detail : 'Failed to update category';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // The backend response message tells us whether it was soft-deleted or hard-deleted
      toast({ title: 'Category removed' });
      setDeleteConfirmId(null);
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string'
        ? err.detail : 'Failed to delete category';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setDeleteConfirmId(null);
    },
  });

  // ─── Form Submit ────────────────────────────────────────────
  const handleSubmit = () => {
    if (!formData.category_name.trim()) {
      toast({ title: 'Validation Error', description: 'Category name is required.', variant: 'destructive' });
      return;
    }

    const payload = {
      category_name: formData.category_name.trim(),
      type: formData.type,
      spending_type: formData.spending_type || undefined,
      is_active: formData.is_active,
    };

    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.categories_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ─── Group categories by type ───────────────────────────────
  const groupedCategories = categories.reduce((acc, cat) => {
    const type = cat.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  // ─── Error state ────────────────────────────────────────────
  if (error && !isLoading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          description="View and manage spending categories"
          actions={
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">Failed to load categories</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['categories'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="View and manage spending categories"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        }
      />

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          Categories help you classify transactions for budgeting and analytics.
          Each category has a <strong>type</strong> (income, expense, saving, investment, exclude)
          and an optional <strong>spending type</strong> (Core, Necessary, Fun, Future) for expense analysis.
          Categories with existing transactions will be deactivated instead of deleted.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {['income', 'expense', 'saving'].map((type) => (
            <div key={type} className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <CategorySkeleton key={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {['income', 'expense', 'saving', 'investment', 'exclude'].map((type) => {
            const cats = groupedCategories[type];
            if (!cats?.length) return null;

            return (
              <Collapsible
                key={type}
                defaultOpen={false}
                className="space-y-4 rounded-xl border border-border/50 bg-card/50 p-4"
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg p-2 group">
                  <h2 className="text-lg font-semibold font-display capitalize flex items-center gap-2">
                    {type}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({cats.length})
                    </span>
                  </h2>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    <AnimatePresence mode="popLayout">
                      {cats.map((category) => {
                        const Icon = iconMap[category.category_name] || CreditCard;
                        return (
                          <motion.div
                            key={category.categories_id_pk}
                            variants={fadeIn}
                            layout
                            className={cn(
                              'group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-glow-sm',
                              category.is_active === false
                                ? 'border-border/50 opacity-60'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="rounded-lg bg-primary/10 p-3 text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{category.category_name}</h3>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                {category.spending_type && (
                                  <span
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 text-xs',
                                      spendingTypeColors[category.spending_type] ||
                                      'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {category.spending_type}
                                  </span>
                                )}
                                {category.is_active === false && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenModal(category)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteConfirmId(category.categories_id_pk)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Groceries, Salary, Gym"
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="category-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spending-type">Spending Type <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select
                value={formData.spending_type || 'none'}
                onValueChange={(value) => setFormData({ ...formData, spending_type: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="spending-type">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SPENDING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this category? If it has existing transactions,
            it will be deactivated instead of permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
