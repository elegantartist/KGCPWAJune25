// server/services/verificationCodeStorageService.ts
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NODE_ENV = process.env.NODE_ENV || 'development';

interface CodeData {
    code: string;
    userId: number; // Generalize for doctorId or patientId
    identifier: string; // Phone or email
    attempts: number;
    expiresAt: number; // Unix timestamp in ms
    type: 'sms' | 'email_link' | 'setup_token';
    // Add more fields if authTokenService's setupTokens need them
    emailForSetup?: string;
    phoneForSetup?: string;
}

// --- In-Memory Store Implementation (for Development/Testing) ---
class InMemoryStore {
    private store = new Map<string, CodeData>();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Start cleanup only once
        if (!this.cleanupInterval) {
            this.cleanupInterval = setInterval(() => {
                const now = Date.now();
                const keysToDelete: string[] = [];
                this.store.forEach((data, key) => {
                    if (now > data.expiresAt) {
                        keysToDelete.push(key);
                    }
                });
                keysToDelete.forEach(key => this.store.delete(key));
            }, 5 * 60 * 1000); // Clean up every 5 minutes
        }
        console.log('Using In-Memory Code Storage (Development Mode)');
    }

    async set(key: string, data: CodeData, ttlSeconds: number): Promise<void> {
        data.expiresAt = Date.now() + (ttlSeconds * 1000);
        this.store.set(key, data);
    }

    async get(key: string): Promise<CodeData | null> {
        const data = this.store.get(key);
        if (data && Date.now() < data.expiresAt) {
            return data;
        }
        if (data) this.store.delete(key);
        return null;
    }

    async del(key: string): Promise<void> {
        this.store.delete(key);
    }

    async incrementAttempts(key: string, currentCodeData: CodeData, ttlSeconds: number): Promise<void> {
        currentCodeData.attempts++;
        this.store.set(key, { ...currentCodeData, expiresAt: Date.now() + (ttlSeconds * 1000) });
    }
}

// --- Redis Store Implementation (for Production) ---
class RedisStoreClient {
    public client: Redis;
    private isConnected = false;

    constructor() {
        this.client = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
            retryDelayOnFailover: 1000,
            lazyConnect: true
        });

        this.client.on('connect', () => {
            console.log('Redis connected successfully for verification codes.');
            this.isConnected = true;
        });

        this.client.on('error', (err) => {
            console.error('Redis connection error:', err.message);
            this.isConnected = false;
            if (NODE_ENV === 'production') {
                console.error('CRITICAL: Redis is down in production! 2FA verification will be severely impacted.');
            }
        });

        this.client.on('close', () => {
            console.warn('Redis connection closed.');
            this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
            console.log('Redis client reconnecting...');
        });
    }

    async set(key: string, data: CodeData, ttlSeconds: number): Promise<void> {
        if (!this.isConnected && NODE_ENV === 'production') {
            throw new Error('Redis not connected in production, cannot set code.');
        }
        await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    }

    async get(key: string): Promise<CodeData | null> {
        if (!this.isConnected && NODE_ENV === 'production') {
            throw new Error('Redis not connected in production, cannot get code.');
        }
        const storedData = await this.client.get(key);
        return storedData ? JSON.parse(storedData) as CodeData : null;
    }

    async del(key: string): Promise<void> {
        if (!this.isConnected && NODE_ENV === 'production') {
            console.warn('Redis not connected in production, cannot delete code. Code might persist until TTL.');
            return;
        }
        await this.client.del(key);
    }

    async incrementAttempts(key: string, currentCodeData: CodeData, ttlSeconds: number): Promise<void> {
        if (!this.isConnected && NODE_ENV === 'production') {
            throw new Error('Redis not connected in production, cannot increment attempts.');
        }
        currentCodeData.attempts++;
        await this.client.setex(key, ttlSeconds, JSON.stringify(currentCodeData));
    }

    getRedisClient(): Redis | null {
        return this.isConnected ? this.client : null;
    }
}

// --- Unified Service Initialization ---
let activeStorage: InMemoryStore | RedisStoreClient;

