import { WorkOS } from '@workos-inc/node';
import { jwtDecode } from 'jwt-decode';
import { config } from 'dotenv';
import * as path from 'path';
import { findProjectRoot } from '../lib/utils/project-root';

// Load environment variables from project root
const rootDir = findProjectRoot(__dirname);
config({ path: path.join(rootDir, '.env') });

interface SystemUserTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SystemUserConfig {
  email: string;
  password: string;
  clientId: string;
  apiKey: string;
}

interface SystemTokenClaims {
  sub: string;
  email: string;
  system_user?: string;
  test_context?: string;
  permissions?: string[];
  environment?: string;
  metadata?: Record<string, any>;
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Consolidated authentication utility for integration testing.
 *
 * Combines token management with HTTP convenience methods for comprehensive
 * test authentication support. Provides automatic token refresh, caching,
 * and validated system user setup.
 *
 * @example
 * ```typescript
 * // Get authentication headers
 * const auth = SystemAuth.fromEnv();
 * const headers = await auth.getAuthHeaders();
 *
 * // Make authenticated requests
 * const response = await auth.get('/api/health');
 *
 * // Validate system user setup
 * const isValid = await auth.isSystemUserToken();
 * ```
 */
export class SystemAuth {
  private tokens: SystemUserTokens | null = null;
  private workos: WorkOS;
  private config: SystemUserConfig;

  constructor(config: SystemUserConfig) {
    this.config = config;
    this.workos = new WorkOS(config.apiKey, {
      clientId: config.clientId,
    });
  }

  /**
   * Creates a SystemAuth instance from environment variables.
   * @returns SystemAuth configured from environment
   * @throws Error if required environment variables are missing
   */
  static fromEnv(): SystemAuth {
    const email = process.env.SYSTEM_USER_EMAIL;
    const password = process.env.SYSTEM_USER_PASSWORD;
    const clientId = process.env.WORKOS_CLIENT_ID;
    const apiKey = process.env.WORKOS_API_KEY;

    // Validate all required environment variables
    const missingVars: string[] = [];
    if (!email) missingVars.push('SYSTEM_USER_EMAIL');
    if (!password) missingVars.push('SYSTEM_USER_PASSWORD');
    if (!clientId) missingVars.push('WORKOS_CLIENT_ID');
    if (!apiKey) missingVars.push('WORKOS_API_KEY');

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
          'Please ensure all variables are set before using SystemAuth.',
      );
    }

