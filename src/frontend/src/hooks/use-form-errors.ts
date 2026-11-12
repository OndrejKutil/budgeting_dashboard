import { useCallback, useState } from 'react';

export type FormErrors<K extends string> = Partial<Record<K, string>>;

/**
 * Per-field error state for the hand-rolled forms. `show` replaces the whole set after a
 * failed submit and moves focus to the first invalid control; `clear` drops one field's
 * error as soon as the user starts fixing it.
 */
export function useFormErrors<K extends string>() {
  const [errors, setErrors] = useState<FormErrors<K>>({});

  const clear = useCallback((...keys: K[]) => {
    setErrors(prev => {
      if (!keys.some(key => prev[key])) return prev;
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  }, []);

  const reset = useCallback(() => setErrors({}), []);

  /** Returns true when there is nothing to show, so it reads as `if (!show(errors)) return`. */
  const show = useCallback((next: FormErrors<K>) => {
    setErrors(next);
    const valid = Object.keys(next).length === 0;
    if (!valid) {
      // After the errors have rendered, so the aria-invalid attribute is there to find.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"], form [aria-invalid="true"]')?.focus();
      });
    }
    return valid;
  }, []);

  return { errors, show, clear, reset };
}

/** Spread onto a control inside a `Field` to wire up invalid styling and the error message. */
export function fieldAria(id: string, error?: string) {
  return error
    ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` }
    : {};
}
