/**
 * Image utilities for handling Cloudinary URLs and fallbacks
 */

import Image5 from "@/src/assets/images/image_food.svg";

/**
 * Ensures a Cloudinary URL is properly formatted
 * @param url - The image URL from the API
 * @param cloudName - The Cloudinary cloud name (optional, can be inferred)
 * @returns A properly formatted Cloudinary URL or fallback string
 */
export function normalizeCloudinaryUrl(url: string | null | undefined, cloudName?: string): string {
  // Return fallback string path for null/undefined/empty URLs
  if (!url || (typeof url !== 'string') || url.trim() === '') {
    // Return the .src property if available (for StaticImageData), otherwise empty string
    return typeof Image5 === 'object' && 'src' in Image5 ? Image5.src : '';
  }

  // If URL is already a complete Cloudinary URL, return as-is
  if (url.startsWith('https://res.cloudinary.com/')) {
    return url;
  }

  // If URL starts with image/upload/ (CloudinaryField format without domain)
  if (url.startsWith('image/upload/')) {
    const cloud = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dw8aaadi6';
    const fullUrl = `https://res.cloudinary.com/${cloud}/${url}`;
    return fullUrl;
  }

  // If URL is a relative Cloudinary path, construct the full URL
  if (url.includes('/image/upload/')) {
    // Extract the path part after '/image/upload/'
    const pathMatch = url.match(/\/image\/upload\/(.+)$/);
    if (pathMatch) {
      const cloudinaryPath = pathMatch[1];
      // Use provided cloud name or try to infer from environment
      const cloud = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dw8aaadi6';
      const fullUrl = `https://res.cloudinary.com/${cloud}/image/upload/${cloudinaryPath}`;
      return fullUrl;
    }
  }

  // If URL looks like a direct image upload path (starts with version)
  if (url.match(/^v\d+\//)) {
    const cloud = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dw8aaadi6';
    const fullUrl = `https://res.cloudinary.com/${cloud}/image/upload/${url}`;
    return fullUrl;
  }

  // If URL is a public ID without path
  if (url.match(/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i)) {
    const cloud = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dw8aaadi6';
    const fullUrl = `https://res.cloudinary.com/${cloud}/image/upload/${url}`;
    return fullUrl;
  }

  // If URL is a valid HTTP(S) URL but not Cloudinary, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If URL is a relative path, return fallback
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return Image5;
  }

  // For any other case, try to construct a Cloudinary URL
  const cloud = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dw8aaadi6';
  const fallbackUrl = `https://res.cloudinary.com/${cloud}/image/upload/${url}`;
  return fallbackUrl;
}

/**
 * Gets the appropriate image URL with fallback handling
 * @param product - Product object with image fields
 * @returns A valid image URL or fallback
 */
export function getProductImageUrl(product: any): string {
  // Try main_image_url first, then main_image, then fallback
  const imageUrl = product?.main_image_url || product?.main_image || '';
  return normalizeCloudinaryUrl(imageUrl);
}

/**
 * Optimizes a Cloudinary URL with transformations
 * @param url - The Cloudinary URL
 * @param width - Desired width
 * @param height - Desired height
 * @param quality - Image quality (1-100)
 * @returns Optimized Cloudinary URL
 */
export function optimizeCloudinaryUrl(
  url: string, 
  width?: number, 
  height?: number, 
  quality: number = 80
): string {
  // Only optimize if it's a Cloudinary URL
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Build transformation string
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push('f_auto'); // Auto format selection

  const transformString = transformations.join(',');

  // Insert transformations into URL
  return url.replace('/image/upload/', `/image/upload/${transformString}/`);
}