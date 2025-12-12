import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CompactCard from './CompactCard'

const GraveyardPanel = ({ playedCards = [] }) => {
  const [expanded, setExpanded] = useState(false)
  
  const hasCards = playedCards.length > 0
  const displayCard = hasCards ? playedCards[playedCards.length - 1] : null

  return (
    <>
      <div 
        className="h-full flex flex-col items-center justify-center cursor-pointer group"
        onClick={() => hasCards && setExpanded(true)}
      >
        {/* Label */}
        <div className="text-white/70 text-xs font-semibold mb-2">Graveyard</div>
        
        {/* Card Display */}
        <div className="relative">
          {hasCards ? (
            <div className="relative">
              {/* Stacked cards effect */}
              {playedCards.length > 1 && (
                <>
                  <div className="absolute -left-1 -top-1 w-24 h-36 bg-white/10 rounded-xl border border-white/20 transform rotate-[5deg]" />
                  {playedCards.length > 2 && (
                    <div className="absolute -left-2 -top-2 w-24 h-36 bg-white/5 rounded-xl border border-white/10 transform rotate-[10deg]" />
                  )}
                </>
              )}
              
              {/* Top card (grayed out) */}
              <div className="relative z-10 w-24 h-36 opacity-70 grayscale group-hover:opacity-90 group-hover:grayscale-0 transition-all">
                <CompactCard
                  card={displayCard}
                  type="action"
                  index={playedCards.length - 1}
                  size="sm"
                />
              </div>
              
              {/* Count badge */}
              {playedCards.length > 1 && (
                <div className="absolute -top-2 -right-2 z-20 bg-gray-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {playedCards.length}
                </div>
              )}
            </div>
          ) : (
            <div className="w-24 h-36 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
              <span className="text-white/40 text-xs">Empty</span>
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
                <h3 className="text-white font-bold text-lg">
                  Graveyard ({playedCards.length})
                  <span className="text-sm font-normal text-white/60 ml-2">
                    Rest to recover these cards
                  </span>
                </h3>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {playedCards.map((card, index) => (
                  <div key={index} className="opacity-70">
                    <CompactCard
                      card={card}
                      type="action"
                      index={index}
                      size="normal"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default GraveyardPanel

