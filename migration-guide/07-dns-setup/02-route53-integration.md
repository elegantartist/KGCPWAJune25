# Route 53 Integration

This document provides detailed instructions for setting up AWS Route 53 for DNS management of the KGC application domain.

## Prerequisites

Before setting up Route 53:
- Complete the [Crazy Domains Configuration](./01-crazy-domains-setup.md)
- Have AWS account access with appropriate permissions
- Know the domain name (keepgoingcare.com)
- Have a list of required DNS records for your AWS resources

## Step 1: Create a Route 53 Hosted Zone

### Console Instructions

1. **Navigate to Route 53**
   - Sign in to the AWS Management Console
   - Search for "Route 53" and select the service
   
   ![Route 53 Navigation](../images/route53-navigation.png)

2. **Create Hosted Zone**
   - In the Route 53 Dashboard, click "Hosted zones" in the left navigation
   - Click "Create hosted zone"
   - Enter the following details:
     - Domain name: "keepgoingcare.com"
     - Type: "Public hosted zone"
     - Comment: "KGC Application Domain"
   - Click "Create hosted zone"
   
   ![Create Hosted Zone](../images/route53-create-hosted-zone.png)

3. **Note the Name Servers**
   - After creating the hosted zone, AWS assigns four name servers
   - Note these name servers as you'll need to update them in Crazy Domains
   - They're listed in the NS record in the hosted zone
   
   ![Route 53 Name Servers](../images/route53-nameservers.png)

### CLI Commands

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name keepgoingcare.com \
  --caller-reference $(date +%s) \
  --hosted-zone-config Comment="KGC Application Domain" \
  --region ap-southeast-2

# Get name servers
aws route53 get-hosted-zone \
  --id /hostedzone/ZXXXXXXXXX \
  --region ap-southeast-2
```

## Step 2: Configure DNS Records

### Console Instructions

1. **Create Record Sets**
   - In the hosted zone for keepgoingcare.com, click "Create record"
   - Configure the following records:

2. **A Record for Root Domain**
   - Create a new record with:
     - Record name: Leave blank (for root domain)
     - Record type: A - IPv4 address
     - Value: IP address of your load balancer or CloudFront distribution
     - TTL: 300 seconds
     - Routing policy: Simple routing
   - Click "Create records"
   
   ![Route 53 A Record](../images/route53-a-record.png)

3. **CNAME Record for WWW Subdomain**
   - Create a new record with:
     - Record name: "www"
     - Record type: CNAME
     - Value: Your CloudFront distribution domain (e.g., d123abcdef.cloudfront.net)
     - TTL: 300 seconds
     - Routing policy: Simple routing
   - Click "Create records"
   
   ![Route 53 CNAME Record](../images/route53-cname-record.png)

4. **Alternative: Alias Records for AWS Resources**
   - Instead of A or CNAME records, you can use Route 53 Alias records for AWS resources
   - Create a new record with:
     - Record name: Leave blank (for root domain)
     - Record type: A - IPv4 address
     - Alias: Yes
     - Route traffic to: Choose the relevant AWS resource
       - CloudFront distribution
       - Application Load Balancer
       - S3 website endpoint
     - Value: Select your specific resource from the dropdown
     - Routing policy: Simple routing
   - Click "Create records"
   
   ![Route 53 Alias Record](../images/route53-alias-record.png)

5. **MX Records for Email**
   - Create a new record with:
     - Record name: Leave blank (for root domain)
     - Record type: MX
     - Value: Priority followed by mail server domain (e.g., "10 mail.example.com")
     - TTL: 3600 seconds
     - Routing policy: Simple routing
   - Click "Create records"
   - Repeat for additional mail servers with different priorities

6. **TXT Records for Email Verification and SPF**
   - Create a new record with:
     - Record name: Leave blank (for root domain)
     - Record type: TXT
     - Value: Your SPF record (e.g., "v=spf1 include:_spf.google.com ~all")
     - TTL: 3600 seconds
     - Routing policy: Simple routing
   - Click "Create records"

### CLI Commands

```bash
# Create A record for root domain
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXX \
  --change-batch '{"Changes": [{"Action": "CREATE", "ResourceRecordSet": {"Name": "keepgoingcare.com.", "Type": "A", "TTL": 300, "ResourceRecords": [{"Value": "203.0.113.1"}]}}]}' \
  --region ap-southeast-2

# Create CNAME record for www subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXX \
  --change-batch '{"Changes": [{"Action": "CREATE", "ResourceRecordSet": {"Name": "www.keepgoingcare.com.", "Type": "CNAME", "TTL": 300, "ResourceRecords": [{"Value": "d123abcdef.cloudfront.net"}]}}]}' \
  --region ap-southeast-2

# Create Alias record for CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXX \
  --change-batch '{"Changes": [{"Action": "CREATE", "ResourceRecordSet": {"Name": "keepgoingcare.com.", "Type": "A", "AliasTarget": {"HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "d123abcdef.cloudfront.net.", "EvaluateTargetHealth": false}}}]}' \
  --region ap-southeast-2
