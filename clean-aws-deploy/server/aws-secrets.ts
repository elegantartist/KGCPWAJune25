import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface AppSecrets {
  DATABASE_URL: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  SENDGRID_API_KEY: string;
  TAVILY_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
}

class SecretsManager {
  private client: SecretsManagerClient;
  private secrets: AppSecrets | null = null;
  private secretName: string;

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
    });
    this.secretName = process.env.SECRET_MANAGER_SECRET_NAME || 'kgc-healthcare-app-secrets';
  }

  async getSecrets(): Promise<AppSecrets> {
    if (this.secrets) {
      return this.secrets;
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: this.secretName
      });

      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error('No secret string found');
      }

      this.secrets = JSON.parse(response.SecretString) as AppSecrets;
      
      // Validate required secrets
      if (!this.secrets.DATABASE_URL || !this.secrets.OPENAI_API_KEY || 
          !this.secrets.ANTHROPIC_API_KEY || !this.secrets.SENDGRID_API_KEY) {
        throw new Error('Missing required secrets');
      }

      return this.secrets;
    } catch (error) {
      console.error('Failed to retrieve secrets from AWS Secrets Manager:', error);
      
      // Fallback to environment variables for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Falling back to environment variables for development');
        this.secrets = {
          DATABASE_URL: process.env.DATABASE_URL!,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
          SENDGRID_API_KEY: process.env.SENDGRID_API_KEY!,
          TAVILY_API_KEY: process.env.TAVILY_API_KEY,
          TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
          TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
        };
        return this.secrets;
      }
      
      throw error;
    }
  }

  async getSecret(key: keyof AppSecrets): Promise<string | undefined> {
    const secrets = await this.getSecrets();
    return secrets[key];
  }
}

export const secretsManager = new SecretsManager();