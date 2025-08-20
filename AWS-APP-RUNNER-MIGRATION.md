# AWS App Runner Migration Guide
## From Replit to AWS Production Deployment

### Overview
Migrate KGC Healthcare Platform from https://kgcpwa-june-25-admin1023.replit.app to AWS App Runner
- 120 users (20 doctors + 100 patients)
- Node.js 22 on Amazon Linux 2023
- No load balancing required
- HIPAA/TGA SaMD compliant

### Step 1: Create Dockerfile
```dockerfile
FROM node:22-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port and start
EXPOSE 8080
CMD ["npm", "start"]
```

### Step 2: Create apprunner.yaml
```yaml
version: 1.0
runtime: nodejs22
build:
  commands:
    build:
      - npm ci --production
      - npm run build
run:
  runtime-version: 22
  command: npm start
  network:
    port: 8080
  env:
    - name: NODE_ENV
      value: "production"
    - name: PORT
      value: "8080"
```

### Step 3: AWS Resources Setup

#### A. Create RDS PostgreSQL Database
```bash
aws rds create-db-instance \
  --db-instance-identifier kgc-healthcare-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username kgcadmin \
  --master-user-password SecureDBPassword2025! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-healthcare \
  --storage-encrypted \
  --backup-retention-period 7
```

#### B. Store Secrets in AWS Secrets Manager
```json
{
  "DATABASE_URL": "postgresql://kgcadmin:password@kgc-healthcare-db.region.rds.amazonaws.com:5432/kgc",
  "OPENAI_API_KEY": "your-openai-key",
  "ANTHROPIC_API_KEY": "your-anthropic-key", 
  "TWILIO_ACCOUNT_SID": "your-twilio-sid",
  "TWILIO_AUTH_TOKEN": "your-twilio-token",
  "TWILIO_PHONE_NUMBER": "your-twilio-number",
  "SENDGRID_API_KEY": "your-sendgrid-key",
  "TAVILY_API_KEY": "your-tavily-key",
  "SESSION_SECRET": "generated-64-char-secret",
  "ADMIN_PASSWORD_HASH": "$2b$12$rQJ8vQJ5K6Q7yZ8x9W0.XeO9Q8x7Y6Z5K4J3H2G1F0E9D8C7B6A5N"
}
```

### Step 4: Create App Runner Service

#### Using AWS Console:
1. Go to AWS App Runner Console
2. Create Service → Source: Repository 
3. Connect to GitHub repository
4. Configure build settings:
   - Runtime: Node.js 22
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: 8080

#### Environment Variables:
```bash
NODE_ENV=production
PORT=8080
AWS_REGION=us-east-1
SECRETS_ARN=arn:aws:secretsmanager:us-east-1:account:secret:kgc-healthcare
```

### Step 5: Security Configuration

#### IAM Role for App Runner:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:kgc-healthcare*"
    },
    {
      "Effect": "Allow", 
      "Action": [
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 6: Custom Domain Setup
1. Create Route 53 hosted zone for your domain
2. Request ACM certificate for healthcare.yourdomain.com
3. Configure custom domain in App Runner
4. Update DNS records

### Step 7: Monitoring & Compliance
- CloudWatch logs automatically enabled
- AWS WAF for security protection  
- CloudTrail for audit logging
- VPC connector for database security

### Migration Timeline
- **Day 1**: Set up RDS database and secrets
- **Day 2**: Create and test App Runner service
- **Day 3**: Configure custom domain and security
- **Day 4**: Data migration and testing
- **Day 5**: Go live and DNS cutover

### Cost Estimate (120 users)
- App Runner: ~$25-50/month
- RDS t3.micro: ~$15/month  
- Data transfer: ~$5/month
- **Total: ~$45-70/month**

### Advantages over Elastic Beanstalk
✅ No ZIP file management
✅ Direct GitHub deployment
✅ Automatic HTTPS
✅ Simpler configuration
✅ Better scaling for small apps
✅ Lower operational overhead