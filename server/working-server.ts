import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

// Enable CORS
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Try to import your actual routes, fall back to basic ones if they fail
let useRealRoutes = false;
try {
  // Test if we can import the real routes
  const { registerRoutes } = require('./routes');
  registerRoutes(app);
  useRealRoutes = true;
  console.log('✅ Using your full Gemini Code Assist routes');
} catch (error) {
  console.log('⚠️  Full routes failed, using basic routes for testing');
  console.log('Error:', error.message);
  
  // Basic routes for testing your admin dashboard
  
  // Admin login
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

  // Admin endpoints
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
    console.log(`Admin impersonating doctor ${doctorIdToImpersonate}`);
    res.json({ message: 'Doctor impersonation set' });
  });

  app.post('/api/admin/set-impersonated-patient', (req: Request, res: Response) => {
    const { patientIdToImpersonate } = req.body;
    console.log(`Admin impersonating patient ${patientIdToImpersonate}`);
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
    console.log('Health scores submitted:', { medicationScore, dietScore, exerciseScore });
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

  // Chat endpoint
  app.post('/api/chat', (req: Request, res: Response) => {
    const { message } = req.body;
    console.log('Chat message:', message);
    res.json({ 
      response: "Thank you for your message. This is a test response from the KGC chatbot. Your actual AI features will work once the full server is running."
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
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'Server running',
    mode: useRealRoutes ? 'Full Gemini Code Assist Features' : 'Basic Testing Mode',
    timestamp: new Date().toISOString()
  });
});

const port = 5000;
app.listen(port, () => {
  console.log(`🚀 KGC Server listening on port ${port}`);
  console.log(`📊 Mode: ${useRealRoutes ? 'Full Features' : 'Testing Mode'}`);
  console.log(`🌐 Admin Dashboard: http://localhost:5173/login`);
  console.log('Ready for impersonation testing!');
});