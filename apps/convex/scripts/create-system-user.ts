#!/usr/bin/env node

/**
 * Script to create a system user in WorkOS for integration testing.
 *
 * Usage (from project root):
 *   npx tsx apps/liminal-api/scripts/create-system-user.ts
 *
 * Environment Variables Required (from root .env):
 *   - WORKOS_API_KEY: WorkOS API key
 *   - WORKOS_CLIENT_ID: WorkOS client ID
 *   - SYSTEM_USER_EMAIL: Email for system user
 *   - SYSTEM_USER_PASSWORD: Password for system user (32+ characters)
 */

import { WorkOS } from '@workos-inc/node';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import * as path from 'path';
import { findProjectRoot } from '../lib/utils/project-root';

// Load environment variables from project root
const rootDir = findProjectRoot(__dirname);
config({ path: path.join(rootDir, '.env') });

interface CreateSystemUserConfig {
  email: string;
  password?: string;
  clientId: string;
  apiKey: string;
  environment?: string;
}

function validateConfig(config: Partial<CreateSystemUserConfig>): CreateSystemUserConfig {
  const { email, password, clientId, apiKey } = config;

  if (!email) {
    throw new Error('SYSTEM_USER_EMAIL environment variable is required');
  }

  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID environment variable is required');
  }

  if (!apiKey) {
    throw new Error('WORKOS_API_KEY environment variable is required');
  }

  // Generate secure password if not provided
  const finalPassword = password || generateSecurePassword();

  if (finalPassword.length < 32) {
    throw new Error('System user password must be at least 32 characters long');
  }

  return {
    email,
    password: finalPassword,
    clientId,
    apiKey,
    environment: process.env.NODE_ENV || 'development',
  };
}

function generateSecurePassword(): string {
  // Generate a secure 40-character password
  return crypto.randomBytes(30).toString('base64');
}

async function createSystemUser(config: CreateSystemUserConfig) {
  console.log('🚀 Creating system user for integration testing...');
  console.log(`   Email: ${config.email}`);
  console.log(`   Environment: ${config.environment}`);

  const workos = new WorkOS(config.apiKey, {
    clientId: config.clientId,
  });

  try {
    // Check if user already exists
    try {
      const existingUsers = await workos.userManagement.listUsers({
        email: config.email,
        limit: 1,
      });

      if (existingUsers.data.length > 0) {
        console.log('⚠️  System user already exists!');
        console.log(`   User ID: ${existingUsers.data[0].id}`);
        console.log(`   Created: ${existingUsers.data[0].createdAt}`);
        console.log('   Use the existing user or delete it first if you need to recreate.');
        return;
      }
    } catch (error) {
      // User doesn't exist, continue with creation
    }

    // Create the system user
    const user = await workos.userManagement.createUser({
      email: config.email,
      password: config.password,
      firstName: 'System',
      lastName: 'Test User',
      emailVerified: true, // Skip email verification for system user
      externalId: `system-integration-test-${config.environment}`,
      metadata: {
        purpose: 'integration_testing',
        environment: config.environment!,
        created_by: 'system_script',
        created_at: new Date().toISOString(),
      },
    });

    console.log('✅ System user created successfully!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   External ID: ${user.externalId}`);
    console.log(`   Created: ${user.createdAt}`);

    // Test authentication
    console.log('\\n🔐 Testing authentication...');
    const authResponse = await workos.userManagement.authenticateWithPassword({
      email: config.email,
      password: config.password,
      clientId: config.clientId,
    });

    console.log('✅ Authentication successful!');
    console.log(`   Access token length: ${authResponse.accessToken.length}`);
    console.log(`   User authenticated: ${authResponse.user.email}`);

    // Display environment variables to set
    console.log('\\n📝 Environment Variables:');
    console.log('   Add these to your .env files:');
    console.log(`   SYSTEM_USER_EMAIL="${config.email}"`);
    console.log(`   SYSTEM_USER_PASSWORD="${config.password}"`);

    console.log('\\n🎯 Next Steps:');
    console.log('1. Configure JWT Template in WorkOS Dashboard:');
    console.log('   - Go to Authentication → JWT Template');
    console.log('   - Add custom claims for system user identification');
    console.log('2. Update your test framework to use the SystemAuth utility from test-utils/');
  } catch (error) {
    console.error('❌ Failed to create system user:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    const config = validateConfig({
      email: process.env.SYSTEM_USER_EMAIL,
      password: process.env.SYSTEM_USER_PASSWORD,
      clientId: process.env.WORKOS_CLIENT_ID,
      apiKey: process.env.WORKOS_API_KEY,
    });

    await createSystemUser(config);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
