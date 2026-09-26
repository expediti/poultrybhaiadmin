/**
 * Image optimization utility for Poultry Bhai Admin.
 * Handles client-side validation, proportional resizing, and WebP compression
 * before uploading to Supabase Storage.
 */

export interface ImageOptimizationResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
  format: string;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

const MAX_INPUT_FILE_SIZE = 15 * 1024 * 1024; // 15MB max file selection

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Supported: JPG, PNG, WebP, GIF, AVIF.`,
    };
  }

  if (file.size > MAX_INPUT_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum supported size is 15 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Resize and compress image client-side to WebP.
 * Default maxDimension is 1200px (high-res for desktop & mobile retina product cards).
 */
export async function optimizeProductImage(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<ImageOptimizationResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // Calculate scaled dimensions keeping aspect ratio
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      // Draw onto canvas
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2D context creation failed for image processing.'));
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Attempt WebP output first
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            const originalSize = file.size;
            const optimizedSize = webpBlob.size;
            const reduction = originalSize > 0
              ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100))
              : 0;

            resolve({
              blob: webpBlob,
              width: targetWidth,
              height: targetHeight,
              originalSize,
              optimizedSize,
              reductionPercentage: reduction,
              format: 'image/webp',
            });
            return;
          }

          // Fallback to JPEG if WebP export is unsupported
          canvas.toBlob(
            (jpegBlob) => {
              if (!jpegBlob) {
                reject(new Error('Failed to encode image from canvas.'));
                return;
              }

              const originalSize = file.size;
              const optimizedSize = jpegBlob.size;
              const reduction = originalSize > 0
                ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100))
                : 0;

              resolve({
                blob: jpegBlob,
                width: targetWidth,
                height: targetHeight,
                originalSize,
                optimizedSize,
                reductionPercentage: reduction,
                format: 'image/jpeg',
              });
            },
            'image/jpeg',
            quality
          );
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to read image file. Please verify file integrity.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Format bytes into human-readable string (e.g. 1.2 MB, 84 KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
