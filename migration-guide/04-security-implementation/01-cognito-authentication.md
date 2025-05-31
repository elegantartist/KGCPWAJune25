# Cognito Authentication Integration

This document provides step-by-step instructions for integrating AWS Cognito authentication into the KGC application.

## Prerequisites

Before beginning the Cognito integration, ensure that:

1. You have completed the [AWS Cognito Setup](../03-aws-setup/04-cognito-setup.md)
2. You have implemented the [Authentication System Preparation](../02-immediate-fixes/04-authentication-preparation.md)
3. You have the following Cognito configuration values:
   - User Pool ID
   - App Client ID
   - Cognito Domain

## Implementation Steps

### 1. Install Required Packages

Add the AWS Amplify packages to your project:

```bash
npm install aws-amplify @aws-amplify/ui-react
```

### 2. Configure Amplify in Your Application

Create a configuration file for Amplify:

```typescript
// client/src/config/amplify-config.ts
export const amplifyConfig = {
  Auth: {
    region: 'ap-southeast-2',
    userPoolId: 'YOUR_USER_POOL_ID',
    userPoolWebClientId: 'YOUR_APP_CLIENT_ID',
    oauth: {
      domain: 'kgc-auth.auth.ap-southeast-2.amazoncognito.com',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: typeof window !== 'undefined' ? 
        `${window.location.origin}/auth/callback` : 
        'https://www.keepgoingcare.com/auth/callback',
      redirectSignOut: typeof window !== 'undefined' ? 
        window.location.origin : 
        'https://www.keepgoingcare.com',
      responseType: 'code',
    },
  },
};
```

Initialize Amplify in your main application file:

```typescript
// client/src/main.tsx
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './config/amplify-config';

// Initialize Amplify with configuration
Amplify.configure(amplifyConfig);

// Rest of your application initialization code
```

### 3. Implement Cognito Auth Provider

Update the CognitoAuthProvider implementation from the preparation phase:

```typescript
// client/src/services/cognitoAuthProvider.ts
import { IAuthProvider, User, AuthState } from './authService';
import { BehaviorSubject } from 'rxjs';
import { Auth } from 'aws-amplify';

export class CognitoAuthProvider implements IAuthProvider {
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  public authState$ = this.authState.asObservable();

  constructor() {
    // Initialize auth state from Cognito session
    this.initializeFromCognito();
  }

  private async initializeFromCognito() {
    try {
      const session = await Auth.currentSession();
      if (session && session.isValid()) {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        const user = this.mapCognitoUser(cognitoUser);
        
        this.authState.next({
          isAuthenticated: true,
          user,
          loading: false,
          error: null,
        });
      } else {
        this.authState.next({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      // User is not authenticated
      this.authState.next({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
    }
  }

  private mapCognitoUser(cognitoUser: any): User {
    const attributes = cognitoUser.attributes || {};
    
    return {
      id: attributes.sub,
      email: attributes.email,
      name: attributes.name || '',
      roleId: this.getRoleIdFromName(attributes['custom:roleName'] || ''),
      roleName: attributes['custom:roleName'] || '',
      uin: attributes['custom:uin'] || '',
    };
  }

  private getRoleIdFromName(roleName: string): number {
    switch (roleName.toLowerCase()) {
      case 'admin': return 1;
      case 'doctor': return 2;
      case 'patient': return 3;
      default: return 0;
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const cognitoUser = await Auth.signIn(email, password);
      
      // Check if MFA is required
      if (cognitoUser.challengeName === 'SMS_MFA' || 
          cognitoUser.challengeName === 'SOFTWARE_TOKEN_MFA') {
        // Return partial user with indication that MFA is required
        this.authState.next({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'MFA required',
        });
        
        throw new Error('MFA verification required');
      }
      
      // User is authenticated
      const user = this.mapCognitoUser(cognitoUser);
      
      this.authState.next({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });
      
      return user;
    } catch (error) {
      this.authState.next({
        ...this.authState.value,
        error: error.message,
        loading: false,
      });
      
      throw error;
    }
  }

  async completeMfaChallenge(code: string): Promise<User> {
    try {
      const cognitoUser = await Auth.confirmSignIn(
        await Auth.currentAuthenticatedUser(),
        code,
        'SMS_MFA'
      );
      
      const user = this.mapCognitoUser(cognitoUser);
      
      this.authState.next({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });
      
      return user;
    } catch (error) {
      this.authState.next({
        ...this.authState.value,
        error: error.message,
        loading: false,
      });
      
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await Auth.signOut();
      
      this.authState.next({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async register(userData: any): Promise<User> {
    try {
      // Register user with Cognito
      await Auth.signUp({
        username: userData.email,
        password: userData.password,
        attributes: {
          email: userData.email,
          name: userData.name,
          'custom:roleName': userData.roleName || 'patient',
          'custom:uin': userData.uin || '',
        },
      });
      
      // After registration, sign in
      return this.login(userData.email, userData.password);
    } catch (error) {
      this.authState.next({
        ...this.authState.value,
        error: error.message,
        loading: false,
      });
      
      throw error;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const session = await Auth.currentSession();
      if (!session.isValid()) {
        await Auth.currentAuthenticatedUser();
      }
      return true;
    } catch (error) {
      this.authState.next({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
      return false;
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      return this.mapCognitoUser(cognitoUser);
    } catch (error) {
      return null;
    }
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      
      const attributes: any = {};
      
      if (userData.name) attributes.name = userData.name;
      if (userData.email) attributes.email = userData.email;
      
      // Update attributes in Cognito
      await Auth.updateUserAttributes(cognitoUser, attributes);
      
      // Get updated user
      const updatedCognitoUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
      const user = this.mapCognitoUser(updatedCognitoUser);
      
      // Update auth state
      this.authState.next({
        ...this.authState.value,
        user,
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  }
}
```

