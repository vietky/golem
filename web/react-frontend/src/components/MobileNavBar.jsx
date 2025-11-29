import React from 'react'
import { motion } from 'framer-motion'
import useGameStore from '../store/gameStore'
import { useMobileLayout } from '../contexts/MobileLayoutContext'
import useOrientation from '../hooks/useOrientation'

const MobileNavBar = () => {
  const { rest } = useGameStore()
  const { isHandExpanded, setIsHandExpanded, isResourceExpanded, setIsResourceExpanded } = useMobileLayout()
  const { isMobile, isPortrait } = useOrientation()

  // Only show on mobile in portrait mode
  if (!isMobile || !isPortrait) {
    return null
  }

  const scrollToMarket = () => {
    const marketArea = document.querySelector('[data-drop-zone="market"]')
    if (marketArea) {
      marketArea.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t-2 border-purple-500/50 safe-bottom"
    >
      <div className="grid grid-cols-4 gap-1 p-2">
        {/* Hand Button */}
        <button
          onClick={() => setIsHandExpanded(!isHandExpanded)}
          className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all touch-target ${
            isHandExpanded
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="text-xs font-semibold">Hand</span>
        </button>

        {/* Resources Button */}
        <button
          onClick={() => setIsResourceExpanded(!isResourceExpanded)}
          className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all touch-target ${
            isResourceExpanded
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-semibold">Resources</span>
        </button>

        {/* Market Button */}
        <button
          onClick={scrollToMarket}
          className="flex flex-col items-center justify-center py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all touch-target"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-xs font-semibold">Market</span>
        </button>

        {/* Rest Button */}
        <button
          onClick={rest}
          className="flex flex-col items-center justify-center py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all touch-target"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs font-semibold">Rest</span>
        </button>
      </div>
    </motion.div>
  )
}

export default MobileNavBar

