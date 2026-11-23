import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { BudgetNative, isNativeApp } from '@/lib/native/budgetNative';

/**
 * Native iOS app only: keeps the status bar text readable on the site's current theme.
 * Renders nothing and does nothing in browsers and the PWA.
 */
export function NativeStatusBar() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isNativeApp() || !resolvedTheme) return;
    // Light text on the dark theme, dark text on the light theme.
    BudgetNative.setStatusBarStyle({ style: resolvedTheme === 'light' ? 'dark' : 'light' }).catch(() => {
      // An older native build without this method: the status bar keeps its default style.
    });
  }, [resolvedTheme]);

  return null;
}
