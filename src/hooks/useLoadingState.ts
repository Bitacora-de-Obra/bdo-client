import { useState, useCallback, useEffect, useRef } from 'react';
import { ApiError } from '../utils/error-handling';

export interface LoadingState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  refetch?: () => Promise<void>;
}

type AnyFetchFn = () => Promise<any>;

interface StoreSnapshot<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

interface StoreEntry<T> extends StoreSnapshot<T> {
  listeners: Set<(state: StoreSnapshot<T>) => void>;
  fetchPromise?: Promise<void>;
}

const store = new Map<AnyFetchFn, StoreEntry<unknown>>();

function getSnapshot<T>(entry: StoreEntry<T>): StoreSnapshot<T> {
  return {
    data: entry.data,
    isLoading: entry.isLoading,
    error: entry.error,
  };
}

function updateEntry<T>(
  entry: StoreEntry<T>,
  updates: Partial<Pick<StoreEntry<T>, 'data' | 'isLoading' | 'error'>>
) {
  Object.assign(entry, updates);
  const snapshot = getSnapshot(entry);
  entry.listeners.forEach((listener) => listener(snapshot));
}

export function useLoadingState<T>(
  fetchFn: () => Promise<T>,
  initialData: T | null = null
): LoadingState<T> {
  const entryRef = useRef<StoreEntry<T>>();

  if (!entryRef.current) {
    let entry = store.get(fetchFn as AnyFetchFn) as StoreEntry<T> | undefined;

    if (!entry) {
      entry = {
        data: initialData,
        isLoading: false,
        error: null,
        listeners: new Set(),
      };
      store.set(fetchFn as AnyFetchFn, entry as StoreEntry<unknown>);
    } else if (entry.data === null && initialData !== null) {
      entry.data = initialData;
    }

    entryRef.current = entry;
  }

  const entry = entryRef.current!;
  const [state, setState] = useState<StoreSnapshot<T>>(() => getSnapshot(entry));

  const runFetch = useCallback(async () => {
    if (entry.fetchPromise) {
      return entry.fetchPromise;
    }

    const fetchOperation = (async () => {
      updateEntry(entry, { isLoading: true, error: null });
      try {
        const result = await fetchFn();
        updateEntry(entry, { data: result, isLoading: false, error: null });
      } catch (err) {
        console.error('Error en useLoadingState:', err);
        const apiError = err instanceof ApiError ? err : new ApiError('Error desconocido');
        updateEntry(entry, { error: apiError, isLoading: false });
      }
    })();

    const wrappedPromise = fetchOperation.finally(() => {
      entry.fetchPromise = undefined;
    });

    entry.fetchPromise = wrappedPromise;
    return wrappedPromise;
  }, [entry, fetchFn]);

  const retry = useCallback(() => runFetch(), [runFetch]);

  useEffect(() => {
    const listener = (snapshot: StoreSnapshot<T>) => {
      setState(snapshot);
    };

    entry.listeners.add(listener);
    setState(getSnapshot(entry));

    if (!entry.isLoading && !entry.fetchPromise && entry.data === null) {
      runFetch();
    }

    return () => {
      entry.listeners.delete(listener);
    };
  }, [entry, runFetch]);

  return { ...state, retry };
}
