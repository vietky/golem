import React, { useState, createContext, useContext, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useOrientation from '../hooks/useOrientation'
import useGameStore from '../store/gameStore'

// Chat Context để chia sẻ state giữa overlay và input
const ChatContext = createContext(null)

// Custom hook để sử dụng chat context
export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}

// Chat Provider component
export const ChatProvider = ({ children, playerName, maxMessages = 10, fadeOutDelay = 5000, useWebSocket = false }) => {
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

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
        setChatMessages((prev) => {
          const updated = [...prev, newMessage]
          return updated.slice(-maxMessagesRef.current)
        })

        // Auto-fade after delay
        setTimeout(() => {
          setChatMessages((prev) => prev.map((msg) => (msg.id === newMessage.id ? { ...msg, visible: false } : msg)))

          setTimeout(() => {
            setChatMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id))
          }, 1000)
        }, fadeOutDelayRef.current)
      }

      setChatCallback(chatCallback)

      return () => {
        setChatCallback(null)
      }
    }
    // Only depend on useWebSocket and setChatCallback
  }, [useWebSocket, setChatCallback])

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      const messageText = chatInput.trim()
      setChatInput('')

      if (useWebSocket && sendChatMsg) {
        // Send via WebSocket
        sendChatMsg(messageText)
      } else {
        // Local only (for lobby)
        const newMessage = {
          id: Date.now(),
          player: playerName,
          message: messageText,
          timestamp: new Date(),
          visible: true,
        }

        setChatMessages((prev) => {
          const updated = [...prev, newMessage]
          return updated.slice(-maxMessages)
        })

        setTimeout(() => {
          setChatMessages((prev) => prev.map((msg) => (msg.id === newMessage.id ? { ...msg, visible: false } : msg)))

          setTimeout(() => {
            setChatMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id))
          }, 1000)
        }, fadeOutDelay)
      }
    }
  }

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        chatInput,
        setChatInput,
        sendChatMessage,
        handleChatKeyPress,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

// Chat Overlay Component
export const ChatOverlay = () => {
  const { chatMessages } = useChatContext()
  const { isMobile, isTablet, isPortrait } = useOrientation()
  const isMobileLayout = isMobile && isPortrait

  return (
    <div
      className={`
        fixed pointer-events-none
        ${isMobileLayout ? 'top-20 right-2 left-2' : 'top-4 right-4'}
        ${isMobileLayout ? 'max-w-full' : 'max-w-sm'}
        z-[9998]
      `}
    >
      <div className="space-y-2">
        <AnimatePresence>
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{
                opacity: msg.visible ? 1 : 0,
                x: msg.visible ? 0 : 100,
                scale: msg.visible ? 1 : 0.8,
              }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
              }}
              className={`
                bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/20
                ${isMobileLayout ? 'text-xs' : 'text-sm'}
                shadow-lg
              `}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold truncate">{msg.player}</span>
                    <span className="text-white/50 text-[10px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-white/90 break-words leading-relaxed">{msg.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Chat Input Component
export const ChatInput = ({ compact = false }) => {
  const { chatInput, setChatInput, sendChatMessage, handleChatKeyPress } = useChatContext()
  const { isMobile, isTablet, isPortrait } = useOrientation()
  const isMobileLayout = isMobile && isPortrait

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleChatKeyPress}
          placeholder="Chat..."
          className="w-32 px-2 py-1 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 text-xs"
        />
        <button
          onClick={sendChatMessage}
          disabled={!chatInput.trim()}
          className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded hover:from-green-600 hover:to-emerald-600 transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          💬
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Chat</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleChatKeyPress}
          placeholder="Type a message and press Enter..."
          className={`
            flex-1 rounded-lg bg-white/20 border border-white/30 
            text-white placeholder-white/50
            ${isMobileLayout ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'}
          `}
        />
        <button
          onClick={sendChatMessage}
          disabled={!chatInput.trim()}
          className={`
            bg-gradient-to-r from-green-500 to-emerald-500 
            text-white rounded hover:from-green-600 hover:to-emerald-600 
            transition-all font-bold touch-target disabled:opacity-50 disabled:cursor-not-allowed
            ${isMobileLayout ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'}
          `}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// Main Chat Component (backward compatible)
const Chat = ({ playerName, maxMessages = 10, fadeOutDelay = 5000, showOverlay = true, showInput = true }) => {
  const { isMobile, isTablet, isPortrait } = useOrientation()

  return (
    <ChatProvider playerName={playerName} maxMessages={maxMessages} fadeOutDelay={fadeOutDelay}>
      {showOverlay && <ChatOverlay />}
      {showInput && <ChatInput />}
    </ChatProvider>
  )
}

export default Chat
