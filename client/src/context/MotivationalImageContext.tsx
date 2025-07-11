import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getMotivationalImage, saveMotivationalImage } from '@/lib/imageStore'; // Assuming imageStore.ts is in lib

interface MotivationalImageContextType {
  imageSrc: string | null; // This will be an object URL
  isLoadingImage: boolean;
  setImageBlob: (blob: Blob | null) => Promise<void>;
  clearImage: () => Promise<void>;
  refreshImage: () => Promise<void>;
}

const MotivationalImageContext = createContext<MotivationalImageContextType | undefined>(undefined);

export const MotivationalImageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  const loadImageFromDB = useCallback(async () => {
    setIsLoadingImage(true);
    try {
      const blob = await getMotivationalImage();
      if (blob && blob.size > 0) { // Check if blob is not null and not empty
        setCurrentBlob(blob);
        const objectURL = URL.createObjectURL(blob);
        setImageSrc(objectURL);
      } else {
        setCurrentBlob(null);
        setImageSrc(null);
      }
    } catch (error) {
      console.error("Error loading motivational image from DB:", error);
      setCurrentBlob(null);
      setImageSrc(null);
    } finally {
      setIsLoadingImage(false);
    }
  }, []);

  useEffect(() => {
    loadImageFromDB();
    // This cleanup function will run when the provider unmounts.
    // It revokes the object URL if one was created.
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load image once on mount

  // This effect specifically handles revoking the *previous* object URL
  // when imageSrc is about to change to a new one.
  useEffect(() => {
    const previousImageSrc = imageSrc;
    return () => {
      if (previousImageSrc && previousImageSrc.startsWith('blob:')) {
        // Only revoke if it's truly being replaced by a new, different URL
        // This check might be tricky if the new imageSrc is set immediately.
        // A more robust way might involve storing the 'current' vs 'next' URL if updates are rapid.
        // For now, this aims to clean up the 'previousImageSrc' when the component re-evaluates due to imageSrc changing.
        // This will be called BEFORE the next imageSrc is rendered if imageSrc changes.
         URL.revokeObjectURL(previousImageSrc);
      }
    };
  }, [imageSrc]);


  const setImageBlob = useCallback(async (blob: Blob | null) => {
    setIsLoadingImage(true);
    const oldImageSrc = imageSrc; // Capture current imageSrc to revoke it

    if (blob && blob.size > 0) {
      try {
        await saveMotivationalImage(blob); // Save to IndexedDB
        setCurrentBlob(blob);
        const objectURL = URL.createObjectURL(blob);
        setImageSrc(objectURL);
      } catch (error) {
        console.error("Error setting motivational image:", error);
        setCurrentBlob(null);
        setImageSrc(null); // Clear src on error
      }
    } else {
      // If blob is null or empty, effectively clear it.
      // Consider what saveMotivationalImage does with a null or empty blob.
      // Assuming it should clear the entry or save an empty marker.
      // For now, let's assume an empty blob means clear.
      await saveMotivationalImage(new Blob([], {type: 'image/png'})); // Save empty blob to clear in DB
      setCurrentBlob(null);
      setImageSrc(null);
    }

    // Revoke the old object URL *after* new one is potentially set or state is cleared
    if (oldImageSrc && oldImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(oldImageSrc);
    }

    setIsLoadingImage(false);
  }, [imageSrc]); // imageSrc is a dependency to manage revocation of the previous URL

  const clearImage = useCallback(async () => {
    await setImageBlob(null);
  }, [setImageBlob]);

  const refreshImage = useCallback(async () => {
    // Revoke current object URL before loading new one
    if (imageSrc && imageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(imageSrc);
      setImageSrc(null); // Clear current src immediately for better UX
    }
    await loadImageFromDB();
  }, [loadImageFromDB, imageSrc]);

  return (
    <MotivationalImageContext.Provider value={{ imageSrc, isLoadingImage, setImageBlob, clearImage, refreshImage }}>
      {children}
    </MotivationalImageContext.Provider>
  );
};

export const useMotivationalImage = (): MotivationalImageContextType => {
  const context = useContext(MotivationalImageContext);
  if (context === undefined) {
    throw new Error('useMotivationalImage must be used within a MotivationalImageProvider');
  }
  return context;
};
