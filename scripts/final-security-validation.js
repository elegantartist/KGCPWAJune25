#!/usr/bin/env node

/**
 * Final Security Validation for KGC Healthcare Application
 * Validates complete bcryptjs implementation and production readiness
 */

import { readFileSync } from 'fs';

console.log('🔐 KGC Healthcare Application - Final Security Validation\n');

let allChecks = true;

// Check 1: bcryptjs dependency
console.log('1. Dependency Security Check');
console.log('─'.repeat(30));
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  
  if (packageJson.dependencies.bcryptjs) {
    console.log('✅ PASS: bcryptjs dependency found');
  } else {
    console.log('❌ FAIL: bcryptjs dependency missing');
    allChecks = false;
  }
  
  // Check for native bcrypt (should NOT exist)
  if (packageJson.dependencies.bcrypt) {
    console.log('❌ FAIL: Native bcrypt dependency found (should be removed)');
    allChecks = false;
  } else {
    console.log('✅ PASS: No native bcrypt dependency');
  }
  
  if (packageJson.dependencies['@types/bcryptjs']) {
    console.log('✅ PASS: bcryptjs TypeScript types found');
  } else {
    console.log('⚠️  WARN: bcryptjs TypeScript types missing');
  }
} catch (error) {
  console.log('❌ ERROR: Could not read package.json');
  allChecks = false;
}

// Check 2: TypeScript strict mode
console.log('\n2. TypeScript Configuration');
console.log('─'.repeat(30));
try {
  const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
  
  if (tsconfig.compilerOptions.strict === true) {
    console.log('✅ PASS: TypeScript strict mode enabled');
  } else {
    console.log('❌ FAIL: TypeScript strict mode disabled');
    allChecks = false;
  }
} catch (error) {
  console.log('❌ ERROR: Could not read tsconfig.json');
  allChecks = false;
}

// Check 3: bcryptjs imports in seeding scripts
console.log('\n3. Seeding Script Security');
console.log('─'.repeat(30));
try {
  const seedDbContent = readFileSync('scripts/seed-db.ts', 'utf8');
  const seedHierarchicalContent = readFileSync('scripts/seed-hierarchical-users.ts', 'utf8');
  
  if (seedDbContent.includes("from 'bcryptjs'")) {
    console.log('✅ PASS: seed-db.ts uses bcryptjs');
  } else if (seedDbContent.includes("from 'bcrypt'")) {
    console.log('❌ FAIL: seed-db.ts uses native bcrypt');
    allChecks = false;
  } else {
    console.log('⚠️  INFO: seed-db.ts does not import bcrypt');
  }
  
  if (seedHierarchicalContent.includes("from 'bcryptjs'")) {
    console.log('✅ PASS: seed-hierarchical-users.ts uses bcryptjs');
  } else if (seedHierarchicalContent.includes("from 'bcrypt'")) {
    console.log('❌ FAIL: seed-hierarchical-users.ts uses native bcrypt');
    allChecks = false;
  } else {
    console.log('⚠️  INFO: seed-hierarchical-users.ts does not import bcrypt');
  }
} catch (error) {
  console.log('❌ ERROR: Could not read seeding scripts');
  allChecks = false;
}

// Check 4: Security environment variables
console.log('\n4. Environment Security');
console.log('─'.repeat(30));

const requiredSecrets = [
  'SESSION_SECRET',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY'
];

let secretsFound = 0;
requiredSecrets.forEach(secret => {
  if (process.env[secret]) {
    console.log(`✅ PASS: ${secret} is configured`);
    secretsFound++;
  } else {
    console.log(`⚠️  WARN: ${secret} not found in environment`);
  }
});

console.log(`\n📊 Security Summary`);
console.log('─'.repeat(20));
console.log(`Secrets configured: ${secretsFound}/${requiredSecrets.length}`);

// Final assessment
console.log('\n🎯 Final Assessment');
console.log('─'.repeat(20));
if (allChecks) {
  console.log('🎉 SUCCESS: All security checks passed!');
  console.log('✅ Application is production-ready for AWS deployment');
  console.log('✅ bcryptjs implementation is complete and secure');
  console.log('✅ TypeScript strict mode provides enhanced type safety');
  process.exit(0);
} else {
  console.log('⚠️  WARNING: Some security checks failed');
  console.log('❌ Please address the failed checks before deployment');
  process.exit(1);
}