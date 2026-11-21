/**
 * Client-side high-performance image compressor using HTML5 Canvas.
 * Automatically resizes large camera/gallery photos to a maximum dimension
 * and compresses them to high-efficiency WebP/JPEG format to ensure lightning-fast loads.
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.8,
    mimeType = 'image/webp'
  } = options;

  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  // If file is SVG, don't compress vector
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Enable high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob
        const targetType = canvas.toBlob ? mimeType : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Create compressed File preserving original name
            const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const extension = targetType === 'image/webp' ? '.webp' : '.jpg';
            const compressedFile = new File([blob], `${originalBaseName}${extension}`, {
              type: targetType,
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          targetType,
          quality
        );
      };

      img.onerror = () => resolve(file); // Fallback to original file on load failure
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
