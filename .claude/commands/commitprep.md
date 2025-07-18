Stage all changes
   - Command: `pnpm precommit:stage-all`
   - Stages all changes with git add -A

Format Check (Auto-fix)
   - Command: `pnpm format:check`
     - Shows files that need formatting
   - Command: `pnpm format:fix` (if needed)
     - Automatically formats staged files
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
   - Command: `pnpm --filter liminal-api docs:llm`
     - Regenerates llms.txt and api-for-claude.md
     - Ensures documentation reflects latest code changes
   - Command: `git add docs/tsdocs/llms.txt docs/tsdocs/api-for-claude.md`
     - Stage the updated documentation files from repository root
   - Continue even if generation has warnings

Final Summary
   - Show summary of all checks (passed/failed/warnings)
   - List any issues that need attention
   - If all critical checks pass, proceed to commit message

All output should be shown in the conversation