### 4. Update Auth Service to Use Cognito Provider

Modify the auth service to use the new Cognito provider:

```typescript
// client/src/services/authService.ts

// Import existing code...

// Replace the JwtAuthProvider instance with CognitoAuthProvider
import { CognitoAuthProvider } from './cognitoAuthProvider';

// Update the singleton instance
export const authService = new CognitoAuthProvider();
```

### 5. Create Auth Callback Component

Create a component to handle the OAuth callback:

```typescript
// client/src/components/auth/AuthCallback.tsx
import { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'wouter';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useNavigate();
  const [location] = useLocation();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Parse the URL to get the authorization code
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code found in URL');
        }
        
        // Exchange the code for tokens
        await Auth.handleAuthResponse(location);
        
        // Redirect to the dashboard
        navigate('/');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
      }
    }
    
    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Completing Sign In</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Please wait while we complete the authentication process...</p>
      </div>
    </div>
  );
}
```

### 6. Update the Login Form Component

Update your login form to work with Cognito:

```typescript
// client/src/components/auth/LoginForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [tempCredentials, setTempCredentials] = useState<FormValues | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await login(values.email, values.password);
      // If we reach here, login was successful without MFA
    } catch (err) {
      if (err.message === 'MFA verification required') {
        setShowMfa(true);
        setTempCredentials(values);
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.completeMfaChallenge(mfaCode);
      // MFA successful, redirect happens in useAuth
    } catch (err) {
      setError(err.message || 'MFA verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showMfa) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Verification Required</h2>
        <p className="text-gray-600">
          Please enter the verification code sent to your device.
        </p>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="mfaCode" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="mfaCode"
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Enter verification code"
            />
          </div>
          
          <Button
            type="button"
            className="w-full"
            onClick={handleMfaSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowMfa(false);
              setTempCredentials(null);
            }}
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sign In</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="your.email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

### 7. Update Routing to Include Auth Callback

Update your application routes to handle the Cognito callback:

```typescript
// client/src/App.tsx
import { Route, Switch } from 'wouter';
import AuthCallback from '@/components/auth/AuthCallback';
// Other imports...

function App() {
  return (
    <Switch>
      {/* Existing routes... */}
      <Route path="/auth/callback" component={AuthCallback} />
      {/* Other routes... */}
    </Switch>
  );
}

export default App;
```

### 8. Add Hosted UI Login Option

Add a button to redirect to the Cognito Hosted UI for login:

```typescript
// client/src/components/auth/CognitoLoginButton.tsx
import { Button } from '@/components/ui/button';
import { Auth } from 'aws-amplify';

