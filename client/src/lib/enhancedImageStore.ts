// Cross-window/page global variable for image storage
// We use multiple strategies to ensure the image persists

// Create a storage key in the window object for direct access
declare global {
  interface Window {
    __KGC_ENHANCED_IMAGE__: string | null;
  }
}

// Set up the global variable if it doesn't exist
if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__ === undefined) {
  window.__KGC_ENHANCED_IMAGE__ = null;
}

// The store is deliberately robust with multiple fallback mechanisms
class EnhancedImageStore {
  // Static flag to track if we've initialized
  private static initialized = false;
  
  // Make sure we're initialized
  private static initialize() {
    if (EnhancedImageStore.initialized) return;
    
    // Try to load from session storage first (survives page refreshes)
    try {
      const hasFlag = sessionStorage.getItem('kgc_has_image');
      if (hasFlag === 'true') {
        console.log('Found image flag in sessionStorage');
        EnhancedImageStore.initialized = true;
      }
    } catch (e) {
      console.error('Error checking sessionStorage:', e);
    }
    
    EnhancedImageStore.initialized = true;
  }
  
  // Store a new image - focuses on reliability, not localStorage which can fail
  public static setImage(imageUrl: string): void {
    console.log('Setting direct image in memory store');
    
    // Initialize if needed
    EnhancedImageStore.initialize();
    
    // Save directly to window object for direct access across component renders
    if (typeof window !== 'undefined') {
      window.__KGC_ENHANCED_IMAGE__ = imageUrl;
    }
    
    // Try sessionStorage as first backup (has more space than localStorage)
    try {
      // Just store a flag since the image itself may be too large
      sessionStorage.setItem('kgc_has_image', 'true');
    } catch (e) {
      console.warn('Could not save image flag to sessionStorage:', e);
    }
    
    // Try localStorage as a third backup option for persistence if possible
    try {
      localStorage.setItem('kgc_has_image', 'true');
    } catch (e) {
      console.warn('Could not save image flag to localStorage:', e);
    }
  }
  
  // Get the current image with multiple fallback strategies
  public static getImage(): string | null {
    // Initialize if needed
    EnhancedImageStore.initialize();
    
    // First check window object (most reliable, survives between components)
    if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__) {
      return window.__KGC_ENHANCED_IMAGE__;
    }
    
    // For debugging
    console.log('No image found in direct memory store');
    return null;
  }
  
  // Check if we have an image
  public static hasImage(): boolean {
    // Initialize if needed
    EnhancedImageStore.initialize();
    
    // Check window object
    if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__) {
      return true;
    }
    
    // Check session storage
    try {
      if (sessionStorage.getItem('kgc_has_image') === 'true') {
        return true;
      }
    } catch (e) {
      // Ignore errors
    }
    
    // Check localStorage
    try {
      if (localStorage.getItem('kgc_has_image') === 'true') {
        return true;
      }
    } catch (e) {
      // Ignore errors
    }
    
    return false;
  }
  
  // Clear the image
  public static clearImage(): void {
    // Clear window object
    if (typeof window !== 'undefined') {
      window.__KGC_ENHANCED_IMAGE__ = null;
    }
    
    // Clear session storage
    try {
      sessionStorage.removeItem('kgc_has_image');
    } catch (e) {
      // Ignore errors
    }
    
    // Clear localStorage
    try {
      localStorage.removeItem('kgc_has_image');
    } catch (e) {
      // Ignore errors
    }
  }
}

export default EnhancedImageStore;