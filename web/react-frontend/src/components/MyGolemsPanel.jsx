import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CompactCard from './CompactCard'

const MyGolemsPanel = ({ pointCards = [], coins = [] }) => {
  const [expanded, setExpanded] = useState(false)
  
  const hasCards = pointCards.length > 0
  const displayCard = hasCards ? pointCards[pointCards.length - 1] : null
  
  // Calculate points
  const golemPoints = pointCards.reduce((sum, card) => sum + (card.points || 0), 0)
  const coinPoints = coins.reduce((sum, c) => sum + (c.points || 0), 0)
  const totalPoints = golemPoints + coinPoints
  const copperCoins = coins.filter(c => c.points === 3).length
  const silverCoins = coins.filter(c => c.points === 1).length

  return (
    <>
      <div 
        className="h-full flex flex-col items-center justify-center cursor-pointer group"
        onClick={() => hasCards && setExpanded(true)}
      >
        {/* Label */}
        <div className="text-white/70 text-xs font-semibold mb-2">My Golems</div>
        
        {/* Card Display */}
        <div className="relative">
          {hasCards ? (
            <div className="relative">
              {/* Stacked cards effect */}
              {pointCards.length > 1 && (
                <>
                  <div className="absolute -left-1 -top-1 w-24 h-36 bg-white/10 rounded-xl border border-white/20 transform rotate-[-5deg]" />
                  {pointCards.length > 2 && (
                    <div className="absolute -left-2 -top-2 w-24 h-36 bg-white/5 rounded-xl border border-white/10 transform rotate-[-10deg]" />
                  )}
                </>
              )}
              
              {/* Top card */}
              <div className="relative z-10 w-24 h-36 group-hover:scale-105 transition-transform">
                <CompactCard
                  card={displayCard}
                  type="point"
                  index={pointCards.length - 1}
                  size="sm"
                />
              </div>
              
              {/* Count badge */}
              {pointCards.length > 1 && (
                <div className="absolute -top-2 -right-2 z-20 bg-yellow-500 text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {pointCards.length}
                </div>
              )}
            </div>
          ) : (
            <div className="w-24 h-36 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
              <span className="text-white/40 text-xs">No Golems</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Modal */}
      {expanded && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">My Golems ({pointCards.length})</h3>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {pointCards.map((card, index) => (
                  <CompactCard
                    key={index}
                    card={card}
                    type="point"
                    index={index}
                    size="normal"
                  />
                ))}
              </div>
              
              {/* Points Summary */}
              <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/20">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {/* Golem Points */}
                  <div className="flex items-center gap-1">
                    <span className="text-white/70 text-sm">Golems:</span>
                    <span className="text-yellow-400 font-bold">★{golemPoints}</span>
                  </div>
                  
                  {/* Coin Bonuses */}
                  {coins.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 text-sm">Bonus:</span>
                      {copperCoins > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <span>🥉</span>
                          <span className="font-bold">{copperCoins}</span>
                        </span>
                      )}
                      {silverCoins > 0 && (
                        <span className="flex items-center gap-0.5 text-gray-300">
                          <span>🥈</span>
                          <span className="font-bold">{silverCoins}</span>
                        </span>
                      )}
                      <span className="text-yellow-400 font-bold">(+{coinPoints})</span>
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="flex items-center gap-1">
                    <span className="text-white/70 text-sm">Total:</span>
                    <span className="text-green-400 font-bold text-lg">★{totalPoints}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default MyGolemsPanel


