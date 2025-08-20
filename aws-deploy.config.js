/**
 * AWS Deployment Configuration
 * 
 * This file contains configuration for deploying to AWS
 * It can be used with AWS Elastic Beanstalk or EC2 instances
 */
module.exports = {
  // Application settings
  app: {
    name: 'keep-going-care',
    port: process.env.PORT || 5000,
  },
  
  // AWS specific settings
  aws: {
    // AWS region to deploy to
    region: process.env.AWS_REGION || 'us-east-1',
    
    // For Elastic Beanstalk
    elasticBeanstalk: {
      environmentName: process.env.EB_ENV_NAME || 'keep-going-care-production',
      applicationName: process.env.EB_APP_NAME || 'keep-going-care',
    },
    
    // For EC2 setup
    ec2: {
      instanceType: 't3.small', // Recommended instance type for this application
    }
  },
  
  // Build settings
  build: {
    outputDir: 'dist',
    clientDir: 'client',
    serverEntry: 'server/index.ts',
  }
};