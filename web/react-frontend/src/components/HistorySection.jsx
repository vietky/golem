import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import useGameStore from '../store/gameStore'

const HistorySection = () => {
  const { actionHistory } = useGameStore()
  const [hoveredCard, setHoveredCard] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const getActionLabel = (type) => {
    switch (type) {
      case 'play': return 'Played'
      case 'upgrade': return 'Upgraded'
      case 'trade': return 'Traded'
      case 'acquire': return 'Acquired'
      case 'claim': return 'Claimed'
      case 'rest': return 'Rested'
      default: return 'Action'
    }
  }

  const getActionColor = (type) => {
    switch (type) {
      case 'play':
      case 'upgrade':
      case 'trade':
        return 'bg-blue-500/20 border-blue-500/30'
      case 'acquire':
        return 'bg-green-500/20 border-green-500/30'
      case 'claim':
        return 'bg-yellow-500/20 border-yellow-500/30'
      case 'rest':
        return 'bg-purple-500/20 border-purple-500/30'
      default:
        return 'bg-gray-500/20 border-gray-500/30'
    }
  }

  const formatTime = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  // Show last 4 actions in preview
  const previewActions = actionHistory.slice(0, 4)
  const hasCard = previewActions.some(a => a.card)
  const displayCard = hasCard ? previewActions.find(a => a.card)?.card : null

  return (
    <>
      <div 
        className="h-full flex flex-col items-center justify-center cursor-pointer group"
        onClick={() => actionHistory.length > 0 && setExpanded(true)}
      >
        {/* Label */}
        <div className="text-white/70 text-xs font-semibold mb-2">History</div>
        
        {/* Card Display */}
        <div className="relative">
          {actionHistory.length > 0 ? (
            <div className="relative">
              {/* Stacked cards effect */}
              {actionHistory.length > 1 && (
                <>
                  <div className="absolute -left-1 -top-1 w-24 aspect-[2/3] bg-white/10 rounded-xl border border-white/20 transform rotate-[5deg]" />
                  {actionHistory.length > 2 && (
                    <div className="absolute -left-2 -top-2 w-24 aspect-[2/3] bg-white/5 rounded-xl border border-white/10 transform rotate-[10deg]" />
                  )}
                </>
              )}
              
              {/* Top card */}
              <div className="relative z-10 w-24 group-hover:scale-105 transition-all">
                {displayCard ? (
                  <img
                    src={`/images/${displayCard.name}.JPG`}
                    alt=""
                    className="w-full rounded-xl border border-white/30"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-2xl">💤</span>
                  </div>
                )}
              </div>
              
              {/* Count badge */}
              <div className="absolute -top-2 -right-2 z-20 bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {actionHistory.length}
              </div>
            </div>
          ) : (
            <div className="w-24 aspect-[2/3] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center">
              <span className="text-white/40 text-xs text-center px-2">No actions<br/>yet</span>
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
              className="bg-gray-900/95 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">
                  📜 Action History ({actionHistory.length})
                </h3>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2">
                {actionHistory.map((action, index) => (
                  <div 
                    key={action.timestamp}
                    className={`${getActionColor(action.type)} rounded-lg p-3 border flex items-center gap-3`}
                    onMouseEnter={() => action.card && setHoveredCard(action.card)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Card Thumbnail */}
                    {action.card ? (
                      <img
                        src={`/images/${action.card.name}.JPG`}
                        alt=""
                        className="w-14 rounded border border-white/30 flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-14 aspect-[2/3] rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">💤</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {action.playerName}
                        </span>
                        {action.isOpponent && (
                          <span className="text-[10px] text-orange-300 bg-orange-500/20 px-1.5 py-0.5 rounded">
                            opponent
                          </span>
                        )}
                      </div>
                      <span className="text-white/60 text-sm">
                        {getActionLabel(action.type)}
                        {action.card && ` • ${action.card.name?.replace(/_/g, ' ')}`}
                      </span>
                    </div>

                    {/* Time */}
                    <span className="text-white/40 text-sm">
                      {formatTime(action.timestamp)}
                    </span>
                  </div>
                ))}

                {actionHistory.length === 0 && (
                  <div className="text-center py-8 text-white/40">
                    No actions yet. Play a card to start!
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Hover Preview */}
      {hoveredCard && createPortal(
        <div 
          className="fixed z-[100] pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(calc(-50% + 200px), -50%)',
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border-2 border-white/30 overflow-hidden">
            <img
              src={`/images/${hoveredCard.name}.JPG`}
              alt={hoveredCard.name}
              className="w-40 rounded-lg"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default HistorySection

