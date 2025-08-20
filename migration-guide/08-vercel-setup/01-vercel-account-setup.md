# Vercel Account Setup

This document provides step-by-step instructions for setting up a Vercel account and preparing it for deployment of the KGC application.

## Prerequisites

Before setting up your Vercel account, ensure you have:

- Access to an email address for account registration
- Access to the Git repository containing the KGC frontend code
- GitHub, GitLab, or Bitbucket account where the code is hosted

## Step 1: Create a Vercel Account

1. **Navigate to Vercel**
   - Open your web browser and go to [https://vercel.com/signup](https://vercel.com/signup)
   
   ![Vercel Signup Page](../images/vercel-signup.png)

2. **Choose Authentication Method**
   - Select your preferred authentication provider:
     - GitHub (recommended if your code is on GitHub)
     - GitLab
     - Bitbucket
     - Email
   - Follow the prompts to authenticate with your chosen provider
   
   ![Vercel Authentication Options](../images/vercel-auth-options.png)

3. **Complete Account Setup**
   - If this is your first time using Vercel, you'll be prompted to:
     - Verify your email address (if using email authentication)
     - Set a password (if using email authentication)
     - Enter your name and other profile details
   - Follow the prompts to complete these steps
   
   ![Vercel Account Setup](../images/vercel-account-setup.png)

## Step 2: Create a Team (Optional but Recommended)

For organizational accounts or projects with multiple contributors, creating a team is recommended:

1. **Access Team Creation**
   - From the Vercel dashboard, click on your profile icon in the top-right corner
   - Select "Create Team"
   
   ![Create Vercel Team](../images/vercel-create-team.png)

2. **Configure Team**
   - Enter a team name (e.g., "Keep Going Care")
   - Choose a URL slug (e.g., "keepgoingcare")
   - Select the appropriate team type (Hobby, Pro, or Enterprise)
   - Click "Create Team"
   
   ![Vercel Team Configuration](../images/vercel-team-config.png)

3. **Invite Team Members**
   - From the team dashboard, click "Members" in the left sidebar
   - Click "Invite Members"
   - Enter email addresses of team members
   - Assign appropriate roles:
     - Owner: Full administrative access
     - Member: Can deploy and manage projects
     - Developer: Limited to development activities
   - Click "Send Invitations"
   
   ![Vercel Team Invitations](../images/vercel-team-invites.png)

## Step 3: Connect to Git Repository

1. **Import Project**
   - From the dashboard, click "Import Project"
   - Select "Import Git Repository"
   
   ![Vercel Import Project](../images/vercel-import-project.png)

2. **Select Git Provider**
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Authenticate if prompted
   
   ![Vercel Git Provider](../images/vercel-git-provider.png)

3. **Select Repository**
   - Search for the KGC repository
   - Click on the repository name to select it
   
   ![Vercel Repository Selection](../images/vercel-repo-selection.png)

4. **Configure Repository Access**
   - If this is your first time connecting to this provider, you may need to:
     - Install the Vercel integration/app for your organization
     - Configure repository access permissions
   - Follow the prompts to complete these steps
   
   ![Vercel GitHub Integration](../images/vercel-github-integration.png)

## Step 4: Configure Vercel CLI (Optional)

For local development and testing, installing the Vercel CLI is recommended:

1. **Install Vercel CLI**
   - Open a terminal window
   - Run the following command:
     ```bash
     npm install -g vercel
     ```

2. **Login to Vercel from CLI**
   - Run the following command:
     ```bash
     vercel login
     ```
   - Follow the prompts to authenticate

3. **Link Project to Local Directory**
   - Navigate to your project directory
   - Run the following command:
     ```bash
     vercel link
     ```
   - Follow the prompts to link to your Vercel project

## Step 5: Set Up Billing Information (For Paid Plans)

If you're using a paid plan (Pro or Enterprise), set up your billing information:

1. **Access Billing Settings**
   - From the dashboard, click on your team name (if applicable)
   - Click "Settings" in the left sidebar
   - Select "Billing"
   
   ![Vercel Billing Settings](../images/vercel-billing-settings.png)

2. **Add Payment Method**
   - Click "Add Payment Method"
   - Enter your credit card information
   - Click "Save"

3. **Configure Billing Email**
   - Ensure the billing email is correct
   - Add additional billing email recipients if needed

## Step 6: Configure Authentication

Set up authentication for your Vercel account to enhance security:

1. **Enable Two-Factor Authentication**
   - From your profile settings, click "Security"
   - Click "Enable" next to Two-Factor Authentication
   - Follow the prompts to set up 2FA using:
     - Authenticator App (recommended)
     - SMS
   - Save your recovery codes in a secure location
   
   ![Vercel 2FA Setup](../images/vercel-2fa-setup.png)

2. **Configure SSH Keys (Optional)**
   - From your profile settings, click "SSH Keys"
   - Click "Add SSH Key"
   - Enter a name for the key
   - Paste your public SSH key
   - Click "Add SSH Key"

## Vercel Account Security Best Practices

1. **Use Strong Passwords**
   - Create a unique, strong password for your Vercel account
   - Consider using a password manager

2. **Enable Two-Factor Authentication**
   - Always enable 2FA for additional security
   - Use an authenticator app rather than SMS when possible

3. **Limit Repository Access**
   - Only grant Vercel access to repositories it needs to deploy
   - Regularly review and revoke unnecessary access

4. **Monitor Team Permissions**
   - Regularly audit team members and their permission levels
   - Remove access for team members who no longer need it

5. **Set Up Billing Alerts**
   - Configure usage alerts to prevent unexpected charges
   - Monitor your usage regularly

## Troubleshooting Common Issues

1. **Repository Access Problems**
   - Issue: Cannot access repository from Vercel
   - Solution: Check organization permissions and ensure the Vercel app has access to the repository

2. **Authentication Failures**
   - Issue: Unable to log in to Vercel
   - Solution: Reset password or recover account using recovery codes

3. **Team Permission Issues**
   - Issue: Team members cannot access projects
   - Solution: Check role assignments and ensure proper permissions are granted

## Next Steps

After setting up your Vercel account, proceed to [Project Configuration](./02-project-configuration.md) to configure your project for deployment.