import { test as base, APIRequestContext } from '@playwright/test';
import { SystemUserTokenManager } from '../lib/auth/system-user-token-manager';

// Cache token per worker process to avoid repeated authentication
let cachedToken: string | null = null;
let tokenManager: SystemUserTokenManager | null = null;
let tokenExpiry: number | null = null;

async function getOrCreateToken(): Promise<string> {
  // Initialize token manager if not exists
  if (!tokenManager) {
    tokenManager = SystemUserTokenManager.fromEnv();
  }

  // Check if we need a new token (no cache or expired)
  const now = Date.now();
  const needsRefresh = !cachedToken || !tokenExpiry || now >= tokenExpiry;

  if (needsRefresh) {
    console.log('🔄 Refreshing WorkOS system user token...');
    cachedToken = await tokenManager.getValidToken();

    // Cache for 50 minutes to align with SystemUserTokenManager
    tokenExpiry = now + 50 * 60 * 1000;
    console.log('✅ Token cached until:', new Date(tokenExpiry).toISOString());
  }

  return cachedToken!;
}

// Create authenticated request fixture
export const test = base.extend<{
  authenticatedRequest: APIRequestContext;
}>({
  authenticatedRequest: async ({ request }, use) => {
    const token = await getOrCreateToken();

    // Create proxy that adds auth header to all requests
    const authenticatedRequest = new Proxy(request, {
      get(target, prop) {
        const original = target[prop as keyof APIRequestContext];

        if (
          typeof original === 'function' &&
          ['get', 'post', 'put', 'patch', 'delete', 'head'].includes(prop as string)
        ) {
          return function (url: string, options: any = {}) {
            const headers: Record<string, string> = {
              ...options.headers,
              Authorization: `Bearer ${token}`,
            };

            // Add Content-Type for data-sending methods if not already set
            if (['post', 'put', 'patch'].includes(prop as string) && !headers['Content-Type']) {
              headers['Content-Type'] = 'application/json';
            }

            return (original as any).call(target, url, {
              ...options,
              headers,
            });
          };
        }

        return original;
      },
    });

    await use(authenticatedRequest as APIRequestContext);
  },
});

export { expect } from '@playwright/test';
