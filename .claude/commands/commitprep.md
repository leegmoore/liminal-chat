Move to root dir

Stage all changes
   - Command: `pnpm precommit:stage-all`
   - Stages all changes with git add -A

Temporary File Check (Show warnings)
   - Command: `pnpm precommit:temp-files`
   - Flags common temporary/test file patterns
   - Shows warnings but continues (non-blocking)

Format (Auto-fix)
   - Command: `pnpm format:fix`
     - Automatically formats all staged files
   - Command: `pnpm precommit:stage-all`
     - Re-stage any files modified by Prettier

Security: Critical Security (Stop on fail)
   - Command: `pnpm precommit:trufflehog`
     - Runs trufflehog on staged files with .trufflehog-exclude file
     - Uses .trufflehog.yaml for custom detectors (Clerk, OpenRouter, Perplexity, Vercel v0)

   - Command: `pnpm precommit:env-files`
     - Checks for environment files (.env.*)
   - Command: `pnpm precommit:api-keys`
   - Additional pattern-based scan for API keys in ALL files
   - Stop and report if any issues found

Code Standards Pass (Show violations)
   - Manual review against docs/engineering-practices.md
   - Check for outdated or missing docstrings (TSDoc/JSDoc)
   - Verify code comments accurately describe the code
   - Flag any violations of standards
   - Show violations but continue

Dependency Security Pass (Stop on critical)
   - Command: `pnpm audit --prod`
     - Checks for vulnerable production dependencies
   - Stop if critical vulnerabilities found
   - Show high/medium vulnerabilities as warnings
   - Continue if only low severity issues

Lint Check (Stop on errors)
   - Command: `pnpm lint`
     - Checks code syntax and style across all packages
   - Stop if linting errors found
   - Show warnings but continue

Type Check (Stop on errors)
   - Command: `pnpm typecheck`
     - Ensures TypeScript compilation across all packages
   - Stop if type errors found

Documentation Generation (Auto-update)
   - Command: `pnpm --filter @liminal/convex docs:llm`
     - Regenerates llms.txt and api-for-claude.md via generate-llms-custom.js and generate-api-for-claude-v2.js
     - Ensures documentation reflects latest code changes
   - Command: `git add apps/convex/docs/api/* apps/convex/llms-config.json`
     - Stage the updated documentation files from Convex package
   - Continue even if generation has warnings

Final Summary
   - Show summary of all checks (passed/failed/warnings)
   - List any issues that need attention
   - If all critical checks pass, proceed to commit message

All output should be shown in the conversation