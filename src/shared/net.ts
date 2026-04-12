/**
 * # Network Support for DietCode
 *
 * ## Development Guidelines
 *
 * **Do** use `import { fetch } from '@/shared/net'` instead of global `fetch`.
 *
 * Global `fetch` will appear to work in development, but proxy support will be
 * broken in restricted environments without this wrapper.
 *
 * ## Proxy Support
 *
 * DietCode uses undici fetch with explicit ProxyAgent for standalone execution.
 *
 * Proxy configuration via standard environment variables:
 * - `http_proxy` / `HTTP_PROXY` - Proxy for HTTP requests
 * - `https_proxy` / `HTTPS_PROXY` - Proxy for HTTPS requests
 * - `no_proxy` / `NO_PROXY` - Comma-separated list of hosts to bypass proxy
 *
 * @example
 * ```typescript
 * import { fetch } from '@/shared/net'
 * const response = await fetch(url)
 * ```
 */

import { EnvHttpProxyAgent, setGlobalDispatcher, fetch as undiciFetch } from "undici";

let mockFetch: typeof globalThis.fetch | undefined;

/**
 * Platform-configured fetch that respects proxy settings.
 * Optimized for Sovereign CLI Hive.
 */
export const fetch: typeof globalThis.fetch = (() => {
  // Configure undici with ProxyAgent for CLI environment
  const agent = new EnvHttpProxyAgent({});
  setGlobalDispatcher(agent);
  const baseFetch = (undiciFetch as unknown) as typeof globalThis.fetch;

  return (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
    (mockFetch || baseFetch)(input, init);
})();

/**
 * Mocks `fetch` for testing and calls `callback`. Then restores `fetch`. If the
 * specified callback returns a Promise, the fetch is restored when that Promise
 * is settled.
 * @param theFetch the replacement function to call to implement `fetch`.
 * @param callback `fetch` will be mocked for the duration of `callback()`.
 * @returns the result of `callback()`.
 */
export function mockFetchForTesting<T>(theFetch: typeof globalThis.fetch, callback: () => T): T {
  const originalMockFetch = mockFetch;
  mockFetch = theFetch;
  let willResetSync = true;
  try {
    const result = callback();
    if (result instanceof Promise) {
      willResetSync = false;
      return result.finally(() => {
        mockFetch = originalMockFetch;
      }) as typeof result;
    }
    return result;
  } finally {
    if (willResetSync) {
      mockFetch = originalMockFetch;
    }
  }
}
