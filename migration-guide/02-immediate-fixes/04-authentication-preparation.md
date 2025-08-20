# Authentication System Preparation

## Overview

To prepare the KGC application for migration to AWS Cognito, the current authentication system needs several updates. This document outlines the changes required to make the transition as smooth as possible without disrupting existing functionality.

## Current Authentication System

The KGC application currently uses a simple JWT-based authentication system with these characteristics:

1. **Token Storage**: Authentication tokens stored in browser localStorage
2. **Role Management**: Basic role checking with limited granularity
3. **Token Validation**: Simple validation without proper refresh mechanisms
4. **Session Management**: No structured session handling

These limitations create security vulnerabilities and will complicate the migration to AWS Cognito.

## Preparation Strategy

The preparation involves restructuring the authentication system to align with AWS Cognito patterns while maintaining backward compatibility. This approach allows for a phased migration rather than a disruptive cutover.

## Implementation Steps

### 1. Create Authentication Service Layer

Implement a service layer to abstract authentication logic, making it easier to swap implementations:

```typescript
// client/src/services/authService.ts
import { BehaviorSubject } from 'rxjs';

export interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  roleName: string;
  uin?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Interface all auth providers must implement
export interface IAuthProvider {
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  register(userData: any): Promise<User>;
  refreshToken(): Promise<boolean>;
  getUser(): Promise<User | null>;
  updateUser(userData: Partial<User>): Promise<User>;
}

// Current implementation using JWT/localStorage
export class JwtAuthProvider implements IAuthProvider {
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  public authState$ = this.authState.asObservable();

  constructor() {
    // Initialize auth state from localStorage on startup
    this.initializeFromStorage();
  }

  private async initializeFromStorage() {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        const user = await this.getUser();
        this.authState.next({
          isAuthenticated: true,
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem('authToken');
        this.authState.next({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'Session expired. Please log in again.',
        });
      }
    } else {
      this.authState.next({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store token
      localStorage.setItem('authToken', data.token);
      
      // Update auth state
      this.authState.next({
        isAuthenticated: true,
        user: data.user,
        loading: false,
        error: null,
      });
      
      return data.user;
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
    // Call logout endpoint to invalidate token on server
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local storage and update state
    localStorage.removeItem('authToken');
    this.authState.next({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });
  }

  async register(userData: any): Promise<User> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      const data = await response.json();
      
      // If registration auto-logs in the user
      localStorage.setItem('authToken', data.token);
      
      this.authState.next({
        isAuthenticated: true,
        user: data.user,
        loading: false,
        error: null,
      });
      
      return data.user;
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
    // Current implementation doesn't support token refresh
    // This will be implemented in Cognito version
    return this.isAuthenticated();
  }

  async getUser(): Promise<User | null> {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return null;
    }
    
    try {
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get user');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch('/api/auth/user', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      const updatedUser = await response.json();
      
      // Update auth state with new user data
      this.authState.next({
        ...this.authState.value,
        user: updatedUser,
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.authState.value.user;
  }
}

// Singleton instance of the current auth provider
// This will be replaced with CognitoAuthProvider during migration
export const authService = new JwtAuthProvider();
```

### 2. Update Authentication Hook

Refactor the authentication hook to use the new service:

```typescript
// client/src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { authService, User, AuthState } from '../services/authService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const subscription = authService.authState$.subscribe(state => {
      setAuthState(state);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      return await authService.login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (userData: any) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      throw error;
    }
  };

  return {
    ...authState,
    login,
    logout,
    register,
  };
}
```

### 3. Add HTTP-Only Cookie Support

Modify the backend to support both token-based and cookie-based authentication:

```typescript
// server/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, userRoles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRATION = '1d'; // 1 day
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// Generate auth token
export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

// Set authentication in both cookie and response
export function setAuthentication(res: Response, userId: number, user: any) {
  const token = generateToken(userId);
  
  // Set HTTP-only cookie
  res.cookie('auth_token', token, COOKIE_OPTIONS);
  
  // Also return token for backward compatibility
  return { token, user };
}

// Authentication middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
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
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Get user with role
export async function getUserWithRole(userId: number) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleId: users.roleId,
      uin: users.uin,
    })
    .from(users)
    .where(eq(users.id, userId));
  
  if (!user) {
    return null;
  }
  
  // Get role
  const [role] = await db
    .select({
      id: userRoles.id,
      name: userRoles.name,
    })
    .from(userRoles)
    .where(eq(userRoles.id, user.roleId));
  
  return {
    ...user,
    roleName: role?.name || 'unknown',
  };
}

// Login endpoint
export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Get user with role
    const userWithRole = await getUserWithRole(user.id);
    
    // Set authentication
    const authData = setAuthentication(res, user.id, userWithRole);
    
    return res.json(authData);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
}

// Logout endpoint
export function logoutHandler(req: Request, res: Response) {
  // Clear cookie
  res.clearCookie('auth_token');
  
  return res.json({ message: 'Logged out successfully' });
}

// User info endpoint
export async function getUserHandler(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const user = await getUserWithRole(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Failed to get user information' });
  }
}
```

