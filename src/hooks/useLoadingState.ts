import { useState, useCallback, useEffect } from 'react';
import { ApiError } from '../utils/error-handling';

export interface LoadingState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

export function useLoadingState<T>(
  fetchFn: () => Promise<T>,
  initialData: T | null = null
): LoadingState<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      console.error('Error en useLoadingState:', err);
      setError(err instanceof ApiError ? err : new ApiError('Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  const retry = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  useEffect(() => {
    console.log('useLoadingState: Iniciando fetchData...');
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, retry };
}