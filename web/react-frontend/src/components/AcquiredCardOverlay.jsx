import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'
import CompactCard from './CompactCard'

const AcquiredCardOverlay = () => {
  const acquiredCardOverlay = useGameStore((state) => state.acquiredCardOverlay)

  return (
    <AnimatePresence>
      {acquiredCardOverlay && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            pointerEvents: 'none',
            zIndex: 99999 
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Semi-transparent background */}
          <motion.div 
            className="absolute inset-0 bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Card and text container */}
          <motion.div 
            className="relative flex flex-col items-center gap-4 z-10"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Player action text */}
            <motion.div 
              className="bg-purple-600 px-6 py-3 rounded-lg shadow-lg"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-white text-lg font-semibold text-center">
                <span className="text-yellow-400">{acquiredCardOverlay.playerName}</span>
                {' '}
                {acquiredCardOverlay.type === 'market' 
                  ? 'acquired from Market' 
                  : acquiredCardOverlay.type === 'golem' 
                    ? 'claimed a Golem' 
                    : 'played a card'}
              </p>
            </motion.div>
            
            {/* Card display */}
            <motion.div 
              className="w-40 h-60"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
            >
              <CompactCard card={acquiredCardOverlay.card} size="large" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AcquiredCardOverlay

