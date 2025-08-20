#!/bin/bash
# AWS Elastic Beanstalk pre-build hook
# Ensures application is built before deployment

echo "🔧 Building KGC Healthcare Application..."

# Install dependencies
npm ci --only=production

# Build the application
npm run build

echo "✅ Build completed successfully"