// Simple local development server that bypasses all Vite middleware complexity
import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import cors from 'cors';

const app = express();

// CORS for local development
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Register API routes
registerRoutes(app);

// Simple health check for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.json({
    message: 'KGC Backend Running - Local Development Mode',
    status: 'Backend server running successfully',
    port: 8000,
    frontend: 'Start frontend with: npm run local:frontend',
    api_docs: 'API available at /api/*'
  });
});

const PORT = 8000;
console.log(`🌐 KGC Backend starting on port ${PORT} (Local Development Mode)`);

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`🔧 Frontend should run on http://localhost:3000`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/*`);
});