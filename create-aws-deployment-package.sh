#!/bin/bash
# Create AWS-optimized deployment package for KGC Healthcare Application

echo "🚀 Creating AWS-optimized deployment package..."

# Remove existing deployment package
rm -f keep-going-care-aws-deployment.tar.gz

# Create AWS deployment structure
mkdir -p aws-deployment

# Copy application files
cp -r client/ aws-deployment/
cp -r server/ aws-deployment/
cp -r shared/ aws-deployment/
cp -r public/ aws-deployment/
cp -r .platform/ aws-deployment/

# Copy configuration files
cp package.json aws-deployment/
cp package-lock.json aws-deployment/
cp Procfile aws-deployment/
cp vite.config.ts aws-deployment/
cp tailwind.config.ts aws-deployment/
cp postcss.config.js aws-deployment/
cp tsconfig.json aws-deployment/
cp drizzle.config.ts aws-deployment/
cp .env.example aws-deployment/

# Copy AWS documentation
cp AWS-*.md aws-deployment/

# Create the deployment package
cd aws-deployment
tar -czf ../keep-going-care-aws-deployment.tar.gz .
cd ..

# Cleanup
rm -rf aws-deployment

echo "✅ AWS deployment package created: keep-going-care-aws-deployment.tar.gz"
echo "📦 Size: $(du -h keep-going-care-aws-deployment.tar.gz | cut -f1)"