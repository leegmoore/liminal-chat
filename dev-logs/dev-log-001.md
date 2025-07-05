# Liminal Chat Development Log

## Project Overview

**Liminal Chat** is an open-source, privacy-first AI chat platform that enables users to bring their own API keys (BYOK) and engage in AI Roundtable conversations where multiple AI perspectives collaborate. The project is undergoing a major architectural migration from a NestJS/ArangoDB/Cloudflare Workers stack to a modern Convex + Vercel AI SDK + Next.js architecture.

## Current Architecture

```
CLI → Convex (Backend) + Vercel AI SDK (LLM Integration) → Multiple AI Providers
```

### Technology Stack
- **Backend**: Convex (serverless functions, database, real-time subscriptions)
- **LLM Integration**: Vercel AI SDK (unified interface for AI providers)
- **Frontend**: Next.js 15.3.4 with App Router, React 18.3.1, Tailwind CSS v3, shadcn/ui
- **Authentication**: ~~Clerk~~ **REMOVED** - Currently public API for development velocity
- **CLI**: Commander.js based command-line interface
- **Monorepo**: pnpm workspaces

### Frontend Architecture (Updated July 4, 2025)
- **Location**: `apps/web/` - Integrated into monorepo workspace
- **Development Strategy**: Version pinning for stability (Next.js 15.3.4, React 18.3.1)
- **UI Framework**: shadcn/ui with New York style, optimized for v0 component generation
- **CSS**: Tailwind v3 (downgraded from v4 for v0 compatibility)
- **Build Tool**: Webpack (Turbopack disabled due to monorepo issues)
- **Status**: Development server running, ready for backend integration

## Migration Status (as of July 4, 2025)

### ✅ Completed Features
1. **Feature 001: Convex Foundation** - Complete
   - Convex backend initialized and deployed
   - ~~Clerk authentication integrated~~ **REMOVED** - Migrated to public API
   - Database schema defined (conversations, messages) 
   - Development environment configured

2. **Feature 002: Next.js Frontend Setup** - Complete *(NEW)*
   - Next.js 15.3.4 frontend in `apps/web` with monorepo integration
   - Version pinning for development stability (React 18.3.1, Tailwind v3)
   - shadcn/ui configured with v0 workflow optimization
   - Convex client installed and ready for backend connection
   - Security vulnerabilities resolved (brace-expansion)
   - Development server functional at http://localhost:3000

### 🚧 In Progress (Features 3-8)
- Feature 3: Vercel AI SDK single provider integration (Partially complete)
- Feature 4: Testing infrastructure setup (Partially complete)
- Feature 5: Multi-provider support (Partially complete)
- Feature 6: Model/Provider DTOs with persistence (Not started)
- Feature 7: Model tools registry (Not started)
- Feature 8: Agent system with orchestration (Not started)
- Feature 9: CLI alignment with core APIs (Not started)

### ✅ **ARCHIVED - Phase Complete: Frontend-Backend Integration**
**FINAL STATUS**: Phase 2 Complete - Next.js frontend successfully connected to Convex backend

**COMPLETED (July 4, 2025)**:
- ✅ Phase 1 Next.js setup complete with all issues resolved
- ✅ Development server confirmed working at http://localhost:3000
- ✅ Turbopack disabled in favor of Webpack for monorepo stability
- ✅ Hot Module Replacement (HMR) and Fast Refresh functional
- ✅ Security vulnerabilities addressed (brace-expansion updated)
- ✅ CSS processing fixed with proper Tailwind v3 configuration
- ✅ **Phase 2 Complete**: Frontend-backend connection established
- ✅ **Critical Fix Applied**: Fixed API import from fake generated to real Convex `_generated/api`
- ✅ **Data Loading Working**: useQuery hooks resolving, conversations page displays data

---

## DEVELOPMENT LOG CLOSED - July 4, 2025

This development log has been closed as of July 4, 2025. The Next.js frontend integration with Convex backend is complete and functional. All major architectural components are in place:

- ✅ Convex backend with public API
- ✅ Next.js frontend with proper data loading
- ✅ Vercel AI SDK integration working
- ✅ Testing infrastructure functional
- ✅ Development environment stable

**Next development log**: `development-log-new.md` will continue from this point.

## Verified Configurations and Setup

### 1. Environment Variables (Convex Cloud)
All API keys are stored in Convex cloud, NOT in local .env files. Verified working keys:

