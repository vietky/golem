import React, { useState, useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'
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
  isDragging = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const longPressTimer = useRef(null)
  const LONG_PRESS_MS = 2000
  const [isClicked, setIsClicked] = useState(false)
  const [isInvalidAction, setIsInvalidAction] = useState(false)
  const { setSelectedCard, selectedCard, invalidAction } = useGameStore()
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

  // Invalid action shake animation
  useEffect(() => {
    if (invalidAction === card?.name) {
      setIsInvalidAction(true)
      controls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.3, ease: "easeInOut" }
      })
      setTimeout(() => {
        setIsInvalidAction(false)
        controls.start({ x: 0 })
      }, 300)
    }
  }, [invalidAction, card?.name, controls])

  // Click animation - scale down briefly with flip effect
  useEffect(() => {
    if (isClicked) {
      // Play sound effect placeholder
      console.log("play card sound")
      
      controls.start({
        scale: [1, 0.95, 1],
        rotateY: [0, 180, 360],
        transition: { 
          duration: 0.3,
          ease: "easeInOut"
        }
      })
      setTimeout(() => setIsClicked(false), 300)
    }
  }, [isClicked, controls])

  // Playing animation (pulse effect)
  useEffect(() => {
    if (isPlaying) {
      controls.start({
        scale: [1, 1.05, 1],
        boxShadow: [
          "0 0 0px rgba(40, 167, 69, 0)",
          "0 0 30px rgba(40, 167, 69, 0.8)",
          "0 0 0px rgba(40, 167, 69, 0)"
        ],
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }
      })
    } else {
      controls.start({ scale: 1, boxShadow: "0 0 0px rgba(40, 167, 69, 0)" })
    }
  }, [isPlaying, controls])

  const handleClick = () => {
    // Check if action is invalid (cannot afford)
    if (onClick && cost && !isAffordable) {
      setIsInvalidAction(true)
      controls.start({
        x: [0, -10, 10, -10, 10, 0],
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
  }

  const isSelected = selectedCard?.name === card?.name
  const glowColor = cardTypeGlowColors[actionType] || '#FFD966'

  return (
    <motion.div
      className={`card-base ${cardTypeColors[actionType] || ''} ${
        isPlayable ? 'border-green-500 ring-2 ring-green-300' : ''
      } ${isAffordable ? 'border-blue-500 ring-2 ring-blue-300' : ''} ${
        isSelected ? 'ring-4 ring-yellow-400' : ''
      } w-full min-w-0 sm:min-w-[160px] md:min-w-[200px]`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onMouseDown={(e) => startLongPress(e)}
      onMouseUp={() => cancelLongPress()}
      onTouchStart={(e) => startLongPress(e)}
      onTouchEnd={() => cancelLongPress()}
      onClick={handleClick}
      animate={controls}
      // Hover animation: simplified
      whileHover={{
        y: -8,
        transition: { duration: 0.15, ease: "easeOut" }
      }}
      // Click animation: scale down 0.95x
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      // Drag & drop support (only if drag handlers provided)
      drag={onDragStart ? true : false}
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
      {(() => {
        const hasDeposits = card?.deposits && Object.keys(card.deposits).length > 0;
        if (hasDeposits) {
          console.log(`[DEBUG Card] Card ${card?.name} (index ${index}) HAS deposits:`, card.deposits);
        }
        return null;
      })()}
      {card?.deposits && Object.keys(card.deposits).length > 0 && (() => {
        // Count crystals by type (now supports stacking: comma-separated values)
        const crystalCounts = {}
        let totalDeposits = 0
        Object.values(card.deposits).forEach(depositValue => {
          // Deposit value can be string (single) or comma-separated string (multiple)
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
            className="absolute top-0 left-0 right-0 bg-purple-600/95 backdrop-blur-sm rounded-t-xl p-2 z-30"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-[10px] font-bold text-white mb-1 text-center">💎 Deposits ({totalDeposits})</div>
            <div className="flex gap-1 justify-center flex-wrap">
              {Object.entries(crystalCounts).map(([crystalType, count]) => (
                <div key={crystalType} className="relative">
                  <img
                    src={crystalImages[crystalType] || '/images/stone_yellow.JPG'}
                    alt={crystalType}
                    className="w-5 h-5 rounded-full object-cover border border-white"
                    onError={(e) => {
                      e.target.src = '/images/stone_yellow.JPG'
                    }}
                  />
                  {count > 1 && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-purple-800 text-white text-[8px] w-3 h-3 rounded-full flex items-center justify-center font-bold">
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
      <div className={`absolute ${card?.deposits && Object.keys(card.deposits).length > 0 ? 'top-16' : 'top-1'} left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white z-20 shadow-lg ${
        actionType === 'produce' ? 'bg-golem-green' :
        actionType === 'upgrade' ? 'bg-golem-blue' :
        actionType === 'trade' ? 'bg-golem-pink' :
        'bg-golem-yellow text-gray-900'
      }`}>
        {cardTypeLabels[actionType]}
      </div>

      {/* Cost Badge */}
      {cost && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold z-20 shadow-lg">
          {Object.values(cost).reduce((a, b) => a + b, 0)}
        </div>
      )}

      {/* Card Image */}
      <motion.div 
        className="w-full min-h-[280px] bg-gray-100 rounded-t-xl overflow-hidden flex items-center justify-center p-2"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {card?.name && (
          <motion.img
            src={getCardImagePath(card.name)}
            alt={getVietnameseCardName(card.name)}
            className="w-full h-auto max-h-[320px]"
            onError={(e) => {
              e.target.src = '/images/golem_bg.JPG'
            }}
            whileHover={{ 
              filter: "brightness(1.1) saturate(1.2)",
              transition: { duration: 0.2 }
            }}
          />
        )}
      </motion.div>

      {/* Card Info */}
      <div className="p-2 space-y-1 bg-white/95 rounded-b-xl">
        <h3 className="font-bold text-xs text-gray-800 text-center leading-tight">
          {getVietnameseCardName(card?.name)}
        </h3>

        {cost && (
          <div className="flex justify-center">
            <CrystalStack resources={cost} size="sm" />
          </div>
        )}

        {type === 'point' && card?.points !== undefined && (
          <div className="text-center">
            <span className="bg-golem-yellow text-gray-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {card.points} Points
            </span>
          </div>
        )}

        {/* Display Deposits */}
        {card?.deposits && Object.keys(card.deposits).length > 0 && (() => {
          // Count crystals by type (now supports stacking: comma-separated values)
          const crystalCounts = {}
          let totalDeposits = 0
          Object.values(card.deposits).forEach(depositValue => {
            // Deposit value can be string (single) or comma-separated string (multiple)
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
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="text-[9px] text-gray-600 mb-1 font-semibold">Deposits ({totalDeposits}):</div>
              <div className="flex gap-1 justify-center flex-wrap">
                {Object.entries(crystalCounts).map(([crystalType, count]) => (
                  <div key={crystalType} className="relative">
                    <img
                      src={crystalImages[crystalType] || '/images/stone_yellow.JPG'}
                      alt={crystalType}
                      className="w-6 h-6 rounded-full object-cover border border-gray-400"
                      onError={(e) => {
                        e.target.src = '/images/stone_yellow.JPG'
                      }}
                    />
                    {count > 1 && (
                      <span className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
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

      {/* Hover Glow Effect - Type-specific colors with smooth transition */}
      {isHovered && !isInvalidAction && (
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

      {/* Long-press Tooltip (desktop hover already shows glow; long-press shows details) */}
      {isHovered && (
        <div className="absolute -top-36 left-1/2 transform -translate-x-1/2 bg-black/95 backdrop-blur-md text-white p-3 rounded-lg text-xs whitespace-nowrap z-50 border border-white/30 shadow-xl min-w-[220px]">
          <div className="font-bold mb-1">{getVietnameseCardName(card?.name)}</div>
          <div className="text-gray-400 text-[10px] mb-1">ID: #{card?.id || index}</div>
          <div className="mb-1">
            <strong>Type:</strong> {actionType.toUpperCase()}
          </div>
          {cost && (
            <div className="text-red-300">Cost: 🟡{cost.yellow || 0} 🟢{cost.green || 0} 🔵{cost.blue || 0} 🟣{cost.pink || 0}</div>
          )}
          {type === 'point' && card?.points !== undefined && (
            <div className="text-yellow-300 mt-1">Points: {card.points}</div>
          )}
          {(card?.input || card?.output) && (
            <div className="mt-1 text-sm">
              {card.input && <div className="text-red-300">Input: 🟡{card.input?.yellow||0} 🟢{card.input?.green||0} 🔵{card.input?.blue||0} 🟣{card.input?.pink||0}</div>}
              {card.output && <div className="text-green-300">Output: 🟡{card.output?.yellow||0} 🟢{card.output?.green||0} 🔵{card.output?.blue||0} 🟣{card.output?.pink||0}</div>}
            </div>
          )}
        </div>
      )}

      {/* Invalid Action Feedback - Red glow and shake */}
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

      {/* Click Ripple Effect */}
      {isClicked && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ 
            background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
            scale: 0,
            opacity: 1
          }}
          animate={{ 
            scale: 2,
            opacity: 0
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}

      {/* Playable Pulse Effect */}
      {isPlayable && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-green-400 pointer-events-none"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

    </motion.div>
  )
}

export default Card
