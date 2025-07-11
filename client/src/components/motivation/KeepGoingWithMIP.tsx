import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Save, Edit2, Upload, Loader2 } from "lucide-react"; // Added Upload, Loader2
import { createHapticFeedback } from "@/lib/soundEffects";
// import { enhanceWithStars } from "@/lib/imageEffects"; // Enhancement is not a pre-save step
import KeepGoingVideo from "@/components/motivation/KeepGoingVideo";
// import EnhancedImageStore from "@/lib/enhancedImageStore"; // Removed
import heartImage from "@assets/image_1744127067136.jpeg";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Removed
import { useMotivationalImage } from "@/context/MotivationalImageContext"; // Added

// Helper function to convert Data URL to Blob - if not already in a shared util
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Invalid data URL');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

interface KeepGoingWithMIPProps {
  onClose: () => void;
}

const KeepGoingWithMIP: React.FC<KeepGoingWithMIPProps> = ({ onClose }) => {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null); // For immediate preview of selected file
  // const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null); // Client-side enhancement before save removed
  // const [processingImage, setProcessingImage] = useState(false); // For client-side enhancement
  const [showVideo, setShowVideo] = useState(false);
  const [showEditor, setShowEditor] = useState(true); // Default to editor
  const { toast } = useToast();

  const {
    imageSrc: contextImageSrc,
    isLoadingImage: isLoadingContextImage,
    setImageBlob
  } = useMotivationalImage();

  // Effect to initialize view based on context image
  useEffect(() => {
    if (!isLoadingContextImage) {
      if (contextImageSrc) {
        setLocalPreviewUrl(contextImageSrc); // Set preview to existing image from context
        setShowEditor(false); // If image exists, show video by default
        setShowVideo(true);
      } else {
        setShowEditor(true); // No image in context, open editor
        setShowVideo(false);
      }
    }
  }, [contextImageSrc, isLoadingContextImage, showEditor]); // Added showEditor to dependencies

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If file selection is cancelled, revert preview to context image or null
      setLocalPreviewUrl(contextImageSrc);
      setSelectedImageFile(null);
    }
  };

  // Enhancement step removed from save workflow based on clarification
  // const handleEnhance = async () => { ... };

  const handleSave = async () => {
    if (!selectedImageFile && !contextImageSrc) { // Can't save if nothing selected and nothing in context (unless we re-save context)
      toast({
        title: "No Image Selected",
        description: "Please select an image to save.",
        variant: "destructive",
      });
      return;
    }
    
    createHapticFeedback();
    
    let blobToSave: Blob | null = selectedImageFile;

    // If no new file is selected, but there's a localPreviewUrl (could be from context or previous selection)
    // and it's a data URL, convert it to blob. This case is less likely if flow is: select -> save.
    if (!blobToSave && localPreviewUrl && localPreviewUrl.startsWith('data:')) {
        try {
            blobToSave = dataURLtoBlob(localPreviewUrl);
        } catch (e) {
            console.error("Error converting preview URL to blob:", e);
            toast({ title: "Error", description: "Could not process image preview for saving.", variant: "destructive" });
            return;
        }
    }

    if (!blobToSave) {
        toast({ title: "Error", description: "No image data to save.", variant: "destructive" });
        return;
    }
    
    try {
      await setImageBlob(blobToSave); // Save to context (and IndexedDB)
      
      toast({
        title: "Image saved!",
        description: "Your motivational image is now set.",
        variant: "default",
      });
      
      setShowEditor(false);
      setShowVideo(true);
    } catch (error) {
      console.error("Error saving image:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your image. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = () => {
    setShowVideo(false);
    setShowEditor(true);
    // If there's an image in context, set it as the initial preview for editing
    // This allows re-uploading/changing the existing image.
    if (contextImageSrc) {
        setLocalPreviewUrl(contextImageSrc);
    }
    setSelectedImageFile(null); // Clear any previously selected file if user wants to re-edit/re-select
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
          <div className="grid grid-cols-2 gap-4">
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
              onClick={handleEnhance}
              disabled={!previewUrl || processingImage}
              size="lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              <span>Add Stars</span>
            </Button>
            
            <Button 
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
              onClick={handleSave}
              disabled={!enhancedUrl || processingImage}
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              <span>Save & View</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeepGoingWithMIP;