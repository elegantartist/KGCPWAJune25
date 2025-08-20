# AWS Environment Variables Setup

## CRITICAL: Set These Environment Variables in AWS Elastic Beanstalk

After deploying, you MUST configure these environment variables in AWS Console:

### Required for Application to Start:
1. **DATABASE_URL** - Your PostgreSQL connection string
2. **SENDGRID_API_KEY** - For email PIN authentication
3. **OPENAI_API_KEY** - For AI chatbot features
4. **ANTHROPIC_API_KEY** - For AI analysis features

### How to Set in AWS:
1. Go to Elastic Beanstalk Console
2. Select your KGC environment
3. Click "Configuration" > "Software"
4. Scroll to "Environment properties"
5. Add each variable with its value

### Optional (for full functionality):
- **TAVILY_API_KEY** - For search features
- **TWILIO_ACCOUNT_SID** - For SMS features
- **TWILIO_AUTH_TOKEN** - For SMS features  
- **TWILIO_PHONE_NUMBER** - For SMS features

### The application will fail to start without the required environment variables.