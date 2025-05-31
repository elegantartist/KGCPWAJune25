# Networking and VPC Configuration

This document provides detailed instructions for setting up a secure Virtual Private Cloud (VPC) environment for the KGC application in AWS.

## VPC Overview

The KGC application requires a secure, isolated network environment that meets healthcare data security standards. We'll create a multi-tier VPC with:

- Public subnets for internet-facing resources (load balancers)
- Private subnets for application resources (ECS/Lambda)
- Isolated subnets for database resources (RDS)
- Multiple Availability Zones for high availability

## Step 1: Create the VPC

### Console Instructions

1. **Navigate to VPC Dashboard**
   - Sign in to the AWS Management Console
   - Search for "VPC" and select the service

2. **Create VPC**
   - Click "Create VPC"
   - Choose "VPC and more" to create a VPC with subnets, route tables, and NAT gateways
   - Enter "KGC-VPC" as the name tag
   - IPv4 CIDR block: `10.0.0.0/16`
   - For tenancy, keep "Default"
   
   ![Create VPC](../images/vpc-create.png)

3. **Configure Subnets**
   - Number of Availability Zones: 3 (for high availability)
   - Number of public subnets: 3
   - Number of private subnets: 3
   - Number of private subnets with isolated resources: 3 (for the database)
   - Customize subnet CIDR blocks if needed:
     - Public subnet CIDRs: `10.0.0.0/24`, `10.0.1.0/24`, `10.0.2.0/24`
     - Private subnet CIDRs: `10.0.3.0/24`, `10.0.4.0/24`, `10.0.5.0/24`
     - Isolated subnet CIDRs: `10.0.6.0/24`, `10.0.7.0/24`, `10.0.8.0/24`

4. **Configure NAT Gateways**
   - Select "In 1 AZ" to save costs (can be changed to 3 AZs for production)
   - NAT gateways enable outbound internet access for private subnets

5. **Configure VPC Endpoints**
   - Select "S3 Gateway" to enable private access to S3

6. **Review and Create**
   - Review your VPC configuration
   - Click "Create VPC"
   - Wait for the VPC and its components to be created (5-10 minutes)

### CLI Commands

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=KGC-VPC}]' \
  --region ap-southeast-2

# Create public subnets
aws ec2 create-subnet \
  --vpc-id vpc-XXXXXXXX \
  --cidr-block 10.0.0.0/24 \
  --availability-zone ap-southeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=KGC-Public-Subnet-1}]' \
  --region ap-southeast-2

aws ec2 create-subnet \
  --vpc-id vpc-XXXXXXXX \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-southeast-2b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=KGC-Public-Subnet-2}]' \
  --region ap-southeast-2

aws ec2 create-subnet \
  --vpc-id vpc-XXXXXXXX \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ap-southeast-2c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=KGC-Public-Subnet-3}]' \
  --region ap-southeast-2

# Create private subnets (repeat for all 6 private and isolated subnets)
# ...

# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=KGC-IGW}]' \
  --region ap-southeast-2

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-XXXXXXXX \
  --vpc-id vpc-XXXXXXXX \
  --region ap-southeast-2

# Create and configure route tables, NAT gateways, and endpoints
# ...
```

## Step 2: Configure Security Groups

Security groups act as virtual firewalls to control inbound and outbound traffic at the instance level.

### Console Instructions

1. **Navigate to Security Groups**
   - In the VPC Dashboard, select "Security Groups" from the left navigation
   - Click "Create security group"

2. **Create Web Tier Security Group**
   - Security group name: "KGC-Web-Tier-SG"
   - Description: "Security group for web tier load balancers"
   - VPC: Select your KGC-VPC
   - Add inbound rules:
     - Type: HTTP, Source: `0.0.0.0/0`
     - Type: HTTPS, Source: `0.0.0.0/0`
   - Click "Create security group"
   
   ![Web Tier Security Group](../images/web-tier-sg.png)

3. **Create App Tier Security Group**
   - Security group name: "KGC-App-Tier-SG"
   - Description: "Security group for application servers"
   - VPC: Select your KGC-VPC
   - Add inbound rules:
     - Type: HTTP, Source: KGC-Web-Tier-SG
     - Type: HTTPS, Source: KGC-Web-Tier-SG
   - Click "Create security group"

4. **Create Database Tier Security Group**
   - Security group name: "KGC-DB-Tier-SG"
   - Description: "Security group for RDS database instances"
   - VPC: Select your KGC-VPC
   - Add inbound rules:
     - Type: PostgreSQL, Source: KGC-App-Tier-SG
   - Click "Create security group"

### CLI Commands

```bash
# Create Web Tier Security Group
aws ec2 create-security-group \
  --group-name KGC-Web-Tier-SG \
  --description "Security group for web tier load balancers" \
  --vpc-id vpc-XXXXXXXX \
  --region ap-southeast-2