```

## Step 3: Configure Health Checks (Optional)

Health checks can monitor the health of your endpoints and adjust DNS routing accordingly.

### Console Instructions

1. **Create Health Check**
   - In the Route 53 Dashboard, click "Health checks" in the left navigation
   - Click "Create health check"
   - Enter the following details:
     - Name: "KGC-Application-Health"
     - What to monitor: "Endpoint"
     - Specify endpoint by: "Domain name"
     - Protocol: HTTPS
     - Domain name: "www.keepgoingcare.com"
     - Path: "/api/health"
     - Advanced configuration:
       - Request interval: 30 seconds
       - Failure threshold: 3
       - String matching: Yes
       - String to match: "OK"
   - Click "Create health check"
   
   ![Route 53 Health Check](../images/route53-health-check.png)

2. **Associate Health Check with DNS Record**
   - Edit the corresponding DNS record
   - Enable "Health check"
   - Select the health check you created
   - Click "Save"

## Step 4: Configure DNS Failover (Optional)

DNS failover helps maintain application availability by redirecting traffic when a primary endpoint fails.

### Console Instructions

1. **Create Primary and Secondary Records**
   - Create primary and secondary endpoints (e.g., in different AWS regions)

2. **Configure Failover Records**
   - Create a new record with:
     - Record name: Leave blank (for root domain)
     - Record type: A - IPv4 address
     - Alias: Yes
     - Route traffic to: Choose the relevant AWS resource
     - Routing policy: Failover
     - Failover record type: Primary
     - Health check: Select your health check
   - Click "Create records"
   
   - Create a second record with:
     - Same name and type
     - Routing policy: Failover
     - Failover record type: Secondary
     - Associate with different endpoint
   - Click "Create records"
   
   ![Route 53 Failover](../images/route53-failover.png)

## Step 5: Test DNS Configuration

1. **Check Propagation Status**
   - Use DNS propagation checking tools:
     - [DNSChecker](https://dnschecker.org/)
     - [WhatsMyDNS](https://www.whatsmydns.net/)
   - Look up your domain records from multiple global locations
   
   ![DNS Checker Tool](../images/dns-checker-tool.png)

2. **Verify Record Resolution**
   - Use nslookup or dig commands to verify the records resolve correctly:

   ```bash
   # Linux/macOS
   dig keepgoingcare.com
   dig www.keepgoingcare.com

   # Windows
   nslookup keepgoingcare.com
   nslookup www.keepgoingcare.com
   ```

3. **Verify Website Loading**
   - Test that your website loads correctly with both:
     - Root domain (https://keepgoingcare.com)
     - www subdomain (https://www.keepgoingcare.com)
   - Test using different browsers and from different networks

## Step 6: Configure Route 53 Monitoring and Alerts

Set up monitoring for your Route 53 health checks and DNS queries:

### Console Instructions

1. **Set Up CloudWatch Alarms for Health Checks**
   - Navigate to the CloudWatch console
   - Create alarms for health check metrics:
     - HealthCheckStatus
     - HealthCheckPercentageHealthy
   - Configure appropriate thresholds and notifications
   
   ![CloudWatch Health Check Alarm](../images/cloudwatch-health-check-alarm.png)

2. **Enable DNS Query Logging**
   - In the Route 53 hosted zone, click "Query logging"
   - Click "Configure query logging"
   - Select a CloudWatch Logs log group
   - Click "Create"
   
   ![Route 53 Query Logging](../images/route53-query-logging.png)

3. **Set Up DNS Query Metrics**
   - Create CloudWatch metrics filters for the query logs
   - Monitor for unusual patterns in DNS queries

## Route 53 Best Practices

1. **Security**
   - Use IAM policies to restrict Route 53 access
   - Enable query logging for security monitoring
   - Regularly audit DNS records

2. **Performance**
   - Use Route 53 Resolver Query Logs to identify performance issues
   - Consider using Route 53 Traffic Flow for complex routing rules
   - Set appropriate TTL values based on change frequency

3. **Reliability**
   - Implement health checks for critical endpoints
   - Use failover routing for high availability
   - Test failover scenarios regularly

4. **Cost Optimization**
   - Monitor Route 53 usage and costs
   - Use aliases for AWS resources (free for Route 53 to Route 53, or Route 53 to AWS resource lookups)
   - Consolidate similar DNS records

## Troubleshooting Common Issues

1. **DNS Propagation Delays**
   - Problem: Changes not immediately visible
   - Solution: Check propagation with global DNS tools, consider using lower TTL values

2. **Health Check False Positives**
   - Problem: Health checks failing incorrectly
   - Solution: Adjust thresholds, check endpoint paths, verify string matching

3. **HTTPS Certificate Validation Issues**
   - Problem: Certificate validation failing
   - Solution: Ensure DNS records match ACM requirements exactly

4. **Alias Record Problems**
   - Problem: Alias records not resolving
   - Solution: Verify target resources are correctly configured and available

## Next Steps

After setting up Route 53, proceed to [SSL Certificate Setup](./03-ssl-certificate-setup.md) to secure your domain with HTTPS.