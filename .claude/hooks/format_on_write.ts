#!/usr/bin/env npx tsx

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { relative, resolve } from 'path';

interface HookPayload {
  tool_name: string;
  tool_input: {
    file_path?: string;
  };
}

interface PrettierFileInfo {
  ignored: boolean;
  inferredParser?: string;
}

function getPrettierFileInfo(filePath: string): PrettierFileInfo | null {
  try {
    const output = execSync(`npx prettier --file-info "${filePath}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 10000,
      cwd: process.cwd(),
    });

    return JSON.parse(output.trim()) as PrettierFileInfo;
  } catch (error: any) {
    console.error(`⚠️  Prettier --file-info failed for ${filePath}: ${error.message}`);
    return null;
  }
}

function runPrettier(filePath: string): { success: boolean; error?: string } {
  try {
    execSync(`npx prettier --write "${filePath}"`, {
      stdio: 'pipe',
      timeout: 30000,
      cwd: process.cwd(),
    });

    return { success: true };
  } catch (error: any) {
    if (error.signal === 'SIGTERM') {
      return { success: false, error: 'Prettier timeout (>30s)' };
    }
    return {
      success: false,
      error: error.stderr?.toString() || error.message || 'Unknown error',
    };
  }
}

function main(): void {
  try {
    // Read hook payload from stdin
    let input = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', () => {
      try {
        const payload: HookPayload = JSON.parse(input);

        const { tool_name, tool_input } = payload;
        const filePath = tool_input?.file_path;

        // Only process Write, Edit, MultiEdit tools
        if (!['Write', 'Edit', 'MultiEdit'].includes(tool_name)) {
          process.exit(0);
        }

        if (!filePath) {
          process.exit(0);
        }

        if (!existsSync(filePath)) {
          console.error(`⚠️  File not found: ${filePath}`);
          process.exit(0);
        }

        // Check if Prettier can and should format this file
        const fileInfo = getPrettierFileInfo(filePath);

        if (!fileInfo) {
          console.error(`⚠️  Cannot determine if ${filePath} should be formatted`);
          process.exit(0);
        }

        if (fileInfo.ignored) {
          // File is ignored by Prettier config, skip silently
          process.exit(0);
        }

        if (!fileInfo.inferredParser) {
          // No parser available for this file type, skip silently
          process.exit(0);
        }

        // File can be formatted, proceed with formatting
        const result = runPrettier(filePath);

        if (result.success) {
          const displayPath = relative(process.cwd(), resolve(filePath));
          console.log(`✅ Formatted ${displayPath}`);
        } else {
          console.error(`⚠️  Prettier failed for ${filePath}: ${result.error}`);
        }

        // Always exit 0 to avoid blocking Claude's workflow
        process.exit(0);
      } catch (parseError) {
        console.error('⚠️  Invalid JSON payload from hook');
        process.exit(0);
      }
    });
  } catch (error) {
    console.error(`⚠️  Hook error: ${error}`);
    process.exit(0);
  }
}

if (process.argv[1] === __filename) {
  main();
}
