# Security Configuration for cPanel Hosting

This document outlines the comprehensive security configuration for the KGC application frontend hosted on cPanel, focusing on maintaining a secure connection between frontend and backend components while ensuring an optimal user experience.

## Prerequisites

Before configuring security settings:
- Complete [cPanel Account Setup](./01-cpanel-account-setup.md)
- Complete [Frontend Deployment](./02-frontend-deployment.md)
- Have access to the cPanel account with admin privileges
- Have SSL certificate information ready

## Step 1: Configure SSL Certificate

Securing the connection between users and the KGC application starts with HTTPS.

### Using Let's Encrypt SSL (Recommended)

1. **Access SSL/TLS Section**
   - Log in to cPanel
   - Scroll to the "Security" section
   - Click on "SSL/TLS"
   
   ![cPanel SSL/TLS Section](../images/cpanel-ssl-tls.png)

2. **Install Let's Encrypt Certificate**
   - Click on "Let's Encrypt SSL"
   - Select domains to secure (ensure both keepgoingcare.com and www.keepgoingcare.com are selected)
   - Set the certificate to auto-renew (every 90 days)
   - Click "Issue Certificate"
   
   ![Let's Encrypt SSL](../images/cpanel-lets-encrypt.png)

3. **Verify SSL Installation**
   - Return to the SSL/TLS section
   - Click on "Installed SSL Certificates"
   - Verify the certificate is installed and valid for keepgoingcare.com
   
   ![Verify SSL Installation](../images/cpanel-verify-ssl.png)

### Using Custom SSL Certificate (If Required)

If using a custom SSL certificate (e.g., from a trusted certificate authority):

1. **Prepare Certificate Files**
   - Certificate file (CRT)
   - Private key file (KEY)
   - Certificate Authority bundle (CABUNDLE)

2. **Install Certificate**
   - In cPanel, go to "SSL/TLS" > "Install and Manage SSL for your site"
   - Paste the certificate, private key, and CA bundle into the respective fields
   - Select the domain from the dropdown
   - Click "Install Certificate"

## Step 2: Configure HTTP to HTTPS Redirection

Ensure all users access the application via secure HTTPS connections.

1. **Access .htaccess File**
   - In cPanel, go to "File Manager"
   - Navigate to the root directory (public_html)
   - Edit the .htaccess file (create one if it doesn't exist)
   
   ![cPanel File Manager](../images/cpanel-file-manager.png)

2. **Add Redirection Rules**
   - Add the following code to the .htaccess file:

```apache
# Redirect HTTP to HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# HSTS Header (Optional but recommended)
<IfModule mod_headers.c>
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
</IfModule>
```

3. **Save Changes**
   - Click "Save Changes" in the editor
   - Test by accessing http://keepgoingcare.com and verify it redirects to https://keepgoingcare.com

## Step 3: Configure Content Security Policy (CSP)

CSP helps prevent Cross-Site Scripting (XSS) and data injection attacks by controlling which resources can be loaded by the browser.

1. **Create/Edit the .htaccess File**
   - Edit the .htaccess file in your document root

2. **Add CSP Headers**
   - Add the following code to the .htaccess file:

```apache
<IfModule mod_headers.c>
    # Content Security Policy
    Header set Content-Security-Policy "default-src 'self'; \
        script-src 'self' https://apis.google.com https://www.google-analytics.com; \
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
        img-src 'self' data: https://www.google-analytics.com; \
        font-src 'self' https://fonts.gstatic.com; \
        connect-src 'self' https://api.keepgoingcare.com https://cognito-idp.ap-southeast-2.amazonaws.com; \
        frame-src 'self' https://www.youtube.com; \
        object-src 'none'"

    # Prevent MIME type sniffing
    Header set X-Content-Type-Options "nosniff"
    
    # Prevent clickjacking
    Header set X-Frame-Options "SAMEORIGIN"
    
    # Enable XSS protection
    Header set X-XSS-Protection "1; mode=block"
    
    # Referrer Policy
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Feature Policy
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=(self), payment=()"
</IfModule>
```

3. **Customize the CSP**
   - Update the connect-src directive to include all backend API endpoints
   - Add any additional trusted domains for script-src, style-src, etc.
   - Test thoroughly to ensure all resources load correctly

## Step 4: Configure Cross-Origin Resource Sharing (CORS)

CORS is a security feature that restricts how resources on a web page can be requested from another domain.

1. **For cPanel Frontend**
   - Create/edit the .htaccess file
   - Add the following code:

```apache
<IfModule mod_headers.c>
    # Only allow CORS from trusted domains
    SetEnvIf Origin "^(https://(www\.)?keepgoingcare\.com|https://api\.keepgoingcare\.com)$" AccessControlAllowOrigin=$0
    Header set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With"
    Header set Access-Control-Allow-Credentials "true"
    
    # Handle preflight requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
</IfModule>
```

2. **For AWS Backend**
   - Ensure the AWS API Gateway or backend services have proper CORS configuration
   - Only allow requests from trusted domains (keepgoingcare.com and www.keepgoingcare.com)

## Step 5: Configure Secure Cookies

Ensure cookies are transmitted securely and protected from client-side access.

1. **Update Application Code**
   - Ensure all cookies used by the application have the following flags:
     - Secure: Only sent over HTTPS
     - HttpOnly: Inaccessible to JavaScript (for sensitive cookies)
     - SameSite: Control when cookies are sent with cross-site requests

2. **Example Implementation**
   - For server-set cookies, ensure they use secure attributes
   - For client-side cookies, use a configuration like this:

```javascript
// Example cookie setting with secure attributes
document.cookie = "sessionToken=abc123; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600";
```

## Step 6: Configure Rate Limiting

Protect the application from brute force attacks and denial-of-service attempts.

1. **Edit .htaccess File**
   - Add the following code:

```apache
<IfModule mod_evasive20.c>
    DOSHashTableSize 3097
    DOSPageCount 5
    DOSSiteCount 50
    DOSPageInterval 1
    DOSSiteInterval 1
    DOSBlockingPeriod 60
</IfModule>

<IfModule mod_security2.c>
    # Rate limiting for login endpoints
    SecRule REQUEST_URI "/api/login" "phase:1,id:1000,nolog,pass,setenv:env_login_attempt=1"
    SecAction "phase:5,id:1001,nolog,pass,rate:5/60,pause:300,status:429,setenv:!env_login_attempt"
</IfModule>
```

2. **Contact Hosting Provider**
   - Some rate-limiting configurations may require server-level changes
   - Contact your cPanel hosting provider to enable mod_evasive or similar rate-limiting modules

## Step 7: Secure AWS API Gateway Access

The API Gateway connecting to the AWS backend should be properly secured.

1. **API Keys**
   - Configure API keys for the frontend to authenticate with the API Gateway
   - Store API keys securely in environment variables

2. **JWT Validation**
   - Ensure the API Gateway validates JWT tokens from Cognito
   - Configure token expiration and refresh mechanisms

3. **Example API Request Code**
   - Update the frontend code to include proper headers:

```javascript
// Example API request with secure headers
async function fetchData(endpoint) {
  const token = await getAuthToken(); // Function to get valid Cognito token
  
  const response = await fetch(`https://api.keepgoingcare.com/${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Api-Key': process.env.API_KEY,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  
  return response.json();
}
```

## Step 8: Implement Regular Security Scanning

Set up regular security scanning to identify and address vulnerabilities.

1. **Configure cPHulk Brute Force Protection**
   - In cPanel, go to "Security" > "cPHulk Brute Force Protection"
   - Enable brute force protection
   - Configure the maximum number of failed login attempts
   
   ![cPHulk Settings](../images/cpanel-cphulk.png)

2. **Enable ImunifyAV (if available)**
   - In cPanel, check for security scanning tools like ImunifyAV
   - Enable regular scans for malware and vulnerabilities
   - Configure email notifications for scan results

3. **Set Up External Scanning**
   - Consider using external scanning services like:
     - Qualys SSL Labs for SSL/TLS configuration
     - OWASP ZAP for vulnerability scanning
     - SecurityHeaders.com for header configuration validation

## Step 9: Configure Backup System

Ensure regular backups to facilitate recovery in case of security incidents.

1. **Configure cPanel Backups**
   - In cPanel, go to "Backup"
   - Configure full or partial backups
   - Set a regular backup schedule
   
   ![cPanel Backup](../images/cpanel-backup.png)

2. **Off-Site Backups**
   - Configure backups to be stored in a separate location
   - Consider using a backup service or AWS S3 for redundancy

## End-to-End Security Testing

After completing the security configuration, perform comprehensive testing:

1. **SSL/TLS Testing**
   - Use [Qualys SSL Labs](https://www.ssllabs.com/ssltest/) to test SSL configuration
   - Aim for an "A" rating or higher

2. **Content Security Policy Testing**
   - Use browser developer tools to check for CSP violations
   - Verify all legitimate resources load correctly

3. **Cross-Origin Testing**
   - Test API requests from the frontend to backend
   - Verify CORS headers are working correctly

4. **Authentication Flow Testing**
   - Test complete login, token refresh, and logout flows
   - Verify session handling and timeout behavior

## Security Considerations for UX

While implementing these security measures, consider the following UX implications:

1. **Login Experience**
   - Use clear error messages for authentication failures
   - Implement progressive security (step up authentication) only when needed
   - Provide clear guidance if users encounter security-related issues

2. **Performance Balancing**
   - Monitor the performance impact of security headers
   - Optimize HTTPS configuration for faster connection establishment
   - Use HTTP/2 or HTTP/3 when available for better performance

3. **Offline Capabilities**
   - Configure service workers and offline data access within security constraints
   - Implement secure local storage with encryption for offline data

4. **Error Handling**
   - Design user-friendly, non-technical security error messages
   - Provide clear recovery paths from security-related errors

## Next Steps

After completing the security configuration, proceed to [Frontend-Backend Integration](./04-frontend-backend-integration.md) to connect the frontend to AWS backend services.