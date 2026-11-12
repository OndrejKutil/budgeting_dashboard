import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TRANSACTIONS_PATH } from '@/components/layout/nav-config';

/** Location state that asks TransactionsPage to open its add-transaction dialog. */
export interface OpenAddState {
  openAdd?: boolean;
}

/** Navigates to the transactions page and asks it to open the add-transaction dialog. */
export function useOpenAddTransaction(): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;

  return useCallback(() => {
    const state: OpenAddState = { openAdd: true };
    // Keep the current filters when the user is already on the transactions page.
    navigate(
      { pathname: TRANSACTIONS_PATH, search: pathname === TRANSACTIONS_PATH ? search : '' },
      { state },
    );
  }, [navigate, pathname, search]);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[role=combobox],[role=listbox],[role=option],[role=menuitem],[role=textbox]')) return true;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Global `N` shortcut for adding a transaction. */
export function useAddTransactionShortcut(): void {
  const openAdd = useOpenAddTransaction();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.repeat) return;
      if (event.isComposing || event.defaultPrevented || isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      event.preventDefault();
      openAdd();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openAdd]);
}
