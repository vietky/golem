import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '../utils/logger'

const logger = createLogger('useOrientation');

/**
 * Custom hook to detect device orientation and screen size
 * Returns: { isPortrait, isLandscape, isMobile, isTablet, isDesktop, width, height }
 */

// Helper to get initial values (works both SSR and client)
const getOrientationValues = () => {
  if (typeof window === 'undefined') {
    return {
      isPortrait: true,
      isLandscape: false,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      width: 375,
      height: 667,
    }
  }
  
  const width = window.innerWidth
  const height = window.innerHeight
  const isPortrait = height > width
  const isLandscape = width >= height
  
  // Device type detection - matches Tailwind breakpoints
  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1024
  const isDesktop = width >= 1024

  return {
    isPortrait,
    isLandscape,
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
  }
}

const useOrientation = () => {
  // Initialize with actual values instead of false/0
  const [orientation, setOrientation] = useState(getOrientationValues)

  const updateOrientation = useCallback(() => {
    const newValues = getOrientationValues()
    setOrientation(prev => {
      // Only update if values actually changed
      if (
        prev.width !== newValues.width ||
        prev.height !== newValues.height
      ) {
        return newValues
      }
      return prev
    })
  }, [])

  useEffect(() => {
    // Update immediately in case initial render was different
    updateOrientation()

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)
    
    // Also listen to visualViewport changes for mobile browsers
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateOrientation)
    }

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateOrientation)
      }
    }
  }, [updateOrientation])

  // Debug log in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug({
        width: orientation.width,
        height: orientation.height,
        isMobile: orientation.isMobile,
        isTablet: orientation.isTablet,
        isDesktop: orientation.isDesktop,
        isPortrait: orientation.isPortrait,
      })
    }
  }, [orientation.width, orientation.height])

  return orientation
}

export default useOrientation
