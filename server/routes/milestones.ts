import { Router } from 'express';
import { getMilestoneDataForUser } from '../services/milestoneService';
import { authMiddleware, AuthenticatedRequest } from '../auth';

const milestonesRouter = Router();

milestonesRouter.use(authMiddleware());

// GET /api/milestones - Fetches all milestone data for the logged-in user
milestonesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  try {
    const data = await getMilestoneDataForUser(user.userId);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching milestone data:", error);
    return res.status(500).json({ error: "Internal server error while fetching milestones." });
  }
});

export default milestonesRouter;