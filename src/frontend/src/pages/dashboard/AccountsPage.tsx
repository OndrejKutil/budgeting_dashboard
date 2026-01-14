import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Wallet, CreditCard, Landmark, MoreHorizontal, Pencil, Trash2, AlertCircle, Building, Loader2 } from 'lucide-react';
import { accountsApi, ApiError } from '@/lib/api/client';
import { Account } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  checking: Wallet,
  savings: Landmark,
  credit: CreditCard,
  investment: Building,
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function AccountSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'];
const CURRENCIES = ['USD', 'EUR', 'CZK', 'GBP', 'PLN', 'CAD', 'AUD'];

export default function AccountsPage() {
  const queryClient = useQueryClient();
  // const [accounts, setAccounts] = useState<Account[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await accountsApi.getAll();
      return response.data;
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    account_name: '',
    type: '',
    currency: 'CZK',
  });



  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account deleted',
        description: 'The account has been removed successfully.',
      });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.detail : 'Failed to delete account';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (accountId: string) => {
    deleteMutation.mutate(accountId);
  };

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Account created successfully' });
      closeModal();
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.detail : 'Failed to create account';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; data: typeof formData }) => accountsApi.update(data.id, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Account updated successfully' });
      closeModal();
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.detail : 'Failed to update account';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async () => {
    if (!formData.account_name || !formData.type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAccount) {
      updateMutation.mutate({ id: selectedAccount.accounts_id_pk, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      account_name: account.account_name,
      type: account.type,
      currency: account.currency || 'CZK',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(null);
    setFormData({
      account_name: '',
      type: '',
      currency: 'CZK',
    });
  };

  if (error && !isLoading && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Accounts"
          description="Manage your bank accounts and balances"
          actions={
            <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-blurple hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">Failed to load accounts</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your bank accounts and balances"
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-blurple hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {/* Total Accounts Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6"
      >
        <p className="text-sm text-muted-foreground">Total Accounts</p>
        <div className="mt-1 text-3xl font-bold font-display">
          {isLoading ? <Skeleton className="h-9 w-16 inline-block" /> : accounts.length}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your financial accounts
        </p>
      </motion.div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <AccountSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {accounts.map((account) => {
            const Icon = iconMap[account.type.toLowerCase()] || Wallet;
            return (
              <motion.div
                key={account.accounts_id_pk}
                variants={fadeIn}
                className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{account.account_name}</h3>
                      <p className="text-sm text-muted-foreground">{account.type}</p>
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
                      <DropdownMenuItem onClick={() => openEditModal(account)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(account.accounts_id_pk)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold font-display">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: account.currency || 'CZK',
                      }).format(account.current_balance || 0)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">30d Net Flow</span>
                    <span
                      className={`font-medium ${(account.net_flow_30d || 0) >= 0
                        ? 'text-emerald-500'
                        : 'text-destructive'
                        }`}
                    >
                      {(account.net_flow_30d || 0) > 0 ? '+' : ''}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: account.currency || 'CZK',
                      }).format(account.net_flow_30d || 0)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedAccount ? 'Edit Account' : 'Add Account'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                placeholder="e.g., Main Checking"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-blurple hover:opacity-90"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedAccount ? 'Save Changes' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
