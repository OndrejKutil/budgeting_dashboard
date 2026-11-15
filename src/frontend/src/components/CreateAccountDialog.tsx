import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fieldAria, useFormErrors } from '@/hooks/use-form-errors';
import { useUser } from '@/contexts/user-context';
import { getErrorMessage } from '@/lib/api/client';
import { accountsApi } from '@/lib/api/endpoints';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash', 'investment'] as const;

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefilled name (e.g. the bank recognised in an imported file). */
  initialName?: string;
  /** Prefilled currency; ignored when the app does not support it. */
  initialCurrency?: string | null;
  /** Called once the account exists, so the caller can carry on with it. */
  /** Called with the new account's id (null if the backend didn't return one). */
  onCreated: (accountId: string | null) => void;
}

/**
 * The minimal "new account" form (name, type, currency) for flows that need an account before
 * they can continue. The Accounts page keeps its own richer dialog (groups, editing); this one
 * waits for the server instead of writing optimistically, because the caller needs the account
 * to exist before it moves on.
 */
export function CreateAccountDialog({ open, onOpenChange, initialName = '', initialCurrency, onCreated }: CreateAccountDialogProps) {
  const { t, currency: userCurrency } = useUser();
  const queryClient = useQueryClient();
  const fallbackCurrency = (SUPPORTED_CURRENCIES as readonly string[]).includes(userCurrency) ? userCurrency : 'CZK';
  const startCurrency = initialCurrency && (SUPPORTED_CURRENCIES as readonly string[]).includes(initialCurrency)
    ? initialCurrency
    : fallbackCurrency;

  const [name, setName] = useState(initialName);
  const [type, setType] = useState<string>('checking');
  const [currency, setCurrency] = useState(startCurrency);
  const { errors, show, clear, reset } = useFormErrors<'name' | 'type'>();

  // Re-seed each time the dialog opens, since the prefill depends on the file just read.
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setType('checking');
    setCurrency(startCurrency);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: t('pages.accounts.created') });
      onCreated(res?.account_id ?? null);
    },
    onError: (err) => {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('pages.accounts.createFailed')),
        variant: 'destructive',
      });
    },
  });

  const submit = () => {
    const fieldErrors: { name?: string; type?: string } = {};
    if (!name.trim()) fieldErrors.name = t('pages.accounts.nameRequired');
    if (!type) fieldErrors.type = t('pages.accounts.typeRequired');
    if (!show(fieldErrors)) return;
    createMutation.mutate({ account_name: name.trim(), type, currency });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pages.accounts.addTitle')}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-5 py-4">
            <Field htmlFor="new_account_name" label={t('pages.accounts.accountName')} error={errors.name}>
              <Input
                id="new_account_name"
                placeholder={t('pages.accounts.accountNamePlaceholder')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clear('name');
                }}
                {...fieldAria('new_account_name', errors.name)}
              />
            </Field>
            <Field htmlFor="new_account_type" label={t('pages.accounts.accountType')} error={errors.type}>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value);
                  clear('type');
                }}
              >
                <SelectTrigger id="new_account_type" {...fieldAria('new_account_type', errors.type)}>
                  <SelectValue placeholder={t('common.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((accountType) => (
                    <SelectItem key={accountType} value={accountType}>
                      {t(`types.${accountType}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field htmlFor="new_account_currency" label={t('common.currency')}>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="new_account_currency">
                  <SelectValue placeholder={t('profile.selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t('pages.accounts.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
