/**
 * Keep Going Care AWS Deployment Script
 * 
 * This script prepares and packages the application for AWS deployment
 * It can also create a build for local execution
 * 
 * Usage:
 *   node scripts/deploy-aws.js [--env=production|local] [--zip]
 * 
 * Options:
 *   --env=production   Create a production-ready build for AWS (default)
 *   --env=local        Create a build for local execution
 *   --zip              Create a zip file of the build for easy upload
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production';
const createZip = args.includes('--zip');

console.log(`=== Keep Going Care AWS Deployment ===`);
console.log(`Preparing ${env} build...`);

// Create build directory if it doesn't exist
const distDir = path.resolve('./dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Run the build command
try {
  console.log('Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

// Create an appropriate .env file template for the chosen environment
const envFile = env === 'production' ? '.env.production' : '.env.local';
const envContent = env === 'production' 
  ? `# Production Environment Configuration
NODE_ENV=production
PORT=5000

# Database
# DATABASE_URL=postgresql://username:password@hostname:port/database

# API Keys
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# TAVILY_API_KEY=your_tavily_key
# SENDGRID_API_KEY=your_sendgrid_key
`
  : `# Local Environment Configuration
NODE_ENV=production
PORT=5000

# Database - replace with your local PostgreSQL connection
# DATABASE_URL=postgresql://username:password@localhost:5432/keepgoingcare

# API Keys - add your development keys here
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# TAVILY_API_KEY=your_tavily_key
# SENDGRID_API_KEY=your_sendgrid_key
`;

fs.writeFileSync(path.join(distDir, envFile), envContent);
console.log(`Created ${envFile} template`);

// Create a start script
const startScript = `#!/bin/bash
# Keep Going Care startup script

# Load environment variables
if [ -f .env.production ]; then
  echo "Loading production environment variables"
  export $(grep -v '^#' .env.production | xargs)
elif [ -f .env.local ]; then
  echo "Loading local environment variables"
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  echo "Loading .env environment variables"
  export $(grep -v '^#' .env | xargs)
fi

# Start the application
node index.js
`;

fs.writeFileSync(path.join(distDir, 'start.sh'), startScript);
execSync(`chmod +x ${path.join(distDir, 'start.sh')}`);
console.log('Created start.sh script');

// Copy AWS-specific files
if (env === 'production') {
  // Copy .ebextensions
  const ebextDir = path.join(distDir, '.ebextensions');
  if (!fs.existsSync(ebextDir)) {
    fs.mkdirSync(ebextDir, { recursive: true });
  }
  
  fs.copyFileSync(
    path.resolve('.ebextensions/nodejs.config'), 
    path.join(ebextDir, 'nodejs.config')
  );
  
  // Create Procfile for Elastic Beanstalk
  fs.writeFileSync(path.join(distDir, 'Procfile'), 'web: node index.js');
  console.log('Created AWS deployment files');
}

// Create a basic README for the build
const readmeContent = `# Keep Going Care - ${env === 'production' ? 'Production' : 'Local'} Build

This directory contains a ready-to-deploy build of the Keep Going Care application.

## Setup Instructions

1. Configure the environment variables in \`${envFile}\`:
   - Set the DATABASE_URL to your PostgreSQL connection string
   - Add your API keys for OpenAI, Anthropic, and other required services

2. Start the application:
   \`\`\`
   ./start.sh
   \`\`\`
   
   Or manually:
   \`\`\`
   node index.js
   \`\`\`

${env === 'production' ? `
## AWS Deployment

For detailed AWS deployment instructions, please refer to the AWS-DEPLOYMENT-GUIDE.md 
in the main project directory.

### Quick Elastic Beanstalk Deployment:

\`\`\`
# Initialize EB application (first time only)
eb init

# Create an environment (first time only)
eb create keep-going-care-production

# Deploy updates
eb deploy
\`\`\`
` : ''}

For more information, see the main project documentation.
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);

// Copy the detailed AWS deployment guide if it exists
if (fs.existsSync('./AWS-DEPLOYMENT-GUIDE.md')) {
  fs.copyFileSync('./AWS-DEPLOYMENT-GUIDE.md', path.join(distDir, 'AWS-DEPLOYMENT-GUIDE.md'));
}

// Create a zip file if requested
if (createZip) {
  console.log('Creating zip archive...');
  const zipFileName = `keep-going-care-${env}-${new Date().toISOString().split('T')[0]}.zip`;
  
  try {
    execSync(`cd ${distDir} && zip -r ../${zipFileName} .`, { stdio: 'inherit' });
    console.log(`Created ${zipFileName} in the project root directory`);
  } catch (error) {
    console.error('Failed to create zip file:', error.message);
    console.log('Please manually zip the dist directory for deployment');
  }
}

console.log(`
=== Deployment Build Complete ===

Your application is now ready for ${env === 'production' ? 'AWS deployment' : 'local execution'}.

${env === 'production' 
  ? 'For AWS deployment, follow the instructions in AWS-DEPLOYMENT-GUIDE.md'
  : 'To run locally, configure the .env.local file in the dist directory and run ./start.sh'}

The build is located in the 'dist' directory.
${createZip ? 'A zip archive has also been created in the project root directory.' : ''}
`);