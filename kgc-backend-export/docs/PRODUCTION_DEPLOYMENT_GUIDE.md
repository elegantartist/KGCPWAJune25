# KGC Production Deployment Guide

## Pre-Deployment Security Checklist

### ✅ Critical Security Requirements

1. **Environment Variables**
   ```bash
   # Generate secure admin password hash
   node scripts/generate-admin-hash.js
   
   # Required production variables
   SESSION_SECRET=<64-char-random-string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=<bcrypt-hash-from-script>
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   NODE_ENV=production
   FORCE_HTTPS=true
   ```

2. **Security Validation**
   ```bash
   # Run security checks
   ./scripts/security-check.sh
   node scripts/validate-security.js
   ```

3. **Database Security**
   - PostgreSQL 12+ with encryption at rest
   - SSL/TLS connections: `DATABASE_URL=postgresql://...?sslmode=require`
   - Automated encrypted backups

## Deployment Methods

### Method 1: AWS Elastic Beanstalk (Recommended)

1. **Prepare Environment**
   ```bash
   # Build application
   npm run build
   
   # Create deployment package
   zip -r kgc-app.zip . -x "node_modules/*" ".git/*" "*.log"
   ```

2. **Elastic Beanstalk Configuration**
   ```json
   {
     "AWSEBDockerrunVersion": "1",
     "Image": {
       "Name": "kgc-healthcare-app",
       "Update": "true"
     },
     "Ports": [
       {
         "ContainerPort": "5000"
       }
     ]
   }
   ```

3. **Environment Variables in EB**
   - Configure all production environment variables in EB console
   - Use AWS Secrets Manager for sensitive data
   - Enable CloudWatch logging

### Method 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   # Use included Dockerfile
   docker build -t kgc-app:latest .
   
   # Run with environment file
   docker run -d \
     --name kgc-production \
     -p 443:5000 \
     --env-file .env.production \
     --restart unless-stopped \
     kgc-app:latest
   ```

2. **Docker Compose (with Nginx)**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       container_name: kgc-app
       environment:
         - NODE_ENV=production
       env_file:
         - .env.production
       volumes:
         - ./logs:/app/logs
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/nginx/ssl
       depends_on:
         - app
       restart: unless-stopped
   ```

### Method 3: Traditional Server Deployment

1. **Server Setup (Ubuntu 20.04+)**
   ```bash
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 process manager
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt-get install nginx
   ```

2. **Application Deployment**
   ```bash
   # Clone and build
   git clone https://github.com/elegantartist/KGCPWAJune25.git
   cd KGCPWAJune25
   npm install
   npm run build
   
   # Configure environment
   cp .env.example .env.production
   # Edit .env.production with your production values
   
   # Start with PM2
   pm2 start npm --name "kgc-app" -- run start
   pm2 save
   pm2 startup
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;
   
       ssl_certificate /path/to/ssl/certificate.pem;
       ssl_certificate_key /path/to/ssl/private.key;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
   
       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-Frame-Options "DENY" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           
           # Rate limiting
           limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
           limit_req zone=login burst=5 nodelay;
       }
   }
   ```

## SSL/TLS Certificate Setup

### Option 1: Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Commercial Certificate
- Purchase from trusted CA (DigiCert, Comodo, etc.)
- Upload certificate files to server
- Update Nginx configuration with certificate paths

## Database Setup

### PostgreSQL Configuration
```sql
-- Create production database
CREATE DATABASE kgc_production;
CREATE USER kgc_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE kgc_production TO kgc_user;

-- Enable required extensions
\c kgc_production;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set up SSL
-- Edit postgresql.conf:
-- ssl = on
-- ssl_cert_file = 'server.crt'
-- ssl_key_file = 'server.key'
```

### Database Migration
```bash
# Push schema to production database
npm run db:push
```

## Monitoring and Logging

### CloudWatch (AWS)
```bash
# Install CloudWatch agent
sudo apt-get install awscli
aws configure

# Configure log groups
aws logs create-log-group --log-group-name /aws/kgc-app/application
aws logs create-log-group --log-group-name /aws/kgc-app/security
```

### Application Monitoring
```bash
# Install monitoring tools
npm install --save newrelic
npm install --save @sentry/node

# Configure monitoring in production
export NEW_RELIC_LICENSE_KEY=your_key
export SENTRY_DSN=your_dsn
```

## Security Hardening

### Server Hardening
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# Install fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### Application Security
```bash
# Run security audit
npm audit fix
npm audit --audit-level high

# Set up automated security scanning
npm install --save-dev audit-ci
```

## Health Checks and Monitoring

### Application Health Endpoint
The application includes a health check endpoint: `GET /api/health`

### Monitoring Script
```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:5000/api/health || exit 1
```

### PM2 Monitoring
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs kgc-app

# Restart if needed
pm2 restart kgc-app
```

## Backup Strategy

### Database Backups
```bash
#!/bin/bash
# backup-database.sh
BACKUP_DIR="/var/backups/kgc"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Create encrypted backup
pg_dump -h localhost -U kgc_user kgc_production | \
gzip | \
gpg --symmetric --cipher-algo AES256 --output "$BACKUP_DIR/kgc_backup_$DATE.sql.gz.gpg"

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gpg" -mtime +30 -delete
```

### Application Backups
```bash
# Backup application files and logs
tar -czf /var/backups/kgc/app_backup_$(date +%Y%m%d).tar.gz /path/to/kgc-app --exclude=node_modules
```

## Post-Deployment Verification

### Security Tests
```bash
# SSL/TLS test
curl -I https://yourdomain.com

# Security headers test
curl -I https://yourdomain.com | grep -i security

# Rate limiting test
for i in {1..10}; do curl -X POST https://yourdomain.com/api/auth/login; done
```

### Application Tests
```bash
# Health check
curl https://yourdomain.com/api/health

# Authentication test
curl -X POST https://yourdomain.com/api/auth/sms-login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'
```

## Compliance Requirements

### HIPAA Compliance
- ✅ Encryption in transit (HTTPS/TLS)
- ✅ Encryption at rest (database)
- ✅ Access controls (RBAC)
- ✅ Audit logging (comprehensive)
- ⚠️ Business Associate Agreements (BAAs) with hosting providers
- ⚠️ Regular security assessments

### TGA SaMD Compliance (Australia)
- ✅ Software quality management system
- ✅ Risk management procedures
- ⚠️ Clinical evaluation documentation
- ⚠️ Post-market surveillance plan

## Troubleshooting

### Common Issues
1. **Application won't start**: Check environment variables and database connection
2. **SSL errors**: Verify certificate installation and Nginx configuration  
3. **Database connection issues**: Check firewall rules and SSL settings
4. **Performance issues**: Monitor resource usage with `htop` and PM2

### Log Locations
- Application logs: `/app/logs/`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/syslog`

The KGC application is now production-ready with comprehensive security measures. Follow this guide for a secure deployment suitable for healthcare environments.