    return new SystemAuth({
      email,
      password,
      clientId,
      apiKey,
    });
  }

  /**
   * Gets a valid access token, refreshing if necessary.
   * @returns Promise<string> Valid JWT access token
   */
  async getValidToken(): Promise<string> {
    if (!this.tokens || this.isTokenExpired()) {
      await this.refreshTokens();
    }
    return this.tokens!.accessToken;
  }

  /**
   * Gets authentication headers for API requests.
   * @returns Promise<Record<string, string>> Headers with Authorization and Content-Type
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Decodes and validates the system user JWT token.
   * @returns Promise<SystemTokenClaims> Decoded token claims
   */
  async getTokenClaims(): Promise<SystemTokenClaims> {
    const token = await this.getValidToken();
    const claims = jwtDecode<SystemTokenClaims>(token);

    // Validate this is actually a system user token
    if (claims.system_user !== 'integration_testing') {
      console.warn(
        '⚠️  Token does not have system_user claim set to "integration_testing". JWT template may not be configured.',
      );
    }

    return claims;
  }

  /**
   * Validates that the token has system user claims.
   * @returns Promise<boolean> True if token has system_user claim
   */
  async isSystemUserToken(): Promise<boolean> {
    try {
      const claims = await this.getTokenClaims();
      return claims.system_user === 'integration_testing';
    } catch (error) {
      console.error('Failed to validate system user token:', error);
      return false;
    }
  }

  /**
   * Forces token refresh from WorkOS.
   */
  async forceRefresh(): Promise<void> {
    await this.refreshTokens();
  }

  /**
   * Clears stored tokens.
   */
  clearTokens(): void {
    this.tokens = null;
  }

  /**
   * Gets token expiration info.
   * @returns Object with expiration details
   */
  getTokenInfo(): { hasToken: boolean; expiresAt?: number; timeUntilExpiry?: number } {
    if (!this.tokens) {
      return { hasToken: false };
    }

    const timeUntilExpiry = this.tokens.expiresAt - Date.now();
    return {
      hasToken: true,
      expiresAt: this.tokens.expiresAt,
      timeUntilExpiry: Math.max(0, timeUntilExpiry),
    };
  }

  /**
   * Creates fetch options with authentication headers.
   * @param options Optional fetch options to merge
   * @returns Promise<RequestInit> Fetch options with auth headers
   */
  async createFetchOptions(options: RequestInit = {}): Promise<RequestInit> {
    const authHeaders = await this.getAuthHeaders();

    return {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };
  }

  /**
   * Makes an authenticated API request.
   * @param url Request URL
   * @param options Fetch options
   * @returns Promise<Response> Fetch response
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fetchOptions = await this.createFetchOptions(options);
    return fetch(url, fetchOptions);
  }

  /**
   * Helper for authenticated GET requests.
   * @param url Request URL
   * @returns Promise<Response> Fetch response
   */
  async get(url: string): Promise<Response> {
    return this.authenticatedFetch(url, { method: 'GET' });
  }

  /**
   * Helper for authenticated POST requests.
   * @param url Request URL
   * @param body Request body
   * @returns Promise<Response> Fetch response
   */
  async post(url: string, body?: any): Promise<Response> {
    return this.authenticatedFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Helper for authenticated PUT requests.
   * @param url Request URL
   * @param body Request body
   * @returns Promise<Response> Fetch response
   */
  async put(url: string, body?: any): Promise<Response> {
    return this.authenticatedFetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Helper for authenticated DELETE requests.
   * @param url Request URL
   * @returns Promise<Response> Fetch response
   */
  async delete(url: string): Promise<Response> {
    return this.authenticatedFetch(url, { method: 'DELETE' });
  }

  /**
   * Creates and validates a SystemAuth instance for testing.
   * Provides helpful error messages for setup issues.
   * @returns Promise<SystemAuth> Validated auth instance
   */
  static async createForTesting(): Promise<SystemAuth> {
    try {
      const auth = SystemAuth.fromEnv();

      // Test that we can get a token
      await auth.getValidToken();

      // Validate it's a system user token
      const isSystemUser = await auth.isSystemUserToken();
      if (!isSystemUser) {
        console.warn('⚠️  JWT template may not be configured for system user claims');
      }

      return auth;
    } catch (error) {
      throw new Error(
        `Failed to create SystemAuth: ${String(error)}\n\n` +
          'Make sure you have:\n' +
          '1. Created a system user (run: npx tsx scripts/create-system-user.ts)\n' +
          '2. Set environment variables: SYSTEM_USER_EMAIL, SYSTEM_USER_PASSWORD\n' +
          '3. Configured JWT template in WorkOS dashboard\n',
      );
    }
  }

  private async refreshTokens(): Promise<void> {
    try {
      // If we have a refresh token, try to use it first
      if (this.tokens?.refreshToken) {
        try {
          const response = await this.workos.userManagement.authenticateWithRefreshToken({
            refreshToken: this.tokens.refreshToken,
            clientId: this.config.clientId,
          });

          this.updateTokens(response.accessToken, response.refreshToken);
          return;
        } catch (error) {
          console.warn('Refresh token failed, falling back to password authentication:', error);
        }
      }

      // Fall back to password authentication
      const response = await this.workos.userManagement.authenticateWithPassword({
        email: this.config.email,
        password: this.config.password,
        clientId: this.config.clientId,
      });

      this.updateTokens(response.accessToken, response.refreshToken);
    } catch (error) {
      this.tokens = null;
      throw new Error(`Failed to authenticate system user: ${String(error)}`);
    }
  }

  private updateTokens(accessToken: string, refreshToken: string): void {
    // Set expiration to 50 minutes from now (tokens typically expire in 1 hour)
    // This ensures we refresh before actual expiration
    const expiresAt = Date.now() + 50 * 60 * 1000;

    this.tokens = {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt;
  }
}

/**
 * Global singleton instance for integration testing.
 * Use this in tests to avoid creating multiple auth instances.
 */
let globalSystemAuth: SystemAuth | null = null;

/**
 * Gets or creates the global SystemAuth instance.
 * @returns Promise<SystemAuth> Global auth instance
 */
export async function getSystemAuth(): Promise<SystemAuth> {
  if (!globalSystemAuth) {
    globalSystemAuth = await SystemAuth.createForTesting();
  }
  return globalSystemAuth;
}

// Legacy compatibility exports - maintain same interface as SystemUserTokenManager
export class SystemUserTokenManager extends SystemAuth {
  static fromEnv(): SystemUserTokenManager {
    return SystemAuth.fromEnv() as SystemUserTokenManager;
  }
}

/**
 * Legacy export for backwards compatibility with existing scripts.
 * @deprecated Use SystemAuth.fromEnv() or getSystemAuth() instead
 */
export const systemUserTokenManager = SystemAuth.fromEnv();
