import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

interface KGCSecrets {
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  SENDGRID_API_KEY: string;
  TAVILY_API_KEY: string;
  PG_PASSWORD: string;
  PG_USER: string;
  PG_HOST: string;
  PG_PORT: string;
  DATABASE_URL: string;
}

class AWSSecretsManager {
  private client: SecretsManagerClient;
  private secrets: KGCSecrets | null = null;
  private secretName = process.env.KGC_SECRET_NAME || "prod/KGC/sec";
  
  constructor() {
    this.client = new SecretsManagerClient({
      region: "us-east-1"
    });
  }

  async getSecrets(): Promise<KGCSecrets> {
    if (this.secrets) {
      return this.secrets;
    }

    try {
      console.log(`[AWS Secrets] Fetching secrets from ${this.secretName}`);
      
      const command = new GetSecretValueCommand({
        SecretId: this.secretName
      });

      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error("Secret string is empty");
      }

      // Parse the JSON secret
      const secretData = JSON.parse(response.SecretString);
      
      // Map AWS secret keys to application environment variables
      // Based on your screenshot, the secret keys are: openaiapi, anthropicapi, etc.
      this.secrets = {
        OPENAI_API_KEY: secretData.openaiapi || secretData.openaikey || secretData.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: secretData.anthropicapi || secretData.anthropickey || secretData.ANTHROPIC_API_KEY,
        TWILIO_ACCOUNT_SID: secretData.twilioaccountsid || secretData.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: secretData.twilioauthtoken || secretData.TWILIO_AUTH_TOKEN,
        SENDGRID_API_KEY: secretData.sendgridapi || secretData.sendgridkey || secretData.SENDGRID_API_KEY,
        TAVILY_API_KEY: secretData.tavilyapi || secretData.tavilykey || secretData.TAVILY_API_KEY,
        PG_PASSWORD: secretData.pgpassword || secretData.PG_PASSWORD,
        PG_USER: secretData.pguser || secretData.PG_USER || 'postgres',
        PG_HOST: secretData.pghost || secretData.PG_HOST,
        PG_PORT: secretData.pgport || secretData.PG_PORT || "5432",
        DATABASE_URL: secretData.database_url || secretData.DATABASE_URL || this.buildDatabaseUrl(secretData)
      };

      console.log('[AWS Secrets] Successfully loaded secrets from AWS Secrets Manager');
      return this.secrets;

    } catch (error) {
      console.error('[AWS Secrets] Error fetching secrets from AWS:', error);
      
      // Fallback to environment variables for development
      if (process.env.NODE_ENV === 'development' || process.env.REPL_ID) {
        console.log('[AWS Secrets] Falling back to environment variables');
        return this.getEnvironmentSecrets();
      }
      
      throw error;
    }
  }

  private buildDatabaseUrl(secretData: any): string {
    const user = secretData.pguser || 'postgres';
    const password = secretData.pgpassword;
    const host = secretData.pghost || 'localhost';
    const port = secretData.pgport || '5432';
    const database = secretData.pgdatabase || 'kgc_healthcare';
    
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  private getEnvironmentSecrets(): KGCSecrets {
    return {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
      TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
      PG_PASSWORD: process.env.PG_PASSWORD || '',
      PG_USER: process.env.PG_USER || 'postgres',
      PG_HOST: process.env.PG_HOST || 'localhost',
      PG_PORT: process.env.PG_PORT || '5432',
      DATABASE_URL: process.env.DATABASE_URL || ''
    };
  }

  async getSecret(key: keyof KGCSecrets): Promise<string> {
    const secrets = await this.getSecrets();
    return secrets[key];
  }
}

// Singleton instance
export const awsSecretsManager = new AWSSecretsManager();

// Helper function for easy access
export async function getKGCSecret(key: keyof KGCSecrets): Promise<string> {
  return awsSecretsManager.getSecret(key);
}

// Initialize all secrets at startup
export async function initializeSecrets(): Promise<KGCSecrets> {
  return awsSecretsManager.getSecrets();
}