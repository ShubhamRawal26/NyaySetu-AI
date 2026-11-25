/**
 * @fileoverview Client-side HTML5 Canvas image downscaling and JPEG compression
 * utility to accelerate multimodal FIR OCR scanning on mobile networks.
 */

/** Maximum pixel dimension (width or height) for pre-OCR image resizing. */
const MAX_OCR_IMAGE_DIMENSION = 1600;

/** Base64 string length threshold below which uncompressed images are kept as-is. */
const SMALL_DATA_URL_CHAR_LIMIT = 1_400_000;

/** JPEG quality factor (0.85) balancing text legibility and payload size. */
const OCR_JPEG_QUALITY = 0.85;

/**
 * Downscales and compresses large smartphone photos in-browser before sending
 * to `/api/fir-ocr`, leaving PDF documents and small images untouched.
 *
 * @param dataUrl - Base64 Data URL of the selected image or PDF.
 * @param mimeType - Original MIME type of the file.
 * @returns Optimized Data URL and resulting MIME type.
 */
export function optimizeImageForOcr(
  dataUrl: string,
  mimeType: string
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    if (mimeType === 'application/pdf') {
      resolve({ dataUrl, mimeType });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const scale = Math.min(
        1,
        MAX_OCR_IMAGE_DIMENSION / Math.max(img.width || 1, img.height || 1)
      );
      if (scale === 1 && dataUrl.length < SMALL_DATA_URL_CHAR_LIMIT) {
        resolve({ dataUrl, mimeType });
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, mimeType });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', OCR_JPEG_QUALITY);
        resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
      } catch {
        resolve({ dataUrl, mimeType });
      }
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });
}
