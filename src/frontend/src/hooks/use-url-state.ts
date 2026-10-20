import { useSearchParams, useLocation } from 'react-router-dom';
import { useCallback, useEffect } from 'react';

/**
 * A hook to manage state that is synchronized with a URL query parameter.
 * 
 * @param key The key of the query parameter
 * @param defaultValue The default value if the parameter is missing
 * @returns [value, setValue] tuple
 */
export function useUrlState<T extends string | number>(
    key: string,
    defaultValue: T
): [T, (newValue: T) => void] {
    const location = useLocation();
    const storageKey = `budget-dashboard:${location.pathname}:${key}`;

    const [searchParams, setSearchParams] = useSearchParams();
    const value = searchParams.get(key);

    // Initial load restoration logic
    useEffect(() => {
        // If the URL param is missing, but we have a stored value, restore it
        if (value === null) {
            const storedValue = sessionStorage.getItem(storageKey);
            if (storedValue !== null && storedValue !== String(defaultValue)) {
                setSearchParams((prev) => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set(key, storedValue);
                    return newParams;
                }, { replace: true });
            }
        }
    }, [key, value, storageKey, defaultValue, setSearchParams]);

    // Parse the value based on the default value's type
    const parsedValue = value === null
        ? defaultValue
        : typeof defaultValue === 'number'
            ? Number(value) as T
            : value as T;

    const setValue = useCallback((newValue: T) => {
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            const stringValue = String(newValue);

            if (newValue === defaultValue || newValue === '' || newValue === null) {
                newParams.delete(key);
                sessionStorage.removeItem(storageKey);
            } else {
                newParams.set(key, stringValue);
                sessionStorage.setItem(storageKey, stringValue);
            }
            return newParams;
        });
    }, [key, defaultValue, setSearchParams, storageKey]);

    return [parsedValue, setValue];
}

/**
 * Month + year as URL params (same storage as two `useUrlState` calls), with a setter that
 * writes both in ONE navigation. Two separate `useUrlState` setters called back to back
 * (e.g. Jan → Dec of the previous year) would each start from the same stale params and the
 * second would undo the first.
 *
 * `month` is stored zero-padded ("03"), matching the existing analytics URLs.
 */
export function useUrlPeriod(): { month: number; year: number; setPeriod: (month: number, year: number) => void } {
    const location = useLocation();
    const [, setSearchParams] = useSearchParams();
    const now = new Date();
    const defaultYear = String(now.getFullYear());
    const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');

    const [yearStr] = useUrlState('year', defaultYear);
    const [monthStr] = useUrlState('month', defaultMonth);

    const parsedMonth = parseInt(monthStr);
    const parsedYear = parseInt(yearStr);
    const month = parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : now.getMonth() + 1;
    const year = Number.isFinite(parsedYear) ? parsedYear : now.getFullYear();

    const setPeriod = useCallback((newMonth: number, newYear: number) => {
        const entries: [string, string, string][] = [
            ['month', String(newMonth).padStart(2, '0'), defaultMonth],
            ['year', String(newYear), defaultYear],
        ];
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            for (const [key, value, fallback] of entries) {
                const storageKey = `budget-dashboard:${location.pathname}:${key}`;
                if (value === fallback) {
                    newParams.delete(key);
                    sessionStorage.removeItem(storageKey);
                } else {
                    newParams.set(key, value);
                    sessionStorage.setItem(storageKey, value);
                }
            }
            return newParams;
        });
    }, [defaultMonth, defaultYear, location.pathname, setSearchParams]);

    return { month, year, setPeriod };
}
