# Cognito User Pool Configuration

This guide provides detailed instructions for setting up AWS Cognito User Pools to secure the KGC application with robust authentication and authorization.

## Step 1: Create a User Pool

### Console Instructions

1. **Navigate to Cognito in AWS Console**
   - Sign in to the AWS Management Console
   - Search for "Cognito" and select the service

2. **Create User Pool**
   - Click "Create user pool"
   - Select "Cognito user pool" as the sign-in option
   - For provider types, keep "Cognito user pool" (default)
   - Click "Next"
   
   ![Create User Pool](../images/cognito-create-pool.png)

3. **Configure Security Requirements**
   - For password policy, select "Cognito defaults" (meets regulatory requirements)
   - Enable Multi-Factor Authentication (MFA):
     - Select "Required for all users" for doctor and admin pools
     - Select "Optional MFA" for patient pools (enforce via application for better UX)
   - For MFA methods, select "SMS message, Email message, and Authenticator apps"
   - Click "Next"

4. **Configure Sign-up Experience**
   - For self-registration, select "Enable self-registration" for patient pools only (disable for admin/doctor pools)
   - For required attributes, select:
     - Email (for all pools)
     - Name (for all pools)
     - Phone number (for doctor/admin pools only)
   - Add custom attributes:
     - "uin" (string, required, mutable) - For KGC's Unique Identity Number
     - "roleName" (string, required, mutable) - For role-based access control
   - Click "Next"

5. **Configure Message Delivery**
   - For email provider, select "Send email with Cognito" for development/testing
     - Plan to switch to Amazon SES for production use
   - For SMS, select "Create a new IAM role" and accept the default name
   - Click "Next"

6. **Integrate Your App**
   - User pool name: Enter "KGC-User-Pool"
   - For Hosted authentication pages, select "Use the Cognito Hosted UI"
   - For domain, select "Use a Cognito domain" and enter a unique prefix like "kgc-auth"
   - For initial app client:
     - App client name: "KGC-Web-Client"
     - App type: "Public client"
     - Authentication flows: Keep defaults
     - Advanced settings: 
       - Enable OAuth grants: Authorization code grant, Implicit grant
       - Allowed callback URLs: `https://www.keepgoingcare.com/auth/callback, http://localhost:3000/auth/callback`
       - Allowed sign-out URLs: `https://www.keepgoingcare.com, http://localhost:3000`
       - OAuth scopes: Select email, openid, profile
   - Click "Next"

7. **Review and Create**
   - Review your selections
   - Click "Create user pool"

### CLI Commands

```bash
# Create the user pool
aws cognito-idp create-user-pool \
  --pool-name KGC-User-Pool \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true}}' \
  --mfa-configuration OPTIONAL \
  --auto-verified-attributes email \
  --schema '[{"Name":"email","Required":true},{"Name":"name","Required":true},{"Name":"phone_number","Required":false},{"Name":"uin","AttributeDataType":"String","DeveloperOnlyAttribute":false,"Mutable":true,"Required":false},{"Name":"roleName","AttributeDataType":"String","DeveloperOnlyAttribute":false,"Mutable":true,"Required":false}]' \
  --region ap-southeast-2

# Create app client
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-name KGC-Web-Client \
  --no-generate-secret \
  --refresh-token-validity 30 \
  --access-token-validity 1 \
  --id-token-validity 1 \
  --token-validity-units '{"AccessToken":"hours","IdToken":"hours","RefreshToken":"days"}' \
  --callback-urls '["https://www.keepgoingcare.com/auth/callback","http://localhost:3000/auth/callback"]' \
  --logout-urls '["https://www.keepgoingcare.com","http://localhost:3000"]' \
  --allowed-o-auth-flows authorization_code implicit \
  --allowed-o-auth-scopes openid email profile \
  --region ap-southeast-2

# Create domain
aws cognito-idp create-user-pool-domain \
  --domain kgc-auth \
  --user-pool-id YOUR_USER_POOL_ID \
  --region ap-southeast-2
```

## Step 2: Set Up User Groups

### Console Instructions

1. **Navigate to User Pool**
   - Select your newly created user pool

2. **Create User Groups**
   - In the left navigation, select "Groups"
   - Click "Create group"
   - Create three groups:
     - Group name: "Admins" (Description: "Administrative users with full access")
     - Group name: "Doctors" (Description: "Healthcare providers with patient management access")
     - Group name: "Patients" (Description: "End users with limited access to personal data")
   - Click "Create group" for each

   ![Create User Groups](../images/cognito-create-groups.png)

### CLI Commands

```bash
# Create Admin group
aws cognito-idp create-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --group-name Admins \
  --description "Administrative users with full access" \
  --precedence 1 \
  --region ap-southeast-2

# Create Doctor group
aws cognito-idp create-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --group-name Doctors \
  --description "Healthcare providers with patient management access" \
  --precedence 2 \
  --region ap-southeast-2

# Create Patient group
aws cognito-idp create-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --group-name Patients \
  --description "End users with limited access to personal data" \
  --precedence 3 \
  --region ap-southeast-2
```

## Step 3: Create Initial Admin User

### Console Instructions

1. **Navigate to User Pool**
   - Select your user pool
   - In the left navigation, select "Users"
   - Click "Create user"

