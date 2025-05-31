/**
 * Keep Going Care Deployment Script
 * 
 * This script prepares the application for deployment to AWS
 * It can also be used to create a build for local execution
 * 
 * Usage:
 * - For production build: node deploy.js --env=production
 * - For local execution: node deploy.js --env=local
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./aws-deploy.config.js');

// Parse command line arguments
const args = process.argv.slice(2);
const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'local';
const skipBuild = args.includes('--skip-build');

console.log(`Starting deployment process for environment: ${env}`);

// Create necessary directories
const distDir = path.resolve(config.build.outputDir);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Function to copy files recursively
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  for (const file of files) {
    // Skip node_modules, .git and other unnecessary folders
    if (['node_modules', '.git', 'dist', 'build', 'cleanup-backups', 'cleanup-logs', 'temp'].includes(file)) {
      continue;
    }
    
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Build the application
if (!skipBuild) {
  try {
    console.log('Building the application...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('Build completed successfully.');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Create a .env.production file for AWS deployment
if (env === 'production') {
  const envContent = `
# Keep Going Care Production Environment
NODE_ENV=production
PORT=${config.app.port}

# Database
# Note: In AWS, set these as environment variables in your EB environment or EC2 instance
# DATABASE_URL=postgresql://user:password@hostname:port/dbname

# API Keys for services (add in AWS environment variables)
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# TAVILY_API_KEY=your_tavily_key
# SENDGRID_API_KEY=your_sendgrid_key

# AWS Configuration
AWS_REGION=${config.aws.region}
`;

  fs.writeFileSync(path.join(distDir, '.env.production'), envContent);
  console.log('Created production environment configuration file.');
}

// Create a local environment file for local execution
if (env === 'local') {
  const envContent = `
# Keep Going Care Local Environment
NODE_ENV=production
PORT=${config.app.port}

# Database - replace with your actual PostgreSQL connection string
# DATABASE_URL=postgresql://user:password@localhost:5432/keepgoingcare

# API Keys for services - add your actual keys
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# TAVILY_API_KEY=your_tavily_key
# SENDGRID_API_KEY=your_sendgrid_key
`;

  fs.writeFileSync(path.join(distDir, '.env.local'), envContent);
  console.log('Created local environment configuration file.');
}

// Create run script for AWS and local execution
const runScript = `
#!/bin/bash
# Run script for Keep Going Care application

# Load environment variables
if [ "$NODE_ENV" = "production" ]; then
  echo "Loading production environment variables"
  set -a
  [ -f .env.production ] && . .env.production
  set +a
else
  echo "Loading local environment variables"
  set -a
  [ -f .env.local ] && . .env.local
  set +a
fi

# Start the application
node index.js
`;

fs.writeFileSync(path.join(distDir, 'run.sh'), runScript);
execSync(`chmod +x ${path.join(distDir, 'run.sh')}`);
console.log('Created executable run script.');

// Create Readme for deployment
const readmeContent = `
# Keep Going Care Deployment

This is a production-ready deployment build of the Keep Going Care application.

## Running Locally

1. Configure your environment variables in \`.env.local\`:
   - Add your database connection string as \`DATABASE_URL\`
   - Add your API keys for OpenAI, Anthropic, and other services

2. Start the application:
   \`\`\`
   ./run.sh
   \`\`\`

## Deploying to AWS

### Option 1: AWS Elastic Beanstalk

1. Install the AWS EB CLI
2. Initialize an EB application:
   \`\`\`
   eb init ${config.aws.elasticBeanstalk.applicationName} --region ${config.aws.region}
   \`\`\`
3. Create an environment:
   \`\`\`
   eb create ${config.aws.elasticBeanstalk.environmentName}
   \`\`\`
4. Set environment variables in the AWS console or using:
   \`\`\`
   eb setenv DATABASE_URL=your_db_url OPENAI_API_KEY=your_key ...
   \`\`\`
5. Deploy the application:
   \`\`\`
   eb deploy
   \`\`\`

### Option 2: AWS EC2

1. Launch an EC2 instance (recommended: ${config.aws.ec2.instanceType})
2. Set up PostgreSQL database
3. Configure security groups to allow inbound traffic on port ${config.app.port}
4. Upload this deployment package to your EC2 instance
5. Configure environment variables in \`.env.production\`
6. Run the application using the provided run script:
   \`\`\`
   ./run.sh
   \`\`\`

## Important Notes

- Ensure your database is properly configured and accessible
- Set proper security permissions for API keys and database credentials
- For production deployments, consider setting up SSL/TLS
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('Created deployment README.');

// Create an AWS Elastic Beanstalk configuration
const ebConfig = `
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeVersion: 20.11.0
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: ${config.app.port}
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: dist/client
`;

fs.writeFileSync(path.join(distDir, '.ebextensions/nodejs.config'), ebConfig);
console.log('Created AWS Elastic Beanstalk configuration.');

console.log(`
=== Deployment build completed ===

The application is ready for deployment to AWS or for local execution.
The build can be found in the '${config.build.outputDir}' directory.

For local execution:
1. Navigate to the ${config.build.outputDir} directory
2. Configure your environment variables in .env.local
3. Run the application using ./run.sh

For AWS deployment:
1. Configure your AWS credentials
2. Follow the instructions in the README.md file

Thank you for using Keep Going Care!
`);