import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'

const CollectModal = ({ card, cardIndex, onClose }) => {
  const { collectCrystals } = useGameStore()
  const [selectedPosition, setSelectedPosition] = useState(null) // Only one position can be selected

  if (!card || !card.deposits) {
    return null
  }

  const deposits = card.deposits || {}
  const availablePositions = Object.keys(deposits).map(Number).sort()

  if (availablePositions.length === 0) {
    return null
  }

  const crystalTypeNames = {
    yellow: 'Yellow',
    green: 'Green',
    blue: 'Blue',
    pink: 'Pink'
  }

  const crystalImages = {
    yellow: '/images/stone_yellow.JPG',
    green: '/images/stone_green.JPG',
    blue: '/images/stone_blue.JPG',
    pink: '/images/stone_pink.JPG'
  }

  const handleSelectPosition = (position) => {
    // Can select any position, but must leave at least one deposit
    // If only one deposit exists, cannot collect
    if (availablePositions.length > 1) {
      setSelectedPosition(position === selectedPosition ? null : position)
    }
  }

  const handleConfirm = () => {
    if (selectedPosition !== null) {
      // Collect only from selected position, automatically leave all lower positions
      collectCrystals(cardIndex, [selectedPosition])
      onClose()
    }
  }

  // Positions that will be left behind (all positions except selected)
  const positionsToLeave = selectedPosition !== null 
    ? availablePositions.filter(p => p !== selectedPosition)
    : []

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
          className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border-4 border-green-500"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-green-600 mb-2">
              💰 Collect Crystals
            </h2>
            <p className="text-gray-700">
              Select position to collect from (must leave at least one deposit behind)
            </p>
            {availablePositions.length === 1 && (
              <p className="text-sm text-red-600 mt-2 font-semibold">
                ⚠️ Cannot collect - only one deposit exists, must leave at least one
              </p>
            )}
          </div>

          <div className="space-y-4 mb-6">
            {availablePositions.map((position) => {
              const crystalType = deposits[position.toString()]
              const isSelected = selectedPosition === position
              const canSelect = availablePositions.length > 1 // Can select if more than one deposit exists
              const willBeLeft = selectedPosition !== null && position !== selectedPosition

              return (
                <motion.button
                  key={position}
                  onClick={() => handleSelectPosition(position)}
                  disabled={!canSelect}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all text-left
                    ${isSelected 
                      ? 'border-green-500 bg-green-100 shadow-lg' 
                      : willBeLeft
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-green-300'
                    }
                    ${!canSelect
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer'
                    }
                  `}
                  whileHover={canSelect ? { scale: 1.02 } : {}}
                  whileTap={canSelect ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-700">
                      Position {position}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <img
                        src={crystalImages[crystalType] || '/images/stone_yellow.JPG'}
                        alt={crystalTypeNames[crystalType] || crystalType}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.src = '/images/stone_yellow.JPG'
                        }}
                      />
                      <span className="text-lg font-semibold text-gray-800">
                        {crystalTypeNames[crystalType] || crystalType}
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div
                        className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <span className="text-white text-sm">✓</span>
                      </motion.div>
                    )}
                    {willBeLeft && (
                      <span className="text-sm text-blue-600 font-semibold">
                        Will be left
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {selectedPosition !== null && positionsToLeave.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 text-center">
                ℹ️ Positions {positionsToLeave.join(', ')} will be left behind for other players
              </p>
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
              disabled={selectedPosition === null}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              whileHover={selectedPosition !== null ? { scale: 1.05 } : {}}
              whileTap={selectedPosition !== null ? { scale: 0.95 } : {}}
            >
              {selectedPosition !== null 
                ? `Collect Position ${selectedPosition} (${positionsToLeave.length} will be left)`
                : 'Select Position to Collect'
              }
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CollectModal
