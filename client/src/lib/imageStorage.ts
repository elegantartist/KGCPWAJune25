// Simple in-memory storage for motivational images with localStorage backup
type StoredImage = {
  original: string;
  enhanced: string;
  timestamp: Date;
};

class ImageStorage {
  private static instance: ImageStorage;
  private _currentImage: StoredImage | null = null;
  
  // Use getters and setters with localStorage persistence
  private get currentImage(): StoredImage | null {
    // If we don't have an image in memory, try to load from localStorage
    if (this._currentImage === null) {
      this.loadFromLocalStorage();
    }
    return this._currentImage;
  }
  
  private set currentImage(image: StoredImage | null) {
    this._currentImage = image;
    // When setting the image, also save to localStorage
    if (image === null) {
      this.clearFromLocalStorage();
    } else {
      this.saveToLocalStorage(image);
    }
  }

  private constructor() {
    // Try to load the image from localStorage
    this.loadFromLocalStorage();
  }
  
  // Save the actual image to localStorage, split into smaller chunks if needed
  private saveToLocalStorage(image: StoredImage) {
    try {
      // Save each property individually to handle large data URLs
      localStorage.setItem('mip_has_stored_image', 'true');
      localStorage.setItem('mip_original_image', image.original);
      localStorage.setItem('mip_enhanced_image', image.enhanced);
      localStorage.setItem('mip_timestamp', new Date().toISOString());
      console.log('Successfully saved image to localStorage');
    } catch (e) {
      console.error('Failed to save image to localStorage:', e);
    }
  }
  
  // Load the image from localStorage
  private loadFromLocalStorage() {
    try {
      const hasStoredImage = localStorage.getItem('mip_has_stored_image');
      
      if (hasStoredImage === 'true') {
        const original = localStorage.getItem('mip_original_image');
        const enhanced = localStorage.getItem('mip_enhanced_image');
        const timestampStr = localStorage.getItem('mip_timestamp');
        
        if (original && enhanced && timestampStr) {
          this._currentImage = {
            original,
            enhanced,
            timestamp: new Date(timestampStr)
          };
          console.log('Successfully loaded image from localStorage');
        }
      }
    } catch (e) {
      console.error('Failed to load image from localStorage:', e);
    }
  }
  
  // Clear the image from localStorage
  private clearFromLocalStorage() {
    try {
      localStorage.removeItem('mip_has_stored_image');
      localStorage.removeItem('mip_original_image');
      localStorage.removeItem('mip_enhanced_image');
      localStorage.removeItem('mip_timestamp');
      console.log('Successfully cleared image from localStorage');
    } catch (e) {
      console.error('Failed to clear image from localStorage:', e);
    }
  }

  public static getInstance(): ImageStorage {
    if (!ImageStorage.instance) {
      ImageStorage.instance = new ImageStorage();
    }
    return ImageStorage.instance;
  }

  public saveImage(original: string, enhanced: string): void {
    console.log("Saving enhanced image to storage");
    
    // This will automatically save to localStorage through the setter
    this.currentImage = {
      original,
      enhanced,
      timestamp: new Date()
    };
    
    // Verify the image was saved
    console.log("Image saved:", this.currentImage !== null);
  }

  public getCurrentImage(): StoredImage | null {
    console.log("Getting image from global storage, exists:", this.currentImage !== null);
    return this.currentImage;
  }

  public hasStoredImage(): boolean {
    return this.currentImage !== null;
  }

  public clearStoredImage(): void {
    // This will automatically clear localStorage through the setter
    this.currentImage = null;
    console.log("Image storage cleared");
  }
}

export const imageStorage = ImageStorage.getInstance();