```bash
# To view current environment variables:
npx convex env list

# Confirmed working API keys:
✅ OPENAI_API_KEY          # Working - tested with gpt-4o-mini
✅ ANTHROPIC_API_KEY       # Working - tested with claude-3-5-sonnet
✅ GOOGLE_GENERATIVE_AI_API_KEY  # Working - tested with gemini-2.0-flash
✅ PERPLEXITY_API_KEY      # Working - tested with sonar-pro
✅ VERCEL_API_KEY          # Working - tested with v0-1.0-md
✅ OPENROUTER_API_KEY      # Fixed during session - working with google/gemini-2.5-flash
✅ CLERK_ISSUER_URL        # Set for JWT verification
✅ DEV_AUTH_DEFAULT=true    # Development auth bypass enabled
```

### 2. Project Structure Clarification
```
/apps/liminal-api/          # The backend application package
  ├── convex/               # Convex functions directory (deployed to cloud)
  │   ├── _generated/       # Auto-generated Convex types
  │   ├── ai/               # AI provider integration
  │   ├── lib/              # Shared libraries (auth, etc.)
  │   ├── schema.ts         # Database schema
  │   ├── http.ts           # HTTP endpoints
  │   ├── chat.ts           # Chat actions
  │   ├── conversations.ts  # Conversation CRUD
  │   ├── messages.ts       # Message handling
  │   └── users.ts          # User management
  ├── tests/                # Integration tests
  ├── package.json          # Dependencies
  └── .env.local            # Local Convex CLI config only
```

### 3. Authentication Implementation

#### Dev User Setup
Implemented a default dev user in the database:
- **Clerk User ID**: `user_2zINPyhtT9Wem9OeVW4eZDs21KI`
- **Database ID**: `j978wkvbjwmcryxbybz910fza97jza8k`
- **Email**: `dev@liminal.chat`
- **Name**: `Dev User`

#### Auth Helper Functions
Created three auth helper functions in `/convex/lib/auth.ts`:
1. `requireAuth(ctx)` - For mutations/queries that require auth
2. `getAuth(ctx)` - For queries that work with or without auth
3. `getAuthForAction(ctx)` - Special version for actions (no DB access)

### 4. Verified Working Endpoints

#### Health Check
```bash
GET https://modest-squirrel-498.convex.site/health
# Returns: { status: "healthy", database: { connected: true, userCount: 1 }}
```

#### Chat Endpoints (All Working)
```bash
# Simple text completion
POST /api/chat-text
{
  "prompt": "Hello",
  "provider": "openai"  # or anthropic, google, perplexity, vercel, openrouter
}
# Returns: { text, usage, finishReason, model, provider, conversationId }

# Streaming chat (Vercel AI SDK format)
POST /api/chat
{
  "messages": [{"role": "user", "content": "Hello"}],
  "provider": "openai"
}
# Returns: Streaming response with data chunks

# Completion endpoint
POST /api/completion
{
  "prompt": "Complete this",
  "provider": "openai"
}
# Returns: Streaming response
```

#### Conversation Endpoints
```bash
# List conversations
GET /api/conversations
# Returns: { page: [], isDone: true } (empty due to auth context)

# Get specific conversation
GET /api/conversations/:id
# Returns: 404 (auth context issue in tests)

# Create conversation
POST /api/conversations
# Update conversation
PATCH /api/conversations/:id
# Delete conversation
DELETE /api/conversations/:id
```

### 5. Testing Infrastructure

#### Test Results (10/11 Passing)
```bash
npm test

✅ System health check
✅ Basic chat functionality  
✅ Streaming format compliance
✅ Error handling
✅ Concurrent request handling
✅ Provider switching (all 6 providers)
✅ Response time check
✅ List conversations endpoint
✅ Create conversation via API
✅ Streaming chat preserves conversation
❌ Create conversation and persist messages (404 on GET)
```

#### Test Configuration
- Framework: Playwright
- Target: Convex HTTP Actions at `https://modest-squirrel-498.convex.site`
- Philosophy: Real API calls, no mocks
- Cost optimization: Uses cheapest models for each provider

### 6. Database Schema

```typescript
// Users table
{
  tokenIdentifier: string,  // Clerk user ID
  email: string,
  name?: string,
  imageUrl?: string,
  createdAt: number,
  updatedAt: number
}

// Conversations table  
{
  userId: string,           // tokenIdentifier from Clerk
  title: string,
  type: "standard" | "roundtable" | "pipeline",
  metadata?: {
    provider?: string,
    model?: string,
    tags?: string[],
    archived?: boolean
  },
  lastMessageAt: number,
  createdAt: number,
  updatedAt: number
}

// Messages table
{
  conversationId: Id<"conversations">,
  authorType: "user" | "agent" | "system",
  authorId: string,
  type: "text" | "tool_call" | "tool_output" | "chain_of_thought" | "error",
  content: any,
  createdAt: number,
  metadata?: {
    model?: string,
    provider?: string,
    promptTokens?: number,
    completionTokens?: number,
    totalTokens?: number,
    finishReason?: string,
    visibility?: string[]
  }
}
```

