import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Wallet, CreditCard, Landmark, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockAccounts = [
  { id: '1', name: 'Main Checking', type: 'Checking', currency: 'USD', balance: 5420.50, icon: Wallet },
  { id: '2', name: 'Savings Account', type: 'Savings', currency: 'USD', balance: 12350.00, icon: Landmark },
  { id: '3', name: 'Credit Card', type: 'Credit', currency: 'USD', balance: -850.25, icon: CreditCard },
  { id: '4', name: 'Investment Account', type: 'Investment', currency: 'USD', balance: 28500.00, icon: Landmark },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AccountsPage() {
  const totalBalance = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your bank accounts and balances"
        actions={
          <Button className="bg-gradient-blurple hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6"
      >
        <p className="text-sm text-muted-foreground">Total Net Balance</p>
        <p className="mt-1 text-3xl font-bold font-display">
          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Across {mockAccounts.length} accounts
        </p>
      </motion.div>

      {/* Accounts Grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {mockAccounts.map((account) => {
          const Icon = account.icon;
          return (
            <motion.div
              key={account.id}
              variants={fadeIn}
              className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-glow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
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
                <p
                  className={cn(
                    'text-2xl font-bold font-display',
                    account.balance < 0 ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {account.balance < 0 ? '-' : ''}${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{account.currency}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
