import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

// Flying crystal icon component for collect animation
const FlyingCrystal = ({ type, startPos, endPos, onComplete }) => {
  return (
    <motion.div
      className="fixed z-tooltip"
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
        className="w-6 h-6 sm:w-8 sm:h-8"
        onError={(e) => {
          e.target.src = '/images/stone_yellow.JPG'
        }}
      />
    </motion.div>
  )
}

const ResourcePanel = () => {
  const { myPlayer, rest, collectAnimations } = useGameStore()
  const { isMobile, isTablet, isPortrait, isLandscape, isDesktop } = useOrientation()
  const [flyingCrystals, setFlyingCrystals] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)
  const previousResourcesRef = useRef(null)

  // Don't show resource panel until player data is loaded
  if (!myPlayer) {
    return null
  }

  // Detect resource changes and trigger collect animations
  useEffect(() => {
    if (!myPlayer || !myPlayer.resources) {
      if (myPlayer?.resources && typeof myPlayer.resources === 'object') {
        previousResourcesRef.current = { ...myPlayer.resources }
      } else {
        previousResourcesRef.current = null
      }
      return
    }

    if (typeof myPlayer.resources !== 'object' || myPlayer.resources === null) {
      previousResourcesRef.current = null
      return
    }

    const previousResources = previousResourcesRef.current

    if (previousResources && typeof previousResources === 'object' && !Array.isArray(previousResources) && myPlayer.resources) {
      const newCrystals = []
      const crystalTypes = ['yellow', 'green', 'blue', 'pink']
      
      try {
        crystalTypes.forEach((type) => {
          const prev = previousResources[type] || 0
          const curr = myPlayer.resources[type] || 0
          const diff = curr - prev
        
          if (diff > 0) {
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
        previousResourcesRef.current = null
      }
      
      if (newCrystals.length > 0) {
        setFlyingCrystals(newCrystals)
      }
    }
    
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
        useGameStore.setState({ collectAnimations: [] })
      }
    }
  }, [collectAnimations])

  const removeFlyingCrystal = (id) => {
    setFlyingCrystals(prev => prev.filter(c => c.id !== id))
  }

  // Get position based on device
  const getPosition = () => {
    if (isMobile && isPortrait) {
      return 'bottom-4 right-3'
    }
    if (isMobile && isLandscape) {
      return 'bottom-3 right-3'
    }
    if (isTablet) {
      return 'bottom-4 right-4'
    }
    return 'top-32 right-4'
  }

  // Total crystals count
  const totalCrystals = myPlayer.resources 
    ? (myPlayer.resources.yellow || 0) + (myPlayer.resources.green || 0) + 
      (myPlayer.resources.blue || 0) + (myPlayer.resources.pink || 0)
    : 0

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

      {/* Resource Panel */}
      <div 
        className={`fixed z-30 ${getPosition()}`}
        data-resource-panel
      >
        {/* Collapsed FAB - Mobile Only */}
        {!isExpanded && isMobile && (
          <motion.button
            onClick={() => setIsExpanded(true)}
            className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold rounded-full shadow-2xl border-2 border-white/20 touch-target w-14 h-14 flex flex-col items-center justify-center"
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="text-lg font-bold leading-none">{myPlayer.points || 0}</div>
            <div className="text-[8px] opacity-80">pts</div>
          </motion.button>
        )}

        {/* Expanded Panel */}
        <AnimatePresence>
          {(isExpanded || !isMobile) && (
            <motion.div
              className={`
                bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border-2 border-gray-300
                ${isMobile && isPortrait 
                  ? 'w-[260px] p-3' 
                  : isMobile && isLandscape
                    ? 'w-[220px] p-2'
                    : isTablet
                      ? 'w-[200px] p-3'
                      : 'w-[200px] p-4'
                }
              `}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {/* Header with close button on mobile */}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className={`font-bold text-gray-800 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Your Resources
                </h3>
                {isMobile && (
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-500 hover:text-gray-700 p-1 -mr-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className={`space-y-2 ${isMobile ? 'sm:space-y-3' : 'space-y-4'}`}>
                {/* Crystals */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-600">Crystals</label>
                    <span className="text-xs text-gray-500">{totalCrystals}/10</span>
                  </div>
                  <CrystalStack 
                    resources={myPlayer.resources} 
                    size={isMobile ? "sm" : "md"} 
                  />
                </div>

                {/* Points */}
                <div className={`
                  bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-center
                  ${isMobile ? 'p-2' : 'p-3'}
                `}>
                  <div className="text-[10px] sm:text-xs text-white/80 mb-0.5">Victory Points</div>
                  <motion.div
                    className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'}`}
                    key={myPlayer.points || 0}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {myPlayer.points || 0}
                  </motion.div>
                </div>

                {/* Point Cards Collected - Compact on mobile */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">
                    Point Cards: {myPlayer.pointCards?.length || 0}
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {Array.isArray(myPlayer.pointCards) && myPlayer.pointCards.length > 0 ? (
                      <>
                        {myPlayer.pointCards.slice(0, isMobile ? 4 : 5).map((card, idx) => (
                          <motion.div
                            key={idx}
                            className={`
                              bg-golem-yellow rounded border border-yellow-600
                              ${isMobile ? 'w-7 h-10' : 'w-10 h-14'}
                            `}
                            title={card?.name || `Card ${idx + 1}`}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: idx * 0.08,
                              type: "spring",
                              stiffness: 200
                            }}
                          />
                        ))}
                        {myPlayer.pointCards.length > (isMobile ? 4 : 5) && (
                          <div className={`
                            bg-gray-300 rounded border border-gray-400 flex items-center justify-center text-[10px] font-bold
                            ${isMobile ? 'w-7 h-10' : 'w-10 h-14'}
                          `}>
                            +{myPlayer.pointCards.length - (isMobile ? 4 : 5)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[10px] text-gray-400">No point cards yet</div>
                    )}
                  </div>
                </div>

                {/* Rest Button */}
                <motion.button
                  onClick={rest}
                  className={`
                    w-full bg-gradient-to-r from-orange-500 to-red-500 
                    text-white font-bold rounded-lg 
                    hover:from-orange-600 hover:to-red-600 
                    transition-all shadow-lg hover:shadow-xl 
                    transform hover:scale-105 touch-target
                    ${isMobile ? 'py-2.5 px-4 text-sm' : 'py-3 px-6'}
                  `}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Rest
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default ResourcePanel