# Add inbound rules to Web Tier SG
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region ap-southeast-2

aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region ap-southeast-2

# Create App Tier Security Group
# ...

# Create Database Tier Security Group
# ...
```

## Step 3: Configure Network ACLs

Network ACLs provide an additional layer of security at the subnet level.

### Console Instructions

1. **Navigate to Network ACLs**
   - In the VPC Dashboard, select "Network ACLs" from the left navigation
   - Click "Create network ACL"

2. **Create Network ACL for Public Subnets**
   - Name: "KGC-Public-NACL"
   - VPC: Select your KGC-VPC
   - Click "Create network ACL"
   - Add inbound rules:
     - Rule #: 100, Type: HTTP, Source: `0.0.0.0/0`, Allow
     - Rule #: 110, Type: HTTPS, Source: `0.0.0.0/0`, Allow
     - Rule #: 120, Type: Custom TCP, Port range: 1024-65535, Source: `0.0.0.0/0`, Allow
   - Add outbound rules:
     - Rule #: 100, Type: All traffic, Destination: `0.0.0.0/0`, Allow
   - Associate with public subnets

3. **Create Network ACL for Private Subnets**
   - Name: "KGC-Private-NACL"
   - VPC: Select your KGC-VPC
   - Click "Create network ACL"
   - Add inbound rules:
     - Rule #: 100, Type: HTTP, Source: `10.0.0.0/16`, Allow
     - Rule #: 110, Type: HTTPS, Source: `10.0.0.0/16`, Allow
     - Rule #: 120, Type: Custom TCP, Port range: 1024-65535, Source: `0.0.0.0/0`, Allow
   - Add outbound rules:
     - Rule #: 100, Type: All traffic, Destination: `0.0.0.0/0`, Allow
   - Associate with private subnets

4. **Create Network ACL for Isolated Subnets**
   - Name: "KGC-Isolated-NACL"
   - VPC: Select your KGC-VPC
   - Click "Create network ACL"
   - Add inbound rules:
     - Rule #: 100, Type: PostgreSQL, Source: `10.0.0.0/16`, Allow
     - Rule #: 110, Type: Custom TCP, Port range: 1024-65535, Source: `10.0.0.0/16`, Allow
   - Add outbound rules:
     - Rule #: 100, Type: Custom TCP, Port range: 1024-65535, Destination: `10.0.0.0/16`, Allow
   - Associate with isolated subnets

## Step 4: Set Up VPC Flow Logs

VPC Flow Logs capture information about IP traffic going to and from network interfaces in your VPC.

### Console Instructions

1. **Navigate to VPC Dashboard**
   - Select your KGC-VPC
   - Select the "Flow logs" tab
   - Click "Create flow log"

2. **Configure Flow Log**
   - Filter: "All"
   - Maximum aggregation interval: "1 minute"
   - Destination: "Send to CloudWatch Logs"
   - IAM role: Create a new IAM role or select an existing one
   - Log group name: "KGC-VPC-Flow-Logs"
   - Click "Create flow log"
   
   ![VPC Flow Logs](../images/vpc-flow-logs.png)

### CLI Commands

```bash
# Create CloudWatch Log Group
aws logs create-log-group \
  --log-group-name KGC-VPC-Flow-Logs \
  --region ap-southeast-2

# Create IAM Role for Flow Logs
# (IAM role creation requires multiple commands - see AWS documentation)

# Create Flow Log
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-XXXXXXXX \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-destination "arn:aws:logs:ap-southeast-2:ACCOUNT_ID:log-group:KGC-VPC-Flow-Logs" \
  --deliver-logs-permission-arn "arn:aws:iam::ACCOUNT_ID:role/FlowLogsRole" \
  --region ap-southeast-2
