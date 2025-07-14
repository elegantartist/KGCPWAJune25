import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getMotivationalImage, saveMotivationalImage, clearMotivationalImage } from '@/lib/imageStore';

interface MotivationalImageContextType {
  imageUrl: string | null;
  setImageBlob: (blob: Blob) => Promise<void>;
  clearImage: () => Promise<void>;
  isLoading: boolean;
}

const MotivationalImageContext = createContext<MotivationalImageContextType | undefined>(undefined);

export const MotivationalImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      try {
        const blob = await getMotivationalImage();
        if (blob) {
          setImageUrl(URL.createObjectURL(blob));
        } else {
          setImageUrl(null);
        }
      } catch (error) {
        console.error("Failed to load motivational image from store:", error);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadImage();
  }, []);

  const setImageBlob = useCallback(async (blob: Blob) => {
    setIsLoading(true);
    try {
      await saveMotivationalImage(blob);
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      setImageUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Failed to save motivational image:", error);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl]);

  const clearImage = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearMotivationalImage();
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      setImageUrl(null);
    } catch (error) {
      console.error("Failed to clear motivational image:", error);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl]);

  const value = { imageUrl, setImageBlob, clearImage, isLoading };

  return (
    <MotivationalImageContext.Provider value={value}>
      {children}
    </MotivationalImageContext.Provider>
  );
};

export const useMotivationalImage = () => {
  const context = useContext(MotivationalImageContext);
  if (context === undefined) {
    throw new Error('useMotivationalImage must be used within a MotivationalImageProvider');
  }
  return context;
};
