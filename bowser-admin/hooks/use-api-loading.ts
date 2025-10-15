import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { ApiError, ApiResponse, LoadingState } from '@/types/api';

/**
 * Hook for tracking loading state of a specific API request
 * 
 * @param key - Unique identifier for the API request
 * @param options - Configuration options for polling behavior
 * @returns Object with loading state information
 */
export const useApiLoading = (key: string, options?: { pollInterval?: number }) => {
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const pollInterval = options?.pollInterval ?? 300; // Default 300ms, configurable

  useEffect(() => {
    // Initial check
    const initialState = apiClient.getLoadingState(key);
    setLoadingState(initialState);

    // Poll for loading state changes with configurable frequency
    const interval = setInterval(() => {
      const currentState = apiClient.getLoadingState(key);
      setLoadingState(currentState);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [key, pollInterval]);

  const isLoading = loadingState?.isLoading ?? false;
  const startTime = loadingState?.startTime ?? null;
  const duration = startTime ? Date.now() - startTime : null;

  return {
    isLoading,
    startTime,
    duration,
    requestId: loadingState?.requestId ?? null
  };
};

/**
 * Optimized version with debounced state updates
 * Reduces re-renders by debouncing state changes
 * 
 * @param key - Unique identifier for the API request
 * @param debounceMs - Debounce delay in milliseconds (default: 100ms)
 * @returns Object with loading state information
 */
export const useApiLoadingDebounced = (key: string, debounceMs: number = 100) => {
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkLoadingState = () => {
      const currentState = apiClient.getLoadingState(key);
      setLoadingState(currentState);
    };

    // Initial check
    checkLoadingState();

    // Poll with debouncing
    const interval = setInterval(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkLoadingState, debounceMs);
    }, 250); // Check every 250ms but debounce updates

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [key, debounceMs]);

  const isLoading = loadingState?.isLoading ?? false;
  const startTime = loadingState?.startTime ?? null;
  const duration = startTime ? Date.now() - startTime : null;

  return {
    isLoading,
    startTime,
    duration,
    requestId: loadingState?.requestId ?? null
  };
};

/**
 * Options for useApiRequest hook
 */
interface UseApiRequestOptions<T> {
  /** Whether to execute the request automatically on mount */
  autoExecute?: boolean;
  /** Callback called on successful request */
  onSuccess?: (data: T) => void;
  /** Callback called on request error */
  onError?: (error: ApiError) => void;
}

/**
 * Hook for managing API request state and execution
 * 
 * @param requestFn - Function that returns a Promise with API response
 * @param options - Configuration options
 * @returns Object with request state and control functions
 */
export const useApiRequest = <T>(
  requestFn: () => Promise<ApiResponse<T>>,
  options: UseApiRequestOptions<T> = {}
) => {
  const { autoExecute = false, onSuccess, onError } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await requestFn();
      setData(response.data);
      onSuccess?.(response.data);
    } catch (err) {
      const requestId = (err as any)?.requestId ?? 'unknown-request-' + Date.now();
      const apiError = err instanceof ApiError ? err : new ApiError(
        err instanceof Error ? err.message : 'Unknown error occurred',
        0,
        requestId,
        'INTERNAL'
      );
      setError(apiError);
      onError?.(apiError);
    } finally {
      setIsLoading(false);
    }
  }, [requestFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Auto-execute on mount if requested
  useEffect(() => {
    if (autoExecute) {
      execute();
    }
  }, [autoExecute, execute]);

  return {
    data,
    error,
    isLoading,
    execute,
    reset
  };
};

/**
 * Options for useMutation hook
 */
interface UseMutationOptions<TData> {
  /** Callback called on successful mutation */
  onSuccess?: (data: TData) => void;
  /** Callback called on mutation error */
  onError?: (error: ApiError) => void;
}

/**
 * Hook for managing mutation operations (POST, PUT, PATCH, DELETE)
 * 
 * @param mutationFn - Function that accepts variables and returns API response
 * @param options - Configuration options
 * @returns Object with mutation state and control functions
 */
export const useMutation = <TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseMutationOptions<TData> = {}
) => {
  const { onSuccess, onError } = options;
  
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (variables: TVariables) => {
    // Prevent concurrent mutations
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await mutationFn(variables);
      setData(response.data);
      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const requestId = (err as any)?.requestId ?? 'unknown-mutation-' + Date.now();
      const apiError = err instanceof ApiError ? err : new ApiError(
        err instanceof Error ? err.message : 'Unknown error occurred',
        0,
        requestId,
        'INTERNAL'
      );
      setError(apiError);
      onError?.(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, isLoading]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
    reset
  };
};

/**
 * Hook for managing multiple API requests with loading states
 * 
 * @param requests - Object with request functions
 * @returns Object with combined loading states and execute functions
 */
export const useMultipleRequests = <T extends Record<string, () => Promise<ApiResponse<any>>>>(
  requests: T
) => {
  const [data, setData] = useState<Record<keyof T, any>>({} as Record<keyof T, any>);
  const [errors, setErrors] = useState<Record<keyof T, ApiError | null>>({} as Record<keyof T, ApiError | null>);
  const [loadingStates, setLoadingStates] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const executeAll = useCallback(async () => {
    const keys = Object.keys(requests) as Array<keyof T>;
    
    // Initialize loading states
    const initialLoadingStates = keys.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<keyof T, boolean>);
    setLoadingStates(initialLoadingStates);

    // Clear previous errors
    const initialErrors = keys.reduce((acc, key) => {
      acc[key] = null;
      return acc;
    }, {} as Record<keyof T, ApiError | null>);
    setErrors(initialErrors);

    // Execute all requests
    const promises = keys.map(async (key) => {
      try {
        const response = await requests[key]();
        setData(prev => ({ ...prev, [key]: response.data }));
      } catch (err) {
        const requestId = (err as any)?.requestId ?? `unknown-request-${String(key)}-${Date.now()}`;
        const apiError = err instanceof ApiError ? err : new ApiError(
          err instanceof Error ? err.message : 'Unknown error occurred',
          0,
          requestId,
          'INTERNAL'
        );
        setErrors(prev => ({ ...prev, [key]: apiError }));
      } finally {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
      }
    });

    await Promise.allSettled(promises);
  }, [requests]);

  const execute = useCallback((key: keyof T) => {
    return async () => {
      setLoadingStates(prev => ({ ...prev, [key]: true }));
      setErrors(prev => ({ ...prev, [key]: null }));

      try {
        const response = await requests[key]();
        setData(prev => ({ ...prev, [key]: response.data }));
      } catch (err) {
        const requestId = (err as any)?.requestId ?? `unknown-request-${String(key)}-${Date.now()}`;
        const apiError = err instanceof ApiError ? err : new ApiError(
          err instanceof Error ? err.message : 'Unknown error occurred',
          0,
          requestId,
          'INTERNAL'
        );
        setErrors(prev => ({ ...prev, [key]: apiError }));
      } finally {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
      }
    };
  }, [requests]);

  const isAnyLoading = Object.values(loadingStates).some(loading => loading);
  const hasAnyError = Object.values(errors).some(error => error !== null);

  return {
    data,
    errors,
    loadingStates,
    isAnyLoading,
    hasAnyError,
    executeAll,
    execute
  };
};