import { useState, useEffect } from 'react'

/**
 * Custom hook to detect device orientation and screen size
 * Returns: { isPortrait, isLandscape, isMobile, isTablet, isDesktop, width, height }
 */
const useOrientation = () => {
  const [orientation, setOrientation] = useState({
    isPortrait: false,
    isLandscape: false,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isPortrait = height > width
      const isLandscape = width > height
      
      // Device type detection
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024

      setOrientation({
        isPortrait,
        isLandscape,
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
      })
    }

    // Initial check
    updateOrientation()

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return orientation
}

export default useOrientation
