import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, MoreHorizontal, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { fundsApi, tokenManager, ApiError } from '@/lib/api/client';
import { SavingsFund, CreateSavingsFundRequest, UpdateSavingsFundRequest } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/user-context';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function FundsPage() {
  const { formatCurrency } = useUser();
  const queryClient = useQueryClient();
  // const [funds, setFunds] = useState<SavingsFund[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  const { data: funds = [], isLoading, error } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => {
      const response = await fundsApi.getAll();
      return response.data;
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<SavingsFund | null>(null);

  const [formData, setFormData] = useState({
    fund_name: '',
    target_amount: '',
  });

  const totalTarget = funds.reduce((sum, f) => sum + f.target_amount, 0);
  const totalCurrent = funds.reduce((sum, f) => sum + (f.current_amount || 0), 0);

  const handleOpenModal = (fund?: SavingsFund) => {
    if (fund) {
      setSelectedFund(fund);
      setFormData({
        fund_name: fund.fund_name,
        target_amount: fund.target_amount.toString(),
      });
    } else {
      setSelectedFund(null);
      setFormData({
        fund_name: '',
        target_amount: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFund(null);
    setFormData({
      fund_name: '',
      target_amount: '',
    });
  };

  const createMutation = useMutation({
    mutationFn: fundsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      toast({ title: 'Fund created successfully' });
      handleCloseModal();
    },
    onError: (err: Error | ApiError) => {
      let message = 'Failed to create fund';
      if (err instanceof ApiError) {
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail.map((e: { msg: string }) => e.msg).join(', ');
        } else if (typeof err.detail === 'object' && err.detail !== null) {
          message = JSON.stringify(err.detail);
        }
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; data: UpdateSavingsFundRequest }) => fundsApi.update(data.id, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      toast({ title: 'Fund updated successfully' });
      handleCloseModal();
    },
    onError: (err: Error | ApiError) => {
      let message = 'Failed to update fund';
      if (err instanceof ApiError) {
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail.map((e: { msg: string }) => e.msg).join(', ');
        } else if (typeof err.detail === 'object' && err.detail !== null) {
          message = JSON.stringify(err.detail);
        }
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async () => {
    if (!formData.fund_name || !formData.target_amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const userId = tokenManager.getUserId();
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User ID not found. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      user_id_fk: userId,
      fund_name: formData.fund_name,
      target_amount: parseInt(formData.target_amount),
    };

    if (selectedFund) {
      updateMutation.mutate({ id: selectedFund.savings_funds_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: fundsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      toast({
        title: 'Fund deleted',
        description: 'The savings fund has been removed.',
      });
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to delete fund';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const handleDelete = (fundId: string) => {
    deleteMutation.mutate(fundId);
  };

  if (error && !isLoading && funds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Savings Funds"
          description="Track your savings goals and progress"
          actions={
            <Button onClick={() => handleOpenModal()} className="bg-gradient-blurple hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Create Fund
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">Failed to load funds</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['funds'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Funds"
        description="Track your savings goals and progress"
        actions={
          <Button onClick={() => handleOpenModal()} className="bg-gradient-blurple hover:opacity-90">
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
        {isLoading ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Saved</p>
              <p className="text-3xl font-bold font-display">
                {formatCurrency(totalCurrent)}
              </p>
              <p className="text-sm text-muted-foreground">
                of {formatCurrency(totalTarget)} target
              </p>
            </div>
            <div className="w-full sm:w-48">
              <Progress
                value={totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0}
                className="h-3"
              />
              <p className="mt-1 text-right text-sm text-muted-foreground">
                {totalTarget > 0 ? ((totalCurrent / totalTarget) * 100).toFixed(0) : 0}% complete
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Funds Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          <AnimatePresence mode='popLayout'>
            {funds.map((fund) => {
              const current = fund.current_amount || 0;
              const progress = fund.target_amount > 0 ? (current / fund.target_amount) * 100 : 0;
              const isComplete = progress >= 100;

              return (
                <motion.div
                  key={fund.savings_funds_id_pk}
                  variants={fadeIn}
                  layout
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
                        <h3 className="font-semibold">{fund.fund_name}</h3>
                        {fund.net_flow_30d !== undefined && fund.net_flow_30d !== null && fund.net_flow_30d !== 0 && (
                          <p className={cn("text-xs", fund.net_flow_30d > 0 ? "text-success" : "text-destructive")}>
                            {fund.net_flow_30d > 0 ? '+' : ''}{formatCurrency(fund.net_flow_30d)} this month
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(fund)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(fund.savings_funds_id_pk)}
                        >
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
                          {formatCurrency(current)}
                        </span>
                        <span className="text-muted-foreground ml-1 text-sm">
                          / {formatCurrency(fund.target_amount)}
                        </span>
                      </div>
                      {isComplete && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          Goal Reached!
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
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedFund ? 'Edit Savings Fund' : 'Create Savings Fund'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fund Name</Label>
              <Input
                id="name"
                placeholder="e.g., Vacation, Emergency Fund"
                value={formData.fund_name}
                onChange={(e) => setFormData({ ...formData, fund_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target Amount</Label>
              <Input
                id="target"
                type="number"
                placeholder="5000"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-blurple hover:opacity-90"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedFund ? 'Save Changes' : 'Create Fund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