### 7. Provider Configuration

All providers are configured in `/convex/ai/providers.ts` with the following verified models:
- **OpenAI**: gpt-4o-mini (default)
- **Anthropic**: claude-3-5-sonnet-20241022
- **Google**: gemini-2.0-flash-exp
- **Perplexity**: sonar-pro
- **Vercel**: v0-1.0-md
- **OpenRouter**: google/gemini-2.5-flash (default)

### 8. Development Workflow

```bash
# Start Convex dev server
cd apps/liminal-api
npm run dev

# In another terminal - start Next.js
cd apps/web  
npm run dev

# Run tests
cd apps/liminal-api
npm test

# Initialize dev user (run once)
npx convex run users:initializeDevUser

# Check Convex dashboard
# https://dashboard.convex.dev/d/modest-squirrel-498
```

## Key Findings and Clarifications

1. **Convex Environment Variables**: Unlike traditional Node.js apps, Convex stores environment variables in the cloud. Use `npx convex env set KEY value` to set them, not .env files.

2. **Testing Approach**: Tests run against deployed Convex functions, not a local server. This is why tests use `https://modest-squirrel-498.convex.site` instead of localhost.

3. **Auth in Actions**: Convex actions don't have direct database access, requiring special auth handling for action contexts.

4. **Conversation Persistence**: Now working! Chat endpoints return a `conversationId` and messages are properly stored.

5. **OpenRouter Issue**: The original API key was invalid/expired. Updated during session and now working.

## Remaining Issues

1. **CLI Integration**: Still points to old edge server URLs, needs updating to use Convex endpoints.

2. **Web UI**: No functional implementation, needs complete chat interface.

3. **Agent System**: Completely missing from the Convex implementation (Feature 7).

## Recent Updates (July 2, 2025)

### Authentication Improvements
- Fixed `messages.getAll` and other message queries to use `getAuthOptional` helper
- Ensured consistent auth handling across all queries
- Created comprehensive authentication documentation at `/docs/technical/authentication.md`

### Conversation Endpoints Fixed (July 2, 2025)
- **Solved HTTP Router Limitation**: Implemented Hono router integration with Convex
- Routes like `/api/conversations/:id` now work correctly with path parameters
- All RESTful endpoints functional: GET, POST, PATCH, DELETE
- ✅ All 11 integration tests now passing

### Test Status
- ✅ 11 out of 11 integration tests passing
- Full test coverage for all conversation and message endpoints

## Security Audit and PR Review (July 2, 2025)

### Phase 1: Critical Security Fixes ✅ COMPLETED
All critical security issues have been addressed before merge:

1. **Webhook Security Implementation** ✅
   - Implemented Svix signature verification for Clerk webhooks
   - Added proper error handling for missing `CLERK_WEBHOOK_SECRET`
   - Webhook now rejects any requests without valid signatures
   - Prevents webhook spoofing attacks

2. **Dev Credentials Externalization** ✅
   - Removed hardcoded Clerk user ID, email, and name from `auth.ts`
   - Moved to environment variables: `DEV_USER_ID`, `DEV_USER_EMAIL`, `DEV_USER_NAME`
   - Added validation to ensure env vars are set when dev auth is enabled
   - Updated documentation with setup instructions

3. **Production Protection** ✅
   - Added `NODE_ENV === 'production'` check to `initializeDevUser` mutation
   - Prevents creation of unauthorized dev users in production
   - Clear error messages explain security implications

4. **Exposed Keys Removal** ✅
   - Replaced hardcoded Clerk publishable key with placeholder in `test-token-generator.html`
   - Added runtime validation to prevent usage without configuration
   - Verified no other exposed keys in codebase

### Phase 2: Type Safety & Code Quality (TODO)
Should be addressed for maintainability:

1. **Fix Type Safety Issues** 
   - Location: `apps/liminal-api/convex/http.ts:159-230`
   - Replace `as any` casts with proper types
   - Import and use `Id<"conversations">` type

2. **Add Performance Protection**
   - Location: `apps/liminal-api/convex/messages.ts:149`
   - Add pagination limits to `getAll` query
   - Implement optional limit parameter
   - Protect against large conversation memory issues

