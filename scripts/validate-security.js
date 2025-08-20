#!/usr/bin/env node

/**
 * Security Validation Script
 * 
 * This script validates the security configuration of the KGC application.
 * Run before deployment to ensure all security measures are properly configured.
 * 
 * Usage:
 *   node scripts/validate-security.js
 */

import { config } from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

console.log('🔒 KGC Security Validation Report');
console.log('==================================\n');

let criticalIssues = 0;
let warnings = 0;
let passed = 0;

function checkPass(message) {
  console.log(`✅ ${message}`);
  passed++;
}

function checkWarn(message) {
  console.log(`⚠️  ${message}`);
  warnings++;
}

function checkFail(message) {
  console.log(`❌ ${message}`);
  criticalIssues++;
}

// 1. Environment Variables Check
console.log('1. Environment Variables');
console.log('-' .repeat(25));

const requiredVars = [
  'SESSION_SECRET',
  'DATABASE_URL', 
  'OPENAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

const productionVars = [
  'ADMIN_PASSWORD_HASH',
  'ALLOWED_ORIGINS',
  'NODE_ENV'
];

// Check required variables
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    checkPass(`${varName} is configured`);
  } else {
    checkFail(`${varName} is missing`);
  }
});

// Check SESSION_SECRET strength
const sessionSecret = process.env.SESSION_SECRET;
if (sessionSecret) {
  if (sessionSecret.length >= 32) {
    checkPass('SESSION_SECRET has adequate length');
  } else {
    checkFail('SESSION_SECRET is too short (minimum 32 characters)');
  }
  
  const weakPatterns = ['default', 'secret', 'password', '123456', 'admin'];
  const hasWeakPattern = weakPatterns.some(pattern => 
    sessionSecret.toLowerCase().includes(pattern)
  );
  
  if (!hasWeakPattern) {
    checkPass('SESSION_SECRET does not contain weak patterns');
  } else {
    checkFail('SESSION_SECRET contains weak patterns');
  }
} else {
  checkFail('SESSION_SECRET is not configured');
}

// Check production variables
console.log('\n2. Production Configuration');
console.log('-' .repeat(28));

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  productionVars.forEach(varName => {
    if (process.env[varName]) {
      checkPass(`${varName} is configured for production`);
    } else {
      checkFail(`${varName} is required for production`);
    }
  });
} else {
  checkWarn('Running in development mode');
}

// 3. File Security Check
console.log('\n3. File Security');
console.log('-' .repeat(17));

// Check if .env exists and is not in git
if (fs.existsSync('.env')) {
  checkPass('.env file exists');
  
  // Check if .env is in .gitignore
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env')) {
      checkPass('.env is properly ignored by git');
    } else {
      checkFail('.env is not in .gitignore - SECURITY RISK!');
    }
  } else {
    checkFail('.gitignore file missing');
  }
} else {
  checkWarn('.env file does not exist (using system environment variables)');
}

// Check for hardcoded secrets in code
const codeFiles = [
  'client/src/pages/admin-login.tsx',
  'server/auth.ts',
  'server/routes.ts'
];

console.log('\n4. Code Security Scan');
console.log('-' .repeat(21));

const suspiciousPatterns = [
  /admin123/gi,
  /password123/gi,
  /default.*secret/gi,
  /hardcoded.*password/gi,
  /api.*key.*=.*[a-zA-Z0-9]{20,}/gi
];

let foundSecurityIssues = false;

codeFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    suspiciousPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        checkFail(`Potential hardcoded credential in ${filePath}: ${matches[0]}`);
        foundSecurityIssues = true;
      }
    });
  }
});

if (!foundSecurityIssues) {
  checkPass('No hardcoded credentials found in code');
}

// 5. Database Security
console.log('\n5. Database Configuration');
console.log('-' .repeat(26));

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    checkPass('Database URL format is valid');
    
    if (dbUrl.includes('sslmode=require') || dbUrl.includes('ssl=true')) {
      checkPass('Database SSL is configured');
    } else {
      checkWarn('Database SSL configuration not detected');
    }
  } else {
    checkFail('Database URL format is invalid');
  }
}

// 6. Security Headers Check
console.log('\n6. Security Implementation');
console.log('-' .repeat(27));

// Check if security middleware files exist
const securityFiles = [
  'server/middleware/security.ts',
  'server/middleware/authentication.ts',
  'server/config/security.ts'
];

securityFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    checkPass(`${path.basename(filePath)} security middleware exists`);
  } else {
    checkFail(`${path.basename(filePath)} security middleware missing`);
  }
});

// 7. Package Vulnerabilities
console.log('\n7. Dependency Security');
console.log('-' .repeat(22));

if (fs.existsSync('package-lock.json')) {
  checkPass('Package lock file exists (consistent dependencies)');
} else {
  checkWarn('Package lock file missing');
}

// Check for common vulnerable patterns in package.json
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const devDeps = packageJson.devDependencies || {};
  
  // Check for common security packages
  const securityPackages = ['express-rate-limit', 'bcrypt', 'cors'];
  const installedSecurity = securityPackages.filter(pkg => 
    packageJson.dependencies && packageJson.dependencies[pkg]
  );
  
  if (installedSecurity.length >= 2) {
    checkPass(`Security packages installed: ${installedSecurity.join(', ')}`);
  } else {
    checkWarn('Some security packages may be missing');
  }
}

// Final Report
console.log('\n' + '=' .repeat(50));
console.log('SECURITY VALIDATION SUMMARY');
console.log('=' .repeat(50));

console.log(`✅ Passed: ${passed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Critical Issues: ${criticalIssues}`);

if (criticalIssues > 0) {
  console.log('\n🚨 CRITICAL SECURITY ISSUES FOUND!');
  console.log('The application should NOT be deployed until these are resolved.');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Security warnings detected.');
  console.log('Review and address warnings before production deployment.');
  process.exit(2);
} else {
  console.log('\n🛡️  Security validation PASSED!');
  console.log('The application meets basic security requirements.');
  console.log('\nRecommended next steps:');
  console.log('- Run penetration testing');
  console.log('- Implement monitoring and alerting');
  console.log('- Set up automated security scans');
  console.log('- Document security procedures');
  process.exit(0);
}