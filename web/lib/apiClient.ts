import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  ApiClientConfig,
  ApiError,
  ApiErrorResponse,
  ApiResponse,
  LoadingState,
  LoadingStateManager,
  RequestConfig,
  DEFAULT_API_CLIENT_CONFIG,
  determineRetryability
} from '@/types/api';

// Enhanced LoadingStateManager with concurrent request support
interface ConcurrentLoadingState {
  count: number;
  startTime: number;
}

class SimpleLoadingStateManager implements LoadingStateManager {
  private loadingStates = new Map<string, ConcurrentLoadingState>();

  startLoading(key: string, reqId?: string): string {
    const requestId = reqId ?? this.generateRequestId();
    const existing = this.loadingStates.get(key);
    
    if (existing) {
      // Increment count for concurrent request
      existing.count++;
    } else {
      // Create new loading state
      this.loadingStates.set(key, {
        count: 1,
        startTime: Date.now()
      });
    }
    
    return requestId;
  }

  stopLoading(key: string): void {
    const existing = this.loadingStates.get(key);
    if (existing) {
      existing.count--;
      // Only delete when no more concurrent requests
      if (existing.count <= 0) {
        this.loadingStates.delete(key);
      }
    }
  }

  isLoading(key: string): boolean {
    const state = this.loadingStates.get(key);
    return state ? state.count > 0 : false;
  }

  clearAll(): void {
    this.loadingStates.clear();
  }

  getLoadingState(key: string): LoadingState | null {
    const state = this.loadingStates.get(key);
    if (!state || state.count <= 0) {
      return null;
    }
    
    // Return aggregate state with generic request ID
    return {
      isLoading: true,
      requestId: this.generateRequestId(), // Generate new ID since we don't track individual ones
      startTime: state.startTime
    };
  }

  private generateRequestId(): string {
    // Fallback for environments without crypto.randomUUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'req-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }
}

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;
  private loadingStateManager: SimpleLoadingStateManager;