2. **Create Admin User**
   - For user creation method, select "Create user"
   - Enter admin email address
   - Enter admin name
   - Select "Generate a password"
   - For optional attributes:
     - Phone number: Enter admin phone number
     - Custom:uin: Enter the admin UIN
     - Custom:roleName: Enter "admin"
   - Click "Create user"

3. **Add Admin to Admins Group**
   - Select the newly created user
   - Select the "Groups" tab
   - Click "Add user to group"
   - Select "Admins" group
   - Click "Add"

### CLI Commands

```bash
# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@keepgoingcare.com \
  --user-attributes Name=name,Value="KGC Administrator" Name=email,Value=admin@keepgoingcare.com Name=phone_number,Value="+61412345678" Name=custom:uin,Value="AD00001" Name=custom:roleName,Value="admin" \
  --temporary-password "TemporaryPass123!" \
  --region ap-southeast-2

# Add admin to Admins group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@keepgoingcare.com \
  --group-name Admins \
  --region ap-southeast-2
```

## Step 4: Configure App Client Settings

### Console Instructions

1. **Navigate to User Pool**
   - Select your user pool
   - In the left navigation, select "App integration"
   - Scroll to "App clients and analytics" and select your app client

2. **Configure App Client Settings**
   - Under "Hosted UI", click "Edit"
   - Customize the UI with KGC branding:
     - Upload KGC logo
     - Set CSS variables to match KGC blue (#2E8BC0)
   - Under "Identity providers", ensure "Cognito user pool" is selected
   - Click "Save changes"

## Step 5: Set Up User Migration Lambda

To migrate existing users to Cognito, create a User Migration Lambda function:

### Create the Lambda Function

```javascript
// User migration Lambda function
exports.handler = async (event, context) => {
  // Log the event for debugging
  console.log('User migration event:', JSON.stringify(event));
  
  // Get the username (email) and password from the event
  const { userName, password } = event.request;
  
  try {
    // Call your existing authentication API to validate credentials
    const response = await fetch('https://www.keepgoingcare.com/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userName,
        password: password,
      }),
    });
    
    if (!response.ok) {
      // If credentials are invalid, return failure
      console.log('Invalid credentials for:', userName);
      event.response.userAttributes = null;
      event.response.finalUserStatus = 'CONFIRMED';
      event.response.messageAction = 'SUPPRESS';
      return event;
    }
    
    // If credentials are valid, get user details
    const user = await response.json();
    
    // Map user attributes to Cognito format
    event.response.userAttributes = {
      email: user.email,
      email_verified: 'true',
      name: user.name,
      phone_number: user.phoneNumber,
      'custom:uin': user.uin,
      'custom:roleName': user.roleName.toLowerCase(),
    };
    
    // Set user as confirmed
    event.response.finalUserStatus = 'CONFIRMED';
    event.response.messageAction = 'SUPPRESS';
    
    console.log('User migration successful for:', userName);
    return event;
  } catch (error) {
    // Log the error
    console.error('User migration error:', error);
    
    // Return failure
    event.response.userAttributes = null;
    event.response.finalUserStatus = 'CONFIRMED';
    event.response.messageAction = 'SUPPRESS';
    return event;
  }
};
```

### Configure Lambda Function

1. Create the Lambda function in the AWS console
2. Assign appropriate IAM permissions for calling your backend API
3. Configure the Cognito User Pool to use this Lambda for user migration

## Step 6: Enable Lambda Triggers for User Operations

Configure Lambda triggers for additional customization:

1. **Pre Sign-up Trigger** - For validating user data and enforcement of MFA
2. **Post Confirmation Trigger** - For adding users to appropriate groups based on roleName
3. **Custom Message Trigger** - For branded email templates

## Step 7: Test Cognito Configuration

1. **Test User Authentication**
   - Navigate to the Cognito hosted UI: `https://kgc-auth.auth.ap-southeast-2.amazoncognito.com/login?client_id=YOUR_CLIENT_ID&response_type=code&scope=email+openid+profile&redirect_uri=https://www.keepgoingcare.com/auth/callback`
   - Try logging in with test credentials
   - Verify redirect to your application

2. **Test User Migration**
   - Attempt to sign in with credentials from your existing system
   - Verify that user attributes are correctly migrated

3. **Test User Authorization**
   - Verify that authenticated users are placed in the correct groups
   - Test access to protected resources based on group membership

## Step 8: Configure Federation (Optional)

For enterprise customers or healthcare provider organizations, configure identity federation:

1. **Add SAML Identity Provider**
   - In the User Pool, navigate to "Sign-in experience"
   - Under "Identity providers", click "Add identity provider"
   - Select "SAML"
   - Configure with your organization's identity provider metadata

2. **Update App Client Settings**
   - Add the SAML provider to your app client
   - Configure attribute mapping

## Security Considerations

1. **MFA Enforcement**
   - Require MFA for all admin and doctor accounts
   - Encourage MFA for patient accounts through the application UX

2. **Password Policies**
   - Enforce strong password requirements
   - Configure account recovery options carefully

3. **Token Handling**
   - Store refresh tokens securely
   - Implement proper token rotation and validation

## Next Steps

After completing the Cognito User Pool setup, proceed to [Lambda and API Gateway Setup](./05-lambda-api-gateway.md) to configure the serverless backend for your application.