### 4. Update API Routes

Update the authentication routes in the Express app:

```typescript
// In server/routes.ts

// Auth routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/logout', logoutHandler);
app.get('/api/auth/user', authenticate, getUserHandler);

// For updating user
app.patch('/api/auth/user', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    delete userData.password;
    delete userData.roleId;
    
    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user with role
    const userWithRole = await getUserWithRole(updatedUser.id);
    
    return res.json(userWithRole);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Failed to update user' });
  }
});
```

### 5. Add Role-Based Authorization Middleware

Create middleware for role-based access control:

```typescript
// server/middleware/roleCheck.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, userRoles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Role-based authorization middleware
export function requireRole(roleName: string | string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      
      // Get user with role
      const [user] = await db
        .select({
          id: users.id,
          roleId: users.roleId,
        })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get role
      const [role] = await db
        .select({
          id: userRoles.id,
          name: userRoles.name,
        })
        .from(userRoles)
        .where(eq(userRoles.id, user.roleId));
      
      if (!role) {
        return res.status(403).json({ message: 'Unauthorized - Role not found' });
      }
      
      // Check if user has required role
      const allowedRoles = Array.isArray(roleName) ? roleName : [roleName];
      if (!allowedRoles.includes(role.name)) {
        return res.status(403).json({ message: 'Unauthorized - Insufficient permissions' });
      }
      
      // Add user role to request for convenience
      req.userRole = role.name;
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ message: 'Authorization check failed' });
    }
  };
}
```

### 6. Apply Role-Based Authorization to Routes

Update routes to use the new role-based middleware:

```typescript
// In server/routes.ts

// Admin-only routes
app.get('/api/admin/profile', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const admin = await getUserWithRole(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    return res.json(admin);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return res.status(500).json({ message: 'Failed to retrieve admin profile' });
  }
});

// Doctor-only routes
app.get('/api/doctor/patients', authenticate, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    // Implementation...
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'An error occurred' });
  }
});

// Patient-only routes
app.post('/api/patient/health-scores', authenticate, requireRole('patient'), async (req, res) => {
  try {
    // Implementation...
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'An error occurred' });
  }
});
```

## Preparing for AWS Cognito

To make the future migration to AWS Cognito smoother, implement a placeholder for the Cognito auth provider:

```typescript
// client/src/services/cognitoAuthProvider.ts
import { IAuthProvider, User, AuthState } from './authService';
import { BehaviorSubject } from 'rxjs';

// This is a placeholder that will be fully implemented during AWS migration
export class CognitoAuthProvider implements IAuthProvider {
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  public authState$ = this.authState.asObservable();

  // These methods will be implemented during AWS migration
  async login(email: string, password: string): Promise<User> {
    // Will use Cognito auth
    throw new Error('Not implemented yet');
  }

  async logout(): Promise<void> {
    // Will use Cognito sign out
    throw new Error('Not implemented yet');
  }

  async register(userData: any): Promise<User> {
    // Will use Cognito sign up
    throw new Error('Not implemented yet');
  }

  async refreshToken(): Promise<boolean> {
    // Will use Cognito token refresh
    throw new Error('Not implemented yet');
  }

  async getUser(): Promise<User | null> {
    // Will get user from Cognito session
    throw new Error('Not implemented yet');
  }

  async updateUser(userData: Partial<User>): Promise<User> {
    // Will update Cognito user attributes
    throw new Error('Not implemented yet');
  }
}
```

## Testing the Authentication Preparation

1. After implementing these changes, test the system by:
   - Logging in with existing credentials
   - Verifying that HTTP-only cookies are set
   - Testing protected routes with role-based authorization
   - Confirming that the admin profile can be accessed

2. Test authentication error handling by:
   - Attempting to access routes without authentication
   - Attempting to access routes with insufficient permissions

## Benefits of the Preparation

1. **Improved Security**: Addition of HTTP-only cookies increases protection against XSS attacks
2. **Cleaner Architecture**: Authentication logic encapsulated in service layer
3. **Better Authorization**: Role-based middleware provides consistent access control
4. **Easier Migration**: Abstract interfaces prepare for Cognito integration
5. **Backward Compatibility**: System continues to work with existing authentication methods

## Next Steps

After completing the authentication system preparation, proceed to the [AWS Setup](../03-aws-setup/README.md) section to begin configuring your AWS environment.