# Component Code Reference
## Complete React Component Implementation for Keep Going Care

### 1. Daily Self-Scores Component
*File: `client/src/components/DailySelfScores.tsx`*

```tsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface DailySelfScoresProps {
  userId: number;
  onComplete?: () => void;
}

interface HealthScores {
  physical: number;
  mental: number;
  nutrition: number;
}

export function DailySelfScores({ userId, onComplete }: DailySelfScoresProps) {
  const [scores, setScores] = useState<HealthScores>({
    physical: 5,
    mental: 5,
    nutrition: 5,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: HealthScores) => {
      const response = await fetch('/api/patient-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: userId,
          physicalHealth: data.physical,
          mentalHealth: data.mental,
          nutritionHealth: data.nutrition,
          scoreDate: new Date().toISOString().split('T')[0],
        }),
      });
      if (!response.ok) throw new Error('Failed to submit scores');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Scores submitted successfully!",
        description: "Your daily health scores have been recorded.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patient-scores'] });
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: "There was a problem submitting your scores. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScoreChange = (category: keyof HealthScores, value: number) => {
    setScores(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = () => {
    // Create haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 5, 10]);
    }
    
    mutation.mutate(scores);
  };

  const allScoresEntered = Object.values(scores).every(score => score >= 1 && score <= 10);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-xl">Daily Self-Scores</CardTitle>
        <p className="text-center text-gray-600">
          Rate how you're feeling today on a scale of 1-10
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Physical Health - Green Gradient */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">Physical Health</Label>
          <Slider
            value={[scores.physical]}
            onValueChange={(value) => handleScoreChange('physical', value[0])}
            max={10}
            min={1}
            step={1}
            className="w-full physical-health-slider"
          />
          <div className="text-center">
            <span className="text-3xl font-bold text-green-600">{scores.physical}</span>
            <p className="text-sm text-gray-500 mt-1">
              {scores.physical <= 3 ? "Needs attention" : 
               scores.physical <= 7 ? "Getting better" : "Feeling great!"}
            </p>
          </div>
        </div>

        {/* Mental Health - Blue Gradient */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">Mental Health</Label>
          <Slider
            value={[scores.mental]}
            onValueChange={(value) => handleScoreChange('mental', value[0])}
            max={10}
            min={1}
            step={1}
            className="w-full mental-health-slider"
          />
          <div className="text-center">
            <span className="text-3xl font-bold text-blue-600">{scores.mental}</span>
            <p className="text-sm text-gray-500 mt-1">
              {scores.mental <= 3 ? "Tough day" : 
               scores.mental <= 7 ? "Managing well" : "Feeling positive!"}
            </p>
          </div>
        </div>

        {/* Nutrition - Red Gradient */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">Nutrition</Label>
          <Slider
            value={[scores.nutrition]}
            onValueChange={(value) => handleScoreChange('nutrition', value[0])}
            max={10}
            min={1}
            step={1}
            className="w-full nutrition-slider"
          />
          <div className="text-center">
            <span className="text-3xl font-bold text-red-600">{scores.nutrition}</span>
            <p className="text-sm text-gray-500 mt-1">
              {scores.nutrition <= 3 ? "Room for improvement" : 
               scores.nutrition <= 7 ? "Making progress" : "Eating well!"}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!allScoresEntered || mutation.isPending}
          className="w-full metallic-blue text-white text-lg py-3 mt-8"
        >
          {mutation.isPending ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  fill="none" 
                  className="opacity-25"
                />
                <path 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  className="opacity-75"
                />
              </svg>
              Submitting...
            </div>
          ) : (
            'Submit Today\'s Scores'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 2. Motivational Image Processor Component
*File: `client/src/pages/motivation.tsx`*

```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import heartImage from '@assets/heart-default.png';

