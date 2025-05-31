# AWS Account and IAM Setup

This document provides step-by-step instructions for setting up your AWS account and configuring Identity and Access Management (IAM) for the KGC application.

## AWS Account Security Configuration

### Step 1: Secure the Root Account

1. **Enable MFA for Root User**
   - Sign in to the AWS Management Console with root account
   - Navigate to IAM Dashboard
   - Click on "Add MFA" for the root user
   - Follow the prompts to set up a virtual MFA device (using an authenticator app)
   
   ![Enable MFA for Root User](../images/root-mfa-setup.png)

2. **Create Alternate Contact Information**
   - Go to Account Settings
   - Add billing, operations, and security contact information
   - This ensures critical notifications reach the right people

3. **Set Strong Password Policy**
   - In IAM Dashboard, select "Account settings"
   - Configure password policy with:
     - Minimum length: 14 characters
     - Require at least one uppercase letter
     - Require at least one lowercase letter
     - Require at least one number
     - Require at least one non-alphanumeric character
     - Password expiration: 90 days
     - Prevent password reuse: 24 passwords

### Step 2: Create IAM Administrator User

1. **Create Admin Group**
   - In IAM Dashboard, navigate to "User groups"
   - Click "Create group"
   - Name the group "KGCAdministrators"
   - Attach the "AdministratorAccess" policy
   
   ![Create Admin Group](../images/admin-group-creation.png)

2. **Create Admin User**
   - Navigate to "Users" and click "Add users"
   - Username: "kgc-administrator"
   - Select "Provide user access to the AWS Management Console"
   - Set a strong, temporary password
   - Add user to the "KGCAdministrators" group
   - Click "Create user"

3. **Enable MFA for Admin User**
   - Select the new user
   - Navigate to the "Security credentials" tab
   - Under "Multi-factor authentication (MFA)", click "Assign MFA device"
   - Follow the prompts to complete MFA setup

4. **Generate Access Keys (Optional)**
   - Only if needed for CLI/API access
   - Under Security credentials, click "Create access key"
   - Select "Command Line Interface (CLI)"
   - Acknowledge the security recommendations
   - Download and securely store the access key information

### Step 3: Create Service-Specific IAM Roles

#### 1. Create EC2 Role for Application Server

```bash
# Using AWS CLI
aws iam create-role --role-name KGCAppServerRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Attach policies
aws iam attach-role-policy --role-name KGCAppServerRole --policy-arn arn:aws:iam::aws:policy/AmazonRDSDataFullAccess
aws iam attach-role-policy --role-name KGCAppServerRole --policy-arn arn:aws:iam::aws:policy/AmazonCognitoPowerUser
aws iam attach-role-policy --role-name KGCAppServerRole --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
aws iam attach-role-policy --role-name KGCAppServerRole --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
```

#### 2. Create Lambda Function Role

```bash
# Using AWS CLI
aws iam create-role --role-name KGCLambdaRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Attach policies
aws iam attach-role-policy --role-name KGCLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name KGCLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonRDSDataFullAccess
aws iam attach-role-policy --role-name KGCLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonCognitoPowerUser
```

#### 3. Create CloudWatch Events Role

```bash
# Using AWS CLI
aws iam create-role --role-name KGCCloudWatchRole --assume-role-policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Attach policies
aws iam attach-role-policy --role-name KGCCloudWatchRole --policy-arn arn:aws:iam::aws:policy/CloudWatchEventsFullAccess
aws iam attach-role-policy --role-name KGCCloudWatchRole --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess
```

### Step 4: Create IAM Policies for Specific Services

#### 1. KGC Application Data Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:Connect",
        "rds-data:ExecuteStatement",
        "rds-data:BatchExecuteStatement"
      ],
      "Resource": [
        "arn:aws:rds:ap-southeast-2:*:db:kgc-*",
        "arn:aws:rds:ap-southeast-2:*:cluster:kgc-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::kgc-patient-data/*",
        "arn:aws:s3:::kgc-patient-data"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:ListUsers"
      ],
      "Resource": "arn:aws:cognito-idp:ap-southeast-2:*:userpool/*"
    }
  ]
}
```

Save this policy with the name "KGCApplicationDataAccess" and attach it to the KGCAppServerRole and KGCLambdaRole.

### Step 5: Configure IAM Users for Development

1. **Create Developer Group**
   - In IAM Dashboard, navigate to "User groups"
   - Click "Create group"
   - Name the group "KGCDevelopers"
   - Attach the following policies:
     - AmazonEC2ReadOnlyAccess
     - AmazonRDSReadOnlyAccess
     - AmazonS3ReadOnlyAccess
     - CloudWatchReadOnlyAccess
     - AWSLambdaReadOnlyAccess
     - AmazonCognitoReadOnly

2. **Create Developer Users**
   - Navigate to "Users" and click "Add users"
   - Create users for each developer
   - Add to the "KGCDevelopers" group
   - Enable Console access
   - Require MFA setup at first login

3. **Create Custom Developer Policy**
   - Create policy "KGCDeveloperAccess" with permissions for development resources
   - Attach to the developer group

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetDashboard",
        "cloudwatch:ListDashboards",
        "cloudwatch:GetMetricData",
        "logs:StartQuery",
        "logs:GetQueryResults",
        "logs:GetLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 6: Set Up AWS Organizations (Optional for Multiple Environments)

If you're planning to have separate development, testing, and production environments:

1. **Enable AWS Organizations**
   - Navigate to AWS Organizations
   - Click "Create organization"
   - Follow the setup wizard

2. **Create Organizational Units**
   - Create OUs for:
     - KGC-Development
     - KGC-Testing
     - KGC-Production

3. **Create Accounts for Each Environment**
   - Create separate AWS accounts for each environment
   - Move accounts to appropriate OUs

4. **Set Up Service Control Policies**
   - Create SCPs to enforce security policies across all accounts

## Next Steps

After completing the IAM setup, proceed to [Networking and VPC Configuration](./02-networking-vpc.md) to set up your secure network environment.