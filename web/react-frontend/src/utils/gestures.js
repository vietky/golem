/**
 * Swipe gesture detection utilities
 */

export const detectSwipe = (startX, startY, endX, endY, threshold = 50) => {
  const deltaX = endX - startX
  const deltaY = endY - startY
  
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  
  // Determine if it's a valid swipe
  if (absX < threshold && absY < threshold) {
    return null // Not a swipe, too short
  }
  
  // Determine direction
  if (absX > absY) {
    // Horizontal swipe
    return deltaX > 0 ? 'right' : 'left'
  } else {
    // Vertical swipe
    return deltaY > 0 ? 'down' : 'up'
  }
}

export const calculateVelocity = (distance, time) => {
  if (time === 0) return 0
  return Math.abs(distance / time)
}

export const isQuickSwipe = (velocity, threshold = 0.5) => {
  return velocity > threshold
}

/**
 * Create pan handlers for framer-motion
 */
export const createPanHandlers = (callbacks = {}) => {
  let startX = 0
  let startY = 0
  let startTime = 0
  
  return {
    onPanStart: (event, info) => {
      startX = info.point.x
      startY = info.point.y
      startTime = Date.now()
      
      if (callbacks.onStart) {
        callbacks.onStart(event, info)
      }
    },
    
    onPan: (event, info) => {
      if (callbacks.onPan) {
        callbacks.onPan(event, info)
      }
    },
    
    onPanEnd: (event, info) => {
      const endX = info.point.x
      const endY = info.point.y
      const endTime = Date.now()
      
      const direction = detectSwipe(startX, startY, endX, endY)
      const distance = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
      )
      const velocity = calculateVelocity(distance, endTime - startTime)
      
      if (callbacks.onSwipe && direction) {
        callbacks.onSwipe(direction, velocity, { startX, startY, endX, endY })
      }
      
      if (callbacks.onEnd) {
        callbacks.onEnd(event, info)
      }
    }
  }
}
