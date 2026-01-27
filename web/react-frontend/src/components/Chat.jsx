import React, { useState, createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useOrientation from '../hooks/useOrientation'
import useGameStore from '../store/gameStore'
import { createLogger } from '../utils/logger'

const logger = createLogger('Chat')

// Chat Context to share state between overlay and input
const ChatContext = createContext(null)

// Custom hook to use chat context
export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}

// Rate limiter hook - 5 messages per 2 seconds by default
const useRateLimiter = (maxMessages = 5, windowMs = 2000) => {
  const messageTimestamps = useRef([])
  
  const canSend = useCallback(() => {
    const now = Date.now()
    // Remove timestamps older than window
    messageTimestamps.current = messageTimestamps.current.filter(
      (ts) => now - ts < windowMs
    )
    return messageTimestamps.current.length < maxMessages
  }, [maxMessages, windowMs])
  
  const recordMessage = useCallback(() => {
    messageTimestamps.current.push(Date.now())
  }, [])
  
  const getRemainingTime = useCallback(() => {
    if (messageTimestamps.current.length < maxMessages) return 0
    const oldest = messageTimestamps.current[0]
    return Math.max(0, windowMs - (Date.now() - oldest))
  }, [maxMessages, windowMs])
  
  return { canSend, recordMessage, getRemainingTime }
}

// Chat Provider component
export const ChatProvider = ({ 
  children, 
  playerName, 
  maxMessages = 50, // Increased default for better history
  fadeOutDelay = 10000, // Longer fade out
  useWebSocket = false,
  rateLimitMessages = 5,
  rateLimitWindowMs = 2000
}) => {
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rateLimitWarning, setRateLimitWarning] = useState('')

  // Rate limiter
  const { canSend, recordMessage, getRemainingTime } = useRateLimiter(rateLimitMessages, rateLimitWindowMs)

  // Use refs to store latest values without causing re-renders
  const maxMessagesRef = useRef(maxMessages)
  const fadeOutDelayRef = useRef(fadeOutDelay)

  // Update refs when props change
  useEffect(() => {
    maxMessagesRef.current = maxMessages
    fadeOutDelayRef.current = fadeOutDelay
  }, [maxMessages, fadeOutDelay])

  // Get gameStore functions only when needed, using selector to avoid re-renders
  const setChatCallback = useWebSocket ? useGameStore((state) => state.setChatMessageCallback) : null
  const sendChatMsg = useWebSocket ? useGameStore((state) => state.sendChatMessage) : null

  // Set up WebSocket chat message handler - only run once when useWebSocket changes
  useEffect(() => {
    if (useWebSocket && setChatCallback) {
      // Set callback to receive chat messages from WebSocket
      const chatCallback = (newMessage) => {
        const messageWithMeta = {
          ...newMessage,
          id: newMessage.id || Date.now() + Math.random(),
          timestamp: newMessage.timestamp || Date.now(),
          visible: true,
        }
        
        setChatMessages((prev) => {
          const updated = [...prev, messageWithMeta]
          return updated.slice(-maxMessagesRef.current)
        })

        logger.debug('Received chat message:', messageWithMeta)
      }

      setChatCallback(chatCallback)

      return () => {
        setChatCallback(null)
      }
    }
  }, [useWebSocket, setChatCallback])

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return

    // Check rate limit
    if (!canSend()) {
      const waitTime = Math.ceil(getRemainingTime() / 1000)
      setRateLimitWarning(`Please wait ${waitTime}s before sending more messages`)
      setTimeout(() => setRateLimitWarning(''), 2000)
      logger.warn('Rate limit exceeded')
      return
    }

    const messageText = chatInput.trim()
    setChatInput('')
    recordMessage()
    setRateLimitWarning('')

    if (useWebSocket && sendChatMsg) {
      // Send via WebSocket
      sendChatMsg(messageText)
      logger.info('Sent chat message via WebSocket:', messageText)
    } else {
      // Local only (for lobby)
      const newMessage = {
        id: Date.now() + Math.random(),
        player: playerName,
        message: messageText,
        timestamp: Date.now(),
        visible: true,
      }

      setChatMessages((prev) => {
        const updated = [...prev, newMessage]
        return updated.slice(-maxMessages)
      })
      logger.info('Added local chat message:', newMessage)
    }
  }, [chatInput, canSend, getRemainingTime, recordMessage, useWebSocket, sendChatMsg, playerName, maxMessages])

  const handleChatKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }, [sendChatMessage])

  const toggleDialog = useCallback(() => {
    setIsDialogOpen((prev) => !prev)
  }, [])

  const clearMessages = useCallback(() => {
    setChatMessages([])
  }, [])

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        chatInput,
        setChatInput,
        sendChatMessage,
        handleChatKeyPress,
        isDialogOpen,
        setIsDialogOpen,
        toggleDialog,
        rateLimitWarning,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

// Format timestamp for display
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  // If within last hour, show relative time
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  // For older messages, show date and time
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
         date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Get player color based on name hash for consistent coloring
