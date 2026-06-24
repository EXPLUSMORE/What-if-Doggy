// ============================================================
// useLocalStorage – typsicherer localStorage-Hook
// ============================================================

import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        // Silently ignore storage errors
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch {
      // Silently ignore
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
