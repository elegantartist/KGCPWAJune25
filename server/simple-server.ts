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

// Mock data for testing
const mockUsers = {
  admin: {
    id: 1,
    name: 'Administrator',
    email: 'admin@keepgoingcare.com',
    role: 'admin'
  },
  doctors: [
    {
      id: 1,
      name: 'Dr. Test Smith',
      email: 'test.doctor@example.com',
      phoneNumber: '+61412345678',
      uin: 'DOC001',
      joinedDate: new Date().toISOString(),
      isActive: true
    }
  ],
  patients: [
    {
      id: 1,
      name: 'John Test Patient',
      email: 'test.patient@example.com',
      uin: 'PAT001',
      joinedDate: new Date().toISOString(),
      isActive: true
    }
  ]
};

// Admin login
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const token = 'admin-token-' + Date.now();
    res.json({
      accessToken: token,
      user: mockUsers.admin,
      message: 'Admin login successful'
    });
  } else {
    res.status(401).json({ message: 'Invalid admin credentials' });
  }
});

// Admin endpoints
app.get('/api/admin/profile', (req: Request, res: Response) => {
  res.json(mockUsers.admin);
});

app.get('/api/admin/stats', (req: Request, res: Response) => {
  res.json({
    doctorCount: mockUsers.doctors.length,
    patientCount: mockUsers.patients.length,
    reportCount: 0
  });
});

app.get('/api/admin/doctors', (req: Request, res: Response) => {
  res.json(mockUsers.doctors);
});

app.get('/api/admin/patients', (req: Request, res: Response) => {
  res.json(mockUsers.patients);
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
  res.json(mockUsers.doctors[0]);
});

app.get('/api/doctor/patients', (req: Request, res: Response) => {
  res.json(mockUsers.patients);
});

// Patient endpoints
app.get('/api/patients/me/dashboard', (req: Request, res: Response) => {
  res.json({
    id: 1,
    userId: 1,
    user: mockUsers.patients[0],
    carePlanDirectives: []
  });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server running' });
});

const port = 5000;
app.listen(port, () => {
  console.log(`KGC Test Server listening on port ${port}`);
  console.log('Ready for impersonation testing!');
});