// Only use Redis in production if REDIS_URL is properly configured
if (NODE_ENV === 'production' && process.env.REDIS_URL && !process.env.REDIS_URL.includes('localhost')) {
    console.log('🔗 Initializing Redis for production deployment');
    activeStorage = new RedisStoreClient();
} else {
    if (NODE_ENV === 'production') {
        console.warn('⚠️ Redis not configured for cloud deployment - using in-memory storage');
    }
    activeStorage = new InMemoryStore();
}

export class VerificationCodeStorageService {
    private static getCodeKey(userId: number, identifier: string, type: CodeData['type']): string {
        return `2fa:${type}:${userId}:${identifier}`;
    }

    private static getSetupTokenKey(token: string): string {
        return `setup_token:${token}`;
    }

    /**
     * Sets a verification code or setup token.
     */
    static async setCode(
        userId: number,
        identifier: string,
        code: string,
        expiryMs: number,
        type: CodeData['type'],
        extraData?: { emailForSetup?: string, phoneForSetup?: string }
    ): Promise<boolean> {
        const key = (type === 'setup_token') ? 
            VerificationCodeStorageService.getSetupTokenKey(identifier) : 
            VerificationCodeStorageService.getCodeKey(userId, identifier, type);
        
        const codeData: CodeData = { 
            code, 
            userId, 
            identifier, 
            attempts: 0, 
            expiresAt: Date.now() + expiryMs, 
            type, 
            ...extraData 
        };
        const ttlSeconds = Math.floor(expiryMs / 1000);

        try {
            await activeStorage.set(key, codeData, ttlSeconds);
            return true;
        } catch (error) {
            console.error(`Error setting code for ${type} in ${NODE_ENV} environment:`, (error as Error).message);
            if (NODE_ENV === 'production') {
                throw new Error(`Critical: Failed to store 2FA code. Auth service unavailable.`);
            }
            return false;
        }
    }

    /**
     * Gets a verification code or setup token.
     */
    static async getCode(
        userId: number,
        identifier: string,
        type: CodeData['type']
    ): Promise<CodeData | null> {
        const key = (type === 'setup_token') ? 
            VerificationCodeStorageService.getSetupTokenKey(identifier) : 
            VerificationCodeStorageService.getCodeKey(userId, identifier, type);
        
        try {
            return await activeStorage.get(key);
        } catch (error) {
            console.error(`Error getting code for ${type} in ${NODE_ENV} environment:`, (error as Error).message);
            if (NODE_ENV === 'production') {
                throw new Error(`Critical: Failed to retrieve 2FA code. Auth service unavailable.`);
            }
            return null;
        }
    }

    /**
     * Deletes a verification code or setup token.
     */
    static async deleteCode(
        userId: number,
        identifier: string,
        type: CodeData['type']
    ): Promise<void> {
        const key = (type === 'setup_token') ? 
            VerificationCodeStorageService.getSetupTokenKey(identifier) : 
            VerificationCodeStorageService.getCodeKey(userId, identifier, type);
        
        try {
            await activeStorage.del(key);
        } catch (error) {
            console.error(`Error deleting code for ${type} in ${NODE_ENV} environment:`, (error as Error).message);
        }
    }

    /**
     * Increments failed attempts for a code and re-sets its expiry.
     */
    static async incrementAttempts(
        userId: number,
        identifier: string,
        type: CodeData['type'],
        currentCodeData: CodeData
    ): Promise<void> {
        const key = (type === 'setup_token') ? 
            VerificationCodeStorageService.getSetupTokenKey(identifier) : 
            VerificationCodeStorageService.getCodeKey(userId, identifier, type);
        
        const remainingExpiryMs = currentCodeData.expiresAt - Date.now();
        const ttlSeconds = Math.max(1, Math.floor(remainingExpiryMs / 1000));

        try {
            await activeStorage.incrementAttempts(key, currentCodeData, ttlSeconds);
        } catch (error) {
            console.error(`Error incrementing attempts for ${type} in ${NODE_ENV} environment:`, (error as Error).message);
            if (NODE_ENV === 'production') {
                throw new Error(`Critical: Failed to update 2FA attempts. Auth service unavailable.`);
            }
        }
    }

    /**
     * Get Redis client for session store (production only)
     */
    static getRedisClient(): Redis | null {
        if (NODE_ENV === 'production' && activeStorage instanceof RedisStoreClient) {
            return activeStorage.getRedisClient();
        }
        return null;
    }
}