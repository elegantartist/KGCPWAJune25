#!/bin/bash

echo "Creating KGC Healthcare AWS Deployment Package..."

# Create deployment directory
mkdir -p kgc-deployment

# Copy essential files
cp package.json kgc-deployment/
cp package-lock.json kgc-deployment/
cp -r server kgc-deployment/
cp -r client kgc-deployment/
cp -r shared kgc-deployment/
cp -r public kgc-deployment/
cp -r scripts kgc-deployment/
cp drizzle.config.ts kgc-deployment/
cp tsconfig.json kgc-deployment/
cp vite.config.ts kgc-deployment/
cp tailwind.config.ts kgc-deployment/
cp postcss.config.js kgc-deployment/
cp theme.json kgc-deployment/
cp .env.example kgc-deployment/
cp README.md kgc-deployment/
cp Dockerfile kgc-deployment/
cp AWS-*.md kgc-deployment/

# Create the deployment package
tar -czf keep-going-care-aws-deployment.tar.gz -C kgc-deployment .

# Clean up temp directory
rm -rf kgc-deployment

echo "✅ Deployment package created: keep-going-care-aws-deployment.tar.gz"
ls -lah keep-going-care-aws-deployment.tar.gz