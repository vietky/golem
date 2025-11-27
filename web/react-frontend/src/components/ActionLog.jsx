import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'

const ActionLog = () => {
  const { actionLog } = useGameStore()

  return (
    <div className="fixed top-24 right-6 z-30 w-64">
      <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 border border-gray-700">
        <h4 className="text-white text-sm font-bold mb-2">Action Log</h4>
        <div className="space-y-2">
          <AnimatePresence>
            {actionLog.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded"
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
          {actionLog.length === 0 && (
            <div className="text-xs text-gray-500">No actions yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActionLog

