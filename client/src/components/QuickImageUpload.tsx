import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Sparkles } from 'lucide-react';
import EnhancedImageStore from '@/lib/enhancedImageStore';

interface QuickImageUploadProps {
  userId: number;
  onImageSaved?: (imageData: string) => void;
}

const QuickImageUpload: React.FC<QuickImageUploadProps> = ({ userId, onImageSaved }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for saving the motivational image
  const saveImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch(`/api/users/${userId}/motivational-image`, {
        method: 'PUT',
        body: JSON.stringify({ imageData }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to save image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the motivational image query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'motivational-image'] });
    },
  });

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

  const handleUpload = async () => {
    if (!selectedImage || !previewUrl) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Save the image to the database
      await saveImageMutation.mutateAsync(previewUrl);
      
      // Also update global stores for immediate use
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = previewUrl;
      }
      EnhancedImageStore.setImage(previewUrl);
      
      // Notify parent component
      onImageSaved?.(previewUrl);
      
      toast({
        title: "Image uploaded successfully!",
        description: "Your motivational image will now appear when you press Keep Going",
        variant: "default",
      });
      
      // Clear the form
      setSelectedImage(null);
      setPreviewUrl(null);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
          Quick Image Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="image-upload" className="text-sm font-medium">
            Upload your motivational image
          </label>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isUploading}
          />
        </div>
        
        {previewUrl && (
          <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <Button 
          onClick={handleUpload}
          disabled={!selectedImage || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <div className="flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Uploading...
            </div>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Save Image
            </>
          )}
        </Button>
        
        <p className="text-xs text-gray-600">
          This image will appear as an overlay when you use the Keep Going feature
        </p>
      </CardContent>
    </Card>
  );
};

export default QuickImageUpload;