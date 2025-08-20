# AWS Setup Guide

## Overview

This section provides detailed instructions for setting up the AWS environment to host the backend services and database for the KGC application. The AWS infrastructure will be configured to meet security, compliance, and performance requirements while maintaining a cost-effective approach.

## Contents

1. [Account and IAM Setup](./01-account-iam-setup.md)
2. [Networking and VPC Configuration](./02-networking-vpc.md)
3. [RDS PostgreSQL Setup](./03-rds-postgresql.md)
4. [Cognito User Pool Configuration](./04-cognito-setup.md)
5. [Lambda and API Gateway Setup](./05-lambda-api-gateway.md)
6. [S3 and CloudFront Configuration](./06-s3-cloudfront.md)
7. [CloudWatch Monitoring Setup](./07-cloudwatch-setup.md)

## AWS Region Selection

All resources will be provisioned in the **Sydney (ap-southeast-2)** region to comply with data sovereignty requirements and minimize latency for Australian users.

## Security-First Approach

Throughout this setup, we follow AWS security best practices:

1. **Least Privilege Access**: IAM roles and policies will grant only the minimum permissions needed
2. **Network Isolation**: VPC with private subnets for database and application tiers
3. **Encryption**: Data encrypted at rest and in transit
4. **Multi-Factor Authentication**: Required for all IAM users
5. **Logging and Monitoring**: Comprehensive audit trails and alerts

## Cost Optimization

To control costs while meeting the requirements:

1. **On-Demand Pricing**: Initial deployment will use on-demand pricing for flexibility
2. **Right-Sizing**: Services sized appropriately for the initial user base (10 doctors, 50 patients, 2 admins)
3. **Auto-Scaling**: Services configured to scale based on demand
4. **Cost Monitoring**: CloudWatch alarms for unexpected spending
5. **Cost Attribution**: Tagging strategy for tracking resource costs by feature/function

## Prerequisites

Before beginning the AWS setup, ensure you have:

1. Access to your AWS account with administrative privileges
2. Multi-factor authentication (MFA) enabled for your AWS root account and IAM users
3. A confirmed budget for AWS services
4. The AWS Command Line Interface (CLI) installed (optional but recommended)

## Implementation Timeline

The AWS setup process should take approximately 8-10 hours of work, spread across several days to allow for testing and validation at each step.

## Next Steps

Begin with [Account and IAM Setup](./01-account-iam-setup.md) to establish the foundation for your secure AWS environment.