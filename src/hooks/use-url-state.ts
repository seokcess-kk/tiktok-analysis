'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

type SerializableValue = string | number | boolean | null | undefined;

interface UseUrlStateOptions<T> {
  defaultValue?: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

/**
 * Hook for syncing state with URL query parameters
 */
export function useUrlState<T extends SerializableValue>(
  key: string,
  options: UseUrlStateOptions<T> = {}
): [T | undefined, (value: T | undefined) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { defaultValue, serialize, deserialize } = options;

  const value = useMemo(() => {
    const paramValue = searchParams.get(key);
    if (paramValue === null) {
      return defaultValue;
    }

    if (deserialize) {
      return deserialize(paramValue);
    }

    // Auto-detect type based on defaultValue
    if (typeof defaultValue === 'number') {
      const num = parseFloat(paramValue);
      return (isNaN(num) ? defaultValue : num) as T;
    }

    if (typeof defaultValue === 'boolean') {
      return (paramValue === 'true') as unknown as T;
    }

    return paramValue as T;
  }, [searchParams, key, defaultValue, deserialize]);

  const setValue = useCallback(
    (newValue: T | undefined) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue === undefined || newValue === null || newValue === '') {
        params.delete(key);
      } else {
        const serialized = serialize
          ? serialize(newValue)
          : String(newValue);
        params.set(key, serialized);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [searchParams, pathname, router, key, serialize]
  );

  return [value, setValue];
}

/**
 * Hook for syncing multiple URL state parameters
 */
export function useUrlStates<T extends Record<string, SerializableValue>>(
  defaultValues: T
): [T, (updates: Partial<T>) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const values = useMemo(() => {
    const result = { ...defaultValues };

    for (const key of Object.keys(defaultValues) as Array<keyof T>) {
      const paramValue = searchParams.get(key as string);
      const defaultValue = defaultValues[key];

      if (paramValue === null) {
        continue;
      }

      if (typeof defaultValue === 'number') {
        const num = parseFloat(paramValue);
        (result as Record<keyof T, SerializableValue>)[key] = isNaN(num) ? defaultValue : num;
      } else if (typeof defaultValue === 'boolean') {
        (result as Record<keyof T, SerializableValue>)[key] = paramValue === 'true';
      } else {
        (result as Record<keyof T, SerializableValue>)[key] = paramValue;
      }
    }

    return result;
  }, [searchParams, defaultValues]);

  const setValues = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  return [values, setValues];
}

/**
 * Hook for date range URL state
 */
export function useDateRangeUrlState(
  startKey = 'startDate',
  endKey = 'endDate'
): [
  { from: Date | undefined; to: Date | undefined },
  (range: { from: Date | undefined; to: Date | undefined }) => void
] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const value = useMemo(() => {
    const startStr = searchParams.get(startKey);
    const endStr = searchParams.get(endKey);

    return {
      from: startStr ? new Date(startStr) : undefined,
      to: endStr ? new Date(endStr) : undefined,
    };
  }, [searchParams, startKey, endKey]);

  const setValue = useCallback(
    (range: { from: Date | undefined; to: Date | undefined }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (range.from) {
        params.set(startKey, range.from.toISOString().split('T')[0]);
      } else {
        params.delete(startKey);
      }

      if (range.to) {
        params.set(endKey, range.to.toISOString().split('T')[0]);
      } else {
        params.delete(endKey);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [searchParams, pathname, router, startKey, endKey]
  );

  return [value, setValue];
}