const getPlayerColor = (playerName) => {
  const colors = [
    'text-blue-400',
    'text-green-400', 
    'text-purple-400',
    'text-orange-400',
    'text-pink-400',
    'text-cyan-400',
    'text-yellow-400',
    'text-red-400',
  ]
  let hash = 0
  for (let i = 0; i < playerName.length; i++) {
    hash = playerName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Chat Overlay Component - Shows floating messages
export const ChatOverlay = ({ maxVisible = 5 }) => {
  const { chatMessages, toggleDialog } = useChatContext()
  const { isMobile, isPortrait } = useOrientation()
  const isMobileLayout = isMobile && isPortrait

  // Only show the most recent messages in the overlay
  const visibleMessages = chatMessages.slice(-maxVisible)

  return (
    <div
      className={`
        fixed pointer-events-none
        ${isMobileLayout ? 'top-16 right-2 left-2' : 'top-4 right-4'}
        ${isMobileLayout ? 'max-w-full' : 'max-w-md'}
        z-[9998]
      `}
    >
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              layout
              className={`
                bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/15
                ${isMobileLayout ? 'text-sm' : 'text-sm'}
                shadow-xl pointer-events-auto cursor-pointer
                hover:bg-black/70 transition-colors
              `}
              onClick={toggleDialog}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-bold truncate ${getPlayerColor(msg.player)}`}>
                      {msg.player}
                    </span>
                    <span className="text-white/40 text-xs flex-shrink-0">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-white/90 break-words leading-relaxed">{msg.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Message count indicator */}
      {chatMessages.length > maxVisible && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full pointer-events-auto hover:bg-black/60 transition-colors"
          onClick={toggleDialog}
        >
          +{chatMessages.length - maxVisible} more messages
        </motion.button>
      )}
    </div>
  )
}

// Chat Input Component - Compact inline input
export const ChatInput = ({ compact = false }) => {
  const { chatInput, setChatInput, sendChatMessage, handleChatKeyPress, rateLimitWarning } = useChatContext()
  const { isMobile, isPortrait } = useOrientation()
  const isMobileLayout = isMobile && isPortrait
  const inputRef = useRef(null)

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 relative">
        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleChatKeyPress}
          placeholder="Chat..."
          maxLength={200}
          className="w-32 px-2 py-1 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <button
          onClick={sendChatMessage}
          disabled={!chatInput.trim()}
          className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded hover:from-green-600 hover:to-emerald-600 transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message (Enter)"
        >
          💬
        </button>
        {rateLimitWarning && (
          <div className="absolute -bottom-6 left-0 text-red-400 text-[10px] whitespace-nowrap">
            {rateLimitWarning}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Chat</label>
      <div className="flex gap-2 relative">
        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleChatKeyPress}
          placeholder="Type a message and press Enter..."
          maxLength={200}
          className={`
            flex-1 rounded-lg bg-white/20 border border-white/30 
            text-white placeholder-white/50
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            ${isMobileLayout ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'}
          `}
        />
        <button
          onClick={sendChatMessage}
          disabled={!chatInput.trim()}
          className={`
            bg-gradient-to-r from-green-500 to-emerald-500 
            text-white rounded-lg hover:from-green-600 hover:to-emerald-600 
            transition-all font-bold touch-target disabled:opacity-50 disabled:cursor-not-allowed
            ${isMobileLayout ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'}
          `}
          title="Send message (Enter)"
        >
          Send
        </button>
      </div>
      {rateLimitWarning && (
        <div className="mt-1 text-red-400 text-xs">
          {rateLimitWarning}
        </div>
      )}
    </div>
  )
}

// Resizable and Movable Chat Dialog Component
export const ChatDialog = ({ 
  defaultPosition = { x: 20, y: 100 },
  defaultSize = { width: 350, height: 400 },
  minSize = { width: 280, height: 250 },
  maxSize = { width: 600, height: 700 },
}) => {
  const { 
    chatMessages, 
    chatInput, 
    setChatInput, 
    sendChatMessage, 
    handleChatKeyPress,
    isDialogOpen, 
    setIsDialogOpen,
    rateLimitWarning,
    clearMessages,
  } = useChatContext()
  
  const { isMobile, isPortrait } = useOrientation()
  const isMobileLayout = isMobile && isPortrait
  
  const dialogRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // Position and size state
  const [position, setPosition] = useState(defaultPosition)
  const [size, setSize] = useState(defaultSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isDialogOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isDialogOpen])

  // Focus input when dialog opens
  useEffect(() => {
    if (isDialogOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isDialogOpen])

  // Handle drag start
  const handleDragStart = (e) => {
    if (isMobileLayout) return // Disable drag on mobile
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y,
    })
    e.preventDefault()
  }

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, clientY - dragOffset.y)),
      })
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragOffset, size])

  // Handle resize start
  const handleResizeStart = (e) => {
    if (isMobileLayout) return // Disable resize on mobile
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setIsResizing(true)
    setResizeStart({
      x: clientX,
      y: clientY,
      width: size.width,
      height: size.height,
    })
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const newWidth = Math.max(minSize.width, Math.min(maxSize.width, resizeStart.width + (clientX - resizeStart.x)))
      const newHeight = Math.max(minSize.height, Math.min(maxSize.height, resizeStart.height + (clientY - resizeStart.y)))
      setSize({ width: newWidth, height: newHeight })
    }

    const handleEnd = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isResizing, resizeStart, minSize, maxSize])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && isDialogOpen) {
        setIsDialogOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDialogOpen, setIsDialogOpen])

  if (!isDialogOpen) return null

  // Mobile full-screen layout
  if (isMobileLayout) {
    return (
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-[10000] bg-gray-900/98 backdrop-blur-lg flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <span>💬</span>
            Chat ({chatMessages.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearMessages}
              className="text-white/50 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10"
              title="Clear messages"
            >
              🗑️
            </button>
            <button
              onClick={() => setIsDialogOpen(false)}
              className="text-white/60 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              <span className="text-4xl mb-2 block">💬</span>
              No messages yet. Start chatting!
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold ${getPlayerColor(msg.player)}`}>{msg.player}</span>
                  <span className="text-white/40 text-xs">{formatTimestamp(msg.timestamp)}</span>
                </div>
                <p className="text-white/90 break-words">{msg.message}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-black/30">
          {rateLimitWarning && (
            <div className="mb-2 text-red-400 text-sm text-center">
              {rateLimitWarning}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyPress}
              placeholder="Type a message..."
              maxLength={200}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              onClick={sendChatMessage}
              disabled={!chatInput.trim()}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              Send
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Desktop draggable/resizable dialog
  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[10000] flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header - Draggable */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 cursor-grab select-none"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>💬</span>
          Chat ({chatMessages.length})
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="text-white/50 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
            title="Clear messages"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsDialogOpen(false)}
            className="text-white/60 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {chatMessages.length === 0 ? (
          <div className="text-center text-white/40 py-8 text-sm">
            <span className="text-3xl mb-2 block">💬</span>
            No messages yet.<br/>Start chatting!
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div 
              key={msg.id} 
              className="bg-white/5 rounded-lg p-2.5 border border-white/10 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`font-bold text-sm ${getPlayerColor(msg.player)}`}>{msg.player}</span>
                <span className="text-white/40 text-xs">{formatTimestamp(msg.timestamp)}</span>
              </div>
              <p className="text-white/90 break-words text-sm leading-relaxed">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-black/30">
        {rateLimitWarning && (
          <div className="mb-2 text-red-400 text-xs text-center">
            {rateLimitWarning}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyPress}
            placeholder="Type a message... (Enter to send)"
            maxLength={200}
            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            onClick={sendChatMessage}
            disabled={!chatInput.trim()}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-green-600 transition-all"
          >
            Send
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <svg 
          className="w-full h-full text-white/30 hover:text-white/50 transition-colors" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M22 22H20V20H22V22ZM22 18H18V22H22V18ZM18 22H14V20H18V22Z"/>
        </svg>
      </div>
    </motion.div>
  )
}

// Chat Toggle Button - Opens the dialog
export const ChatToggleButton = ({ className = '' }) => {
  const { chatMessages, toggleDialog, isDialogOpen } = useChatContext()
  const { isMobile, isPortrait } = useOrientation()
  const isMobileLayout = isMobile && isPortrait
  const unreadCount = chatMessages.length

  return (
    <motion.button
      onClick={toggleDialog}
      whileTap={{ scale: 0.9 }}
      className={`
        relative flex items-center justify-center
        bg-gradient-to-r from-emerald-600 to-green-600
        hover:from-emerald-700 hover:to-green-700
        text-white rounded-full shadow-lg
        transition-all
        ${isMobileLayout ? 'w-12 h-12' : 'w-11 h-11'}
        ${isDialogOpen ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900' : ''}
        ${className}
      `}
      title="Open chat (C)"
    >
      <span className={isMobileLayout ? 'text-xl' : 'text-lg'}>💬</span>
      {unreadCount > 0 && !isDialogOpen && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </motion.button>
  )
}

// Main Chat Component (backward compatible)
const Chat = ({ 
  playerName, 
  maxMessages = 50, 
  fadeOutDelay = 10000, 
  showOverlay = true, 
  showInput = true,
  showDialog = false,
  showToggle = false,
  useWebSocket = false,
}) => {
  return (
    <ChatProvider 
      playerName={playerName} 
      maxMessages={maxMessages} 
      fadeOutDelay={fadeOutDelay}
      useWebSocket={useWebSocket}
    >
      {showOverlay && <ChatOverlay />}
      {showInput && <ChatInput />}
      {showDialog && <ChatDialog />}
      {showToggle && <ChatToggleButton />}
    </ChatProvider>
  )
}

export default Chat
