import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { milestoneService } from '../services/milestoneService';
import { logger } from '../lib/logger';

const patientRouter = Router();

// All routes in this file are for authenticated patients
patientRouter.use(authMiddleware(['patient']));

/**
 * GET /api/patient/milestones
 * Fetches the patient's earned badges and their progress towards the next ones.
 */
patientRouter.get('/milestones', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    logger.info('Fetching milestones for user', { userId });
    const milestoneStatus = await milestoneService.getMilestoneStatus(userId);
    res.json(milestoneStatus);
  } catch (error) {
    // Pass the error to the centralized error handler
    next(error);
  }
});

export default patientRouter;