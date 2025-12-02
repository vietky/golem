import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'

const DepositModal = ({ card, cardIndex, isHandCard = false, onClose }) => {
  const { myPlayer, depositCrystals, gameState, acquireCard, connected } = useGameStore()
  const [isDepositing, setIsDepositing] = useState(false)
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

  // Calculate actual card index for backend
  const getActualCardIndex = () => {
    // Market card: add hand length to distinguish from hand cards
    const handLength = myPlayer?.hand?.length || 0
    return handLength + cardIndex
  }

  // Required positions to deposit: from 1 to (targetPosition - 1)
  // Example: card index 1 (position 2) → deposit to position 1 (card index 0)
  // Example: card index 2 (position 3) → deposit to positions 1, 2 (card index 0, 1)
  // Each position corresponds to a card index: position N = card index N-1
  const requiredPositions = targetPosition > 1 
    ? Array.from({ length: targetPosition - 1 }, (_, i) => i + 1)
    : []

  const crystalTypes = [
    { key: 'yellow', label: 'Yellow', color: 'bg-yellow-400', image: '/images/stone_yellow.JPG' },
    { key: 'green', label: 'Green', color: 'bg-green-400', image: '/images/stone_green.JPG' },
    { key: 'blue', label: 'Blue', color: 'bg-blue-400', image: '/images/stone_blue.JPG' },
    { key: 'pink', label: 'Pink', color: 'bg-pink-400', image: '/images/stone_pink.JPG' }
  ]

  const availableCrystals = {
    yellow: myPlayer.resources?.yellow || 0,
    green: myPlayer.resources?.green || 0,
    blue: myPlayer.resources?.blue || 0,
    pink: myPlayer.resources?.pink || 0
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
    console.log(`[DEBUG DepositModal] handleConfirm: cardIndex=${cardIndex}, targetPosition=${targetPosition}, requiredPositions=`, requiredPositions)
    if (requiredPositions.length === 0) {
      // Card position 1, no deposit needed, just acquire
      console.log(`[DEBUG DepositModal] No deposits required, acquiring card index ${cardIndex} directly`)
      acquireCard(cardIndex)
      onClose()
      return
    }

    // Must deposit to all required positions
    const validDeposits = {}
    let allPositionsFilled = true
    for (const pos of requiredPositions) {
      if (deposits[pos] === null) {
        allPositionsFilled = false
        break
      }
      validDeposits[pos] = deposits[pos]
    }

    if (allPositionsFilled) {
      const actualIndex = getActualCardIndex()
      console.log('[DEBUG DepositModal] Depositing and acquiring:', {
        actualIndex,
        validDeposits,
        targetPosition,
        cardIndex
      })
      setIsDepositing(true)
      depositCrystals(actualIndex, validDeposits, targetPosition)
      // After deposit, automatically acquire the card
      // Wait for state update from WebSocket (deposit action completes and broadcasts)
      // Then acquire the card which will trigger NextTurn
      // Note: We don't check affordability here because deposits reduce resources
      // The backend will handle the actual acquisition and cost payment
      setTimeout(() => {
        console.log('[DEBUG DepositModal] Auto-acquiring card index:', cardIndex)
        // Use sendAction to acquire card (backend will validate affordability)
        const { sendAction } = useGameStore.getState()
        sendAction('acquireCard', cardIndex)
        setIsDepositing(false)
      }, 800)
      onClose()
    }
  }

  const canConfirm = requiredPositions.length === 0 || 
    requiredPositions.every(pos => deposits[pos] !== null)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border-4 border-purple-500"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-purple-600 mb-2">
              💎 Deposit Crystals
            </h2>
            <p className="text-gray-700">
              To acquire card at position {targetPosition}, you must deposit crystals to positions {requiredPositions.length > 0 ? requiredPositions.join(', ') : 'none'}
            </p>
            {requiredPositions.length === 0 && (
              <p className="text-sm text-green-600 mt-2 font-semibold">
                ✓ No deposit required for position 1 card
              </p>
            )}
          </div>

          {/* Deposit to Required Positions */}
          {requiredPositions.length > 0 && (
            <div className="space-y-6 mb-6">
              {requiredPositions.map((position) => (
                <div key={position} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Position {position} (Required)
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {crystalTypes.map(({ key, label, color, image }) => {
                      const isSelected = deposits[position] === key
                      const isAvailable = availableCrystals[key] > 0
                      const usedCount = Object.values(deposits).filter(v => v === key).length
                      const remaining = availableCrystals[key] - usedCount

                      return (
                        <motion.button
                          key={key}
                          onClick={() => handleSelectCrystal(position, key)}
                          disabled={!isAvailable || remaining <= 0}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all
                            ${isSelected 
                              ? 'border-purple-500 bg-purple-100 shadow-lg scale-105' 
                              : 'border-gray-300 bg-white hover:border-purple-300'
                            }
                            ${!isAvailable || remaining <= 0 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'cursor-pointer'
                            }
                          `}
                          whileHover={isAvailable && remaining > 0 ? { scale: 1.05 } : {}}
                          whileTap={isAvailable && remaining > 0 ? { scale: 0.95 } : {}}
                        >
                          <img
                            src={image}
                            alt={label}
                            className="w-12 h-12 mx-auto mb-2 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = '/images/stone_yellow.JPG'
                            }}
                          />
                          <div className="text-xs font-medium text-gray-700">
                            {label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Available: {remaining}
                          </div>
                          {isSelected && (
                            <motion.div
                              className="absolute top-1 right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <span className="text-white text-xs">✓</span>
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

          <div className="flex gap-4">
            <motion.button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-400 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              whileHover={canConfirm ? { scale: 1.05 } : {}}
              whileTap={canConfirm ? { scale: 0.95 } : {}}
            >
              {requiredPositions.length === 0 
                ? 'Acquire Card (No Deposit Required)'
                : `Deposit & Acquire Card (Positions ${requiredPositions.join(', ')})`
              }
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default DepositModal
