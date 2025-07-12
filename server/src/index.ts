import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'Backend is running' });
});

// Basic admin login endpoint for testing
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const adminUser = {
      id: 1,
      name: 'Administrator',
      email: 'admin@keepgoingcare.com',
      role: 'admin'
    };
    
    // Simple token for testing
    const token = 'admin-token-' + Date.now();
    
    res.json({
      accessToken: token,
      user: adminUser,
      message: 'Admin login successful'
    });
  } else {
    res.status(401).json({ message: 'Invalid admin credentials' });
  }
});

// Basic admin profile endpoint
app.get('/api/admin/profile', (req: Request, res: Response) => {
  res.json({
    id: 1,
    name: 'Administrator',
    email: 'admin@keepgoingcare.com',
    role: 'admin'
  });
});

// Basic stats endpoint
app.get('/api/admin/stats', (req: Request, res: Response) => {
  res.json({
    doctorCount: 0,
    patientCount: 0,
    reportCount: 0
  });
});

// Basic doctors endpoint
app.get('/api/admin/doctors', (req: Request, res: Response) => {
  res.json([]);
});

// Basic patients endpoint
app.get('/api/admin/patients', (req: Request, res: Response) => {
  res.json([]);
});

app.listen(PORT, () => {
  console.log(`KGCPR backend is listening on port ${PORT}`);
});
