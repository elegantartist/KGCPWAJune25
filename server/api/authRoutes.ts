import express, { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../auth'; // Assuming auth.ts is in server root

const router = Router();

// GET /api/auth/status
// Returns the authentication status of the current session.
router.get('/status', authMiddleware({ optional: true }), (req: AuthenticatedRequest, res: Response) => {
  if (req.user && req.session?.user) {
    // User is authenticated if req.user (from token) and req.session.user both exist
    res.json({
      authenticated: true,
      userId: req.user.userId,
      role: req.user.role,
      name: req.user.name,
      sessionId: req.sessionID // Expose session ID for debugging or advanced client use
    });
  } else {
    // User is not authenticated or session is not properly established
    res.json({ authenticated: false });
  }
});

// Placeholder for other auth-related routes that might be separate from the main routes.ts
// For example, if there are specific /api/auth/something_else routes.
// For now, only /status is implemented as required by the tests.

export default router;
