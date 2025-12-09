import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { setToastListener, clearToastListener } from '../utils/toast'

const Toast = () => {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    console.log('[Toast] Component mounted, setting up listener')
    setToastListener((toast) => {
      console.log('[Toast] Received toast:', toast)
      setToasts(prev => [...prev, toast])
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 3000)
    })

    return () => {
      clearToastListener()
    }
  }, [])

  // Always render portal container
  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
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
              <span>{toast.message}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

export default Toast
