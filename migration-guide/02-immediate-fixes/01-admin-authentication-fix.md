# Admin Authentication Fix

## Problem Description

The KGC application currently experiences an authentication issue for admin users, resulting in "Admin not found" errors (404 status) when attempting to access the admin profile endpoint. This prevents critical administrative functions, particularly creating new patients.

The issue manifests in the following ways:
- GET requests to `/api/admin/profile` return 404 with "Admin not found" message
- Admin Dashboard can load but certain functions fail
- Patient creation through the Doctor Dashboard fails when submitted

## Root Cause Analysis

After investigating the server logs and code, the root cause has been identified in the `/api/admin/profile` endpoint implementation in `server/routes.ts`. The current implementation:

1. Uses a hardcoded admin ID (`adminId = 999`) that doesn't correspond to any actual user in the database
2. Performs strict role checking without fallback mechanisms
3. Does not properly integrate with the client-side authentication that stores user state in localStorage

```javascript
// Current problematic code (approximate location lines 2318-2333 in server/routes.ts)
app.get("/api/admin/profile", async (req, res) => {
  try {
    // In a real app, this would use authentication to get the admin's ID
    const adminId = 999; // Just a placeholder, in real app would be the authenticated user
    
    const [admin] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, adminId),
        eq(users.roleId, 1) // Assuming roleId 1 is for admins
      ));
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    // Get role name for the admin
    const [role] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.id, admin.roleId));
    
    return res.json({
      ...admin,
      roleName: role?.name || 'unknown'
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return res.status(500).json({ message: "Failed to retrieve admin profile" });
  }
});
```

## Solution Implementation

### 1. Extract Admin ID from Authentication Token

Instead of using a hardcoded admin ID, we'll extract the user ID from the authentication token provided in the request headers.

### 2. Modify Admin Profile Endpoint

Update the `/api/admin/profile` endpoint in `server/routes.ts` to:
- Extract user information from the authorization header
- Check for admin role more flexibly
- Use the authenticated user's ID instead of a hardcoded value

### 3. Code Changes

Here's the implementation fix for the admin profile endpoint:

```javascript
// Updated code for server/routes.ts
app.get("/api/admin/profile", async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Extract and verify the token
    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      // Verify the token (implementation depends on your token format)
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }
    
    // Get user from token data
    const userId = decodedToken.userId;
    
    // Get admin user from database
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Get user's role - more flexible checking
    const [userRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.id, admin.roleId));
    
    // Check if user has admin role
    if (!userRole || userRole.name.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: "Not authorized as admin" });
    }
    
    return res.json({
      ...admin,
      roleName: userRole.name
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    return res.status(500).json({ message: "Failed to retrieve admin profile" });
  }
});
```

### 4. Additional Client-Side Updates

Ensure that the admin authentication token is properly included in requests:

```javascript
// Example client-side code for API calls (in apiRequest function)
export const apiRequest = async (method, endpoint, data = null) => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Always include auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Rest of the function remains the same
  // ...
};
```

## Testing the Fix

1. After implementing the changes, test admin authentication by:
   - Logging in as an admin user
   - Navigating to the Admin Dashboard
   - Checking that profile information loads correctly
   - Attempting to create a new patient through the Doctor Dashboard

2. Verify that the server logs show successful requests to `/api/admin/profile` without 404 errors.

3. Test patient creation to ensure it completes successfully.

## Security Considerations

This fix addresses immediate functionality issues but still has security limitations that will be addressed during the AWS migration:

1. It still relies on localStorage for token storage, which will be replaced with secure HTTP-only cookies and Cognito tokens.
2. The JWT verification process is basic and will be enhanced with proper token management through Cognito.
3. Role-based access control will be further improved with AWS IAM and Cognito groups.

## Next Steps

After implementing this fix, proceed to the [Self-Score Analysis Fix](./02-self-score-analysis-fix.md) to address the dual analysis issue.