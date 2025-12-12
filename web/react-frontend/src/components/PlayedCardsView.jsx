import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CompactCard from './CompactCard'
import useOrientation from '../hooks/useOrientation'

const PlayedCardsView = ({ playedCards, onClose }) => {
  const { isMobile, isPortrait } = useOrientation()

  // Lock body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!playedCards || playedCards.length === 0) {
    return null
  }

  // Calculate grid dimensions based on number of cards
  const cols = isMobile && isPortrait ? 3 : 4
  const rows = Math.ceil(playedCards.length / cols)
  
  // Calculate card height based on viewport width
  const viewportWidth = window.innerWidth || 375
  const cardWidth = isMobile && isPortrait 
    ? (viewportWidth - 8 - (2 * 0.5 * 2)) / 3 // width - padding - gaps
    : 112 // normal card width
  const cardHeight = cardWidth * 1.5 // aspect ratio 2:3
  
  const gap = isMobile && isPortrait ? 2 : 12 // gap-0.5 = 2px
  const headerHeight = isMobile && isPortrait ? 36 : 60
  const padding = isMobile && isPortrait ? 8 : 48 // p-1 = 4px * 2
  
  // Calculate total height needed
  const totalHeight = headerHeight + (rows * cardHeight) + ((rows - 1) * gap) + padding
  const maxHeight = window.innerHeight * 0.9 // 90% of viewport
  const modalHeight = Math.min(totalHeight, maxHeight)

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`
            bg-black/90 backdrop-blur-md rounded-xl border border-white/30 shadow-2xl
            ${isMobile && isPortrait 
              ? 'w-full p-1' 
              : 'p-6 max-w-4xl w-full max-w-[90vw]'
            }
            flex flex-col overflow-hidden
          `}
          style={isMobile && isPortrait ? {
            height: `${modalHeight}px`,
            maxHeight: '90vh'
          } : {
            maxHeight: '90vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between flex-shrink-0 ${isMobile && isPortrait ? 'mb-1 px-1' : 'mb-4'}`}>
            <h3 className={`text-white font-bold ${isMobile && isPortrait ? 'text-sm' : 'text-2xl'}`}>
              Played Cards ({playedCards.length})
            </h3>
            <button
              onClick={onClose}
              className={`text-white/60 hover:text-white leading-none ${isMobile && isPortrait ? 'text-xl' : 'text-3xl'}`}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Cards Grid - Similar to CompactGameBoard */}
          <div className={`
            ${isMobile && isPortrait ? 'overflow-visible' : 'flex-1 overflow-y-auto'}
            ${isMobile && isPortrait 
              ? 'grid grid-cols-3 gap-0.5' 
              : 'grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'
            }
          `}
            style={isMobile && isPortrait ? {
              height: `${rows * cardHeight + (rows - 1) * gap}px`
            } : {}}
          >
            {playedCards.map((card, index) => (
              <div 
                key={`played-${index}`} 
                className={`
                  relative w-full overflow-hidden
                  ${isMobile && isPortrait ? 'flex items-center justify-center' : ''}
                `}
                style={isMobile && isPortrait ? {
                  aspectRatio: '2/3'
                } : {}}
              >
                <CompactCard
                  card={card}
                  type="action"
                  index={index}
                  size={isMobile && isPortrait ? 'flexible' : 'normal'}
                  showDetails={!isMobile}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default PlayedCardsView

