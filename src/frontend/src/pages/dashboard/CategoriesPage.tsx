import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Housing: Home,
  Transport: Car,
  Food: Utensils,
  Entertainment: Film,
  Shopping: ShoppingCart,
  Utilities: Zap,
  Income: TrendingUp,
  Investment: Briefcase,
  Savings: PiggyBank,
  Other: CreditCard,
};

const mockCategories = [
  { id: '1', name: 'Housing', type: 'expense', spending_type: 'Core', is_active: true },
  { id: '2', name: 'Food', type: 'expense', spending_type: 'Core', is_active: true },
  { id: '3', name: 'Transport', type: 'expense', spending_type: 'Necessary', is_active: true },
  { id: '4', name: 'Utilities', type: 'expense', spending_type: 'Core', is_active: true },
  { id: '5', name: 'Entertainment', type: 'expense', spending_type: 'Fun', is_active: true },
  { id: '6', name: 'Shopping', type: 'expense', spending_type: 'Fun', is_active: true },
  { id: '7', name: 'Income', type: 'income', spending_type: 'Income', is_active: true },
  { id: '8', name: 'Investment', type: 'investment', spending_type: 'Future', is_active: true },
  { id: '9', name: 'Savings', type: 'saving', spending_type: 'Future', is_active: true },
];

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

export default function CategoriesPage() {
  const groupedCategories = mockCategories.reduce((acc, cat) => {
    const type = cat.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(cat);
    return acc;
  }, {} as Record<string, typeof mockCategories>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="View and manage spending categories"
      />

      {Object.entries(groupedCategories).map(([type, categories]) => (
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
            {categories.map((category) => {
              const Icon = iconMap[category.name] || CreditCard;
              return (
                <motion.div
                  key={category.id}
                  variants={fadeIn}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-sm"
                >
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{category.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-xs',
                          spendingTypeColors[category.spending_type]
                        )}
                      >
                        {category.spending_type}
                      </span>
                    </div>
                  </div>
                  {!category.is_active && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
