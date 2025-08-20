#!/usr/bin/env node

/**
 * Generate Admin Password Hash
 * 
 * This script generates a secure bcrypt hash for the admin password.
 * Run this script and copy the output to your production environment variables.
 * 
 * Usage:
 *   node scripts/generate-admin-hash.js
 *   Enter your desired admin password when prompted.
 */

import bcrypt from 'bcryptjs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 KGC Admin Password Hash Generator');
console.log('=====================================\n');

function generateHash() {
  rl.question('Enter the admin password (will not be displayed): ', (password) => {
    // Hide the input
    process.stdout.write('\n');
    
    if (!password || password.length < 8) {
      console.log('❌ Password must be at least 8 characters long.');
      console.log('Please try again.\n');
      generateHash();
      return;
    }
    
    // Check for common weak passwords
    const weakPasswords = [
      'password', 'admin', '123456', 'admin123', 'password123', 
      'qwerty', 'letmein', 'welcome', 'monkey', 'dragon'
    ];
    
    if (weakPasswords.includes(password.toLowerCase())) {
      console.log('❌ This password is too common and insecure.');
      console.log('Please choose a stronger password.\n');
      generateHash();
      return;
    }
    
    console.log('⏳ Generating secure hash...\n');
    
    // Use high salt rounds for admin password (12 rounds = ~300ms on modern hardware)
    const saltRounds = 12;
    
    bcrypt.hash(password, saltRounds)
      .then(hash => {
        console.log('✅ Admin password hash generated successfully!\n');
        console.log('Add this to your production environment variables:');
        console.log('=' .repeat(60));
        console.log(`ADMIN_PASSWORD_HASH=${hash}`);
        console.log('=' .repeat(60));
        console.log('\n📋 Also set these environment variables:');
        console.log('ADMIN_USERNAME=admin');
        console.log('NODE_ENV=production');
        console.log('\n⚠️  Security Notes:');
        console.log('- Never store the plain text password');
        console.log('- Keep the hash secret and secure');
        console.log('- Use different passwords for different environments');
        console.log('- Regularly rotate admin passwords');
        
        rl.close();
      })
      .catch(error => {
        console.error('❌ Error generating hash:', error);
        rl.close();
        process.exit(1);
      });
  });
}

// Hide password input
rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (rl.stdoutMuted) {
    rl.output.write('*');
  } else {
    rl.output.write(stringToWrite);
  }
};

console.log('This will generate a secure bcrypt hash for your admin password.');
console.log('The hash will be used for secure admin authentication.\n');

// Start the process
generateHash();

// Make input invisible
rl.stdoutMuted = true;