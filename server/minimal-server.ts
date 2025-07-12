import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || '32cefb92e4c7db972c6672eac3a1b700';

// Admin login endpoint
app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ userId: 1, role: 'admin' }, JWT_SECRET);
    res.json({ 
      success: true, 
      token,
      user: { id: 1, name: 'Admin', role: 'admin' }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log('🚀 KGC Server Started');
  console.log(`📡 Port: ${PORT}`);
  console.log('🌐 Admin Dashboard: http://localhost:5173/login');
  console.log('✅ Ready for testing!');
});