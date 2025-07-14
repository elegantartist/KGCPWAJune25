import React, { useState, useRef, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Sparkles, Save, Loader2 } from 'lucide-react';
import { useSimpleToast } from '@/hooks/simple-toast';
import { useMotivationalImage } from '@/context/MotivationalImageContext';
import { enhanceWithStars } from '@/lib/imageEffects';

// Utility to convert data URL to Blob
const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

const MotivationalImageProcessor: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useSimpleToast();
  const { setImageBlob } = useMotivationalImage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setEnhancedPreviewUrl(null); // Reset enhanced preview when new image is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEnhanceImage = useCallback(async () => {
    if (!previewUrl) {
      toast({ title: "No Image Selected", description: "Please select an image first.", variant: "destructive" });
      return;
    }
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceWithStars(previewUrl);
      setEnhancedPreviewUrl(enhanced);
      toast({ title: "Image Enhanced!", description: "Your image has been enhanced with stars." });
    } catch (error) {
      console.error("Failed to enhance image:", error);
      toast({ title: "Error", description: "Could not enhance your image. Please try again.", variant: "destructive" });
    } finally {
      setIsEnhancing(false);
    }
  }, [previewUrl, toast]);

  const handleSaveImage = useCallback(async () => {
    const imageToSave = enhancedPreviewUrl || previewUrl;

    if (!imageToSave) {
      toast({ title: "No Image Selected", description: "Please select an image to save.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const blob = dataURLtoBlob(imageToSave);
      await setImageBlob(blob);
      toast({ title: "Success!", description: "Your motivational image has been saved." });
    } catch (error) {
      console.error("Failed to save image:", error);
      toast({ title: "Error", description: "Could not save your image. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [enhancedPreviewUrl, previewUrl, toast, setImageBlob]);

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
              {enhancedPreviewUrl || previewUrl ? (
                <img src={enhancedPreviewUrl || previewUrl!} alt="Motivational preview" className="w-full h-full object-contain" />
              ) : (
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button onClick={handleUploadClick} variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" /> Select Image</Button>
              <Button onClick={handleEnhanceImage} disabled={!previewUrl || isEnhancing} className="w-full">
                {isEnhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Enhance
              </Button>
              <Button onClick={handleSaveImage} disabled={!previewUrl || isSaving} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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