3. **Synchronize Package Versions**
   - Align Convex versions (1.23.0 → 1.25.0) across packages
   - Update Clerk package versions for consistency
   - Test for breaking changes

### Phase 3: Developer Experience (TODO)
Nice to have improvements:

1. **Environment Configuration**
   - Add proper environment variable validation
   - Replace hardcoded URLs with environment variables
   - Improve error messages for missing configuration

2. **Code Cleanup**
   - Remove unused imports and variables
   - Consolidate duplicated test helpers
   - Add cross-platform compatibility to scripts

3. **Documentation Updates**
   - Fix markdown formatting issues
   - Add proper TypeScript path mapping guidance
   - Update deployment instructions

## Next Steps

### ✅ Completed
1. **Merged PR** - All Phase 1, 2, and 3 fixes complete and merged
2. **Conversation Endpoints** - Fixed with Hono router integration

### 🚀 Priority Tasks

1. **Web UI Implementation** (High Impact)
   - Recreate Next.js app with functional chat interface
   - Implement Vercel AI SDK's `useChat` hook
   - Add conversation management UI
   - Provider selection interface
   - Real-time streaming display

2. **CLI Integration** 
   - Recreate CLI package connecting to Convex endpoints
   - Update from old edge server URLs
   - Implement provider commands
   - Add conversation management commands

3. **Agent System** (Feature 7 - Core Feature)
   - Implement AI Roundtable orchestration
   - Agent registry and management
   - Tool system integration
   - Multi-agent conversation support

4. **Complete Remaining Features**
   - Feature 5: Model/Provider DTOs with persistence
   - Feature 6: Model tools registry
   - Feature 8: CLI alignment with core APIs

## Phase 2: Type Safety & Code Quality Improvements (July 2, 2025)

### ✅ Completed Improvements

1. **Type Safety Fixes**
   - Eliminated all `as any` type casts from HTTP routes in `convex/http.ts`
   - Imported proper Convex `Id<"conversations">` types
   - Created TypeScript interfaces for request bodies
   - Full type safety now enforced in conversation endpoints

2. **Pagination Protection**
   - Added pagination to `messages.getAll` query to prevent memory issues
   - Default limit: 100 messages, maximum: 1000
   - Implemented cursor-based pagination for efficient data retrieval
   - Response structure: `{ messages, hasMore, nextCursor }`

3. **Package Version Synchronization**
   - Aligned Convex to version 1.25.2 across all packages
   - Standardized TypeScript to 5.3.3
   - Unified @types/node to 20.11.5
   - Resolved version inconsistencies

### 🔄 Major Refactoring: Monorepo Simplification

**Decision**: Deleted web and CLI apps to focus on Convex backend as the foundation
- Removed `apps/web` - Next.js frontend (to be regenerated)
- Removed `apps/cli` - Command-line interface (to be regenerated)
- Removed `apps/domain` - Old NestJS implementation
- Will regenerate frontend and CLI based on stable Convex API

### 🧹 Workspace Cleanup

**Removed Packages and Files**:
- `packages/shared-types` - No longer used
- `packages/shared-utils` - No longer used
- Root test infrastructure (old edge/domain tests)
- Outdated scripts and documentation
- **Total packages removed**: 842 from node_modules

**Current Workspace Structure**:
```
liminal-chat/
├── apps/
│   └── liminal-api/        # Core Convex backend
├── scripts/
│   └── claude-shell.sh     # Claude workspace restriction
├── agent-management/       # Agent development docs
├── docs/                   # Project documentation
└── package.json           # Simplified root config
```

### 📊 Current State

**Active Components**:
- **liminal-api**: Fully functional Convex backend with:
  - ✅ Clerk authentication with dev bypass
  - ✅ Conversation and message persistence
  - ✅ 6 AI provider integrations (OpenAI, Anthropic, Google, Perplexity, Vercel, OpenRouter)
  - ✅ Streaming and non-streaming chat endpoints
  - ✅ Webhook security with Svix
  - ✅ Type-safe HTTP routes with Hono
  - ✅ Pagination protection for large conversations

**Test Status**:
- 10/11 integration tests passing
- Remaining issue: Convex HTTP router path parameter limitation

### 🎯 Immediate Next Steps

1. **Merge Current PR** - All Phase 1 & 2 fixes complete
2. **Fix Conversation Endpoints** - Work around path parameter limitation
3. **Regenerate Frontend** - Build new Next.js app based on Convex API
4. **Regenerate CLI** - Create new CLI that connects to Convex endpoints