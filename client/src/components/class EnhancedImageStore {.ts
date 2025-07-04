class EnhancedImageStore {
  private static readonly key = 'kgc-enhanced-image';

  static setImage(imageData: string) {
    try {
      localStorage.setItem(this.key, imageData);
    } catch (error) {
      console.error("Error saving image to localStorage", error);
    }
  }

  static getImage(): string | null {
    try {
      return localStorage.getItem(this.key);
    } catch (error) {
      console.error("Error getting image from localStorage", error);
      return null;
    }
  }
}

export default new EnhancedImageStore();