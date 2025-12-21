import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCardSpriteStyle, getCardImagePath } from '../utils/cardNames'

const ConfirmGolemModal = ({ isOpen, golem, onConfirm, onCancel }) => {
  if (!isOpen || !golem) return null

  const requirement = golem.requirement || {}
  const totalCost = (requirement.yellow || 0) + (requirement.green || 0) + 
                   (requirement.blue || 0) + (requirement.pink || 0)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-yellow-500/30 max-w-sm w-full overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-4 py-3 border-b border-yellow-500/20">
              <h3 className="text-lg font-bold text-yellow-300 text-center">
                🗿 Claim Golem?
              </h3>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Golem Preview */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  {(() => {
                    const spriteStyle = getCardSpriteStyle(golem.name)
                    if (spriteStyle) {
                      return (
                        <div
                          className="w-20 h-28 rounded-lg border-2 border-yellow-500/50 shadow-lg"
                          style={spriteStyle}
                        />
                      )
                    }
                    return (
                      <img
                        src={getCardImagePath(golem.name)}
                        alt={golem.name}
                        className="w-20 h-28 rounded-lg object-cover border-2 border-yellow-500/50 shadow-lg"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )
                  })()}
                  <span className="absolute -bottom-2 -right-2 bg-yellow-500 text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                    {golem.points}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="text-white/60 text-xs mb-1">Points</div>
                  <div className="text-yellow-300 text-2xl font-bold mb-2">
                    {golem.points} pts
                  </div>
                  
                  <div className="text-white/60 text-xs mb-1">Cost</div>
                  <div className="flex gap-1 flex-wrap">
                    {requirement.yellow > 0 && (
                      <div className="flex items-center gap-0.5 bg-yellow-500/20 rounded px-1.5 py-0.5">
                        <img src="/images/stone_yellow.JPG" alt="yellow" className="w-4 h-4 rounded-full" />
                        <span className="text-yellow-300 text-sm font-semibold">{requirement.yellow}</span>
                      </div>
                    )}
                    {requirement.green > 0 && (
                      <div className="flex items-center gap-0.5 bg-green-500/20 rounded px-1.5 py-0.5">
                        <img src="/images/stone_green.JPG" alt="green" className="w-4 h-4 rounded-full" />
                        <span className="text-green-300 text-sm font-semibold">{requirement.green}</span>
                      </div>
                    )}
                    {requirement.blue > 0 && (
                      <div className="flex items-center gap-0.5 bg-blue-500/20 rounded px-1.5 py-0.5">
                        <img src="/images/stone_blue.JPG" alt="blue" className="w-4 h-4 rounded-full" />
                        <span className="text-blue-300 text-sm font-semibold">{requirement.blue}</span>
                      </div>
                    )}
                    {requirement.pink > 0 && (
                      <div className="flex items-center gap-0.5 bg-pink-500/20 rounded px-1.5 py-0.5">
                        <img src="/images/stone_pink.JPG" alt="pink" className="w-4 h-4 rounded-full" />
                        <span className="text-pink-300 text-sm font-semibold">{requirement.pink}</span>
                      </div>
                    )}
                    {totalCost === 0 && (
                      <span className="text-green-400 text-sm">Free!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                <p className="text-orange-200 text-sm text-center">
                  ⚠️ This action cannot be undone. Your crystals will be spent.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.button
                  onClick={onCancel}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ✓ Claim
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default ConfirmGolemModal