export default function CognitoLoginButton() {
  const handleHostedUiLogin = async () => {
    try {
      await Auth.federatedSignIn();
    } catch (error) {
      console.error('Failed to redirect to hosted UI:', error);
    }
  };

  return (
    <Button 
      onClick={handleHostedUiLogin}
      variant="outline"
      className="w-full"
    >
      Sign in with Cognito
    </Button>
  );
}
```

### 9. Update Backend for Cognito Token Validation

Add Cognito token validation to your backend:

```typescript
// server/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { db } from './db';
import { users, userRoles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configure JWKS client
const client = jwksClient({
  jwksUri: `https://cognito-idp.ap-southeast-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Authentication middleware for Cognito tokens
export function authenticateCognito(req: Request, res: Response, next: NextFunction) {
  // First check if we have the legacy authentication
  if (req.user) {
    return next();
  }
  
  // Check for token in cookie first (preferred)
  const cookieToken = req.cookies?.auth_token;
  
  // Fall back to Authorization header
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  // Use cookie token if available, otherwise use header token
  const token = cookieToken || headerToken;
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Verify Cognito token
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, async (err, decoded: any) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    try {
      // Check if user exists in our database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, decoded.email));
      
      if (!user) {
        // Create user in our database if they don't exist
        // (This happens when a user is created directly in Cognito)
        const [newUser] = await db
          .insert(users)
          .values({
            email: decoded.email,
            name: decoded['cognito:username'] || decoded.email,
            roleId: getRoleIdFromName(decoded['custom:roleName'] || 'patient'),
            uin: decoded['custom:uin'] || generateUIN(decoded['custom:roleName'] || 'patient'),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        req.user = newUser;
      } else {
        req.user = user;
      }
      
      next();
    } catch (error) {
      console.error('Error during Cognito authentication:', error);
      return res.status(500).json({ message: 'Authentication failed' });
    }
  });
}

// Helper to get role ID from name
function getRoleIdFromName(roleName: string): number {
  switch (roleName.toLowerCase()) {
    case 'admin': return 1;
    case 'doctor': return 2;
    case 'patient': return 3;
    default: return 3; // Default to patient
  }
}

// Helper to generate UIN
function generateUIN(roleName: string): string {
  const prefix = roleName.toLowerCase() === 'doctor' ? 'DR' : 'PT';
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${randomPart}`;
}
```

### 10. Update API Routes to Use Cognito Authentication

Update your API routes to use the new Cognito authentication middleware:

```typescript
// server/routes.ts

// Replace existing authentication middleware with Cognito-aware version
import { authenticateCognito as authenticate } from './auth';

// Update protected routes to use the new middleware
app.get('/api/auth/user', authenticate, getUserHandler);
app.patch('/api/auth/user', authenticate, updateUserHandler);

// Other protected routes...
```

## Migration Strategy

To ensure a smooth transition from the existing authentication system to Cognito:

1. **Add Cognito Authentication in Parallel**: Keep both authentication systems working side by side initially
2. **Enable Gradual User Migration**: Use the User Migration Lambda to move users seamlessly
3. **Monitor Authentication Usage**: Track which system users are authenticating with
4. **Phase Out Legacy Authentication**: After most users have migrated, disable the legacy system

## Testing the Integration

Test the Cognito integration thoroughly:

1. **New User Registration**: Test registering a new user through Cognito
2. **Existing User Authentication**: Test logging in with migrated user credentials
3. **MFA Verification**: Test the multi-factor authentication flow
4. **Permission Checks**: Verify that users have appropriate permissions based on their Cognito groups
5. **Token Refresh**: Test the token refresh mechanism
6. **Logout Flow**: Verify that logout properly clears all tokens and session data

## Security Considerations

1. **Token Storage**: Ensure tokens are stored securely using HTTP-only cookies
2. **CSRF Protection**: Implement proper Cross-Site Request Forgery protection
3. **Rate Limiting**: Configure rate limiting for authentication requests
4. **Audit Logging**: Log all authentication events for security monitoring

## Next Steps

After completing the Cognito authentication integration, proceed to [Role-Based Access Control](./02-role-based-access.md) to implement fine-grained permissions based on Cognito groups.