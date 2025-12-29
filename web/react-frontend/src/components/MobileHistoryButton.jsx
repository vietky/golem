import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import useGameStore from '../store/gameStore'
import { getCardSpriteStyle, getCardImagePath } from '../utils/cardNames'

const MobileHistoryButton = () => {
  const { actionHistory, roundNumber, setChatMessageCallback } = useGameStore()
  const [showModal, setShowModal] = useState(false)
  const [chatMessages, setChatMessages] = useState([])

  // Set up chat message listener
  useEffect(() => {
    if (setChatMessageCallback) {
      const callback = (newMessage) => {
        setChatMessages((prev) => [...prev, newMessage])
      }
      setChatMessageCallback(callback)
      return () => setChatMessageCallback(null)
    }
  }, [setChatMessageCallback])

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
      case 'chat':
        return 'bg-emerald-500/20 border-emerald-500/30'
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

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setShowModal(true)}
        className="fixed top-16 right-2 z-50 w-10 h-10 bg-black/70 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center shadow-lg"
        whileTap={{ scale: 0.9 }}
      >
        <span className="text-lg">📜</span>
        {actionHistory.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {actionHistory.length}
          </span>
        )}
      </motion.button>

      {/* Modal */}
      {showModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gray-900/95 rounded-2xl p-4 w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <span>📜</span>
                  {roundNumber > 0 ? `Round ${roundNumber} • ` : ''}History ({actionHistory.length + (chatMessages?.length || 0)})
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/60 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {(() => {
                  // Combine chat and actions
                  const combined = []
                  
                  // Add chat messages
                  if (chatMessages && Array.isArray(chatMessages)) {
                    chatMessages.forEach(msg => {
                      combined.push({
                        id: `chat-${msg.id || msg.timestamp}`,
                        type: 'chat',
                        playerName: msg.player,
                        message: msg.message,
                        timestamp: msg.timestamp,
                      })
                    })
                  }
                  
                  // Add action history
                  if (actionHistory && Array.isArray(actionHistory)) {
                    actionHistory.forEach(action => {
                      combined.push({
                        ...action,
                        id: `action-${action.timestamp}`,
                      })
                    })
                  }
                  
                  // Sort by timestamp
                  combined.sort((a, b) => a.timestamp - b.timestamp)
                  
                  if (combined.length === 0) {
                    return (
                      <div className="text-center py-8 text-white/40 text-sm">
                        No activity yet.<br/>Play a card or chat!
                      </div>
                    )
                  }
                  
                  return combined.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`${getActionColor(item.type)} rounded-lg p-2.5 border flex items-center gap-2.5`}
                    >
                      {item.type === 'chat' ? (
                        /* Chat Message */
                        <>
                          <div className="w-10 aspect-[2/3] rounded bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-base">💬</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium text-sm block truncate">
                              {item.playerName}
                            </span>
                            <span className="text-white/80 text-xs block break-words">
                              {item.message}
                            </span>
                          </div>
                          <span className="text-white/40 text-xs flex-shrink-0">
                            {formatTime(item.timestamp)}
                          </span>
                        </>
                      ) : (
                        /* Action Item */
                        <>
                          {/* Card Thumbnail */}
                          {item.card ? (
                            (() => {
                              const spriteStyle = getCardSpriteStyle(item.card.name)
                              if (spriteStyle) {
                                return (
                                  <div
                                    className="w-10 aspect-[2/3] rounded border border-white/30 flex-shrink-0"
                                    style={spriteStyle}
                                  />
                                )
                              }
                              return (
                                <img
                                  src={getCardImagePath(item.card.name)}
                                  alt=""
                                  className="w-10 rounded border border-white/30 flex-shrink-0"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              )
                            })()
                          ) : (
                            <div className="w-10 aspect-[2/3] rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-base">💤</span>
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-medium text-sm truncate">
                                {item.playerName}
                              </span>
                              {item.isOpponent && (
                                <span className="text-[9px] text-orange-300 bg-orange-500/20 px-1 py-0.5 rounded">
                                  opp
                                </span>
                              )}
                            </div>
                            <span className="text-white/60 text-xs">
                              {getActionLabel(item.type)}
                            </span>
                          </div>

                          {/* Time */}
                          <span className="text-white/40 text-xs flex-shrink-0">
                            {formatTime(item.timestamp)}
                          </span>
                        </>
                      )}
                    </motion.div>
                  ))
                })()}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default MobileHistoryButton

