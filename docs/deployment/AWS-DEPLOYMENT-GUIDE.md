# Keep Going Care AWS Deployment Guide

This guide provides detailed instructions for deploying the Keep Going Care application to AWS and running it locally.

## Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- PostgreSQL database
- AWS account with appropriate permissions
- API keys for required services (OpenAI, Anthropic, etc.)

## Building the Application

The application is already set up with build scripts in `package.json`:

```bash
# Install dependencies
npm install

# Create production build
npm run build
```

This will generate optimized files in the `dist` directory, ready for deployment.

## Running Locally

To run the build locally:

1. Create a `.env` file in the root directory with the following variables:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
TAVILY_API_KEY=your_tavily_key
SENDGRID_API_KEY=your_sendgrid_key
```

2. Start the application:

```bash
NODE_ENV=production node dist/index.js
```

## Deploying to AWS

### Option 1: AWS Elastic Beanstalk

Elastic Beanstalk provides an easy way to deploy and manage your application.

1. **Install the AWS EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize your EB application**:
   ```bash
   eb init keep-going-care --platform node.js --region us-east-1
   ```

3. **Create an EB environment**:
   ```bash
   eb create keep-going-care-production
   ```

4. **Set environment variables**:
   Configure environment variables in the Elastic Beanstalk console or using the CLI:
   ```bash
   eb setenv NODE_ENV=production DATABASE_URL=your_db_url OPENAI_API_KEY=your_key ANTHROPIC_API_KEY=your_key
   ```

5. **Deploy the application**:
   ```bash
   eb deploy
   ```

### Option 2: AWS EC2

For more control over your deployment:

1. **Launch an EC2 instance**:
   - Recommended instance type: t3.small or larger
   - Use Amazon Linux 2 AMI

2. **Set up the server**:
   ```bash
   # Update packages
   sudo yum update -y
   
   # Install Node.js
   curl -sL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs
   
   # Install Git
   sudo yum install -y git
   ```

3. **Clone or upload your application**:
   ```bash
   git clone your-repository-url
   ```
   
   Or upload your built application to the server.

4. **Configure environment variables**:
   Create a `.env` file in your application directory with the necessary environment variables.

5. **Start the application**:
   ```bash
   npm install --production
   NODE_ENV=production node dist/index.js
   ```

6. **Set up a process manager (PM2)**:
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start your application with PM2
   pm2 start dist/index.js --name keep-going-care
   
   # Configure PM2 to start on server boot
   pm2 startup
   pm2 save
   ```

### Option 3: AWS App Runner

For a fully managed service without server configuration:

1. **Build your application locally**:
   ```bash
   npm run build
   ```

2. **Create a ZIP file of your application**:
   ```bash
   zip -r keep-going-care.zip dist node_modules package.json
   ```

3. **Create an App Runner service**:
   - Go to the AWS App Runner console
   - Create a new service
   - Upload your ZIP file
   - Configure environment variables
   - Set the start command to `node dist/index.js`

## Database Configuration

1. **Use Amazon RDS for PostgreSQL**:
   - Create a PostgreSQL instance in RDS
   - Configure security groups to allow access from your application
   - Use the RDS endpoint in your DATABASE_URL

2. **Migrate your database**:
   ```bash
   # If using Drizzle ORM
   npm run db:push
   ```

## Configuring HTTPS

1. **Set up a custom domain**:
   - Register a domain or use an existing one
   - Create a certificate using AWS Certificate Manager
   - Configure your Elastic Beanstalk environment or EC2 instance with the certificate

2. **For EC2, set up NGINX as a reverse proxy**:
   ```bash
   # Install NGINX
   sudo yum install -y nginx
   
   # Configure NGINX as a reverse proxy
   sudo vi /etc/nginx/conf.d/keep-going-care.conf
   ```

   Add the following configuration:
   ```
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable and start NGINX:
   ```bash
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

## Monitoring and Scaling

1. **Set up CloudWatch Alarms**:
   - Create alarms for CPU usage, memory, and other metrics
   - Configure notifications for when thresholds are exceeded

2. **Auto Scaling (for Elastic Beanstalk)**:
   - Configure auto-scaling in the Elastic Beanstalk console
   - Set minimum and maximum instance counts
   - Define scaling triggers based on metrics

## Security Considerations

1. **IAM Roles and Policies**:
   - Create IAM roles with least privilege
   - Use IAM roles for EC2 instances and Elastic Beanstalk environments

2. **Security Groups**:
   - Restrict inbound traffic to necessary ports
   - Limit outbound traffic as needed

3. **Secrets Management**:
   - Use AWS Secrets Manager or Parameter Store for sensitive values
   - Don't hardcode secrets in your application code

## Troubleshooting

1. **Check application logs**:
   - In Elastic Beanstalk: `eb logs`
   - In EC2: Check `/var/log/nodejs/application.log` or use `pm2 logs`

2. **Verify environment variables**:
   - Ensure all required variables are set
   - Check for typos in connection strings and API keys

3. **Database connectivity issues**:
   - Verify security groups allow access from your application
   - Test database connection from EC2 instance
   
## Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)