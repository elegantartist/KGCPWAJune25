#!/usr/bin/env tsx

/**
 * Fix Environment Variables for KGC Healthcare Application
 */

import { writeFileSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

console.log('🔧 Fixing environment configuration...');

// Read current .env file
let envContent = '';
try {
  envContent = readFileSync('.env', 'utf8');
} catch (error) {
  console.log('Creating new .env file...');
}

// Generate a proper session secret
const newSessionSecret = randomBytes(64).toString('hex');

// Update or add SESSION_SECRET
if (envContent.includes('SESSION_SECRET=')) {
  envContent = envContent.replace(/SESSION_SECRET=.*/, `SESSION_SECRET=${newSessionSecret}`);
} else {
  envContent += `\nSESSION_SECRET=${newSessionSecret}`;
}

// Write the updated .env file
writeFileSync('.env', envContent);

console.log('✅ Environment variables fixed');
console.log(`✅ New SESSION_SECRET generated (${newSessionSecret.length} characters)`);
console.log('✅ Application should now start without security warnings');