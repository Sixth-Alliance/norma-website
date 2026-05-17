// filepath: /src/api/client.ts
// 🎯 UNIFIED BACKEND API CLIENT - Single source of truth for all API communication
// All frontend code uses this client—NO direct fetch() calls elsewhere
// Features: Retry logic, caching, standardized response parsing, token management

import { logger } from '@/src/utils/logger';
import { TokenManager } from '@/src/lib/tokens';
import { ApiError, parseApiError } from '@/src/lib/apiErrors';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  errors: Record<string, any> | null;
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  skipRetry?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // milliseconds
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    logger.debug(`Cache hit for: ${key}`);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = CacheManager.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    logger.debug(`Cached: ${key} (TTL: ${ttl}ms)`);
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      logger.debug('Cache cleared');
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
    logger.debug(`Cache invalidated for pattern: ${pattern}`);
  }
}

// ============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================================

interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

class RetryManager {
  private static readonly DEFAULT_MAX_ATTEMPTS = 3;
  private static readonly DEFAULT_INITIAL_DELAY = 1000; // 1s
  private static readonly DEFAULT_MAX_DELAY = 30000; // 30s
  private static readonly DEFAULT_BACKOFF = 2;

  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const {
      maxAttempts = RetryManager.DEFAULT_MAX_ATTEMPTS,
      initialDelay = RetryManager.DEFAULT_INITIAL_DELAY,
      maxDelay = RetryManager.DEFAULT_MAX_DELAY,
      backoffMultiplier = RetryManager.DEFAULT_BACKOFF,
    } = config;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(`Attempt ${attempt}/${maxAttempts}`);
        return await fn();
      } catch (error) {
        lastError = error as Error;

        const isRetryable = RetryManager.isRetryableError(error);
        const isLastAttempt = attempt === maxAttempts;

        if (!isRetryable || isLastAttempt) {
          logger.error(`Request failed (attempt ${attempt}/${maxAttempts}):`, lastError.message);
          throw lastError;
        }

        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );

        logger.warn(`Retrying in ${delay}ms after error:`, lastError.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private static isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) return true;
      if (error.message.includes('timeout')) return true;
    }

    // HTTP 5xx errors are retryable
    if (error.status >= 500 && error.status < 600) return true;

    // HTTP 429 (rate limit) is retryable
    if (error.status === 429) return true;

    // HTTP 408 (timeout) is retryable
    if (error.status === 408) return true;

    // Don't retry client errors (4xx except above)
    return false;
  }
}

// TokenManager is provided by centralized tokens module (src/lib/tokens.ts).
// We import it above to avoid duplicate implementations across the codebase.

// ============================================================================
// MAIN API CLIENT
// ============================================================================

class ApiClient {
  private baseURL: string;
  private cache: CacheManager;
  private retryConfig: RetryConfig;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://norma-api.up.railway.app/api/v1') {
    this.baseURL = baseURL;
    this.cache = new CacheManager();
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };

    // Handle online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => logger.info('Browser online'));
      window.addEventListener('offline', () => logger.warn('Browser offline'));
    }
  }

  /**
   * Execute API request with retry, caching, and standardized response parsing
   */
  async request<T = any>(path: string, config: ApiRequestConfig = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      skipRetry = false,
      cacheKey,
      cacheTTL = 5 * 60 * 1000,
    } = config;

    // Check cache for GET requests
    if (method === 'GET' && cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Build URL with query params
    let url = `${this.baseURL}${path}`;
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    // Build headers
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    // Add authentication
    const accessToken = TokenManager.getAccessToken();
    if (accessToken) {
      finalHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add cart token for cart operations
    if (path.includes('/cart/')) {
      const cartToken = TokenManager.getCartToken();
      if (cartToken) {
        finalHeaders['X-Cart-Token'] = cartToken;
      }
    }

    // Execute with retry logic
    const executeRequest = async () => {
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include', // Include cookies
      });

      return this.handleResponse<T>(response);
    };

    let result: T;
    try {
      if (skipRetry) {
        result = await executeRequest();
      } else {
        result = await RetryManager.executeWithRetry(executeRequest, this.retryConfig);
      }
    } catch (error: any) {
      logger.error(`API request failed: ${method} ${path}`, error);
      throw error;
    }

    // Cache successful GET responses
    if (method === 'GET' && cacheKey) {
      this.cache.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Handle API response with standardized parsing
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Check for cart token rotation
    const newCartToken = response.headers.get('X-New-Cart-Token');
    if (newCartToken) {
      TokenManager.rotateCartToken(newCartToken);
    }

    // Parse response body
    let data: any;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { data: text } : {};
    }

    // Handle error responses and standardized response format
    if (!response.ok) {
      // Prefer structured message when available
      const parsedMessage = data?.message || data?.error || data?.detail || null;
      throw new ApiError(parsedMessage || `HTTP ${response.status}`, response.status, data, data?.errors || null);
    }

    if (data?.success === false) {
      throw new ApiError(data?.message || 'Request failed', response.status, data, data?.errors || null);
    }

    // Return data (handle both wrapped and direct responses)
    return (data?.data ?? data) as T;
  }

  /**
   * Invalidate cache
   */
  invalidateCache(pattern?: string): void {
    this.cache.invalidate(pattern);
  }

  /**
   * GET request
   */
  get<T = any>(path: string, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  post<T = any>(
    path: string,
    body?: any,
    config?: Omit<ApiRequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  /**
   * PATCH request
   */
  patch<T = any>(
    path: string,
    body?: any,
    config?: Omit<ApiRequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  delete<T = any>(path: string, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }
}

// ============================================================================
// EXPORT SINGLETON CLIENT
// ============================================================================

export const apiClient = new ApiClient();
export { TokenManager, CacheManager };
