import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const DepositModal = ({ card, cardIndex, isHandCard = false, onClose }) => {
  const { myPlayer, acquireCard } = useGameStore()
  const { isMobile } = useOrientation()

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Target position = card index + 1 (card 0 = position 1, card 1 = position 2, etc.)
  const targetPosition = isHandCard ? null : cardIndex + 1
  const [deposits, setDeposits] = useState({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null
  })

  if (!card || !myPlayer) {
    return null
  }

  // For hand cards, don't show deposit modal (not applicable)
  if (isHandCard) {
    return null
  }

  // Required positions to deposit: from 1 to (targetPosition - 1)
  const requiredPositions = targetPosition > 1 
    ? Array.from({ length: targetPosition - 1 }, (_, i) => i + 1)
    : []

  const crystalTypes = [
    { key: 'yellow', label: 'Yellow', color: 'bg-yellow-400', image: 'https://statics.vietky.io.vn/images/stone_yellow.JPG' },
    { key: 'green', label: 'Green', color: 'bg-green-400', image: 'https://statics.vietky.io.vn/images/stone_green.JPG' },
    { key: 'blue', label: 'Blue', color: 'bg-blue-400', image: 'https://statics.vietky.io.vn/images/stone_blue.JPG' },
    { key: 'pink', label: 'Pink', color: 'bg-pink-400', image: 'https://statics.vietky.io.vn/images/stone_pink.JPG' }
  ]

  const availableCrystals = {
    yellow: myPlayer.caravan?.yellow || 0,
    green: myPlayer.caravan?.green || 0,
    blue: myPlayer.caravan?.blue || 0,
    pink: myPlayer.caravan?.pink || 0
  }

  const handleSelectCrystal = (position, crystalType) => {
    // Can only deposit to required positions
    if (!requiredPositions.includes(position)) {
      return
    }
    setDeposits(prev => ({
      ...prev,
      [position]: prev[position] === crystalType ? null : crystalType
    }))
  }

  const handleConfirm = () => {
    if (requiredPositions.length === 0) {
      // Card position 1, no deposit needed, just acquire
      acquireCard(cardIndex, [], card)
      onClose()
      return
    }

    // Must deposit to all required positions
    let allPositionsFilled = true
    for (const pos of requiredPositions) {
      if (deposits[pos] === null) {
        allPositionsFilled = false
        break
      }
    }

    if (allPositionsFilled) {
      // Convert deposits object { 1: 'yellow', 2: 'green' } to array format
      // Backend expects: [{ crystal: 'yellow' }, { crystal: 'green' }]
      const depositArray = requiredPositions.map(pos => ({
        crystal: deposits[pos]
      }))
      
      acquireCard(cardIndex, depositArray, card)
      onClose()
    }
  }

  const canConfirm = requiredPositions.length === 0 || 
    requiredPositions.every(pos => deposits[pos] !== null)

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`
            bg-white rounded-xl sm:rounded-2xl shadow-2xl border-4 border-purple-500 w-full overflow-y-auto
            ${isMobile 
              ? 'max-w-[95vw] max-h-[90vh] p-3 mx-2' 
              : 'max-w-2xl max-h-[90vh] p-8 mx-4'
            }
          `}
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
            <h2 className={`font-bold text-purple-600 ${isMobile ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>
              💎 Deposit Crystals
            </h2>
            <p className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-base'}`}>
              To acquire card at position {targetPosition}, deposit to positions {requiredPositions.length > 0 ? requiredPositions.join(', ') : 'none'}
            </p>
            {requiredPositions.length === 0 && (
              <p className={`text-green-600 font-semibold ${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
                ✓ No deposit required for position 1 card
              </p>
            )}
          </div>

          {/* Deposit to Required Positions */}
          {requiredPositions.length > 0 && (
            <div className={`space-y-3 ${isMobile ? 'mb-3' : 'space-y-6 mb-6'}`}>
              {requiredPositions.map((position) => (
                <div key={position} className={`bg-gray-50 rounded-lg ${isMobile ? 'p-2' : 'p-4'}`}>
                  <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm mb-2' : 'text-lg mb-3'}`}>
                    Position {position} (Required)
                  </h3>
                  <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-4 gap-3'}`}>
                    {crystalTypes.map(({ key, label, color, image }) => {
                      const isSelected = deposits[position] === key
                      const isAvailable = availableCrystals[key] > 0
                      const usedCount = Object.values(deposits).filter(v => v === key).length
                      const remaining = availableCrystals[key] - usedCount

                      // If already selected, always allow click to deselect
                      const canClick = isSelected || (isAvailable && remaining > 0)

                      return (
                        <motion.button
                          key={key}
                          onClick={() => handleSelectCrystal(position, key)}
                          disabled={!canClick}
                          className={`
                            relative rounded-lg border-2 transition-all
                            ${isMobile ? 'p-2' : 'p-4'}
                            ${isSelected 
                              ? 'border-purple-500 bg-purple-100 shadow-lg scale-105' 
                              : 'border-gray-300 bg-white hover:border-purple-300'
                            }
                            ${!canClick
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'cursor-pointer'
                            }
                          `}
                          whileHover={canClick ? { scale: 1.05 } : {}}
                          whileTap={canClick ? { scale: 0.95 } : {}}
                        >
                          <img
                            src={image}
                            alt={label}
                            className={`mx-auto rounded-full object-cover ${isMobile ? 'w-8 h-8 mb-1' : 'w-12 h-12 mb-2'}`}
                            onError={(e) => {
                              e.target.src = 'https://statics.vietky.io.vn/images/stone_yellow.JPG'
                            }}
                          />
                          <div className={`font-medium text-gray-700 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                            {label}
                          </div>
                          <div className={`text-gray-500 ${isMobile ? 'text-[9px] mt-0.5' : 'text-xs mt-1'}`}>
                            Available: {remaining}
                          </div>
                          {isSelected && (
                            <motion.div
                              className={`
                                absolute bg-purple-500 rounded-full flex items-center justify-center
                                ${isMobile ? 'top-0.5 right-0.5 w-4 h-4' : 'top-1 right-1 w-6 h-6'}
                              `}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <span className={`text-white ${isMobile ? 'text-[8px]' : 'text-xs'}`}>✓</span>
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={`flex ${isMobile ? 'gap-2' : 'gap-4'}`}>
            <motion.button
              onClick={onClose}
              className={`
                flex-1 bg-gray-300 text-gray-700 font-bold rounded-lg 
                hover:bg-gray-400 transition-all
                ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'}
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`
                flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold 
                rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl
                ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'}
              `}
              whileHover={canConfirm ? { scale: 1.05 } : {}}
              whileTap={canConfirm ? { scale: 0.95 } : {}}
            >
              {requiredPositions.length === 0 
                ? (isMobile ? 'Acquire' : 'Acquire Card (No Deposit Required)')
                : (isMobile ? `Deposit & Acquire` : `Deposit & Acquire Card (Positions ${requiredPositions.join(', ')})`)
              }
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default DepositModal
