/**
 * Client-side image compressor utility.
 * Reduces file sizes of avatars and banners to a few KB (using Canvas WebP/JPEG compression)
 * before uploading to Cloudinary, saving bandwidth, storage, and speeding up real-time chats.
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercentage: number;
}

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/webp' | 'image/jpeg';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Compresses an image file by resizing dimensions and applying lossy WebP/JPEG compression.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const originalSize = file.size;

  // If not an image, return original untouched
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      reductionPercentage: 0
    };
  }

  // Preserve animated GIFs if they are already reasonable size (< 1.5MB)
  if (file.type === 'image/gif' && file.size < 1.5 * 1024 * 1024) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      reductionPercentage: 0
    };
  }

  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    mimeType = 'image/webp'
  } = options;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down proportionally if exceeding limits
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          savedBytes: 0,
          reductionPercentage: 0
        });
        return;
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt to export in preferred mime type (webp or jpeg)
      const exportType = mimeType;
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              savedBytes: 0,
              reductionPercentage: 0
            });
            return;
          }

          // If compression didn't actually reduce the size (e.g. tiny 2KB icon), keep original
          if (blob.size >= originalSize) {
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              savedBytes: 0,
              reductionPercentage: 0
            });
            return;
          }

          const ext = exportType === 'image/webp' ? '.webp' : '.jpg';
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}${ext}`, {
            type: exportType,
            lastModified: Date.now()
          });

          const compressedSize = compressedFile.size;
          const savedBytes = Math.max(0, originalSize - compressedSize);
          const reductionPercentage = Math.round((savedBytes / originalSize) * 100);

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize,
            savedBytes,
            reductionPercentage
          });
        },
        exportType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        savedBytes: 0,
        reductionPercentage: 0
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Specifically optimizes an Avatar (PFP).
 * Scales to max 320x320 and compresses into ~10-25 KB WebP.
 */
export async function compressAvatar(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 320,
    maxHeight: 320,
    quality: 0.8,
    mimeType: 'image/webp'
  });
}

/**
 * Specifically optimizes a Banner image.
 * Scales to max 1200x500 and compresses into ~30-60 KB WebP.
 */
export async function compressBanner(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 500,
    quality: 0.78,
    mimeType: 'image/webp'
  });
}
