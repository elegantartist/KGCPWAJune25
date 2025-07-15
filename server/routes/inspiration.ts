import express from 'express';
import { z } from 'zod';
import { tavilyClient } from '../ai/tavilyClient'; // Assuming Tavily is used for video search

const router = express.Router();

const videoRequestSchema = z.object({
  userId: z.number(),
  cpdDirective: z.string(),
  preferences: z.object({
    cuisinePreferences: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    skillLevel: z.string().optional(),
  }),
});

router.post('/curated-videos', async (req, res) => {
  try {
    const { userId, cpdDirective, preferences } = videoRequestSchema.parse(req.body);

    const searchQueries = [
      `${preferences.skillLevel || ''} ${preferences.cuisinePreferences?.join(' ')} ${cpdDirective} recipes`,
      `${cpdDirective} meal ideas`,
    ];

    let allVideos: any[] = [];
    for (const query of searchQueries) {
      const videos = await tavilyClient.search(query, {
        max_results: 10,
        include_raw_content: false,
        include_answer: false,
      });
      if (videos && videos.results) {
        allVideos = [...allVideos, ...videos.results];
      }
    }

    // De-duplicate and select the best 10
    const uniqueVideos = Array.from(new Map(allVideos.map(v => [v.url, v])).values());
    const curatedVideos = uniqueVideos.slice(0, 10).map((video: any) => ({
      id: video.url,
      title: video.title,
      url: video.url,
      thumbnail_url: video.thumbnail,
      source_name: "YouTube",
      cpdAlignment: true,
      relevanceScore: video.score,
    }));

    res.json(curatedVideos);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    console.error('Error fetching curated videos:', error);
    res.status(500).json({ error: 'Failed to fetch curated videos' });
  }
});

export default router;
