#!/usr/bin/env node

/**
 * KGC E2E Test Runner
 * 
 * This script runs all Cypress E2E tests in sequence and provides
 * comprehensive reporting for the KGC application.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test configuration
const testFiles = [
  '01-login-flow.cy.ts',
  '02-admin-user-creation.cy.ts', 
  '03-patient-daily-scores.cy.ts',
  '04-enhanced-chatbot.cy.ts',
  '05-doctor-dashboard.cy.ts',
  '06-full-integration.cy.ts'
];

const testDescriptions = {
  '01-login-flow.cy.ts': 'Authentication & Login Flow',
  '02-admin-user-creation.cy.ts': 'Admin User Management',
  '03-patient-daily-scores.cy.ts': 'Patient Daily Score Submission',
  '04-enhanced-chatbot.cy.ts': 'AI Chatbot Integration',
  '05-doctor-dashboard.cy.ts': 'Doctor Dashboard Functionality',
  '06-full-integration.cy.ts': 'Complete Application Integration'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSubHeader(message) {
  log(`\n${'-'.repeat(40)}`, 'blue');
  log(`  ${message}`, 'blue');
  log(`${'-'.repeat(40)}`, 'blue');
}

function checkPrerequisites() {
  logHeader('KGC E2E Test Suite - Prerequisites Check');
  
  const checks = [
    {
      name: 'Frontend Server (http://localhost:5173)',
      command: 'curl -s http://localhost:5173 > /dev/null',
      required: true
    },
    {
      name: 'Backend Server (http://localhost:3000)',
      command: 'curl -s http://localhost:3000/api/health > /dev/null',
      required: true
    },
    {
      name: 'Database Connection',
      command: 'curl -s http://localhost:3000/api/admin/users > /dev/null',
      required: false
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      execSync(check.command, { stdio: 'ignore' });
      log(`✅ ${check.name}`, 'green');
    } catch (error) {
      if (check.required) {
        log(`❌ ${check.name} - REQUIRED`, 'red');
        allPassed = false;
      } else {
        log(`⚠️  ${check.name} - Optional`, 'yellow');
      }
    }
  }
  
  if (!allPassed) {
    log('\n❌ Prerequisites not met. Please ensure:', 'red');
    log('   1. Frontend server is running: npm run dev (in client/)', 'red');
    log('   2. Backend server is running: npm run dev (in server/)', 'red');
    log('   3. Database is seeded: npm run seed:quick (in server/)', 'red');
    process.exit(1);
  }
  
  log('\n✅ All prerequisites met!', 'green');
}

function runTest(testFile) {
  const description = testDescriptions[testFile] || testFile;
  logSubHeader(`Running: ${description}`);
  
  try {
    const startTime = Date.now();
    
    execSync(`npx cypress run --spec "cypress/e2e/${testFile}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ ${description} - Passed (${duration}s)`, 'green');
    
    return { file: testFile, status: 'passed', duration };
    
  } catch (error) {
    log(`❌ ${description} - Failed`, 'red');
    return { file: testFile, status: 'failed', duration: 0 };
  }
}

function generateReport(results) {
  logHeader('Test Results Summary');
  
  const passed = results.filter(r => r.status === 'passed');
  const failed = results.filter(r => r.status === 'failed');
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  log(`Total Tests: ${results.length}`, 'bright');
  log(`Passed: ${passed.length}`, 'green');
  log(`Failed: ${failed.length}`, failed.length > 0 ? 'red' : 'green');
  log(`Total Duration: ${totalDuration.toFixed(2)}s`, 'cyan');
  
  if (failed.length > 0) {
    log('\nFailed Tests:', 'red');
    failed.forEach(test => {
      log(`  ❌ ${testDescriptions[test.file]}`, 'red');
    });
  }
  
  if (passed.length > 0) {
    log('\nPassed Tests:', 'green');
    passed.forEach(test => {
      log(`  ✅ ${testDescriptions[test.file]} (${test.duration.toFixed(2)}s)`, 'green');
    });
  }
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      duration: totalDuration
    },
    results: results.map(r => ({
      test: testDescriptions[r.file],
      file: r.file,
      status: r.status,
      duration: r.duration
    }))
  };
  
  const reportPath = path.join(__dirname, '../reports/test-results.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`\n📊 Detailed report saved to: ${reportPath}`, 'cyan');
  
  return failed.length === 0;
}

function main() {
  const startTime = Date.now();
  
  logHeader('KGC End-to-End Test Suite');
  log('Testing the complete Keep Going Care application', 'cyan');
  
  // Check prerequisites
  checkPrerequisites();
  
  // Run all tests
  logHeader('Running Test Suite');
  const results = [];
  
  for (const testFile of testFiles) {
    const result = runTest(testFile);
    results.push(result);
    
    // Small delay between tests
    if (testFile !== testFiles[testFiles.length - 1]) {
      log('Waiting 2 seconds before next test...', 'yellow');
      execSync('sleep 2');
    }
  }
  
  // Generate final report
  const allPassed = generateReport(results);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  logHeader('Test Suite Complete');
  log(`Total execution time: ${totalTime}s`, 'cyan');
  
  if (allPassed) {
    log('🎉 All tests passed! KGC is ready for production.', 'green');
    process.exit(0);
  } else {
    log('❌ Some tests failed. Please review and fix issues.', 'red');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('KGC E2E Test Runner', 'bright');
  log('\nUsage: node run-all-tests.js [options]', 'cyan');
  log('\nOptions:', 'cyan');
  log('  --help, -h     Show this help message');
  log('  --skip-prereq  Skip prerequisite checks');
  log('\nExample:', 'cyan');
  log('  node run-all-tests.js');
  process.exit(0);
}

if (args.includes('--skip-prereq')) {
  log('⚠️  Skipping prerequisite checks', 'yellow');
  // Override checkPrerequisites to do nothing
  checkPrerequisites = () => {};
}

// Run the test suite
main();