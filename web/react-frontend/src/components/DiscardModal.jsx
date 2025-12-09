import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const DiscardModal = () => {
  const { myPlayer, discardCrystals } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [discardCounts, setDiscardCounts] = useState({
    yellow: 0,
    green: 0,
    blue: 0,
    pink: 0
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    if (myPlayer?.pendingDiscard > 0) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [myPlayer?.pendingDiscard]);

  if (!myPlayer || !myPlayer.pendingDiscard || myPlayer.pendingDiscard <= 0) {
    return null
  }

  const pending = myPlayer.pendingDiscard
  const currentTotal = discardCounts.yellow + discardCounts.green + discardCounts.blue + discardCounts.pink
  const remaining = pending - currentTotal

  const updateDiscard = (type, delta) => {
    setDiscardCounts(prev => {
      const newCounts = { ...prev }
      const current = newCounts[type] || 0
      const available = myPlayer.resources[type] || 0
      const newValue = Math.max(0, Math.min(available, current + delta))
      newCounts[type] = newValue
      return newCounts
    })
  }

  const handleConfirm = () => {
    if (currentTotal === pending) {
      discardCrystals(discardCounts)
      setDiscardCounts({ yellow: 0, green: 0, blue: 0, pink: 0 })
    }
  }

  const crystalTypes = [
    { key: 'yellow', label: 'Yellow', color: 'bg-yellow-400' },
    { key: 'green', label: 'Green', color: 'bg-green-400' },
    { key: 'blue', label: 'Blue', color: 'bg-blue-400' },
    { key: 'pink', label: 'Pink', color: 'bg-pink-400' }
  ]

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`
            bg-white rounded-xl sm:rounded-2xl shadow-2xl border-4 border-red-500 w-full
            ${isMobile 
              ? 'max-w-[95vw] p-3 mx-2' 
              : 'max-w-md p-8 mx-4'
            }
          `}
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
            <h2 className={`font-bold text-red-600 ${isMobile ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>
              ⚠️ Too Many Crystals!
            </h2>
            <p className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-base'}`}>
              You have <span className="font-bold text-red-600">{pending}</span> excess crystals.
              <br />
              Discard <span className="font-bold">{remaining}</span> more to continue.
            </p>
          </div>

          <div className={`space-y-2 ${isMobile ? 'mb-3' : 'space-y-4 mb-6'}`}>
            {crystalTypes.map(({ key, label, color }) => {
              const available = myPlayer.resources[key] || 0
              const selected = discardCounts[key] || 0
              
              return (
                <div key={key} className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
                  <div className={`
                    ${color} rounded-full flex items-center justify-center text-white font-bold shadow-lg
                    ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}
                  `}>
                    <img
                      src={`/images/stone_${key}.JPG`}
                      alt={label}
                      className={`rounded-full object-cover ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}
                      onError={(e) => {
                        e.target.src = '/images/stone_yellow.JPG'
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className={`flex justify-between items-center ${isMobile ? 'mb-0.5' : 'mb-1'}`}>
                      <span className={`font-medium text-gray-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>{label}</span>
                      <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                        Available: {available} | Selected: {selected}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => updateDiscard(key, -1)}
                        disabled={selected <= 0}
                        className={`
                          rounded-full bg-gray-200 hover:bg-gray-300 
                          disabled:opacity-50 disabled:cursor-not-allowed 
                          flex items-center justify-center font-bold text-gray-700
                          ${isMobile ? 'w-7 h-7 text-sm' : 'w-8 h-8'}
                        `}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        −
                      </motion.button>
                      <div className={`
                        flex-1 bg-gray-100 rounded-lg text-center font-bold
                        ${isMobile ? 'px-2 py-1 text-base' : 'px-4 py-2 text-lg'}
                      `}>
                        {selected}
                      </div>
                      <motion.button
                        onClick={() => updateDiscard(key, 1)}
                        disabled={selected >= available || currentTotal >= pending}
                        className={`
                          rounded-full bg-gray-200 hover:bg-gray-300 
                          disabled:opacity-50 disabled:cursor-not-allowed 
                          flex items-center justify-center font-bold text-gray-700
                          ${isMobile ? 'w-7 h-7 text-sm' : 'w-8 h-8'}
                        `}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        +
                      </motion.button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={`
            bg-yellow-50 border-2 border-yellow-300 rounded-lg
            ${isMobile ? 'p-2 mb-3' : 'p-4 mb-6'}
          `}>
            <div className="text-center">
              <div className={`text-gray-600 ${isMobile ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>Progress</div>
              <div className={`font-bold text-yellow-700 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {currentTotal} / {pending}
              </div>
              <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${isMobile ? 'h-2 mt-1' : 'h-3 mt-2'}`}>
                <motion.div
                  className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentTotal / pending) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          <motion.button
            onClick={handleConfirm}
            disabled={currentTotal !== pending}
            className={`
              w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold 
              rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl
              ${isMobile ? 'py-3 px-4 text-sm' : 'py-4 px-6'}
            `}
            whileHover={currentTotal === pending ? { scale: 1.05 } : {}}
            whileTap={currentTotal === pending ? { scale: 0.95 } : {}}
          >
            {currentTotal === pending 
              ? 'Confirm Discard' 
              : `Select ${remaining} more crystal${remaining !== 1 ? 's' : ''}`
            }
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default DiscardModal
