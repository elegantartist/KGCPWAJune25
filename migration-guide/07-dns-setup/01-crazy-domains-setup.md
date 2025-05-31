# Crazy Domains Configuration

This document provides step-by-step instructions for configuring your domain in Crazy Domains to work with AWS services for the KGC application.

## Prerequisites

Before configuring your Crazy Domains account, ensure you have:

- Access to the Crazy Domains account that manages the keepgoingcare.com domain
- Login credentials for the account
- The list of DNS records needed for your AWS resources

## Step 1: Access Crazy Domains Account

1. **Log in to Crazy Domains**
   - Navigate to [Crazy Domains Login Page](https://www.crazydomains.com.au/login/)
   - Enter your username/email and password
   - Click "Login"
   
   ![Crazy Domains Login](../images/crazy-domains-login.png)

2. **Access Domain Management**
   - From the dashboard, click on "My Domains"
   - Find and select "keepgoingcare.com" from your list of domains
   - Click "Manage Domain"
   
   ![Crazy Domains Dashboard](../images/crazy-domains-dashboard.png)

## Step 2: Configure DNS Settings

### Option A: Using Crazy Domains DNS

If you plan to manage DNS records directly through Crazy Domains:

1. **Access DNS Management**
   - In the domain management page, click on "DNS"
   - This will take you to the DNS management interface
   
   ![Crazy Domains DNS Management](../images/crazy-domains-dns.png)

2. **Configure A Records**
   - Click "Add Record"
   - Select "A" as the record type
   - Enter "@" in the "Name" field (for the root domain)
   - Enter the IP address of your AWS resource (e.g., Elastic Load Balancer)
   - Set TTL to 300 (5 minutes) during migration, can be increased later
   - Click "Save"
   
   ![Crazy Domains A Record](../images/crazy-domains-a-record.png)

3. **Configure CNAME Records**
   - Click "Add Record"
   - Select "CNAME" as the record type
   - Enter "www" in the "Name" field
   - Enter your CloudFront distribution domain or load balancer domain in the "Value" field
     (e.g., `d123abcdef.cloudfront.net`)
   - Set TTL to 300
   - Click "Save"
   
   ![Crazy Domains CNAME Record](../images/crazy-domains-cname-record.png)

4. **Configure MX Records (for Email)**
   - Click "Add Record"
   - Select "MX" as the record type
   - Enter "@" in the "Name" field
   - Enter your mail server domain in the "Value" field
   - Set the priority (e.g., 10)
   - Set TTL to 3600 (1 hour)
   - Click "Save"
   - Repeat for additional mail servers with different priorities

5. **Configure TXT Records (for Email Verification and SPF)**
   - Click "Add Record"
   - Select "TXT" as the record type
   - Enter "@" in the "Name" field
   - Enter your SPF record in the "Value" field (e.g., `v=spf1 include:_spf.google.com ~all`)
   - Set TTL to 3600
   - Click "Save"
   
   ![Crazy Domains TXT Record](../images/crazy-domains-txt-record.png)

6. **Configure ACM Validation Records (if using AWS Certificate Manager)**
   - In the AWS Certificate Manager console, you will receive a validation record
   - Create a CNAME record in Crazy Domains with:
     - Name: The subdomain provided by ACM
     - Value: The validation value provided by ACM
   - Set TTL to 300
   - Click "Save"

### Option B: Using Crazy Domains with AWS Route 53 Name Servers

If you plan to use AWS Route 53 for DNS management (recommended approach):

1. **Get AWS Route 53 Name Servers**
   - Create a hosted zone in Route 53 (see [Route 53 Integration](./02-route53-integration.md))
   - Note the four name servers assigned to your hosted zone
   
   ![AWS Route 53 Name Servers](../images/aws-route53-nameservers.png)

2. **Update Name Servers in Crazy Domains**
   - In the domain management page, click on "Name Servers"
   - Select "Use custom name servers"
   - Remove existing name servers
   - Add each of the Route 53 name servers (typically 4)
   - Click "Save"
   
   ![Crazy Domains Name Servers](../images/crazy-domains-nameservers.png)

3. **Verify Name Server Changes**
   - Name server changes can take 24-48 hours to propagate globally
   - Use a DNS lookup tool like [DNSChecker](https://dnschecker.org/) to verify the name servers have updated
   
   ![DNS Checker](../images/dns-checker.png)

## Step 3: Domain Lock and Security Settings

Configure additional security settings to protect your domain:

1. **Enable Domain Lock**
   - In the domain management page, click on "Security"
   - Enable "Domain Lock" to prevent unauthorized domain transfers
   - Click "Save"
   
   ![Crazy Domains Security](../images/crazy-domains-security.png)

2. **Configure Admin Contact Details**
   - Ensure your admin contact information is current
   - Use a role-based email address (e.g., admin@keepgoingcare.com) rather than a personal email
   - Enable privacy protection if desired

3. **Enable Auto-Renewal**
   - In the domain management page, click on "Renewal"
   - Enable "Auto-Renewal" to prevent accidental domain expiration
   - Click "Save"
   
   ![Crazy Domains Renewal](../images/crazy-domains-renewal.png)

## Step 4: Domain Forwarding (Optional)

If you need to redirect specific domains or subdomains:

1. **Access Domain Forwarding**
   - In the domain management page, click on "Forwarding"
   - Click "Add Forwarding"
   
   ![Crazy Domains Forwarding](../images/crazy-domains-forwarding.png)

2. **Configure Forwarding**
   - Enter the source domain (e.g., "old.keepgoingcare.com")
   - Enter the destination URL
   - Select forwarding type (301 Permanent or 302 Temporary)
   - Choose whether to forward with or without path
   - Click "Save"

## Domain Management Best Practices

1. **Documentation**
   - Maintain a document with all DNS records for reference
   - Document the reason for each DNS record
   - Store DNS credentials securely

2. **Monitoring**
   - Regularly check domain expiration dates
   - Monitor DNS configurations for unauthorized changes
   - Set up alerts for approaching domain renewal dates

3. **Security**
   - Use strong passwords for your Crazy Domains account
   - Enable two-factor authentication if available
   - Limit access to the domain management account

4. **Testing**
   - Always test DNS changes in a development environment first
   - Use DNS propagation checkers to verify changes
   - Have a rollback plan for DNS changes

## Troubleshooting Common Issues

1. **DNS Propagation Delay**
   - Problem: DNS changes not reflecting immediately
   - Solution: DNS can take 24-48 hours to propagate globally; use lower TTL values during migrations

2. **Certificate Validation Issues**
   - Problem: AWS ACM certificate not validating
   - Solution: Verify CNAME records match exactly what ACM provides, including trailing dots

3. **Name Server Conflicts**
   - Problem: Domain not resolving correctly
   - Solution: Ensure name servers are consistent across all registrars and providers

4. **MX Record Problems**
   - Problem: Email not being delivered
   - Solution: Verify MX records have correct priority values and domain names

## Next Steps

After configuring your domain in Crazy Domains, proceed to [Route 53 Integration](./02-route53-integration.md) to set up AWS Route 53 for DNS management.