  constructor(config: ApiClientConfig) {
    this.config = { ...DEFAULT_API_CLIENT_CONFIG, ...config };
    this.loadingStateManager = new SimpleLoadingStateManager();
    
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Ensure headers exist before mutation
        config.headers = config.headers || {};
        
        // Generate request ID
        const requestId = this.generateRequestId();
        config.headers['x-request-id'] = requestId;
        
        // Get request config early for type safety
        const requestConfig = config as RequestConfig;
        
        // Handle idempotency for mutating operations
        const method = config.method?.toUpperCase();
        const isMutate = method === 'POST' || method === 'PUT' || method === 'PATCH';
        if (isMutate && this.config.enableIdempotency) {
          config.headers['Idempotency-Key'] = requestId;
        } else if (isMutate && requestConfig.skipRetry === undefined) {
          requestConfig.skipRetry = true;
        }
        
        // Check for concurrent prevention
        const loadingKey = requestConfig.concurrencyKey || this.getLoadingKey(config.url, config.method);
        
        if (requestConfig.preventConcurrent && this.loadingStateManager.isLoading(loadingKey)) {
          throw new ApiError(
            'Request in progress',
            0,
            requestId,
            'CONCURRENT_REQUEST',
            undefined,
            false
          );
        }
        
        // Start loading state tracking
        if (!requestConfig.skipLoadingState) {
          this.loadingStateManager.startLoading(loadingKey, requestId);
        }

        // Add auth token if available
        const token = this.config.getAuthToken ? this.config.getAuthToken() : this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Apply custom timeout if specified
        if (requestConfig.customTimeout && typeof requestConfig.customTimeout === 'number') {
          config.timeout = requestConfig.customTimeout;
        }

        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
            requestId,
            data: config.data
          });
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Stop loading state tracking
        const responseConfig = response.config as RequestConfig;
        const loadingKey = responseConfig.concurrencyKey || this.getLoadingKey(response.config.url, response.config.method);
        this.loadingStateManager.stopLoading(loadingKey);

        // Extract request ID
        const requestId = response.headers['x-request-id'] || 
                         response.config.headers['x-request-id'] as string;

        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Response] ${response.status} ${response.config.url}`, {
            requestId,
            data: response.data
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const config = error?.config as RequestConfig | undefined;
        const loadingKey = config?.concurrencyKey || this.getLoadingKey(config?.url, config?.method);

        // Preserve ApiError thrown from request interceptor or other code paths
        if (error instanceof ApiError) {
          this.loadingStateManager.stopLoading(loadingKey);
          return Promise.reject(error);
        }

        // Check for canceled requests first
        if (axios.isCancel?.(error) || (error as any).code === 'ERR_CANCELED') {
          const requestId = config?.headers?.['x-request-id'] as string || 
                           this.generateRequestId();
          const cancelError = new ApiError(
            'Request cancelled',
            0,
            requestId,
            'CANCELLED',
            undefined,
            false
          );
          
          // Minimal logging for cancellation
          if (process.env.NODE_ENV === 'development') {
            console.log(`[API Cancelled] ${config?.method?.toUpperCase()} ${config?.url}`, {
              requestId
            });
          }
          
          this.loadingStateManager.stopLoading(loadingKey);
          throw cancelError;
        }

        // Parse error response
        const apiError = this.parseErrorResponse(error);

        // Log error in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`[API Error] ${config?.method?.toUpperCase()} ${config?.url}`, {
            requestId: apiError.requestId,
            status: apiError.status,
            message: apiError.message,
            code: apiError.code
          });
        }

        // Attempt retry if applicable
        if (config && this.shouldRetry(apiError, config) && !config.skipRetry) {
          const retryCount = (config._retryCount || 0) + 1;
          
          if (retryCount <= this.config.retry.maxRetries) {
            const delay = this.calculateRetryDelay(retryCount - 1);
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[API Retry] Attempt ${retryCount}/${this.config.retry.maxRetries} after ${delay}ms`);
            }
            
            await this.wait(delay);
            
            // Update retry count
            config._retryCount = retryCount;
            
            // Don't stop loading here since we're retrying
            return this.axiosInstance.request(config);
          }
        }

        // Only stop loading when we're not retrying or after max retries exhausted
        this.loadingStateManager.stopLoading(loadingKey);
        throw apiError;
      }
    );
  }

  private parseErrorResponse(error: AxiosError): ApiError {
    const fallbackReqId = this.generateRequestId();
    const headerReqId = error.config?.headers?.['x-request-id'] as string | undefined;
    const baseRequestId = headerReqId || fallbackReqId;

    if (error.response) {
      let data = error.response.data as any;
      const envelope = data && typeof data === 'object' ? data : {};

      // Unwrap nested error
      if (envelope.error && typeof envelope.error === 'object') {
        data = { requestId: envelope.requestId ?? baseRequestId, ...(envelope.error as object) };
      }

      const errData = data as ApiErrorResponse;
      const isRetryable = determineRetryability(error.response.status, errData.code, this.config.retry);
      return new ApiError(
        errData.message || error.message || 'Request failed',
        error.response.status,
        errData.requestId || baseRequestId,
        errData.code,
        errData.details,
        isRetryable
      );
    } else if (error.request) {
      // Network error (no response received)
      const isRetryable = determineRetryability(0, 'TIMEOUT', this.config.retry);
      return new ApiError(
        'Network error: Unable to connect to server',
        0,
        baseRequestId,
        'TIMEOUT',
        undefined,
        isRetryable
      );
    } else {
      // Request setup error
      const isRetryable = determineRetryability(0, 'INTERNAL', this.config.retry);
      return new ApiError(
        error.message || 'Request configuration error',
        0,
        baseRequestId,
        'INTERNAL',
        undefined,
        isRetryable
      );
    }
  }

  private shouldRetry(error: ApiError, config?: RequestConfig): boolean {
    if (!config || config.skipRetry) {
      return false;
    }

    const retryCount = config._retryCount || 0;
    if (retryCount >= this.config.retry.maxRetries) {
      return false;
    }

    // Check if error is retryable
    return (
      this.config.retry.retryableStatusCodes.includes(error.status) ||
      (error.code && this.config.retry.retryableErrorCodes.includes(error.code)) ||
      error.status === 0 // Network errors
    );
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retry.retryDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    // Cap maximum delay at 30 seconds
    return Math.min(delay, 30000);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getLoadingKey(url?: string, method?: string): string {
    return `${method?.toUpperCase() || 'GET'}-${url || 'unknown'}`;
  }

  private generateRequestId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'req-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  private getAuthToken(): string | null {
    // Check localStorage for auth token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || 
             localStorage.getItem('token') ||
             sessionStorage.getItem('authToken') ||
             sessionStorage.getItem('token');
    }
    return null;
  }

  // HTTP method wrappers
  /**
   * Perform GET request
   * @param url - Request URL
   * @param config - Request configuration. For cancellation, use: 
   *   `const controller = apiClient.createCancelToken(); apiClient.get(url, { signal: controller.signal })`
   */
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    return this.normalizeResponse(response);
  }

  /**
   * Perform POST request
   * @param url - Request URL
   * @param data - Request data
   * @param config - Request configuration. For cancellation, use: 
   *   `const controller = apiClient.createCancelToken(); apiClient.post(url, data, { signal: controller.signal })`
   * 
   * Note: Automatic Idempotency-Key header is added for POST operations. For truly non-idempotent 
   * operations without backend idempotency support, use `{ skipRetry: true }` to prevent retries.
   */
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return this.normalizeResponse(response);
  }

  /**
   * Perform PUT request
   * @param url - Request URL
   * @param data - Request data
   * @param config - Request configuration. For cancellation, use: 
   *   `const controller = apiClient.createCancelToken(); apiClient.put(url, data, { signal: controller.signal })`
   * 
   * Note: Automatic Idempotency-Key header is added for PUT operations. For truly non-idempotent 
   * operations without backend idempotency support, use `{ skipRetry: true }` to prevent retries.
   */
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return this.normalizeResponse(response);
  }

  /**
   * Perform PATCH request
   * @param url - Request URL
   * @param data - Request data
   * @param config - Request configuration. For cancellation, use: 
   *   `const controller = apiClient.createCancelToken(); apiClient.patch(url, data, { signal: controller.signal })`
   */
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return this.normalizeResponse(response);
  }

  /**
   * Perform DELETE request
   * @param url - Request URL
   * @param config - Request configuration. For cancellation, use: 
   *   `const controller = apiClient.createCancelToken(); apiClient.delete(url, { signal: controller.signal })`
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return this.normalizeResponse(response);
  }

  private normalizeResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    let requestId = response.headers['x-request-id'] || response.config.headers?.['x-request-id'] as string;
    let data = response.data;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const envelope: any = data;

      if (envelope.requestId) {
        requestId = envelope.requestId || requestId;
      }

      if (envelope.requestId && envelope.data !== undefined) {
        data = envelope.data as T;
      } else if (envelope.requestId && envelope.result !== undefined) {
        data = envelope.result as T;
      } else if (envelope.requestId && envelope.payload !== undefined) {
        data = envelope.payload as T;
      }
    }

    return { data, status: response.status, requestId };
  }

  // Loading state management
  getLoadingState(key: string): LoadingState | null {
    return this.loadingStateManager.getLoadingState(key);
  }

  isLoading(key: string): boolean {
    return this.loadingStateManager.isLoading(key);
  }

  clearLoadingStates(): void {
    this.loadingStateManager.clearAll();
  }

  // Request cancellation
  /**
   * Create an AbortController for request cancellation
   * @returns AbortController instance
   * @example
   * ```typescript
   * const controller = apiClient.createCancelToken();
   * apiClient.get('/users', { signal: controller.signal });
   * // Later: controller.abort();
   * ```
   */
  createCancelToken(): AbortController {
    return new AbortController();
  }

  /**
   * Convenience wrapper that creates a controller and merges it with config
   * @param config - Base request configuration
   * @returns Object with controller and merged config
   * @example
   * ```typescript
   * const { controller, config } = apiClient.withController({ timeout: 5000 });
   * apiClient.get('/users', config);
   * // Later: controller.abort();
   * ```
   */
  withController(config?: RequestConfig): { controller: AbortController; config: RequestConfig } {
    const controller = new AbortController();
    return {
      controller,
      config: {
        ...config,
        signal: controller.signal
      }
    };
  }
}

// Factory function for creating custom instances
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

// Type augmentation for axios config to include retry count
declare module 'axios' {
  interface AxiosRequestConfig {
    _retryCount?: number;
    skipRetry?: boolean;
    skipLoadingState?: boolean;
  }
}