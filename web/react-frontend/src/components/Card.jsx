import React, { useState, useEffect } from 'react'
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

  const isSelected = selectedCard?.name === card?.name
  const glowColor = cardTypeGlowColors[actionType] || '#FFD966'

  return (
    <motion.div
      className={`card-base ${cardTypeColors[actionType] || ''} ${
        isPlayable ? 'border-green-500 ring-2 ring-green-300' : ''
      } ${isAffordable ? 'border-blue-500 ring-2 ring-blue-300' : ''} ${
        isSelected ? 'ring-4 ring-yellow-400' : ''
      } min-w-[200px]`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      animate={controls}
      // Hover animation: scale up 1.05x with glow
      whileHover={{
        scale: 1.05,
        y: -8,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      // Click animation: scale down 0.95x
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.2 }
      }}
      // Drag & drop support (only if drag handlers provided)
      drag={onDragStart ? true : false}
      dragConstraints={dragConstraints}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      dragElastic={0.2}
      whileDrag={{
        scale: 1.1,
        y: -10,
        z: 50,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        transition: { duration: 0.2 }
      }}
      layout
      style={{ 
        perspective: 1000,
        cursor: isDragging ? 'grabbing' : 'pointer'
      }}
    >
      {/* Card Type Badge */}
      <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white z-20 shadow-lg ${
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
            className="w-full h-auto max-h-[320px] object-contain"
            onError={(e) => {
              e.target.src = '/images/golem_bg.JPG'
            }}
            whileHover={{ 
              filter: "brightness(1.1) saturate(1.2)",
              transition: { duration: 0.3 }
            }}
            animate={isPlaying ? {
              filter: [
                "brightness(1) saturate(1)",
                "brightness(1.2) saturate(1.3)",
                "brightness(1) saturate(1)"
              ],
              transition: {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }
            } : {}}
          />
        )}
      </motion.div>

      {/* Card Info */}
      <div className="p-2 space-y-1 bg-white/95">
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
