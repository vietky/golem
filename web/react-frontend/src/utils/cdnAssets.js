/**
 * CDN asset URL utilities
 * Provides centralized management of CDN URLs for images and sounds
 */

// Get the CDN base URL for images
export const getCdnImageUrl = (path) => {
  const baseUrl = import.meta.env.VITE_CDN_IMAGES_URL || 'https://statics.vietky.io.vn/images'
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  return `${baseUrl}/${cleanPath}`
}

// Get the CDN base URL for sounds
export const getCdnSoundUrl = (path) => {
  const baseUrl = import.meta.env.VITE_CDN_SOUNDS_URL || 'https://statics.vietky.io.vn/sounds'
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  return `${baseUrl}/${cleanPath}`
}

// Commonly used image paths
export const cdnImages = {
  // Stone/crystal resources
  stone_yellow: getCdnImageUrl('stone_yellow.JPG'),
  stone_green: getCdnImageUrl('stone_green.JPG'),
  stone_blue: getCdnImageUrl('stone_blue.JPG'),
  stone_pink: getCdnImageUrl('stone_pink.JPG'),
  
  // Background
  background: getCdnImageUrl('background.jpg'),
  
  // Avatars (will be combined with number, e.g., avatar/1.webp)
  getAvatarUrl: (num) => getCdnImageUrl(`avatar/${num}.webp`),
}

// Commonly used sound paths
export const cdnSounds = {
  // Add sound constants here as needed
  // Example: click: getCdnSoundUrl('click.mp3'),
}

export default {
  getCdnImageUrl,
  getCdnSoundUrl,
  cdnImages,
  cdnSounds
}
