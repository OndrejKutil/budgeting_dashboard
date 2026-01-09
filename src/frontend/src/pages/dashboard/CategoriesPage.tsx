import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { categoriesApi, ApiError } from '@/lib/api/client';
import { Category } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await categoriesApi.getAll();
        setCategories(response.data);
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : 'Failed to load categories';
        setError(message || 'Failed to load categories');
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const groupedCategories = categories.reduce((acc, cat) => {
    const type = cat.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  if (error && !isLoading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          description="View and manage spending categories"
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">Failed to load categories</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="View and manage spending categories"
      />

      {isLoading ? (
        <div className="space-y-6">
          {['expense', 'income', 'saving'].map((type) => (
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
        Object.entries(groupedCategories).map(([type, cats]) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold font-display capitalize">{type}</h2>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {cats.map((category) => {
                const Icon = iconMap[category.category_name] || CreditCard;
                return (
                  <motion.div
                    key={category.categories_id_pk}
                    variants={fadeIn}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-sm"
                  >
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{category.category_name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        {category.spending_type && (
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-xs',
                              spendingTypeColors[category.spending_type] || 'bg-muted text-muted-foreground'
                            )}
                          >
                            {category.spending_type}
                          </span>
                        )}
                      </div>
                    </div>
                    {category.is_active === false && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        ))
      )}
    </div>
  );
}
