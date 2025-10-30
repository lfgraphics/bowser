import { AxiosRequestConfig } from 'axios';

// Backend Error Response Types
export type ApiErrorCode = 
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_KEY'
  | 'CAST_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL'
  | 'CANCELLED'
  | 'CONCURRENT_REQUEST';

export interface ApiErrorResponse {
  requestId: string;
  status: number;
  message: string;
  code?: ApiErrorCode;
  details?: any;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: ApiErrorCode;
  public readonly requestId: string;
  public readonly details?: any;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    status: number,
    requestId: string,
    code?: ApiErrorCode,
    details?: any,
    isRetryable?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    
    // Use provided isRetryable or determine from shared utility
    this.isRetryable = isRetryable !== undefined 
      ? isRetryable 
      : determineRetryability(status, code);
  }
}

// API Client Configuration Types
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
  retryableErrorCodes: ApiErrorCode[];
}

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retry: RetryConfig;
  headers?: Record<string, string>;
  /** Custom function to retrieve auth token. If not provided, falls back to default storage lookup */
  getAuthToken?: () => string | null;
  /** Enable idempotency headers and retries for POST/PUT/PATCH operations. Defaults to false for backward compatibility */
  enableIdempotency?: boolean;
}

export interface RequestConfig extends AxiosRequestConfig {
  /** Skip retry logic for this request */
  skipRetry?: boolean;
  /** Skip loading state tracking for this request */
  skipLoadingState?: boolean;
  /** Custom timeout in milliseconds for this specific request */
  customTimeout?: number;
  /** Prevent concurrent requests to the same endpoint */
  preventConcurrent?: boolean;
  /** Custom key for concurrent prevention. If not provided, defaults to METHOD-URL */
  concurrencyKey?: string;
}

// Loading State Types
export interface LoadingState {
  isLoading: boolean;
  requestId: string;
  startTime: number;
}

export interface LoadingStateManager {
  startLoading(key: string, reqId?: string): string;
  stopLoading(key: string): void;
  isLoading(key: string): boolean;
  clearAll(): void;
  getLoadingState(key: string): LoadingState | null;
}

// Response Types
export interface ApiResponse<T> {
  data: T;
  status: number;
  requestId?: string;
}

export type ApiSuccessResponse<T> = ApiResponse<T>;

export interface ApiFailureResponse {
  error: ApiErrorResponse;
}

// Default configuration values
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: ['TIMEOUT', 'INTERNAL']
};

export const DEFAULT_API_CLIENT_CONFIG: Omit<ApiClientConfig, 'baseURL'> = {
  timeout: 30000,
  retry: DEFAULT_RETRY_CONFIG
};

// Shared utility function for determining retryability
export function determineRetryability(
  status: number, 
  code?: ApiErrorCode, 
  retryConfig?: RetryConfig
): boolean {
  // Cancelled and concurrent requests are never retryable
  if (code === 'CANCELLED' || code === 'CONCURRENT_REQUEST') {
    return false;
  }
  
  const config = retryConfig || DEFAULT_RETRY_CONFIG;
  
  return (
    config.retryableStatusCodes.includes(status) ||
    Boolean(code && config.retryableErrorCodes.includes(code))
  );
}