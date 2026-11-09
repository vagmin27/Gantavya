/**
 * Resilient HTTP Client Utility
 * Gantavya Platform - Milestone 2.4
 *
 * Provides bounded timeouts, exponential backoff with jitter, retryable error handling,
 * and credential sanitization for external provider integrations (HERE, Amadeus, etc.).
 */

export class HttpError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
    this.isRetryable = details.isRetryable || false;
    this.attempts = details.attempts || 1;
    this.url = details.url;
  }
}

export class ResilientHttpClient {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxRetries = options.maxRetries ?? 2;
    this.baseDelayMs = options.baseDelayMs ?? 300;
    this.maxDelayMs = options.maxDelayMs ?? 3000;
    this.jitterMs = options.jitterMs ?? 100;
    this.retryableStatusCodes = new Set(options.retryableStatusCodes || [429, 500, 502, 503, 504]);
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.logger = options.logger || console;
  }

  /**
   * Sanitizes sensitive queries and headers from URLs and error logs.
   * @param {string} urlString
   * @returns {string} Sanitized URL
   */
  sanitizeUrl(urlString) {
    try {
      const url = new URL(urlString);
      const sensitiveKeys = ['apikey', 'api_key', 'client_secret', 'secret', 'token', 'access_token', 'password'];
      for (const [key] of url.searchParams.entries()) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
          url.searchParams.set(key, 'REDACTED');
        }
      }
      return url.toString();
    } catch {
      return urlString ? urlString.replace(/([?&](?:apiKey|secret|token)=)[^&]+/gi, '$1REDACTED') : '';
    }
  }

  /**
   * Calculates exponential backoff delay with jitter.
   * @param {number} attempt
   * @returns {number} Delay in milliseconds
   */
  calculateBackoff(attempt) {
    const exponential = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * this.jitterMs);
    return Math.min(this.maxDelayMs, exponential + jitter);
  }

  /**
   * Performs an HTTP request with bounded timeout, retry logic, and exponential backoff.
   * @param {string} url - Target URL
   * @param {Object} options - Fetch options (method, headers, body, timeoutMs, retries)
   * @returns {Promise<Response>} Native Response object
   */
  async request(url, options = {}) {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const sanitizedUrl = this.sanitizeUrl(url);

    let lastError = null;
    const totalAttempts = maxRetries + 1;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      const controller = new AbortController();
      let timer = null;

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      // If caller passed an external signal, forward abort
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort(options.signal.reason), { once: true });
      }

      const requestOptions = {
        ...options,
        signal: controller.signal
      };

      const startTime = Date.now();

      try {
        const response = await this.fetchFn(url, requestOptions);
        if (timer) clearTimeout(timer);

        const durationMs = Date.now() - startTime;

        if (response.ok) {
          return response;
        }

        const statusCode = response.status;
        const isRetryable = this.retryableStatusCodes.has(statusCode);

        let errorBody = '';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            errorBody = await response.json();
          } else {
            errorBody = await response.text();
          }
        } catch {
          errorBody = response.statusText;
        }

        const error = new HttpError(
          `HTTP ${statusCode} ${response.statusText} for ${sanitizedUrl}`,
          statusCode,
          {
            url: sanitizedUrl,
            attempts: attempt + 1,
            isRetryable,
            body: errorBody,
            durationMs
          }
        );

        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        lastError = error;
        const delay = this.calculateBackoff(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (err) {
        if (timer) clearTimeout(timer);

        const durationMs = Date.now() - startTime;
        const isAbort = controller.signal.aborted || err.name === 'AbortError' || err.name === 'TimeoutError';

        const isNetworkError =
          err instanceof TypeError ||
          isAbort ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ENOTFOUND';

        const isRetryable = err instanceof HttpError ? err.isRetryable : isNetworkError;

        lastError =
          err instanceof HttpError
            ? err
            : new HttpError(
                isAbort
                  ? `Request timeout after ${timeoutMs}ms for ${sanitizedUrl}`
                  : `Network error for ${sanitizedUrl}: ${err.message}`,
                isAbort ? 504 : 503,
                {
                  url: sanitizedUrl,
                  attempts: attempt + 1,
                  isRetryable,
                  cause: err.message,
                  durationMs
                }
              );

        if (!isRetryable || attempt >= maxRetries) {
          throw lastError;
        }

        const delay = this.calculateBackoff(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Helper for GET requests returning parsed JSON.
   */
  async getJson(url, options = {}) {
    const res = await this.request(url, { ...options, method: 'GET' });
    return res.json();
  }

  /**
   * Helper for POST requests returning parsed JSON.
   */
  async postJson(url, body, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    };
    const res = await this.request(url, {
      ...options,
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
    return res.json();
  }
}

export const defaultHttpClient = new ResilientHttpClient();

