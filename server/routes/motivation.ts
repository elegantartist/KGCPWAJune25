import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';

const motivationRouter = Router();

motivationRouter.use(authMiddleware());

// GET /api/motivation/image - Fetches the user's motivational image URL
// This is a placeholder. In a real implementation, this would fetch the URL
// from the user's profile in the database, which would be set by the MIP feature.
motivationRouter.get('/image', async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  try {
    // Placeholder URL. Replace with actual database lookup.
    const imageUrl = `https://images.unsplash.com/photo-1583511655826-05700d52f4d9?q=80&w=1887&auto=format&fit=crop`;

    return res.json({ imageUrl });
  } catch (error) {
    console.error("Error fetching motivational image:", error);
    return res.status(500).json({ error: "Internal server error while fetching motivational image." });
  }
});

export default motivationRouter;