export default function Motivation() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [showKeepGoingVideo, setShowKeepGoingVideo] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = 73; // Current user ID

  // Fetch saved motivational image
  const { data: savedImage } = useQuery({
    queryKey: ['/api/users', userId, 'motivational-image'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}/motivational-image`);
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mutation for saving images
  const saveImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch(`/api/users/${userId}/motivational-image`, {
        method: 'PUT',
        body: JSON.stringify({ imageData }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to save image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/users', userId, 'motivational-image'] 
      });
    },
  });

  // Load saved image on component mount
  useEffect(() => {
    if (savedImage && savedImage.imageData) {
      console.log("Motivation page: Found saved image in database");
      setPreviewUrl(savedImage.imageData);
      
      // Update local storage for compatibility
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }
    }
  }, [savedImage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !previewUrl) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    setEnhancedUrl(null);
    
    try {
      await saveImageMutation.mutateAsync(previewUrl);
      
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = previewUrl;
      }
      
      toast({
        title: "Image uploaded successfully",
        description: "Your motivational image has been saved and is ready to use",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was a problem saving your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEnhance = async () => {
    if (!previewUrl) {
      toast({
        title: "No image to enhance",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    
    // Create haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 5, 10]);
    }
    
    setProcessingImage(true);
    
    try {
      const enhanced = await enhanceWithStars(previewUrl);
      setEnhancedUrl(enhanced);
      
      toast({
        title: "Image enhanced!",
        description: "Your image has been enhanced with motivational stars",
        variant: "default",
      });
    } catch (error) {
      console.error('Error enhancing image:', error);
      toast({
        title: "Enhancement failed",
        description: "There was a problem enhancing your image",
        variant: "destructive",
      });
    } finally {
      setProcessingImage(false);
    }
  };

  const handleSave = async () => {
    if (!previewUrl || !enhancedUrl) {
      toast({
        title: "Nothing to save",
        description: "Please upload and enhance an image first",
        variant: "destructive",
      });
      return;
    }
    
    // Create haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 5, 10]);
    }
    
    try {
      await saveImageMutation.mutateAsync(enhancedUrl);
      
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = enhancedUrl;
        console.log("SAVED IMAGE TO GLOBAL WINDOW OBJECT");
      }
      
      toast({
        title: "Image saved!",
        description: "Your image is now permanently saved and will appear in the Keep Going video",
        variant: "default",
      });
      
      // Show preview after save
      setTimeout(() => {
        setShowKeepGoingVideo(true);
      }, 1500);
    } catch (error) {
      console.error("Error saving image to database:", error);
      toast({
        title: "Save error",
        description: "There was a problem saving your image permanently. It's still available for this session.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Motivational Image Processor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Motivational Image</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Upload an image of a special person, pet, family, or whatever motivates you 
              to maintain a healthier lifestyle.
            </p>
            
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="picture">Picture</Label>
                <Input 
                  id="picture" 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              
              <Button 
                onClick={handleUpload}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Upload Image
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden mb-4">
              {enhancedUrl ? (
                <img 
                  src={enhancedUrl} 
                  alt="Enhanced preview" 
                  className="w-full h-full object-cover"
                />
              ) : previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={heartImage} 
                  alt="Default motivation" 
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Loading overlay */}
              {processingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex flex-col items-center text-white">
                    <svg className="animate-spin h-8 w-8 mb-2" viewBox="0 0 24 24">
                      <circle 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4" 
                        fill="none"
                        className="opacity-25"
                      />
                      <path 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      />
                    </svg>
                    <span>Enhancing image...</span>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-center text-gray-600 mb-4">
              Enhance your image with motivational effects, then save for the Keep Going experience.
            </p>
            
            {/* Enhancement buttons */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button 
                className="metallic-blue text-white"
                onClick={handleEnhance}
                disabled={!previewUrl || processingImage}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enhance Image
              </Button>
              
              <Button 
                className="metallic-blue text-white"
                onClick={handleSave}
                disabled={!enhancedUrl || processingImage}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Image enhancement utility function
async function enhanceWithStars(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Optimize size for performance
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
        console.log(`Optimizing image size to ${Math.round(width)}x${Math.round(height)} to reduce file size`);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Add golden stars
      const starCount = 8;
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 15 + Math.random() * 20;
        
        drawStar(ctx, x, y, size);
      }
      
      const result = canvas.toDataURL('image/jpeg', 0.85);
      const sizeKB = Math.round((result.length * 0.75) / 1024);
      console.log(`Enhanced image size: ${sizeKB} KB`);
      
      resolve(result);
    };
    
    img.src = imageUrl;
  });
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.5, '#FFA500');
  gradient.addColorStop(1, '#FF6347');
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;
  
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
```

### 3. Keep Going Feature Component
*File: `client/src/components/keep-going/KeepGoingFeature.tsx`*

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import KeepGoingVideo from '../motivation/KeepGoingVideo';

interface KeepGoingFeatureProps {
  motivationalImage?: string;
}

export function KeepGoingFeature({ motivationalImage }: KeepGoingFeatureProps) {
  const [showVideo, setShowVideo] = useState(false);

  const handleKeepGoingClick = () => {
    // Create haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 5, 10]);
    }
    
    // Play therapeutic sound
    playTherapeuticGong();
    
    // Show video
    setShowVideo(true);
  };

  const playTherapeuticGong = () => {
    try {
      console.log("Initializing gong audio");
      const audio = new Audio('/sounds/therapeutic-gong.wav');
      audio.volume = 0.3;
      audio.preload = 'auto';
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Playing therapeutic gong sound");
          })
          .catch(error => {
            console.log("Gong audio playback failed:", error);
          });
      }
    } catch (error) {
      console.log("Therapeutic gong not available:", error);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center space-y-4">
        <Button
          onClick={handleKeepGoingClick}
          className="metallic-blue text-white text-xl px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 min-h-[120px] min-w-[200px]"
          style={{
            background: motivationalImage 
              ? `linear-gradient(rgba(74, 144, 226, 0.7), rgba(53, 122, 189, 0.7)), url(${motivationalImage})`
              : 'linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #7fb3f0 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="flex flex-col items-center">
            <Heart className="h-8 w-8 mb-2" />
            <span>Keep Going</span>
          </div>
        </Button>
        
        {motivationalImage && (
          <p className="text-sm text-gray-600 text-center">
            Your motivational image is active
          </p>
        )}
      </div>

      {showVideo && (
        <KeepGoingVideo 
          videoId="bKYqK1R19hM"
          onClose={() => setShowVideo(false)}
          enhancedImageOverlay={true}
        />
      )}
    </>
  );
}
```

### 4. CSS Styling Requirements
*File: `client/src/index.css`*

```css
/* Metallic Blue Button Styling */
.metallic-blue {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #7fb3f0 100%);
  border: 1px solid #357abd;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.metallic-blue:hover {
  background: linear-gradient(135deg, #357abd 0%, #2c6aa0 50%, #6b9bd1 100%);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.metallic-blue:active {
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Health Slider Styling */
.physical-health-slider [role="slider"] {
  background: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e);
}

.mental-health-slider [role="slider"] {
  background: linear-gradient(to right, #ef4444, #f97316, #eab308, #3b82f6, #1d4ed8);
}

.nutrition-slider [role="slider"] {
  background: linear-gradient(to right, #ef4444, #f97316, #eab308, #f97316, #ef4444);
}

/* Card Hover Effects */
.feature-card {
  transition: all 0.3s ease;
  transform: translateY(0);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

/* Loading Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1025px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}
```

This complete component reference provides all the React components, styling, and implementation details needed to recreate the exact functionality and appearance of the Keep Going Care application.