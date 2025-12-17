import React, { useState, useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'
import { getVietnameseCardName, getCardImagePath } from '../utils/cardNames'

const Card = ({ 
  card, 
  type, 
  index, 
  cost = null, 
  isPlayable = false, 
  isAffordable = false, 
  onClick, 
  isPlaying = false,
  onDragStart,
  onDragEnd,
  dragConstraints,
  isDragging = false,
  size = 'auto' // 'auto', 'sm', 'md', 'lg'
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const longPressTimer = useRef(null)
  const LONG_PRESS_MS = 800
  const [isClicked, setIsClicked] = useState(false)
  const [isInvalidAction, setIsInvalidAction] = useState(false)
  const { setSelectedCard, selectedCard, invalidAction } = useGameStore()
  const { isMobile, isTablet, isPortrait, isLandscape } = useOrientation()
  const controls = useAnimation()

  // Card type colors for glow effects
  const cardTypeGlowColors = {
    produce: '#6AA84F',  // Green
    upgrade: '#3C78D8',   // Blue
    trade: '#E06666',     // Pink
    points: '#FFD966',    // Yellow
  }

  const cardTypeColors = {
    produce: 'border-golem-green',
    upgrade: 'border-golem-blue',
    trade: 'border-golem-pink',
    points: 'border-golem-yellow',
  }

  const cardTypeLabels = {
    produce: 'PRODUCE',
    upgrade: 'UPGRADE',
    trade: 'TRADE',
    points: 'POINTS',
  }

  const actionType = card?.actionType !== undefined 
    ? ['produce', 'upgrade', 'trade'][card.actionType] 
    : type === 'point' ? 'points' : 'produce'

  // Get responsive card size classes
  const getCardSizeClasses = () => {
    if (size === 'sm') {
      return 'w-full min-w-[120px] max-w-[140px]'
    }
    if (size === 'lg') {
      return 'w-full min-w-[200px] max-w-[240px]'
    }
    // Auto sizing based on device
    if (isMobile && isPortrait) {
      return 'w-full min-w-[140px] max-w-[180px]'
    }
    if (isMobile && isLandscape) {
      return 'w-full min-w-[120px] max-w-[160px]'
    }
    if (isTablet) {
      return 'w-full min-w-[150px] max-w-[180px]'
    }
    // Desktop
    return 'w-full min-w-[160px] max-w-[220px]'
  }

  // Get image height classes
  const getImageHeightClasses = () => {
    if (isMobile && isPortrait) {
      return 'min-h-[180px] max-h-[220px]'
    }
    if (isMobile && isLandscape) {
      return 'min-h-[140px] max-h-[180px]'
    }
    if (isTablet) {
      return 'min-h-[200px] max-h-[260px]'
    }
    return 'min-h-[220px] max-h-[300px]'
  }

  // Invalid action shake animation
  useEffect(() => {
    if (invalidAction === card?.name) {
      setIsInvalidAction(true)
      controls.start({
        x: [0, -8, 8, -8, 8, 0],
        transition: { duration: 0.3, ease: "easeInOut" }
      })
      setTimeout(() => {
        setIsInvalidAction(false)
        controls.start({ x: 0 })
      }, 300)
    }
  }, [invalidAction, card?.name, controls])

  // Click animation - disabled
  useEffect(() => {
    if (isClicked) {
      setTimeout(() => setIsClicked(false), 100)
    }
  }, [isClicked])

  // Playing animation - disabled for simplicity
  useEffect(() => {
    // No animation needed
  }, [isPlaying])

  const handleClick = () => {
    if (onClick && cost && !isAffordable) {
      setIsInvalidAction(true)
      controls.start({
        x: [0, -8, 8, -8, 8, 0],
        transition: { duration: 0.3, ease: "easeInOut" }
      })
      setTimeout(() => {
        setIsInvalidAction(false)
        controls.start({ x: 0 })
      }, 300)
      return
    }

    setIsClicked(true)
    if (onClick) {
      onClick(index)
    } else {
      setSelectedCard(card)
    }
  }

  const startLongPress = (e) => {
    if (e) e.persist && e.persist()
    clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      setIsHovered(true)
    }, LONG_PRESS_MS)
  }

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current)
    // On mobile, also clear hover state when touch ends
    if (isMobile) {
      setTimeout(() => setIsHovered(false), 100)
    }
  }

  const isSelected = selectedCard?.name === card?.name
  const glowColor = cardTypeGlowColors[actionType] || '#FFD966'

  return (
    <motion.div
      className={`
        card-base 
        ${cardTypeColors[actionType] || ''} 
        ${isPlayable ? 'border-green-500 ring-2 ring-green-300' : ''} 
        ${isAffordable ? 'border-blue-500 ring-2 ring-blue-300' : ''} 
        ${isSelected ? 'ring-4 ring-yellow-400' : ''}
        ${getCardSizeClasses()}
      `}
      onHoverStart={() => !isMobile && setIsHovered(true)}
      onHoverEnd={() => !isMobile && setIsHovered(false)}
      onMouseDown={(e) => startLongPress(e)}
      onMouseUp={() => cancelLongPress()}
      onTouchStart={(e) => startLongPress(e)}
      onTouchEnd={() => cancelLongPress()}
      onClick={handleClick}
      animate={controls}
      whileHover={!isMobile ? {
        y: -6,
        transition: { duration: 0.15, ease: "easeOut" }
      } : {}}
      whileTap={{ 
        scale: 0.97,
        transition: { duration: 0.1 }
      }}
      drag={onDragStart && !isMobile ? true : false}
      dragConstraints={dragConstraints}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      dragElastic={0.2}
      whileDrag={{
        scale: 1.05,
        y: -10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        transition: { duration: 0.15 }
      }}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'pointer',
        willChange: 'transform'
      }}
    >
      {/* Deposits Tooltip - Show on top of card */}
      {card?.deposits && Object.keys(card.deposits).length > 0 && (() => {
        const crystalCounts = {}
        let totalDeposits = 0
        Object.values(card.deposits).forEach(depositValue => {
          const crystals = typeof depositValue === 'string' ? depositValue.split(',') : [depositValue]
          crystals.forEach(crystalType => {
            const trimmed = crystalType.trim()
            if (trimmed) {
              crystalCounts[trimmed] = (crystalCounts[trimmed] || 0) + 1
              totalDeposits++
            }
          })
        })
        
        const crystalImages = {
          yellow: '/images/stone_yellow.JPG',
          green: '/images/stone_green.JPG',
          blue: '/images/stone_blue.JPG',
          pink: '/images/stone_pink.JPG'
        }
        
        return (
          <motion.div
            className="absolute top-0 left-0 right-0 bg-purple-600/95 backdrop-blur-sm rounded-t-xl p-1.5 sm:p-2 z-30"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-[8px] sm:text-[10px] font-bold text-white mb-1 text-center">
              💎 Deposits ({totalDeposits})
            </div>
            <div className="flex gap-0.5 sm:gap-1 justify-center flex-wrap">
              {Object.entries(crystalCounts).map(([crystalType, count]) => (
                <div key={crystalType} className="relative">
                  <img
                    src={crystalImages[crystalType] || '/images/stone_yellow.JPG'}
                    alt={crystalType}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-white"
                    onError={(e) => {
                      e.target.src = '/images/stone_yellow.JPG'
                    }}
                  />
                  {count > 1 && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-purple-800 text-white text-[6px] sm:text-[8px] w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center font-bold">
                      {count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )
      })()}

      {/* Card Type Badge */}
      <div className={`
        absolute z-20 shadow-lg
        ${card?.deposits && Object.keys(card.deposits).length > 0 
          ? 'top-12 sm:top-14' 
          : 'top-1'
        } 
        left-1 
        px-1 sm:px-1.5 py-0.5 rounded 
        text-[8px] sm:text-[10px] font-bold text-white 
        ${actionType === 'produce' ? 'bg-golem-green' :
          actionType === 'upgrade' ? 'bg-golem-blue' :
          actionType === 'trade' ? 'bg-golem-pink' :
          'bg-golem-yellow text-gray-900'
        }
      `}>
        {cardTypeLabels[actionType]}
      </div>

      {/* Cost Badge */}
      {cost && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] font-bold z-20 shadow-lg">
          {Object.values(cost).reduce((a, b) => a + b, 0)}
        </div>
      )}

      {/* Card Image */}
      <motion.div 
        className={`
          w-full bg-gray-100 rounded-t-xl overflow-hidden 
          flex items-center justify-center p-1 sm:p-2
          ${getImageHeightClasses()}
        `}
        whileHover={!isMobile ? { scale: 1.02 } : {}}
        transition={{ duration: 0.2 }}
      >
        {card?.name && (
          <motion.img
            src={getCardImagePath(card.name)}
            alt={getVietnameseCardName(card.name)}
            className="w-full h-auto object-contain"
            style={{ maxHeight: '100%' }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
            whileHover={!isMobile ? { 
              filter: "brightness(1.1) saturate(1.2)",
              transition: { duration: 0.2 }
            } : {}}
          />
        )}
      </motion.div>

      {/* Card Info */}
      <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1 bg-white/95 rounded-b-xl">
        <h3 className="font-bold text-[10px] sm:text-xs text-gray-800 text-center leading-tight truncate">
          {getVietnameseCardName(card?.name)}
        </h3>

        {cost && (
          <div className="flex justify-center">
            <CrystalStack resources={cost} size={isMobile ? "xs" : "sm"} />
          </div>
        )}

        {type === 'point' && card?.points !== undefined && (
          <div className="text-center">
            <span className="bg-golem-yellow text-gray-900 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold">
              {card.points} Points
            </span>
          </div>
        )}

        {/* Display Deposits */}
        {card?.deposits && Object.keys(card.deposits).length > 0 && (() => {
          const crystalCounts = {}
          let totalDeposits = 0
          Object.values(card.deposits).forEach(depositValue => {
            const crystals = typeof depositValue === 'string' ? depositValue.split(',') : [depositValue]
            crystals.forEach(crystalType => {
              const trimmed = crystalType.trim()
              if (trimmed) {
                crystalCounts[trimmed] = (crystalCounts[trimmed] || 0) + 1
                totalDeposits++
              }
            })
          })
          
          const crystalImages = {
            yellow: '/images/stone_yellow.JPG',
            green: '/images/stone_green.JPG',
            blue: '/images/stone_blue.JPG',
            pink: '/images/stone_pink.JPG'
          }
          
          return (
            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-gray-300">
              <div className="text-[7px] sm:text-[9px] text-gray-600 mb-0.5 sm:mb-1 font-semibold">
                Deposits ({totalDeposits}):
              </div>
              <div className="flex gap-0.5 sm:gap-1 justify-center flex-wrap">
                {Object.entries(crystalCounts).map(([crystalType, count]) => (
                  <div key={crystalType} className="relative">
                    <img
                      src={crystalImages[crystalType] || '/images/stone_yellow.JPG'}
                      alt={crystalType}
                      className="w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover border border-gray-400"
                      onError={(e) => {
                        e.target.src = '/images/stone_yellow.JPG'
                      }}
                    />
                    {count > 1 && (
                      <span className="absolute -bottom-0.5 sm:-bottom-1 -right-0.5 sm:-right-1 bg-purple-500 text-white text-[6px] sm:text-[8px] w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center font-bold">
                        {count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Hover Glow Effect - Desktop only */}
      {isHovered && !isInvalidAction && !isMobile && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 0.8,
            boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}40`
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            border: `2px solid ${glowColor}`,
            borderRadius: '0.75rem'
          }}
        />
      )}

      {/* Long-press Tooltip - Only on desktop or when long-pressed on mobile */}
      {isHovered && (
        <div className={`
          absolute bg-black/95 backdrop-blur-md text-white rounded-lg z-tooltip 
          border border-white/30 shadow-xl
          ${isMobile 
            ? '-top-28 left-1/2 transform -translate-x-1/2 p-2 text-[10px] min-w-[180px]'
            : '-top-36 left-1/2 transform -translate-x-1/2 p-3 text-xs min-w-[220px]'
          }
        `}>
          <div className="font-bold mb-1">{getVietnameseCardName(card?.name)}</div>
          <div className="text-gray-400 text-[9px] sm:text-[10px] mb-1">ID: #{card?.id || index}</div>
          <div className="mb-1">
            <strong>Type:</strong> {actionType.toUpperCase()}
          </div>
          {cost && (
            <div className="text-red-300 text-[9px] sm:text-[10px]">
              Cost: 🟡{cost.yellow || 0} 🟢{cost.green || 0} 🔵{cost.blue || 0} 🟣{cost.pink || 0}
            </div>
          )}
          {type === 'point' && card?.points !== undefined && (
            <div className="text-yellow-300 mt-1">Points: {card.points}</div>
          )}
          {(card?.input || card?.output) && (
            <div className="mt-1 text-[9px] sm:text-xs">
              {card.input && <div className="text-red-300">Input: 🟡{card.input?.yellow||0} 🟢{card.input?.green||0} 🔵{card.input?.blue||0} 🟣{card.input?.pink||0}</div>}
              {card.output && <div className="text-green-300">Output: 🟡{card.output?.yellow||0} 🟢{card.output?.green||0} 🔵{card.output?.blue||0} 🟣{card.output?.pink||0}</div>}
            </div>
          )}
        </div>
      )}

      {/* Invalid Action Feedback */}
      {isInvalidAction && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none border-2 border-red-500"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            boxShadow: [
              "0 0 0px rgba(239, 68, 68, 0)",
              "0 0 30px rgba(239, 68, 68, 0.8)",
              "0 0 0px rgba(239, 68, 68, 0)"
            ]
          }}
          transition={{ duration: 0.3 }}
        />
      )}


    </motion.div>
  )
}

export default Card