```

## Step 5: Configure AWS PrivateLink for AWS Services

AWS PrivateLink provides private connectivity between VPCs, AWS services, and on-premises networks.

### Console Instructions

1. **Create VPC Endpoints for Required Services**
   - In the VPC Dashboard, select "Endpoints" from the left navigation
   - Click "Create endpoint"
   - Service category: "AWS services"
   - Search for and select the following services:
     - `com.amazonaws.ap-southeast-2.s3`
     - `com.amazonaws.ap-southeast-2.dynamodb`
     - `com.amazonaws.ap-southeast-2.secretsmanager`
     - `com.amazonaws.ap-southeast-2.monitoring` (CloudWatch)
   - VPC: Select your KGC-VPC
   - Select the appropriate private subnets
   - Security group: Select your App Tier security group
   - Policy: "Full access"
   - Click "Create endpoint"

## Step 6: Set Up Direct Connect (Optional for Production)

For production environments, AWS Direct Connect provides a dedicated network connection from your premises to AWS.

### Console Instructions

1. **Request a Direct Connect Connection**
   - Navigate to the Direct Connect console
   - Click "Create Connection"
   - Select "Dedicated Connection"
   - Connection configuration:
     - Name: "KGC-Direct-Connect"
     - Location: Choose the nearest AWS Direct Connect location
     - Port speed: Choose appropriate speed (typically 1Gbps or 10Gbps)
   - Click "Create Connection"

2. **Create a Virtual Private Gateway**
   - Navigate to the VPC Dashboard
   - Select "Virtual Private Gateways" from the left navigation
   - Click "Create Virtual Private Gateway"
   - Name tag: "KGC-VPG"
   - Click "Create Virtual Private Gateway"
   - Select the created gateway and attach it to your KGC-VPC

3. **Create a Direct Connect Gateway**
   - Navigate to the Direct Connect console
   - Select "Direct Connect Gateways" from the left navigation
   - Click "Create Direct Connect Gateway"
   - Name: "KGC-DXGW"
   - ASN: Choose an appropriate ASN
   - Click "Create Direct Connect Gateway"

4. **Create a Virtual Interface**
   - Navigate to the Direct Connect console
   - Select your Direct Connect connection
   - Click "Create Virtual Interface"
   - Type: "Private Virtual Interface"
   - Name: "KGC-Private-VIF"
   - Connection: Select your connection
   - Gateway: Select your Direct Connect Gateway
   - VLAN ID: (provided by your network team)
   - BGP ASN: (your organization's ASN)
   - Complete the remaining fields as required
   - Click "Create Virtual Interface"

## Network Diagram

Here's a visual representation of the complete VPC setup:

```
+------------------------------------------+
|                KGC-VPC                   |
|                                          |
|  +----------------+  +----------------+  |
|  | Public Subnet  |  | Public Subnet  |  |
|  | (AZ-1)         |  | (AZ-2)         |  |
|  |                |  |                |  |
|  | Load Balancer  |  | Load Balancer  |  |
|  +-------+--------+  +--------+-------+  |
|          |                     |          |
|          v                     v          |
|  +-------+--------+  +--------+-------+  |
|  | Private Subnet |  | Private Subnet |  |
|  | (AZ-1)         |  | (AZ-2)         |  |
|  |                |  |                |  |
|  | App Servers    |  | App Servers    |  |
|  +-------+--------+  +--------+-------+  |
|          |                     |          |
|          v                     v          |
|  +-------+--------+  +--------+-------+  |
|  | Isolated Subnet|  | Isolated Subnet|  |
|  | (AZ-1)         |  | (AZ-2)         |  |
|  |                |  |                |  |
|  | Database       |  | Database       |  |
|  +----------------+  +----------------+  |
|                                          |
+------------------------------------------+
```

## Security Considerations

1. **Principle of Least Privilege**: Security groups and NACLs are configured to allow only necessary traffic
2. **Defense in Depth**: Multiple security layers (security groups, NACLs, isolated subnets)
3. **Encryption in Transit**: All traffic within the VPC is secured
4. **Logging and Monitoring**: VPC Flow Logs capture all network activity
5. **Private Connectivity**: VPC Endpoints provide private access to AWS services

## Cost Optimization Tips

1. **NAT Gateway**: Use a single NAT Gateway for development/testing environments
2. **VPC Endpoints**: Reduce data transfer costs by using VPC Endpoints for AWS services
3. **Direct Connect**: Consider Direct Connect only for production environments with high bandwidth requirements
4. **Flow Logs**: Configure appropriate retention periods for flow logs to manage CloudWatch costs

## Next Steps

After completing the VPC and networking setup, proceed to [RDS PostgreSQL Setup](./03-rds-postgresql.md) to configure your database environment.