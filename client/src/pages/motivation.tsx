import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles, Save } from "lucide-react";
import { createHapticFeedback } from "@/lib/soundEffects";
import { enhanceWithStars } from "@/lib/imageEffects";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import KeepGoingVideo from "@/components/motivation/KeepGoingVideo";
import heartImage from "@assets/KGCLady3_1746596042812.jpeg";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Motivation: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [showKeepGoingVideo, setShowKeepGoingVideo] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
        console.log('No saved image found, this is expected for new users');
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
  
  // Check for any stored or saved images on component mount
  useEffect(() => {
    if (savedImage && savedImage.imageData) {
      console.log("Motivation page: Found saved image in database");
      // Only set as preview URL, not enhanced URL, so user can still enhance it
      setPreviewUrl(savedImage.imageData);
      // Don't set enhancedUrl here - let the user enhance it if they want
      
      // Also update the local caches for compatibility with other components
      EnhancedImageStore.setImage(savedImage.imageData);
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }
    } else {
      // Fall back to local storage if no database image
      console.log("Motivation page: Checking local storage");
      const enhancedImage = EnhancedImageStore.getImage();
      
      if (enhancedImage) {
        console.log("Motivation page: Found stored enhanced image");
        setPreviewUrl(enhancedImage);
        // If it's from store, it might be enhanced, but let user decide
      } else {
        console.log("Motivation page: No stored image found");
      }
    }
  }, [savedImage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // Create a URL for the preview
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

    // Reset enhanced image if uploading a new original
    setEnhancedUrl(null);
    
    try {
      // Save the original image to the database immediately
      await saveImageMutation.mutateAsync(previewUrl);
      
      // Also update local storage for immediate access
      EnhancedImageStore.setImage(previewUrl);
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = previewUrl;
      }
      
      // Show success message
      toast({
        title: "Image uploaded successfully",
        description: "Your motivational image has been saved and is ready to use",
        variant: "default",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem saving your image. Please try again.",
        variant: "destructive",
      });
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
  
  // Save the enhanced image and enable it for Keep Going video
  const handleSave = async () => {
    if (!previewUrl || !enhancedUrl) {
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
      // Save the image to the database for permanent storage
      await saveImageMutation.mutateAsync(enhancedUrl);
      
      // Also preserve compatibility with window object for immediate use
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = enhancedUrl;
        console.log("SAVED IMAGE TO GLOBAL WINDOW OBJECT");
      }
      
      // Also save to our enhanced image store for redundancy
      EnhancedImageStore.setImage(enhancedUrl);
      
      // Show success message
      toast({
        title: "Image saved!",
        description: "Your image is now permanently saved and will appear in the Keep Going video",
        variant: "default",
      });
      
      // Show a preview of the Keep Going video with the image
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
      
      // Fall back to local storage only
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = enhancedUrl;
      }
      EnhancedImageStore.setImage(enhancedUrl);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Keep Going Video with enhanced image overlay */}
      {showKeepGoingVideo && (
        <KeepGoingVideo 
          videoId="bKYqK1R19hM" 
          onClose={() => setShowKeepGoingVideo(false)}
          enhancedImageOverlay={true}
        />
      )}
    
      <h1 className="text-2xl font-bold mb-6">Motivational Image Processor</h1>
      
      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-6`}>
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Motivational Image</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Upload an image of a special person, pet, family, or whatever motivates you to maintain a healthier lifestyle.
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
        
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden mb-4">
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
                    <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Enhancing image...</span>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-center text-gray-600 mb-4">
              Enhance your image with motivational effects, then save for the Keep Going experience.
            </p>
            
            {/* Enhance and Save buttons side by side */}
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
};

export default Motivation;