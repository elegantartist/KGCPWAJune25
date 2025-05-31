import { apiRequest } from '../lib/queryClient';

export interface ExerciseWellnessSearchFilters {
  userId?: number;
  category: 'exercise' | 'wellness';
  intensity?: 'low' | 'moderate' | 'high';
  duration?: 'short' | 'medium' | 'long';
  tags?: string[];
  useCPDs?: boolean; // Flag to indicate if CPDs should be considered in search
  additionalContext?: {
    doctorCPD?: string;    // Doctor's exact exercise or wellness plan text
    healthConditions?: string[]; // Health conditions to consider 
  };
  limit?: number; // Limit the number of results
}

export interface ExerciseWellnessResult {
  id?: number;  // Added for favorite videos
  userId?: number;  // Added for favorite videos
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string | null;
  thumbnail_url?: string;
  videoId?: string;  // YouTube video ID
  source_name?: string;
  category: 'exercise' | 'wellness';
  intensity?: 'low' | 'moderate' | 'high';
  duration?: string;
  tags?: string[];  // Tags for categorizing videos
  createdAt?: string;  // For sorting favorites by date
  fitnessAnalysis?: {  // OpenAI analysis
    difficultyLevel?: string;
    targetMuscleGroups?: string[];
    caloriesBurn?: number;
    suitableFor?: string[];
    equipment?: string[];
    healthBenefits?: string[];
    precautions?: string[];
    skillLevel?: string;
    intensityScore?: number;
  };
}

export interface ExerciseWellnessSearchResponse {
  videos: ExerciseWellnessResult[];
  query: string;
  answer?: string;
}

/**
 * Search for exercise and wellness videos with advanced parameters
 */
export async function searchExerciseWellnessVideos(
  filters: ExerciseWellnessSearchFilters
): Promise<ExerciseWellnessSearchResponse> {
  try {
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await apiRequest<ExerciseWellnessSearchResponse>(
        'POST', 
        '/api/exercise-wellness/videos', 
        { ...filters, limit: filters.limit || 10 },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response || !response.videos) {
        console.error('Invalid response format from video search API');
        return { videos: [], query: filters.category };
      }

      // Ensure all video results have a thumbnail_url and other required fields
      const videosWithThumbnails = response.videos.map(video => {
        if (!video.thumbnail_url && video.videoId) {
          // If we have a videoId but no thumbnail, use YouTube's image API
          video.thumbnail_url = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
        } else if (!video.thumbnail_url) {
          // If no thumbnail or videoId, use a YouTube-style placeholder
          video.thumbnail_url = `https://placehold.co/320x180/5a67d8/ffffff?text=${encodeURIComponent(video.category + ": " + video.title.substring(0, 15))}`;
        }
        
        return video;
      });
      
      return {
        videos: videosWithThumbnails,
        query: response.query,
        answer: response.answer
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Video search request timed out');
        throw new Error('Video search request timed out. Please try again.');
      }

      throw error;
    }
  } catch (error: unknown) {
    console.error('Exercise & Wellness video search error:', error);

    // Extract more detailed error message if available
    let errorMessage = 'Failed to search for videos';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      if (errorObj.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Save a video to user's favorites
 */
export async function saveFavoriteEwVideo(userId: number, video: ExerciseWellnessResult): Promise<any> {
  try {
    return await apiRequest('POST', `/api/users/${userId}/favorite-ew-videos`, video);
  } catch (error) {
    console.error('Save favorite E&W video error:', error);
    throw new Error('Failed to save favorite video');
  }
}

/**
 * Get user's favorite E&W videos
 */
export async function getFavoriteEwVideos(userId: number): Promise<ExerciseWellnessResult[]> {
  try {
    return await apiRequest<ExerciseWellnessResult[]>('GET', `/api/users/${userId}/favorite-ew-videos`);
  } catch (error) {
    console.error('Get favorite E&W videos error:', error);
    throw new Error('Failed to retrieve favorite videos');
  }
}

/**
 * Delete a favorite E&W video
 */
export async function deleteFavoriteEwVideo(userId: number, videoId: number): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/users/${userId}/favorite-ew-videos/${videoId}`);
  } catch (error) {
    console.error('Delete favorite E&W video error:', error);
    throw new Error('Failed to delete favorite video');
  }
}

export default {
  searchExerciseWellnessVideos,
  saveFavoriteEwVideo,
  getFavoriteEwVideos,
  deleteFavoriteEwVideo
};