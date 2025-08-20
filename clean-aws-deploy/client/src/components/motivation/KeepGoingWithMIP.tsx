import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Save, Edit2 } from "lucide-react";
import { createHapticFeedback } from "@/lib/soundEffects";
import { enhanceWithStars } from "@/lib/imageEffects";
import KeepGoingVideo from "@/components/motivation/KeepGoingVideo";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import heartImage from "@assets/image_1744127067136.jpeg";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface KeepGoingWithMIPProps {
  onClose: () => void;
}

const KeepGoingWithMIP: React.FC<KeepGoingWithMIPProps> = ({ onClose }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // User ID for demo purposes (in a real app, this would be from auth)
  const userId = 2; // Reuben Collins - Patient
  
  // Query for getting the saved motivational image from the database
  const { data: savedImage, isLoading: isLoadingImage } = useQuery({
    queryKey: ['/api/users', userId, 'motivational-image'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}/motivational-image`);
        if (!response.ok) {
          if (response.status === 404) {
            // No image found, but this is not an error
            return null;
          }
          throw new Error('Failed to fetch motivational image');
        }
        return await response.json();
      } catch (error) {
        console.log('No saved image found in database, this is expected for new users');
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Mutation for saving a new motivational image
  const saveImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      return await fetch(`/api/users/${userId}/motivational-image`, {
        method: 'PUT',
        body: JSON.stringify({ imageData }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      // Invalidate the motivational image query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'motivational-image'] });
    },
  });

  // Check for existing image on mount, prioritizing database, then falling back to local
  useEffect(() => {
    // First try to get image from database
    if (savedImage && savedImage.imageData) {
      console.log("KeepGoingWithMIP: Found image in database");
      setEnhancedUrl(savedImage.imageData);
      setPreviewUrl(savedImage.imageData);
      
      // Also update local stores for redundancy
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }
      EnhancedImageStore.setImage(savedImage.imageData);
      
      // If there's an image and we're not explicitly in editor mode, show the video
      if (!showEditor) {
        setShowVideo(true);
      }
    } 
    // Fallback to window object (for immediate use)
    else if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__) {
      console.log("KeepGoingWithMIP: Found existing image in window object");
      setEnhancedUrl(window.__KGC_ENHANCED_IMAGE__);
      setPreviewUrl(window.__KGC_ENHANCED_IMAGE__);
      
      // If there's already an image, we can show the video immediately
      // unless the user explicitly opens the editor
      if (!showEditor) {
        setShowVideo(true);
      }
    } 
    // Fallback to local storage
    else {
      const imageUrl = EnhancedImageStore.getImage();
      if (imageUrl) {
        console.log("KeepGoingWithMIP: Found image in local storage");
        setEnhancedUrl(imageUrl);
        setPreviewUrl(imageUrl);
        
        // If there's already an image, we can show the video immediately
        // unless the user explicitly opens the editor
        if (!showEditor) {
          setShowVideo(true);
        }
      } else {
        console.log("KeepGoingWithMIP: No existing image found, showing editor");
        // If no image exists, show the editor by default
        setShowEditor(true);
      }
    }
  }, [savedImage, showEditor]);

  // Function to compress image before upload
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 800px width/height)
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      try {
        // Compress the image for preview and upload
        const compressedImage = await compressImage(file);
        setPreviewUrl(compressedImage);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original file
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Enhance the image with stars
  const handleEnhance = async () => {
    if (!previewUrl) {
      toast({
        title: "No image to enhance",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    
    // Create haptic feedback and sound effect
    createHapticFeedback();
    
    // Show loading state
    setProcessingImage(true);
    
    try {
      // Enhance the image with stars
      const enhanced = await enhanceWithStars(previewUrl);
      setEnhancedUrl(enhanced);
      
      // Show success message
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
  
  // Save the enhanced image and show the video
  const handleSave = async () => {
    if (!enhancedUrl) {
      toast({
        title: "Nothing to save",
        description: "Please upload and enhance an image first",
        variant: "destructive",
      });
      return;
    }
    
    // Create haptic feedback and sound effect
    createHapticFeedback();
    
    try {
      // Save to database for permanent storage
      await saveImageMutation.mutateAsync(enhancedUrl);
      console.log("SAVED IMAGE TO DATABASE");
      
      // Also save directly to window object for immediate use
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = enhancedUrl;
        console.log("SAVED IMAGE TO GLOBAL WINDOW OBJECT");
      }
      
      // Also save via our local store for redundancy
      EnhancedImageStore.setImage(enhancedUrl);
      
      // Success message
      toast({
        title: "Image saved!",
        description: "Your image is now permanently saved and will appear in the Keep Going video",
        variant: "default",
      });
      
      // Hide the editor and show the video
      setShowEditor(false);
      setShowVideo(true);
    } catch (error) {
      console.error("Error saving image to database:", error);
      
      // Still save to local storage as fallback
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = enhancedUrl;
      }
      EnhancedImageStore.setImage(enhancedUrl);
      
      toast({
        title: "Image saved locally",
        description: "There was a problem saving your image permanently, but it's available for this session",
        variant: "default",
      });
      
      // Still proceed with showing the video
      setShowEditor(false);
      setShowVideo(true);
    }
  };
  
  // Handle editing the existing image
  const handleEdit = () => {
    // Hide the video and show the editor
    setShowVideo(false);
    setShowEditor(true);
    
    // Create haptic feedback
    createHapticFeedback();
  };
  
  // Function to close the entire component
  const handleClose = () => {
    createHapticFeedback();
    setTimeout(() => onClose(), 500);
  };
  
  // Function when video ends or is closed
  const handleVideoClose = () => {
    setShowVideo(false);
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      {/* Close button (always visible) */}
      <button 
        onClick={handleClose}
        className="absolute top-4 right-4 text-white bg-red-600 rounded-full p-2 z-20"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Show Keep Going video with enhanced image if available */}
      {showVideo && (
        <div className="relative w-full">
          {/* Prominent Edit button overlaid on video */}
          <button
            onClick={handleEdit}
            className="absolute top-4 left-4 z-20 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 shadow-lg flex items-center"
            aria-label="Edit motivational image"
          >
            <Edit2 className="h-5 w-5 mr-2" />
            <span className="font-medium">Edit Image</span>
          </button>
          
          <KeepGoingVideo
            videoId="bKYqK1R19hM"
            onClose={handleVideoClose}
            enhancedImageOverlay={true}
          />
        </div>
      )}
      
      {/* Show MIP editor if needed */}
      {showEditor && (
        <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">Motivational Image Processor</h2>
          
          <p className="text-gray-600 mb-4">
            Upload an image that inspires you to maintain a healthier lifestyle - a loved one, pet, place, 
            or goal. This image will appear as a special effect during your Keep Going experience.
          </p>
          
          {/* Image preview in a nicer frame */}
          <div className="relative w-full h-64 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg overflow-hidden mb-6 shadow-lg border-2 border-blue-200">
            {/* Show enhanced image if available, otherwise show original or default */}
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
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <img 
                  src={heartImage} 
                  alt="Default motivation" 
                  className="w-32 h-32 object-cover rounded-full mb-4 border-4 border-white shadow-md"
                />
                <p className="text-blue-600 font-medium">Select an image to get started</p>
              </div>
            )}
            
            {/* Loading overlay */}
            {processingImage && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center text-white">
                  <svg className="animate-spin h-10 w-10 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg">Adding Motivational Stars...</span>
                </div>
              </div>
            )}
            
            {/* Optional star overlays for visual effect */}
            {!processingImage && !enhancedUrl && (
              <div className="absolute top-2 right-2 text-white opacity-80">
                <Sparkles className="h-6 w-6" />
              </div>
            )}
          </div>
          
          {/* Image upload with clearer instructions */}
          <div className="mb-6">
            <Label htmlFor="picture" className="mb-2 block font-medium text-gray-700">
              Choose Your Motivation
            </Label>
            <Input 
              id="picture" 
              type="file" 
              accept="image/*"
              onChange={handleImageChange}
              className="mb-2 border-blue-200 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500">
              Select a meaningful image to inspire your wellness journey
            </p>
          </div>
          
          {/* Action buttons with clearer guidance */}
          <div className="space-y-3">
            {/* Quick Upload - Primary action */}
            <Button 
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
              onClick={async () => {
                if (previewUrl) {
                  // Save directly without enhancement
                  setEnhancedUrl(previewUrl);
                  await handleSave();
                }
              }}
              disabled={!previewUrl || processingImage}
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              <span>Upload & Use Image</span>
            </Button>
            
            {/* Optional enhancement buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={handleEnhance}
                disabled={!previewUrl || processingImage}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                <span>Add Stars</span>
              </Button>
              
              <Button 
                variant="outline"
                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                onClick={handleSave}
                disabled={!enhancedUrl || processingImage}
              >
                <Save className="h-4 w-4 mr-2" />
                <span>Save Enhanced</span>
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Use "Upload & Use Image" for quick setup, or enhance with stars first
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeepGoingWithMIP;