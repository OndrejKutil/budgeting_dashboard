import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockFunds = [
  { id: '1', name: 'Emergency Fund', target: 15000, current: 8500, description: '6-month expenses buffer' },
  { id: '2', name: 'Vacation', target: 3000, current: 1250, description: 'Summer trip to Europe' },
  { id: '3', name: 'New Car', target: 25000, current: 12000, description: 'Down payment for new vehicle' },
  { id: '4', name: 'Home Renovation', target: 10000, current: 10000, description: 'Kitchen remodel' },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function FundsPage() {
  const totalTarget = mockFunds.reduce((sum, f) => sum + f.target, 0);
  const totalCurrent = mockFunds.reduce((sum, f) => sum + f.current, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Funds"
        description="Track your savings goals and progress"
        actions={
          <Button className="bg-gradient-blurple hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Create Fund
          </Button>
        }
      />

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Saved</p>
            <p className="text-3xl font-bold font-display">
              ${totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">
              of ${totalTarget.toLocaleString('en-US')} target
            </p>
          </div>
          <div className="w-full sm:w-48">
            <Progress
              value={(totalCurrent / totalTarget) * 100}
              className="h-3"
            />
            <p className="mt-1 text-right text-sm text-muted-foreground">
              {((totalCurrent / totalTarget) * 100).toFixed(0)}% complete
            </p>
          </div>
        </div>
      </motion.div>

      {/* Funds Grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2"
      >
        {mockFunds.map((fund) => {
          const progress = (fund.current / fund.target) * 100;
          const isComplete = progress >= 100;

          return (
            <motion.div
              key={fund.id}
              variants={fadeIn}
              className={cn(
                'group rounded-xl border bg-card p-5 shadow-card transition-all hover:shadow-glow-sm',
                isComplete ? 'border-success/30' : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'rounded-lg p-2.5',
                      isComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    )}
                  >
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{fund.name}</h3>
                    <p className="text-sm text-muted-foreground">{fund.description}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-bold font-display">
                      ${fund.current.toLocaleString('en-US')}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}/ ${fund.target.toLocaleString('en-US')}
                    </span>
                  </div>
                  {isComplete && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      Complete!
                    </span>
                  )}
                </div>
                <Progress
                  value={Math.min(progress, 100)}
                  className={cn('mt-3 h-2', isComplete && '[&>div]:bg-success')}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
