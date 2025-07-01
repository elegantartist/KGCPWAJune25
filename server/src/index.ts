import express, { Request, Response } from 'express';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`KGCPR backend is listening on port ${PORT}`);
});
