#!/usr/bin/env node

/**
 * KGC Local Development Setup Script
 * This script creates a foolproof local development environment
 * by bypassing all the complex Vite middleware issues.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up KGC for local development...\n');

// 1. Create local environment file
const envContent = `# KGC Local Development Environment
NODE_ENV=development
PORT=8000

# Database (optional for basic functionality)
DATABASE_URL=postgresql://localhost:5432/kgc_local

# OpenAI API (required for chatbot)
OPENAI_API_KEY=your_openai_key_here

# Optional services (can be left as placeholders)
TWILIO_ACCOUNT_SID=optional
TWILIO_AUTH_TOKEN=optional
SENDGRID_API_KEY=optional

# Local development flag (prevents AWS secrets fetch)
LOCAL_DEV=true
`;

fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file for local development');

// 2. Create simplified vite config for local dev
const viteConfigContent = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
`;

fs.writeFileSync('vite.local.config.ts', viteConfigContent);
console.log('✅ Created simplified Vite config');

// 3. Create local development package.json scripts
const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

packageJson.scripts = {
  ...packageJson.scripts,
  "local:backend": "LOCAL_DEV=true tsx server/index.ts",
  "local:frontend": "vite --config vite.local.config.ts",
  "local:install": "npm install",
  "local:start": "echo 'Start backend: npm run local:backend' && echo 'Start frontend: npm run local:frontend'"
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Added local development scripts to package.json');

// 4. Create startup instructions
const instructionsContent = `# KGC Local Development - Quick Start

## Setup (One Time)
1. Run this setup: \`node local-dev-setup.js\`
2. Edit .env file and add your OpenAI API key
3. Install dependencies: \`npm run local:install\`

## Daily Development Workflow

### Terminal 1 - Backend Server
\`\`\`bash
npm run local:backend
\`\`\`
Should show: "serving on port 8000"

### Terminal 2 - Frontend Server  
\`\`\`bash
npm run local:frontend
\`\`\`
Opens: http://localhost:3000

## Troubleshooting

### Port Conflicts
\`\`\`bash
# Kill processes on ports if needed
lsof -i :3000
lsof -i :8000
kill -9 <PID>
\`\`\`

### Clear Cache
\`\`\`bash
rm -rf node_modules
npm cache clean --force
npm install
\`\`\`

### Missing Dependencies
\`\`\`bash
npm run local:install
\`\`\`

## What This Setup Does
- Backend runs on port 8000 (API only, no Vite middleware)
- Frontend runs on port 3000 (separate Vite dev server)
- API calls automatically proxy from frontend to backend
- Bypasses all complex Vite middleware that causes hangs
- Uses LOCAL_DEV flag to skip AWS secrets and Replit-specific features
`;

fs.writeFileSync('LOCAL-DEV-INSTRUCTIONS.md', instructionsContent);
console.log('✅ Created LOCAL-DEV-INSTRUCTIONS.md');

console.log('\n🎉 Local development setup complete!');
console.log('\nNext steps:');
console.log('1. Edit .env file and add your OpenAI API key');
console.log('2. Run: npm install');
console.log('3. Start backend: npm run local:backend');
console.log('4. Start frontend: npm run local:frontend');
console.log('\nSee LOCAL-DEV-INSTRUCTIONS.md for detailed instructions.');