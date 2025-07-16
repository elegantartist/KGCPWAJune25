import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173', // Vite dev server
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      // Test credentials from Kiro's seeding scripts
      adminEmail: 'admin@kgc.com',
      adminPassword: 'admin123',
      doctorEmail: 'sarah.johnson@kgc.com',
      doctorPassword: 'doctor123',
      patientEmail: 'john.smith@example.com',
      patientPassword: 'patient123'
    }
  },
});
