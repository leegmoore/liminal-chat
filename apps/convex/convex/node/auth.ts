'use node';

/**
 * # WorkOS Authentication for Liminal Chat
 *
 * This module provides comprehensive WorkOS JWT authentication for the Convex backend.
 * All authentication runs in Node.js runtime to access the WorkOS SDK.
 *
 * ## Overview
 *
 * The authentication system uses WorkOS (https://workos.com) with the following setup:
 * - **WorkOS Client**: Configured with SSO/OIDC
 * - **Authentication Provider**: WorkOS with OAuth providers configured
 * - **Integration**: Direct JWT validation using WorkOS JWKS endpoint
 * - **Runtime**: Node.js runtime required for WorkOS SDK access
 *
 * ## Environment Variables
 *
 * Set these in the Convex dashboard using `npx convex env set`:
 *
 * **Required:**
 * - `WORKOS_CLIENT_ID` - WorkOS Client ID for JWT verification
 * - `WORKOS_API_KEY` - WorkOS API Key for backend operations
 *
 * **Optional (Development Only):**
 * - `DEV_AUTH_DEFAULT=true` - Bypass auth in development (REMOVE FOR PRODUCTION)
 *
 * ## Configuration
 *
 * WorkOS is configured in `auth.config.js` with:
 * - Domain: https://api.workos.com/sso/oidc
 * - Application ID: WORKOS_CLIENT_ID environment variable
 *
 * ## Database Schema
 *
 * User information is stored in the agents table with WorkOS user IDs:
 * ```typescript
 * agents: {
 *   userId: string          // WorkOS user ID from JWT
 *   // ... other agent fields
 * }
 *
 * // Note: No dedicated users table - WorkOS manages user data
 * ```
 *
 * ## Available Functions
 *
 * ### Main Actions
 * 1. **`requireAuth`** - Validates WorkOS JWT and returns user info (throws on failure)
 * 2. **`optionalAuth`** - Optional authentication (returns null if no header)
 * 3. **`validateWorkOSToken`** - Direct token validation function
 *
 * ## Usage Examples
 *
 * ### In HTTP Actions
 * ```typescript
 * // Required authentication
 * const authHeader = request.headers.get('Authorization') || undefined;
 * const user = await ctx.runAction(api.node.auth.requireAuth, { authHeader });
 * // user: { id: string, email: string, customClaims: {...} }
 *
 * // Optional authentication
 * const user = await ctx.runAction(api.node.auth.optionalAuth, { authHeader });
 * // user: AuthenticatedUser | null
 * ```
 *
 * ### HTTP Endpoints Using Authentication
 * - `GET /health` - Health check endpoint (requires authentication)
 * - `POST /api/chat` - Chat endpoints (require authentication)
 * - `POST /api/agents` - Agent management endpoints (require authentication)
 * - All conversation management endpoints
 *
 * ## Setup Instructions
 *
 * ### 1. Configure WorkOS Dashboard
 * 1. Create a WorkOS application at [workos.com](https://workos.com)
 * 2. Configure SSO/OIDC settings
 * 3. Set up JWT claims template with custom claims:
 *    ```json
 *    {
 *      "system_user": "{{ user.metadata.purpose == 'integration_testing' }}",
 *      "test_context": "{{ user.metadata.environment }}",
 *      "permissions": ["api_access"],
 *      "environment": "{{ user.metadata.environment }}"
 *    }
 *    ```
 * 4. Copy WorkOS Client ID and API Key
 *
 * ### 2. Configure Convex Environment
 * ```bash
 * npx convex env set WORKOS_CLIENT_ID "client_your_workos_client_id"
 * npx convex env set WORKOS_API_KEY "sk_live_your_workos_api_key"
 * ```
 *
 * ### 3. Frontend Integration
 * Implement frontend authentication flow using WorkOS SDK and pass JWT tokens
 * in Authorization headers as `Bearer <token>`.
 *
 * ## Testing Setup
 *
 * For integration testing, create a system user with test metadata:
 *
 * ### Environment Variables for Testing
 * ```bash
 * SYSTEM_USER_EMAIL=system-test@your-domain.com
 * SYSTEM_USER_PASSWORD=your_secure_password_32_chars_minimum
 * ```
 *
 * ### Create System User
 * ```bash
 * npx tsx scripts/create-system-user.ts
 * ```
 *
 * This creates a WorkOS user with system metadata for integration testing.
 * See `test-utils/system-auth.ts` for test token management utilities.
 *
 * ## Security Notes
 *
 * - All JWT validation uses WorkOS JWKS endpoint for secure verification
 * - Tokens are validated on every request (no local caching of secrets)
 * - Custom claims provide flexible authorization context
 * - Environment separation supported (dev/staging/prod)
 * - Never commit API keys to version control
 *
 * ## Troubleshooting
 *
 * ### Authentication Issues
 * - Verify WorkOS Client ID and API Key are correctly set in Convex
 * - Check that WorkOS SSO/OIDC is properly configured
 * - Ensure Authorization header format is `Bearer <token>`
 * - Verify JWT claims include required fields
 *
 * ### Environment Variables
 * ```bash
 * # Check current variables
 * npx convex env list
 *
 * # Test in any Convex function
 * console.log('Auth check:', {
 *   hasClientId: !!process.env.WORKOS_CLIENT_ID,
 *   hasApiKey: !!process.env.WORKOS_API_KEY,
 * });
 * ```
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { WorkOS } from '@workos-inc/node';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { webcrypto } from 'node:crypto';

// TypeScript interfaces for authentication
export interface AuthenticatedUser {
  id: string;
  email: string;
  customClaims: {
    system_user?: string;
    test_context?: string;
    environment?: string;
    permissions?: string[];
  };
}

// Polyfill globalThis.crypto for Node.js 18
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

// Lazy initialization of WorkOS
let workosClient: WorkOS | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function initializeWorkOS() {
  if (workosClient && jwks) {
    return { workosClient, jwks };
  }

  const WORKOS_API_KEY = process.env.WORKOS_API_KEY;
  const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;

  if (!WORKOS_API_KEY) {
    throw new Error('WORKOS_API_KEY environment variable is required');
  }

  if (!WORKOS_CLIENT_ID) {
    throw new Error('WORKOS_CLIENT_ID environment variable is required');
  }

  // Initialize WorkOS client for JWKS URL
  workosClient = new WorkOS(WORKOS_API_KEY);

  // Create JWKS for WorkOS token verification
  const jwksUrl = workosClient.userManagement.getJwksUrl(WORKOS_CLIENT_ID);
  jwks = createRemoteJWKSet(new URL(jwksUrl));

  return { workosClient, jwks };
}

/**
 * Internal function to validate WorkOS JWT token
 * Handles JWT verification using WorkOS JWKS endpoint
 */
async function validateWorkOSTokenInternal(token: string): Promise<AuthenticatedUser | null> {
  try {
    // Initialize WorkOS if not already done
    const { jwks } = initializeWorkOS();

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Verify JWT using WorkOS JWKS
    const { payload } = await jwtVerify(cleanToken, jwks);

    // Extract user information from JWT claims with runtime validation
    const id = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload['urn:myapp:email'] === 'string' ? payload['urn:myapp:email'] : '';

    return {
      id,
      email,
      customClaims: {
        system_user: typeof payload.system_user === 'string' ? payload.system_user : undefined,
        test_context: typeof payload.test_context === 'string' ? payload.test_context : undefined,
        environment: typeof payload.environment === 'string' ? payload.environment : undefined,
        permissions:
          Array.isArray(payload.permissions) &&
          payload.permissions.every((p) => typeof p === 'string')
            ? payload.permissions
            : undefined,
      },
    };
  } catch (error) {
    console.error('WorkOS JWT validation failed:', error);
    return null;
  }
}

/**
 * Validates a WorkOS JWT token and returns user information
 * This runs in Node.js runtime to access WorkOS SDK
 *
 * @param token - JWT token string
 * @returns AuthenticatedUser | null
 */
export const validateWorkOSToken = action({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      email: v.string(),
      customClaims: v.object({
        system_user: v.optional(v.string()),
        test_context: v.optional(v.string()),
        environment: v.optional(v.string()),
        permissions: v.optional(v.array(v.string())),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<AuthenticatedUser | null> => {
    return await validateWorkOSTokenInternal(args.token);
  },
});

/**
 * Validates authorization header and returns authenticated user
 * This runs in Node.js runtime for WorkOS integration
 *
 * Throws error if authentication fails - use for protected endpoints
 *
 * @param authHeader - Authorization header (optional)
 * @returns AuthenticatedUser
 * @throws Error if authentication fails
 */
export const requireAuth = action({
  args: {
    authHeader: v.optional(v.string()),
  },
  returns: v.object({
    id: v.string(),
    email: v.string(),
    customClaims: v.object({
      system_user: v.optional(v.string()),
      test_context: v.optional(v.string()),
      environment: v.optional(v.string()),
      permissions: v.optional(v.array(v.string())),
    }),
  }),
  handler: async (ctx, args): Promise<AuthenticatedUser> => {
    if (!args.authHeader || !args.authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }

    // Extract token from header
    const token = args.authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new Error('Missing authorization token');
    }

    // Validate token using WorkOS
    const user = await validateWorkOSTokenInternal(token);
    if (!user) {
      throw new Error('Invalid or expired token');
    }

    return user;
  },
});

/**
 * Optional authentication - returns null if no auth header provided
 * This runs in Node.js runtime for WorkOS integration
 *
 * Use for endpoints that work with or without authentication
 *
 * @param authHeader - Authorization header (optional)
 * @returns AuthenticatedUser | null
 */
export const optionalAuth = action({
  args: {
    authHeader: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      email: v.string(),
      customClaims: v.object({
        system_user: v.optional(v.string()),
        test_context: v.optional(v.string()),
        environment: v.optional(v.string()),
        permissions: v.optional(v.array(v.string())),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<AuthenticatedUser | null> => {
    if (!args.authHeader || !args.authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Extract token from header
    const token = args.authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return null;
    }

    // Validate token using WorkOS
    return await validateWorkOSTokenInternal(token);
  },
});
