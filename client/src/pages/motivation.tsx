import React, { useState, useRef, useCallback, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Sparkles, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Corrected import path
import { useMotivationalImage } from '@/context/MotivationalImageContext';
import { enhanceWithStars } from '@/lib/imageEffects'; // Import the enhancement function

// Helper function to convert Data URL to Blob
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

const MotivationalImageProcessor: React.FC = () => {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null); // Preview of original selected image
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string | null>(null); // Preview of enhanced image
  const [isEnhancing, setIsEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useSimpleToast();
  const { imageSrc: contextImageSrc, isLoadingImage, setImageBlob } = useMotivationalImage();

  useEffect(() => {
    // If an image exists in context and no new file is locally selected, display the context image.
    // This also implies it might have been enhanced before.
    if (contextImageSrc && !selectedImageFile) {
      setOriginalPreviewUrl(null); // Clear original if we are showing context one
      setEnhancedPreviewUrl(contextImageSrc); // Assume context image is the one to show (possibly enhanced)
    } else if (!contextImageSrc && !selectedImageFile) {
      // No image in context and nothing selected, clear previews
      setOriginalPreviewUrl(null);
      setEnhancedPreviewUrl(null);
    }
    // If selectedImageFile is present, local previews are handled by handleFileChange
  }, [contextImageSrc, selectedImageFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setEnhancedPreviewUrl(null); // Clear any previous enhancement when new file is chosen
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImageFile(null);
      setOriginalPreviewUrl(contextImageSrc); // Revert to context image or null
      setEnhancedPreviewUrl(contextImageSrc); // Revert to context image or null
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEnhanceImage = async () => {
    if (!originalPreviewUrl && !contextImageSrc) { // Check if there's any base image to enhance
      toast({ title: "No Image", description: "Please select an image first.", variant: "destructive" });
      return;
    }
    const baseImageForEnhancement = originalPreviewUrl || contextImageSrc;
    if (!baseImageForEnhancement) return;


    setIsEnhancing(true);
    try {
      const enhancedDataUrl = await enhanceWithStars(baseImageForEnhancement);
      setEnhancedPreviewUrl(enhancedDataUrl);
      toast({ title: "Enhanced!", description: "Stars added. Save to keep changes." });
    } catch (error) {
      console.error("Failed to enhance image:", error);
      toast({ title: "Error", description: "Could not enhance image.", variant: "destructive" });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveImage = useCallback(async () => {
    const urlToSave = enhancedPreviewUrl || originalPreviewUrl || contextImageSrc;

    if (!urlToSave) {
      toast({ title: "No Image", description: "Please select or enhance an image to save.", variant: "destructive" });
      return;
    }

    try {
      const blobToSave = dataURLtoBlob(urlToSave);
      await setImageBlob(blobToSave);
      toast({ title: "Success!", description: "Your motivational image has been saved." });
      setSelectedImageFile(null); // Clear local selection after save
      // `enhancedPreviewUrl` will be updated by the context via useEffect if imageSrc changes
    } catch (error) {
      console.error("Failed to save image:", error);
      toast({ title: "Error", description: "Could not save your image. Please try again.", variant: "destructive" });
    }
  }, [enhancedPreviewUrl, originalPreviewUrl, contextImageSrc, setImageBlob, toast]);

  const displayUrl = enhancedPreviewUrl || originalPreviewUrl || contextImageSrc;

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center"><Sparkles className="mr-2 h-6 w-6 text-yellow-500" /> Motivational Image Processor</CardTitle>
            <CardDescription>Upload an image that inspires you. This will be shown during your "Keep Going" sequence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {isLoadingImage && !displayUrl && (
                <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
              )}
              {!isLoadingImage && displayUrl && (
                <img src={displayUrl} alt="Motivational preview" className="w-full h-full object-contain" />
              )}
              {!isLoadingImage && !displayUrl && (
                <p className="text-muted-foreground">Image preview will appear here</p>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={handleUploadClick} variant="outline" className="w-full md:col-span-1" disabled={isLoadingImage || isEnhancing}>
                <Upload className="mr-2 h-4 w-4" /> Select Image
              </Button>
              <Button onClick={handleEnhanceImage} className="w-full md:col-span-1" disabled={(!originalPreviewUrl && !contextImageSrc) || isEnhancing || isLoadingImage}>
                {isEnhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Enhance
              </Button>
              <Button onClick={handleSaveImage} disabled={!displayUrl || isLoadingImage || isEnhancing} className="w-full md:col-span-1">
                {isLoadingImage && displayUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Image
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MotivationalImageProcessor;