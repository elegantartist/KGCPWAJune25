import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
// This will allow the client at a different origin (e.g., localhost:5173) to make requests
app.use(cors());

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`KGCPR backend is listening on port ${PORT}`);
});
