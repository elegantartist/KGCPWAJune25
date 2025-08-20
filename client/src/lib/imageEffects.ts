// Image enhancement utilities

/**
 * Creates a star shape on a canvas
 */
const drawStar = (
  ctx: CanvasRenderingContext2D, 
  cx: number, 
  cy: number, 
  spikes: number, 
  outerRadius: number, 
  innerRadius: number,
  opacity: number = 0.3
) => {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.globalAlpha = opacity;
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  
  // Create a gradient for the star
  const gradient = ctx.createRadialGradient(cx, cy, innerRadius / 2, cx, cy, outerRadius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 220, 0.7)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.globalAlpha = 1.0; // Reset opacity
};

/**
 * Enhances an image by adding semi-transparent stars with size optimization
 */
export const enhanceWithStars = async (
  originalImageUrl: string,
  numStars: number = 5
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // OPTIMIZATION: Downscale large images to reduce final size
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 400;
      
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions if needed
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
        console.log(`Optimizing image size to ${width}x${height} to reduce file size`);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw the original image, with resizing if needed
      ctx.drawImage(img, 0, 0, width, height);
      
      // Add stars
      for (let i = 0; i < numStars; i++) {
        // Random position within the canvas
        const cx = Math.random() * canvas.width;
        const cy = Math.random() * canvas.height;
        
        // Random size for the star (proportional to image size)
        const maxDimension = Math.max(canvas.width, canvas.height);
        const outerRadius = (Math.random() * 0.1 + 0.05) * maxDimension; // 5-15% of image size
        const innerRadius = outerRadius * 0.4;
        
        // Random number of spikes (5-8)
        const spikes = Math.floor(Math.random() * 4) + 5;
        
        // Random opacity (0.15-0.4)
        const opacity = Math.random() * 0.25 + 0.15;
        
        // Draw the star
        drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, opacity);
      }
      
      // Return the enhanced image as a data URL with lower quality for size reduction
      const enhancedImageUrl = canvas.toDataURL('image/jpeg', 0.6); // Lower quality = smaller file
      
      // Log the file size for debugging
      const fileSizeKB = Math.round(enhancedImageUrl.length / 1024);
      console.log(`Enhanced image size: ${fileSizeKB} KB`);
      
      resolve(enhancedImageUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for enhancement'));
    };
    
    img.src = originalImageUrl;
  });
};