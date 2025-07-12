#!/bin/bash

# KGC PWA - AWS Deployment Script
# This script helps deploy your KGC application to AWS Amplify

set -e

echo "🚀 KGC PWA - AWS Deployment Script"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   brew install awscli"
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "📦 Installing AWS Amplify CLI..."
    npm install -g @aws-amplify/cli
fi

# Build the application
echo "🔨 Building application..."
cd client && npm install && npm run build
cd ../server && npm install

# Initialize Amplify (if not already done)
if [ ! -d "amplify" ]; then
    echo "🎯 Initializing AWS Amplify..."
    amplify init --yes
fi

# Create amplify.yml if it doesn't exist
if [ ! -f "amplify.yml" ]; then
    echo "📝 Creating amplify.yml build configuration..."
    cat > amplify.yml << EOF
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - cd client && npm install
        build:
          commands:
            - cd client && npm run build
      artifacts:
        baseDirectory: client/dist
        files:
          - '**/*'
      cache:
        paths:
          - client/node_modules/**/*
    backend:
      phases:
        preBuild:
          commands:
            - cd server && npm install
        build:
          commands:
            - echo "Server build complete"
      artifacts:
        baseDirectory: server
        files:
          - '**/*'
      cache:
        paths:
          - server/node_modules/**/*
EOF
fi

# Add hosting if not already added
echo "🌐 Setting up hosting..."
amplify add hosting || echo "Hosting already configured"

# Set environment variables
echo "🔧 Setting up environment variables..."
echo "Please ensure you have set the following environment variables in AWS Amplify Console:"
echo "- DATABASE_URL"
echo "- REDIS_URL"
echo "- JWT_SECRET"
echo "- SENDGRID_API_KEY"
echo "- TWILIO_ACCOUNT_SID"
echo "- TWILIO_AUTH_TOKEN"
echo "- OPENAI_API_KEY"
echo "- ANTHROPIC_API_KEY"

# Deploy
echo "🚀 Deploying to AWS Amplify..."
amplify publish

echo ""
echo "✅ Deployment complete!"
echo "📱 Your KGC PWA is now live on AWS Amplify"
echo "🔗 Check the Amplify Console for your app URL"
echo ""
echo "Next steps:"
echo "1. Set up your custom domain in Amplify Console"
echo "2. Configure environment variables"
echo "3. Set up RDS PostgreSQL database"
echo "4. Configure ElastiCache Redis"
echo "5. Test all functionality"
echo ""
echo "📚 See AWS_DEPLOYMENT_PLAN.md for detailed instructions"