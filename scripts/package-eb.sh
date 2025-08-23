#!/bin/bash
set -e

echo "📦 Building Elastic Beanstalk deployment package..."

# Clean old dist + build fresh
rm -rf dist
npm run build

# Create a temporary deploy folder
rm -rf eb-deploy
mkdir eb-deploy

# Copy server entry + built files
cp -r dist eb-deploy/dist
cp package.json Procfile eb-deploy/

# Copy EB configs
mkdir -p eb-deploy/.ebextensions
cp -r .ebextensions/* eb-deploy/.ebextensions/

# Zip it up
cd eb-deploy
zip -r ../deployment.zip .
cd ..

# Cleanup
rm -rf eb-deploy

echo "✅ Created deployment.zip — ready for AWS Elastic Beanstalk!"
