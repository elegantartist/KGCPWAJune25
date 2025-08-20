#!/bin/bash
# AWS CLI Deployment Script for KGC Healthcare Application
# Alternative to console deployment when tag validation fails

echo "🚀 Deploying KGC Healthcare Application to AWS Elastic Beanstalk..."

# Create application
aws elasticbeanstalk create-application \
    --application-name "KGC-Healthcare-App" \
    --description "Keep Going Care Healthcare Platform for 120 users"

# Create application version
aws elasticbeanstalk create-application-version \
    --application-name "KGC-Healthcare-App" \
    --version-label "v1.0-production" \
    --source-bundle S3Bucket="your-deployment-bucket",S3Key="keep-going-care-aws-deployment.tar.gz" \
    --description "Production deployment with enhanced security"

# Create environment
aws elasticbeanstalk create-environment \
    --application-name "KGC-Healthcare-App" \
    --environment-name "KGC-Production" \
    --solution-stack-name "64bit Amazon Linux 2023 v6.1.6 running Node.js 22" \
    --version-label "v1.0-production" \
    --tier Name="WebServer",Type="Standard",Version="1.0" \
    --option-settings \
        Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=t3.micro \
        Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=SingleInstance

echo "✅ Deployment initiated. Check AWS console for progress."