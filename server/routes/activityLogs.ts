import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { db } from '../db';
import { keepGoingLogs } from '@shared/schema';
import { secureLog } from '../services/privacyMiddleware';

const activityLogsRouter = Router();

activityLogsRouter.use(authMiddleware());

// POST /api/activity/keep-going - Logs usage of the Keep Going sequence
activityLogsRouter.post('/keep-going', async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    // This should ideally not happen due to authMiddleware, but as a safeguard:
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { triggerContext, notes } = req.body;

  try {
    await db.insert(keepGoingLogs).values({
      userId: user.userId,
      triggerContext: triggerContext,
      notes: notes,
      // timestamp and createdAt will use defaultNow()
    });

    secureLog('Keep Going sequence usage logged.', { userId: user.userId, triggerContext });
    return res.status(201).json({ success: true, message: 'Keep Going usage logged.' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    secureLog('Error logging Keep Going usage.', { userId: user.userId, error: errorMessage });
    console.error("Error logging Keep Going usage:", error);
    return res.status(500).json({ error: "Internal server error while logging usage." });
  }
});

export default activityLogsRouter;
