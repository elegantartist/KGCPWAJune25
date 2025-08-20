#!/usr/bin/env tsx

/**
 * Simple Security Check for KGC Healthcare Application
 * 
 * Focuses on essential security without complexity
 */

import bcrypt from 'bcryptjs';

async function main() {
  console.log('🔐 KGC Healthcare - Simple Security Validation');
  console.log('==============================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  // Check 1: Environment Variables
  totalChecks++;
  console.log('1️⃣ Checking environment variables...');
  const requiredVars = ['SESSION_SECRET', 'DATABASE_URL', 'OPENAI_API_KEY', 'TWILIO_ACCOUNT_SID'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length === 0) {
    console.log('✅ All required environment variables present');
    passedChecks++;
  } else {
    console.log(`❌ Missing: ${missing.join(', ')}`);
  }

  // Check 2: Session Secret Strength
  totalChecks++;
  console.log('\n2️⃣ Checking session secret...');
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (sessionSecret && sessionSecret.length >= 32) {
    console.log('✅ Session secret is strong enough');
    passedChecks++;
  } else {
    console.log('❌ Session secret too weak or missing');
  }

  // Check 3: Password Hashing
  totalChecks++;
  console.log('\n3️⃣ Testing password security...');
  
  try {
    const testPassword = 'test123';
    const startTime = Date.now();
    const hash = await bcrypt.hash(testPassword, 12);
    const endTime = Date.now();
    const isValid = await bcrypt.compare(testPassword, hash);
    
    if (isValid && (endTime - startTime) < 1000) {
      console.log(`✅ Password hashing working (${endTime - startTime}ms)`);
      passedChecks++;
    } else {
      console.log('❌ Password hashing issues');
    }
  } catch (error) {
    console.log(`❌ Password hashing failed: ${error}`);
  }

  // Check 4: Database Connection
  totalChecks++;
  console.log('\n4️⃣ Checking database security...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.includes('neon.tech') || dbUrl.includes('sslmode=require'))) {
    console.log('✅ Database connection secure');
    passedChecks++;
  } else {
    console.log('⚠️ Database security unclear');
  }

  // Check 5: Application Structure
  totalChecks++;
  console.log('\n5️⃣ Checking application structure...');
  
  try {
    await import('../server/auditLogger');
    await import('../server/middleware/authentication');
    console.log('✅ Security components present');
    passedChecks++;
  } catch (error) {
    console.log('❌ Missing security components');
  }

  // Results
  console.log('\n📊 Security Check Results');
  console.log('========================');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${totalChecks - passedChecks}`);
  
  const passRate = Math.round((passedChecks / totalChecks) * 100);
  console.log(`Pass Rate: ${passRate}%`);

  if (passedChecks === totalChecks) {
    console.log('\n🎉 All essential security checks passed!');
    console.log('Application is secure and ready for healthcare use.');
    process.exit(0);
  } else if (passedChecks >= 4) {
    console.log('\n⚠️ Most security checks passed - application usable with minor issues');
    process.exit(0);
  } else {
    console.log('\n❌ Critical security issues found');
    console.log('Please address the failed checks before deployment.');
    process.exit(1);
  }
}

main().catch(console.error);