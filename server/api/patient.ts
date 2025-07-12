import express, { Router, Request, Response } from 'express';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Patient routes are active - pong!' });
});

// Add other patient-specific routes here if needed in the future

export default router;
