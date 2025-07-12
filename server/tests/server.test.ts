import request from 'supertest';
// The Replit advice used '../index.js', but since I'm not using that version of index.ts,
// I will stick to the extensionless import that was working for module resolution before.
import { app, setupApp } from '../index';
import { patientScores, users } from '../src/shared/schema';

describe('Server Tests', () => {
  beforeAll(async () => {
    // Pass the imported 'app' to setupApp, as required by my version of index.ts
    await setupApp(app);
  });

  describe('Basic Server Functionality', () => {
    test('GET /api/ping should return pong', async () => {
      const response = await request(app)
        .get('/api/ping')
        .expect(200);

      expect(response.text).toBe('pong');
    });

    test('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Schema Imports', () => {
    // This test from the Replit advice is a great check
    test('should import patientScores table correctly', () => {
      expect(patientScores).toBeDefined();
      expect(users).toBeDefined();
    });
  });

  describe('Authentication Routes', () => {
    test('GET /api/auth/status should return auth status', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toHaveProperty('authenticated');
    });
  });
});
