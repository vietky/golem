/**
 * CDN Path Utilities
 * Provides functions to generate correct URLs for images and sounds from CDN
 */

const CDN_IMAGES_URL = import.meta.env.VITE_CDN_IMAGES_URL || 'https://statics.vietky.io.vn/images';
const CDN_SOUNDS_URL = import.meta.env.VITE_CDN_SOUNDS_URL || 'https://statics.vietky.io.vn/sounds';

/**
 * Get CDN URL for an image file
 * @param {string} imageName - Image filename or path
 * @returns {string} Full CDN URL for the image
 */
export const getImageUrl = (imageName) => {
  if (!imageName) return `${CDN_IMAGES_URL}/golem_bg.JPG`;
  return `${CDN_IMAGES_URL}/${imageName}`;
}

/**
 * Get CDN URL for a sound file
 * @param {string} soundName - Sound filename or path
 * @returns {string} Full CDN URL for the sound
 */
export const getSoundUrl = (soundName) => {
  if (!soundName) return null;
  return `${CDN_SOUNDS_URL}/${soundName}`;
}

export { CDN_IMAGES_URL, CDN_SOUNDS_URL };
