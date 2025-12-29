import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import RoomDisplay from './RoomDisplay'
import useOrientation from '../hooks/useOrientation'
import useGameStore from '../store/gameStore'
import { getCardSpriteStyle, getCardImagePath } from '../utils/cardNames'

// Helper component to render card image (sprite or fallback)
const CardImage = ({ cardName, className, style = {} }) => {
  const spriteStyle = getCardSpriteStyle(cardName)
  if (spriteStyle) {
    return (
      <div 
        className={className}
        style={{ ...spriteStyle, ...style }}
      />
    )
  }
  return (
    <img
      src={getCardImagePath(cardName)}
      alt=""
      className={className}
      style={style}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

const CollapsibleInfo = ({ sessionId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const { isMobile, isPortrait } = useOrientation()
  const scrollRef = useRef(null)
  const previousMessageCountRef = useRef(0)
  
  // Get action history and stores
  const { actionHistory, actionLog, sendChatMessage, setChatMessageCallback, roundNumber } = useGameStore()

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

  // Combine chat messages and actions into unified feed
  useEffect(() => {
    const combined = []
    
    // Add chat messages
    if (chatMessages && Array.isArray(chatMessages)) {
      chatMessages.forEach(msg => {
        combined.push({
          id: `chat-${msg.id}`,
          type: 'chat',
          player: msg.player,
          message: msg.message,
          timestamp: msg.timestamp,
        })
      })
    }
    
    // Check for new messages when collapsed
    if (!isExpanded && chatMessages.length > previousMessageCountRef.current) {
      setHasUnreadMessages(true)
    }
    previousMessageCountRef.current = chatMessages.length
    
    // Add action history (rich actions with card details)
    if (actionHistory && Array.isArray(actionHistory)) {
      actionHistory.forEach((action, idx) => {
        combined.push({
          id: `action-${idx}-${action.timestamp}`,
          type: 'action',
          actionType: action.type,
          player: action.playerName,
          avatar: action.playerAvatar,
          card: action.card,
          isOpponent: action.isOpponent,
          timestamp: new Date(action.timestamp),
        })
      })
    }
    
    // Add simple action logs (join/leave, turn changes)
    if (actionLog && Array.isArray(actionLog)) {
      actionLog.forEach((log, idx) => {
        combined.push({
          id: `log-${idx}`,
          type: 'log',
          message: log,
          timestamp: new Date(),
        })
      })
    }
    
    // Sort by timestamp (newest last) and take last 50
    combined.sort((a, b) => a.timestamp - b.timestamp)
    setActivityFeed(combined.slice(-50))
  }, [chatMessages, actionHistory, actionLog, isExpanded])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activityFeed, isExpanded])

  // Clear all activity
  const handleClear = () => {
    if (confirm('Clear all activity history?')) {
      setActivityFeed([])
      setChatMessages([])
      useGameStore.setState({ actionLog: [], actionHistory: [] })
    }
  }

  // Send chat message
  const handleSendChat = () => {
    if (chatInput.trim() && sendChatMessage) {
      sendChatMessage(chatInput.trim())
      setChatInput('')
    }
  }

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  // Keep visible on all devices now

  // Format timestamp (relative time similar to HistorySection)
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  // Get action label
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

  // Get action color (matching HistorySection style)
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
      case 'log':
        return 'bg-gray-500/20 border-gray-500/30'
      default:
        return 'bg-gray-500/20 border-gray-500/30'
    }
  }

  return (
    <>
      <div className={`
        fixed z-50
        ${isMobile 
          ? 'top-2 right-2' 
          : 'top-4 right-4'
        }
      `}>
        {/* Collapsed State - Icon Button */}
        {!isExpanded && (
          <button
            onClick={() => {
              setIsExpanded(true)
              setHasUnreadMessages(false)
              previousMessageCountRef.current = chatMessages.length
            }}
            className={`
              bg-purple-600 hover:bg-purple-700 text-white rounded-full 
              flex items-center justify-center shadow-lg transition-all hover:scale-110
              relative
              ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}
            `}
            title="Show Activity Feed"
          >
            <svg 
              className={isMobile ? 'w-5 h-5' : 'w-6 h-6'}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
              />
            </svg>
            {/* Unread Message Count Badge */}
            {hasUnreadMessages && chatMessages.length - previousMessageCountRef.current > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-emerald-500 rounded-full border-2 border-purple-600 animate-bounce flex items-center justify-center px-1">
                <span className="text-white text-xs font-bold">
                  {chatMessages.length - previousMessageCountRef.current}
                </span>
              </span>
            )}
          </button>
        )}

        {/* Expanded State */}
        {isExpanded && (
          <div className={`
            bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl overflow-hidden flex flex-col
            ${isMobile 
              ? 'min-w-[300px] max-w-[340px] max-h-[80vh]' 
              : 'min-w-[420px] max-w-lg max-h-[85vh]'
            }
          `}>
            {/* Header */}
            <div className={`
              flex items-center justify-between bg-purple-600 flex-shrink-0
              ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}
            `}>
              <h3 className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {roundNumber > 0 ? `🎯 Round ${roundNumber} • ` : ''}📊 Activity
              </h3>
              <div className="flex items-center gap-2">
                {activityFeed.length > 0 && (
                  <button
                    onClick={handleClear}
                    className={`text-white/80 hover:text-white hover:bg-white/20 rounded px-2 py-0.5 transition-all ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                    title="Clear all"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className={`text-white hover:bg-white/20 rounded-full flex items-center justify-center transition-all ${isMobile ? 'w-5 h-5 text-xs' : 'w-6 h-6'}`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className={`flex flex-col flex-1 min-h-0 ${isMobile ? 'p-2' : 'p-3'}`}>
              {/* Room ID - Compact */}
              <div className="mb-2 pb-2 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`text-white/50 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>Room:</span>
                  <div className="flex-1 min-w-0">
                    <RoomDisplay sessionId={sessionId} compact={true} />
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="flex-1 flex flex-col min-h-0">
                <h4 className={`text-white/70 font-semibold mb-2 flex-shrink-0 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  Timeline
                </h4>
                <div 
                  ref={scrollRef}
                  className={`bg-black/40 rounded-lg overflow-y-auto flex-1 ${isMobile ? 'p-1.5 max-h-[40vh]' : 'p-2 max-h-[50vh]'}`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
                  }}
                >
                  {activityFeed.length === 0 ? (
                    <div className={`text-white/50 text-center py-8 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      No activity yet
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activityFeed.map((item) => (
                        <div key={item.id}>
                          {/* Chat Message */}
                          {item.type === 'chat' && (
                            <div className={`${getActionColor('chat')} rounded-lg p-2 border ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-emerald-400">💬</span>
                                <span className="text-emerald-400 font-semibold">{item.player}</span>
                                <span className="text-white/40 text-[9px] ml-auto">{formatTime(item.timestamp)}</span>
                              </div>
                              <p className="text-white/90 leading-relaxed break-words pl-5">{item.message}</p>
                            </div>
                          )}

                          {/* Game Action - Text-based with hover */}
                          {item.type === 'action' && (
                            <div 
                              className={`${getActionColor(item.actionType)} rounded-lg p-2 border cursor-pointer hover:bg-white/5 transition-colors ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                              onMouseEnter={() => item.card && setHoveredCard(item.card)}
                              onMouseLeave={() => setHoveredCard(null)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <span className="text-white font-semibold">{item.player}</span>
                                  {item.isOpponent && (
                                    <span className="ml-1.5 text-[8px] text-orange-300 bg-orange-500/20 px-1 py-0.5 rounded">OPP</span>
                                  )}
                                  <span className="text-white/70 ml-1.5">
                                    {getActionLabel(item.actionType).toLowerCase()}
                                    {item.card && (
                                      <span className="text-white/90 font-medium"> {item.card.name?.replace(/_/g, ' ')}</span>
                                    )}
                                  </span>
                                </div>
                                <span className="text-white/40 text-[9px] flex-shrink-0 ml-2">{formatTime(item.timestamp)}</span>
                              </div>
                            </div>
                          )}

                          {/* System Log */}
                          {item.type === 'log' && (
                            <div className={`${getActionColor('log')} rounded-lg p-2 border ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-1">
                                  <span className="text-gray-400">ℹ️</span>
                                  <span className="text-white/80">{item.message}</span>
                                </div>
                                <span className="text-white/40 text-[9px] flex-shrink-0 ml-2">{formatTime(item.timestamp)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input */}
              <div className="mt-2 pt-2 border-t border-white/10 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type message..."
                    className={`flex-1 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className={`bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
                    title="Send message"
                  >
                    💬
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hover Card Preview */}
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
            <CardImage
              cardName={hoveredCard.name}
              className="w-40 aspect-[2/3] rounded-lg"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default CollapsibleInfo
