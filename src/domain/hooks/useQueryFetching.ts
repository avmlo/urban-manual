/**
 * TanStack Query-based Data Fetching Hook
 *
 * Provides consistent data fetching patterns using TanStack Query v5 with:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Loading states
 * - Error handling
 * - Retry with exponential backoff
 * - Optimistic updates
 *
 * This replaces the custom useDataFetching hook with industry-standard
 * TanStack Query for better stability and features.
 */

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Query status enum compatible with TanStack Query states
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error' | 'refreshing';

/**
 * Map TanStack Query v5 status to our QueryStatus
 */
export function getQueryStatus(
  status: 'pending' | 'error' | 'success',
  isFetching: boolean,
  hasData: boolean
): QueryStatus {
  if (status === 'pending' && !hasData) return 'loading';
  if (status === 'error') return 'error';
  if (isFetching && hasData) return 'refreshing';
  if (status === 'success') return 'success';
  return 'idle';
}

interface UseQueryFetchingOptions<T> {
  /** Unique key for caching and deduplication */
  queryKey: QueryKey;
  /** Initial data */
  initialData?: T;
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
  /** Cache time in milliseconds (default: 5 minutes) */
  staleTime?: number;
  /** Retry count on failure (default: 3) */
  retryCount?: number;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Refetch on window focus (default: false) */
  refetchOnWindowFocus?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
}

interface UseQueryFetchingResult<T> {
  /** Current data */
  data: T | undefined;
  /** Current status */
  status: QueryStatus;
  /** Error if any */
  error: Error | null;
  /** Whether currently loading (no data yet) */
  isLoading: boolean;
  /** Whether currently refreshing (has data, fetching new) */
  isRefreshing: boolean;
  /** Whether fetch was successful */
  isSuccess: boolean;
  /** Whether fetch had an error */
  isError: boolean;
  /** Whether data is stale */
  isStale: boolean;
  /** Refetch data */
  refetch: () => Promise<void>;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
  /** Optimistically update data */
  setData: (updater: T | ((prev: T | undefined) => T | undefined)) => void;
}

/**
 * Hook for data fetching using TanStack Query
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useQueryFetching(
 *   async () => {
 *     const response = await fetch('/api/destinations');
 *     return response.json();
 *   },
 *   { queryKey: ['destinations'] }
 * );
 * ```
 */
export function useQueryFetching<T>(
  fetcher: () => Promise<T>,
  options: UseQueryFetchingOptions<T>
): UseQueryFetchingResult<T> {
  const {
    queryKey,
    initialData,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    retryCount = 3,
    onSuccess,
    onError,
    refetchOnWindowFocus = false,
    refetchInterval,
  } = options;

  const queryClient = useQueryClient();

  // v5: onSuccess/onError removed from useQuery options - handle via useEffect
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const queryOptions: UseQueryOptions<T, Error> = {
    queryKey,
    queryFn: fetcher,
    initialData,
    enabled,
    staleTime,
    retry: retryCount,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus,
    refetchInterval,
  };

  const query = useQuery(queryOptions);

  // Handle success/error callbacks via useEffect (v5 pattern)
  useEffect(() => {
    if (query.isSuccess && onSuccessRef.current && query.data !== undefined) {
      onSuccessRef.current(query.data);
    }
  }, [query.isSuccess, query.data]);

  useEffect(() => {
    if (query.isError && onErrorRef.current && query.error) {
      onErrorRef.current(query.error);
    }
  }, [query.isError, query.error]);

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const setData = useCallback(
    (updater: T | ((prev: T | undefined) => T | undefined)) => {
      queryClient.setQueryData(queryKey, updater);
    },
    [queryClient, queryKey]
  );

  const status = getQueryStatus(
    query.status,
    query.isFetching,
    query.data !== undefined
  );

  return {
    data: query.data,
    status,
    error: query.error ?? null,
    // v5: isLoading = isPending && isFetching (true only on initial load)
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && query.data !== undefined,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isStale: query.isStale,
    refetch,
    invalidate,
    setData,
  };
}

/**
 * Hook for mutations with optimistic updates
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useQueryMutation(
 *   async (data) => {
 *     const response = await fetch('/api/save', {
 *       method: 'POST',
 *       body: JSON.stringify(data),
 *     });
 *     return response.json();
 *   },
 *   {
 *     invalidateKeys: [['destinations']],
 *     onSuccess: () => console.log('Saved!'),
 *   }
 * );
 * ```
 */
interface UseQueryMutationOptions<TData, TVariables> {
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Callback on success */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Callback on error */
  onError?: (error: Error, variables: TVariables) => void;
  /** Optimistic update function */
  onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
  /** Rollback function on error */
  onSettled?: () => void;
}

interface UseQueryMutationResult<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => void;
  /** Execute the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Whether mutation is in progress (v5 name) */
  isPending: boolean;
  /** @deprecated Use isPending instead */
  isLoading: boolean;
  /** Whether mutation was successful */
  isSuccess: boolean;
  /** Whether mutation had an error */
  isError: boolean;
  /** Error if any */
  error: Error | null;
  /** Reset mutation state */
  reset: () => void;
}

export function useQueryMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseQueryMutationOptions<TData, TVariables> = {}
): UseQueryMutationResult<TData, TVariables> {
  const queryClient = useQueryClient();
  const { invalidateKeys, onSuccess, onError, onMutate, onSettled } = options;

  const mutation = useMutation({
    mutationFn,
    onMutate,
    onSuccess: async (data, variables) => {
      // Invalidate specified queries
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          )
        );
      }
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      onError?.(error as Error, variables);
    },
    onSettled,
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    // Backward compatibility alias
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: (mutation.error as Error | null) ?? null,
    reset: mutation.reset,
  };
}

/**
 * Helper to prefetch data
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  return useCallback(
    async <T>(queryKey: QueryKey, fetcher: () => Promise<T>) => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: fetcher,
      });
    },
    [queryClient]
  );
}

/**
 * Helper to invalidate queries
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return useCallback(
    async (queryKey: QueryKey) => {
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );
}
