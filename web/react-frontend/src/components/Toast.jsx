import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createLogger } from '../utils/logger'
import { setToastListener, clearToastListener } from '../utils/toast'

const logger = createLogger('ToastComponent');

const Toast = () => {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    logger.debug('Component mounted, setting up listener')
    setToastListener((toast) => {
      logger.debug('Received toast:', toast)
      setToasts(prev => [...prev, toast])
      
      // Auto remove after 3 seconds (longer to give time to read)
      setTimeout(() => {
        removeToast(toast.id)
      }, 3000)
    })

    return () => {
      clearToastListener()
    }
  }, [removeToast])

  // Always render portal container - positioned top right
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`
              px-4 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm
              backdrop-blur-md border-2 pointer-events-auto
              ${toast.type === 'error' 
                ? 'bg-red-500/90 border-red-300' 
                : toast.type === 'success'
                ? 'bg-green-500/90 border-green-300'
                : 'bg-blue-500/90 border-blue-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span>
                {toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}
              </span>
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors text-xs font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

export default Toast
