import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

// Flying crystal icon component for collect animation
const FlyingCrystal = ({ type, startPos, endPos, onComplete }) => {
  return (
    <motion.div
      className="absolute z-50"
      initial={{
        x: startPos.x,
        y: startPos.y,
        scale: 1,
        opacity: 1
      }}
      animate={{
        x: endPos.x,
        y: endPos.y,
        scale: 0.5,
        opacity: 0
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.6,
        ease: "easeOut"
      }}
      onAnimationComplete={onComplete}
    >
      <img
        src={`/images/stone_${type}.JPG`}
        alt={type}
        className="w-8 h-8"
        onError={(e) => {
          e.target.src = '/images/stone_yellow.JPG'
        }}
      />
    </motion.div>
  )
}

const ResourcePanel = () => {
  const { myPlayer, rest, collectAnimations } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [flyingCrystals, setFlyingCrystals] = useState([])
  const [isCollapsed, setIsCollapsed] = useState(isMobile && isPortrait)
  const previousResourcesRef = useRef(null)

  // Don't show resource panel until player data is loaded
  if (!myPlayer) {
    return null
  }

  // Detect resource changes and trigger collect animations
  useEffect(() => {
    // Early return if player or resources don't exist
    if (!myPlayer || !myPlayer.resources) {
      if (myPlayer?.resources && typeof myPlayer.resources === 'object') {
        previousResourcesRef.current = { ...myPlayer.resources }
      } else {
        previousResourcesRef.current = null
      }
      return
    }

    // Ensure resources is an object
    if (typeof myPlayer.resources !== 'object' || myPlayer.resources === null) {
      previousResourcesRef.current = null
      return
    }

    const previousResources = previousResourcesRef.current

    // Only compare if we have previous resources (must be an object)
    if (previousResources && typeof previousResources === 'object' && !Array.isArray(previousResources) && myPlayer.resources) {
      const newCrystals = []
      
      // Check each crystal type for increases
      const crystalTypes = ['yellow', 'green', 'blue', 'pink']
      try {
        crystalTypes.forEach((type) => {
          const prev = previousResources[type] || 0
          const curr = myPlayer.resources[type] || 0
          const diff = curr - prev
        
        if (diff > 0) {
          // Create flying crystals for each gained crystal
          for (let i = 0; i < diff; i++) {
            const cardElement = document.querySelector('[data-card-source]')
            const panelElement = document.querySelector('[data-resource-panel]')
            
            if (cardElement && panelElement) {
              const cardRect = cardElement.getBoundingClientRect()
              const panelRect = panelElement.getBoundingClientRect()
              
              newCrystals.push({
                id: `${type}-${Date.now()}-${i}`,
                type,
                startPos: {
                  x: cardRect.left + cardRect.width / 2,
                  y: cardRect.top + cardRect.height / 2
                },
                endPos: {
                  x: panelRect.left + panelRect.width / 2,
                  y: panelRect.top + panelRect.height / 2
                }
              })
            }
          }
        }
        })
      } catch (error) {
        console.error('Error in resource comparison:', error)
        // Reset previous resources on error
        previousResourcesRef.current = null
      }
      
      if (newCrystals.length > 0) {
        setFlyingCrystals(newCrystals)
      }
    }
    
    // Only update previous resources if current resources exist and is an object (not array, not null)
    if (myPlayer.resources && typeof myPlayer.resources === 'object' && !Array.isArray(myPlayer.resources) && myPlayer.resources !== null) {
      try {
        previousResourcesRef.current = { ...myPlayer.resources }
      } catch (error) {
        console.error('Error setting previous resources:', error)
        previousResourcesRef.current = null
      }
    }
  }, [myPlayer, myPlayer?.resources])

  // Handle collect animations from store
  useEffect(() => {
    if (!collectAnimations) return
    
    if (Array.isArray(collectAnimations) && collectAnimations.length > 0) {
      const animations = collectAnimations
        .filter(anim => anim && anim.type && anim.from && anim.to)
        .map((anim, idx) => ({
          id: `collect-${Date.now()}-${idx}`,
          type: anim.type,
          startPos: anim.from,
          endPos: anim.to
        }))
      
      if (animations.length > 0) {
        setFlyingCrystals(prev => [...prev, ...animations])
        
        // Clear animations from store
        useGameStore.setState({ collectAnimations: [] })
      }
    }
  }, [collectAnimations])

  const removeFlyingCrystal = (id) => {
    setFlyingCrystals(prev => prev.filter(c => c.id !== id))
  }

  return (
    <>
      {/* Flying crystals overlay */}
      <AnimatePresence>
        {flyingCrystals.map((crystal) => (
          <FlyingCrystal
            key={crystal.id}
            type={crystal.type}
            startPos={crystal.startPos}
            endPos={crystal.endPos}
            onComplete={() => removeFlyingCrystal(crystal.id)}
          />
        ))}
      </AnimatePresence>

      <div 
        className={`fixed z-30 ${
          isMobile && isPortrait 
            ? 'bottom-20 right-2' 
            : 'bottom-24 sm:bottom-28 md:bottom-32 right-2 sm:right-4 md:right-6'
        }`}
        data-resource-panel
      >
        {isCollapsed && isMobile ? (
          /* Collapsed mobile view - compact button */
          <motion.button
            onClick={() => setIsCollapsed(false)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-4 py-3 rounded-xl shadow-2xl border-2 border-white/20 touch-target"
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl font-bold">{myPlayer.points || 0}</div>
              <div className="text-[10px] opacity-90">Points</div>
            </div>
          </motion.button>
        ) : (
          /* Expanded view - full panel */
          <motion.div
            className={`bg-white/95 backdrop-blur-md rounded-xl p-3 sm:p-4 md:p-6 shadow-2xl border-2 border-gray-300 ${
              isMobile && isPortrait ? 'w-[280px]' : 'w-[180px] sm:w-[200px] md:w-auto'
            }`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Header with close button on mobile */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Your Resources</h3>
              {isMobile && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Crystals */}
              <div>
                <label className="text-xs sm:text-sm text-gray-600 mb-2 block">Crystals</label>
                <CrystalStack resources={myPlayer.resources} size={isMobile ? "sm" : "md"} />
              </div>

              {/* Points */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-3 sm:p-4 text-center">
                <div className="text-xs sm:text-sm text-white/80 mb-1">Victory Points</div>
                <motion.div
                  className="text-2xl sm:text-3xl font-bold text-white"
                  key={myPlayer.points || 0}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut"
                  }}
                >
                  {myPlayer.points || 0}
                </motion.div>
              </div>

              {/* Point Cards Collected */}
              <div>
                <label className="text-xs sm:text-sm text-gray-600 mb-2 block">
                  Point Cards: {myPlayer.pointCards?.length || 0}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Array.isArray(myPlayer.pointCards) && myPlayer.pointCards.length > 0 ? (
                    <>
                      {myPlayer.pointCards.slice(0, 5).map((card, idx) => (
                        <motion.div
                          key={idx}
                          className="w-10 h-14 sm:w-12 sm:h-16 bg-golem-yellow rounded border-2 border-yellow-600"
                          title={card?.name || `Card ${idx + 1}`}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            delay: idx * 0.1,
                            type: "spring",
                            stiffness: 200
                          }}
                        />
                      ))}
                      {myPlayer.pointCards.length > 5 && (
                        <div className="w-10 h-14 sm:w-12 sm:h-16 bg-gray-300 rounded border-2 border-gray-400 flex items-center justify-center text-xs font-bold">
                          +{myPlayer.pointCards.length - 5}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400">No point cards yet</div>
                  )}
                </div>
              </div>

              {/* Rest Button */}
              <motion.button
                onClick={rest}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 px-4 sm:px-6 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 touch-target"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Rest
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  )
}

export default ResourcePanel
