import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import 'dotenv/config';

const app = express();

// Enable CORS for client
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Try to load your complete routes system
let routesLoaded = false;
try {
  // Import your actual routes with all Gemini Code Assist features
  const { registerRoutes } = require('./routes');
  
  // Test if we can call registerRoutes
  if (typeof registerRoutes === 'function') {
    console.log('🔄 Loading full KGC routes system...');
    
    // Wrap in async IIFE to handle async routes
    (async () => {
      try {
        await registerRoutes(app);
        routesLoaded = true;
        console.log('✅ Full KGC routes system loaded successfully');
        console.log('🎯 All Gemini Code Assist features active');
      } catch (routeError) {
        console.log('⚠️  Route registration failed:', (routeError as Error).message);
        console.log('🔄 Falling back to essential routes...');
        loadEssentialRoutes();
      }
    })();
  } else {
    throw new Error('registerRoutes is not a function');
  }
} catch (importError) {
  console.log('⚠️  Could not import full routes:', (importError as Error).message);
  console.log('🔄 Loading essential routes for testing...');
  loadEssentialRoutes();
}

// Essential routes for testing (fallback)
function loadEssentialRoutes() {
  // Admin authentication
  app.post('/api/auth/admin-login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
      const token = 'admin-token-' + Date.now();
      res.json({
        accessToken: token,
        user: {
          id: 1,
          name: 'Administrator',
          email: 'admin@keepgoingcare.com',
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  });

  // Admin dashboard endpoints
  app.get('/api/admin/profile', (req: Request, res: Response) => {
    res.json({
      id: 1,
      name: 'Administrator',
      email: 'admin@keepgoingcare.com',
      role: 'admin'
    });
  });

  app.get('/api/admin/stats', (req: Request, res: Response) => {
    res.json({
      doctorCount: 2,
      patientCount: 3,
      reportCount: 5
    });
  });

  app.get('/api/admin/doctors', (req: Request, res: Response) => {
    res.json([
      {
        id: 1,
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@example.com',
        phoneNumber: '+61412345678',
        uin: 'DOC001',
        joinedDate: new Date().toISOString(),
        isActive: true
      },
      {
        id: 2,
        name: 'Dr. Michael Chen',
        email: 'michael.chen@example.com',
        phoneNumber: '+61412345679',
        uin: 'DOC002',
        joinedDate: new Date().toISOString(),
        isActive: true
      }
    ]);
  });

  app.get('/api/admin/patients', (req: Request, res: Response) => {
    res.json([
      {
        id: 1,
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        uin: 'PAT001',
        joinedDate: new Date().toISOString(),
        isActive: true
      },
      {
        id: 2,
        name: 'Bob Wilson',
        email: 'bob.wilson@example.com',
        uin: 'PAT002',
        joinedDate: new Date().toISOString(),
        isActive: true
      },
      {
        id: 3,
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        uin: 'PAT003',
        joinedDate: new Date().toISOString(),
        isActive: true
      }
    ]);
  });

  // Impersonation endpoints
  app.post('/api/admin/set-impersonated-doctor', (req: Request, res: Response) => {
    const { doctorIdToImpersonate } = req.body;
    console.log(`🎭 Admin impersonating doctor ${doctorIdToImpersonate}`);
    res.json({ message: 'Doctor impersonation set' });
  });

  app.post('/api/admin/set-impersonated-patient', (req: Request, res: Response) => {
    const { patientIdToImpersonate } = req.body;
    console.log(`🎭 Admin impersonating patient ${patientIdToImpersonate}`);
    res.json({ message: 'Patient impersonation set' });
  });

  // Doctor endpoints
  app.get('/api/doctor/profile', (req: Request, res: Response) => {
    res.json({
      id: 1,
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phoneNumber: '+61412345678',
      userId: 1
    });
  });

  app.get('/api/doctor/patients', (req: Request, res: Response) => {
    res.json([
      {
        id: 1,
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        phoneNumber: '+61412345680',
        userId: 2,
        doctorId: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        uin: 'PAT001'
      }
    ]);
  });

  app.get('/api/doctor/alerts/count', (req: Request, res: Response) => {
    res.json({ count: 2 });
  });

  // Patient endpoints
  app.get('/api/patients/me/dashboard', (req: Request, res: Response) => {
    res.json({
      id: 1,
      userId: 2,
      user: {
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        createdAt: new Date()
      },
      carePlanDirectives: []
    });
  });

  app.post('/api/patients/me/scores', (req: Request, res: Response) => {
    const { medicationScore, dietScore, exerciseScore } = req.body;
    console.log('📊 Health scores submitted:', { medicationScore, dietScore, exerciseScore });
    res.json({ 
      message: "Scores submitted successfully",
      metric: {
        id: 1,
        medicationScore,
        dietScore,
        exerciseScore,
        date: new Date()
      }
    });
  });

  // Supervisor Agent Chat endpoint
  app.post('/api/chat', (req: Request, res: Response) => {
    const { message } = req.body;
    console.log('💬 Chat message:', message);
    res.json({ 
      response: "Thank you for your message. I'm here to help with your health journey. This is currently running in test mode - your full AI features will be available once the complete system is running."
    });
  });

  // MCA endpoint
  app.post('/api/doctor/mca-access', (req: Request, res: Response) => {
    res.json({
      mcaAccessUrl: 'https://test-mca-url.com/login?token=test123',
      doctorName: 'Dr. Sarah Johnson',
      assignedPatientCount: 3
    });
  });

  console.log('📋 Essential routes loaded for testing');
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'KGC Server Running',
    mode: routesLoaded ? 'Full Production Mode' : 'Essential Testing Mode',
    features: routesLoaded ? [
      'Supervisor Agent with Multi-AI Validation',
      'Memory Systems (Semantic, Episodic, Procedural)',
      'Care Plan Directives (CPD)',
      'Multi-Dashboard Architecture',
      'Database Integration',
      'Authentication & Authorization',
      'MCA Integration',
      'Emergency Alert System',
      'Progress Milestones',
      'Food Database',
      'Image Processing'
    ] : [
      'Admin Dashboard',
      'Doctor Dashboard',
      'Patient Dashboard', 
      'Basic Impersonation',
      'Essential Chat',
      'Health Metrics'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
const port = 5000;
app.listen(port, () => {
  console.log('🚀 Keep Going Care Server Started');
  console.log(`📡 Port: ${port}`);
  console.log(`🌐 Admin Dashboard: http://localhost:5173/login`);
  console.log(`🎯 Mode: ${routesLoaded ? 'Full Production' : 'Essential Testing'}`);
  console.log('✅ Ready for impersonation testing!');
  
  if (!routesLoaded) {
    console.log('');
    console.log('💡 To enable full features:');
    console.log('   1. Fix any remaining compilation errors in routes.ts');
    console.log('   2. Ensure all dependencies are installed');
    console.log('   3. Set up environment variables');
    console.log('   4. Restart the server');
  }
});