import express, { Router, Request, Response } from 'express';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Admin routes are active - pong!' });
});

// Add other admin-specific routes here if needed in the future

export default router;
