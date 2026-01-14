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
