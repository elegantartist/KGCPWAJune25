# How to Find AWS App Runner

## Method 1: Search in AWS Console
1. In the AWS Console top search bar, type: **"App Runner"**
2. It should appear under "Services"
3. Click on it

## Method 2: Direct URL
Go directly to: `https://console.aws.amazon.com/apprunner/home`

## Method 3: Services Menu
1. Click **"Services"** in the top menu
2. Under **"Compute"** section, look for **"App Runner"**
3. It's usually listed with EC2, Lambda, etc.

## Method 4: Region Check
App Runner is available in these regions:
- **US East (N. Virginia)** - us-east-1
- **US East (Ohio)** - us-east-2  
- **US West (Oregon)** - us-west-2
- **Europe (Ireland)** - eu-west-1
- **Asia Pacific (Tokyo)** - ap-northeast-1
- **Asia Pacific (Sydney)** - ap-southeast-2

Make sure you're in one of these regions (check top-right corner of AWS Console).

## If You Still Can't Find It
Some AWS accounts have limited service access. Try:
1. **Check your region** (switch to us-east-1)
2. **Contact AWS Support** to enable App Runner
3. **Use Elastic Beanstalk** as backup (works identically)

## Once You Find App Runner
1. Click **"Create service"**
2. Choose **"Source code repository"** 
3. Connect to GitHub: `elegantartist/KGCPWAJune25`
4. Use the `apprunner.yaml` configuration I created
5. **CRITICAL**: Set the IAM service role for secrets access

Let me know when you find it!