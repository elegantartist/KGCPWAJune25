#!/bin/bash
# Create clean AWS deployment package for KGC Healthcare Application

echo "🚀 Creating clean AWS deployment package..."

# Remove any existing deployment files
rm -f keep-going-care-aws-deployment.tar.gz
rm -rf aws-clean-deployment

# Create clean deployment directory
mkdir -p aws-clean-deployment

# Copy essential application files
echo "📁 Copying application files..."
cp -r client/ aws-clean-deployment/
cp -r server/ aws-clean-deployment/
cp -r shared/ aws-clean-deployment/
cp -r public/ aws-clean-deployment/

# Copy configuration files
echo "⚙️ Copying configuration files..."
cp package.json aws-clean-deployment/
cp package-lock.json aws-clean-deployment/
cp vite.config.ts aws-clean-deployment/
cp tailwind.config.ts aws-clean-deployment/
cp postcss.config.js aws-clean-deployment/
cp tsconfig.json aws-clean-deployment/
cp drizzle.config.ts aws-clean-deployment/
cp .env.example aws-clean-deployment/

# Copy AWS-specific files if they exist
if [ -d ".platform" ]; then
    cp -r .platform/ aws-clean-deployment/
fi

if [ -f "Procfile" ]; then
    cp Procfile aws-clean-deployment/
fi

# Create Procfile if it doesn't exist
if [ ! -f "aws-clean-deployment/Procfile" ]; then
    echo "web: npm start" > aws-clean-deployment/Procfile
fi

# Create proper ZIP file (not tar.gz for AWS)
echo "📦 Creating ZIP deployment package..."
cd aws-clean-deployment
zip -r ../keep-going-care-aws-deployment.zip . -x "*.git*" "node_modules/*" "dist/*" ".replit*" "*.log"
cd ..

# Cleanup
rm -rf aws-clean-deployment

echo "✅ Clean AWS deployment package created: keep-going-care-aws-deployment.zip"
echo "📦 Size: $(du -h keep-going-care-aws-deployment.zip | cut -f1)"
echo "🎯 Ready for AWS Elastic Beanstalk deployment"