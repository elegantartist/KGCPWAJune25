import React, { useState, useRef, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Sparkles, Save } from 'lucide-react';
import { useSimpleToast } from '@/hooks/simple-toast';
import { saveMotivationalImage, getMotivationalImage } from '@/lib/imageStore';

const MotivationalImageProcessor: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useSimpleToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
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

  const handleSaveImage = useCallback(async () => {
    if (!selectedImage) {
      toast({ title: "No Image Selected", description: "Please select an image first.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // In a real implementation, we would first apply the canvas enhancement
      // For now, we save the original image blob.
      await saveMotivationalImage(selectedImage);
      toast({ title: "Success!", description: "Your motivational image has been saved." });
    } catch (error) {
      console.error("Failed to save image:", error);
      toast({ title: "Error", description: "Could not save your image. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [selectedImage, toast]);

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
              {previewUrl ? (
                <img src={previewUrl} alt="Motivational preview" className="w-full h-full object-contain" />
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
            <div className="flex gap-4">
              <Button onClick={handleUploadClick} variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" /> Select Image</Button>
              <Button onClick={handleSaveImage} disabled={!selectedImage || isSaving} className="w-full"><Save className="mr-2 h-4 w-4" /> Save Image</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MotivationalImageProcessor;