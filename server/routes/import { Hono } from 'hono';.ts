import { Hono } from 'hono';
import { getMilestoneDataForUser } from '../services/milestoneService';
import { authMiddleware } from '../middleware/auth';

const milestonesRouter = new Hono();

milestonesRouter.use('/*', authMiddleware);

// GET /api/milestones - Fetches all milestone data for the logged-in user
milestonesRouter.get('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const data = await getMilestoneDataForUser(user.id);
  return c.json(data);
});

export default milestonesRouter;