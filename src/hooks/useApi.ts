// filepath: /src/hooks/useApi.ts
// 🎯 REACT HOOK FOR API CALLS - Handles loading, error, and success states
// Use this in all components instead of direct fetch/apiClient calls

import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/src/utils/logger';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  skip?: boolean;
  dependencies?: any[];
}

/**
 * Hook for executing async API calls with loading and error handling
 *
 * @example
 * const { data: user, loading, error } = useApi(
 *   () => authService.getProfile(),
 *   { dependencies: [] }
 * );
 */
export function useApi<T = any>(
  asyncFn: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & { refetch: () => Promise<void> } {
  const { onSuccess, onError, skip = false, dependencies = [] } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: !skip,
    error: null,
    isSuccess: false,
  });

  const execute = useCallback(async () => {
    if (skip) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFn();
      setState({ data: result, loading: false, error: null, isSuccess: true });
      onSuccess?.(result);
      logger.debug('API call successful', { result });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error, isSuccess: false });
      onError?.(error);
      logger.error('API call failed', error);
    }
  }, [asyncFn, skip, onSuccess, onError]);

  // Execute on mount
  useEffect(() => {
    execute();
  }, [execute, ...dependencies]);

  return {
    ...state,
    refetch: execute,
  };
}

/**
 * Hook for executing mutations (POST, PATCH, DELETE) with optional immediate return of state
 *
 * @example
 * const { mutate, loading, error } = useApiMutation(
 *   (data) => cartService.addToCart(outletId, data),
 *   { onSuccess: () => { /* refresh cart * / } }
 * );
 */
export function useApiMutation<T = any, P = any>(
  asyncFn: (params: P) => Promise<T>,
  options: UseApiOptions = {}
): {
  mutate: (params: P) => Promise<T>;
  loading: boolean;
  error: Error | null;
  data: T | null;
  isSuccess: boolean;
  reset: () => void;
} {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    isSuccess: false,
  });

  const mutate = useCallback(
    async (params: P): Promise<T> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await asyncFn(params);
        setState({ data: result, loading: false, error: null, isSuccess: true });
        onSuccess?.(result);
        logger.debug('Mutation successful', { result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ data: null, loading: false, error, isSuccess: false });
        onError?.(error);
        logger.error('Mutation failed', error);
        throw error;
      }
    },
    [asyncFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, isSuccess: false });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook for paginated API calls
 *
 * @example
 * const { items, page, hasMore, loading } = useApiPagination(
 *   (page) => ordersService.listOrders(page)
 * );
 */
export function useApiPagination<T = any>(
  asyncFn: (page: number) => Promise<{ results: T[]; count: number; next: string | null }>,
  pageSize: number = 20
): {
  items: T[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
} {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const goToPage = useCallback(
    async (newPage: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(newPage);
        setItems(result.results);
        setHasMore(!!result.next);
        setPage(newPage);
        logger.debug(`Loaded page ${newPage}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error('Pagination failed', error);
      } finally {
        setLoading(false);
      }
    },
    [asyncFn]
  );

  const nextPage = useCallback(async () => {
    if (hasMore) await goToPage(page + 1);
  }, [page, hasMore, goToPage]);

  const previousPage = useCallback(async () => {
    if (page > 1) await goToPage(page - 1);
  }, [page, goToPage]);

  // Load first page on mount
  useEffect(() => {
    goToPage(1);
  }, []);

  return {
    items,
    page,
    hasMore,
    loading,
    error,
    goToPage,
    nextPage,
    previousPage,
  };
}

/**
 * Hook for polling API calls (e.g., order status updates)
 *
 * @example
 * const { data: order, stop } = useApiPolling(
 *   () => ordersService.getOrder(orderId),
 *   { interval: 5000 } // Poll every 5 seconds
 * );
 */
export function useApiPolling<T = any>(
  asyncFn: () => Promise<T>,
  options: { interval?: number; maxRetries?: number; onSuccess?: (data: T) => void } = {}
): UseApiState<T> & { stop: () => void; start: () => void } {
  const { interval = 5000, maxRetries = 10, onSuccess } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
    isSuccess: false,
  });

  const [isPolling, setIsPolling] = useState(true);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!isPolling) return;

    const timer = setInterval(async () => {
      try {
        const result = await asyncFn();
        setState({ data: result, loading: false, error: null, isSuccess: true });
        setRetries(0); // Reset retries on success
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        setRetries((prev) => {
          const newRetries = prev + 1;
          if (newRetries >= maxRetries) {
            setState({ data: null, loading: false, error, isSuccess: false });
            setIsPolling(false);
            logger.error('Polling stopped after max retries', error);
          }
          return newRetries;
        });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPolling, asyncFn, interval, maxRetries, onSuccess]);

  return {
    ...state,
    stop: () => setIsPolling(false),
    start: () => {
      setIsPolling(true);
      setRetries(0);
    },
  };
}
