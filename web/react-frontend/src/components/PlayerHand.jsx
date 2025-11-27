import React, { useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import Card from './Card'
import useGameStore from '../store/gameStore'

const PlayerHand = () => {
  const { myPlayer, currentPlayer, playCard, setIsDragging } = useGameStore()
  const handRef = useRef(null)
  const [draggedCardIndex, setDraggedCardIndex] = useState(null)
  const dragControls = useDragControls()

  // Show empty state if player data not ready yet
  if (!myPlayer) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-800 to-transparent p-6 z-20">
        <div className="max-w-7xl mx-auto text-center text-white">
          <p>Loading your hand...</p>
        </div>
      </div>
    )
  }

  if (!myPlayer.hand || myPlayer.hand.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-800 to-transparent p-6 z-20">
        <div className="max-w-7xl mx-auto text-center text-white">
          <h3 className="text-lg font-bold mb-4">Your Hand</h3>
          <p className="text-gray-400">No cards in hand yet</p>
        </div>
      </div>
    )
  }

  const isMyTurn = currentPlayer?.id === myPlayer.id
  const hand = myPlayer.hand || []

  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedCardIndex(index)
    setIsDragging(true)
  }

  // Handle drag end
  const handleDragEnd = (event, info, cardIndex) => {
    setIsDragging(false)
    setDraggedCardIndex(null)
    
    // Check if dropped over valid area (market area)
    const marketArea = document.querySelector('[data-drop-zone="market"]')
    if (marketArea) {
      const rect = marketArea.getBoundingClientRect()
      const x = event.clientX || info.point.x
      const y = event.clientY || info.point.y
      
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Valid drop - play card
        if (isMyTurn) {
          playCard(cardIndex)
        }
      } else {
        // Invalid drop - shake back to position
        // Animation handled by Card component
      }
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-800 to-transparent p-6 z-20">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-white text-lg font-bold mb-4 text-center">
          Your Hand {isMyTurn && <span className="text-green-400">(Your Turn)</span>}
        </h3>
        
        <div
          ref={handRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          style={{
            scrollbarWidth: 'thin',
          }}
        >
          <AnimatePresence>
            {hand.map((card, index) => (
              <motion.div
                key={`${card.name}-${index}`}
                initial={{ opacity: 0, y: 50, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotateZ: -180 }}
                layout
                className="flex-shrink-0"
                style={{ width: '220px', minWidth: '220px' }}
                whileHover={{ y: -10, z: 20 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                <Card
                  card={card}
                  type="action"
                  index={index}
                  isPlayable={isMyTurn}
                  isPlaying={isMyTurn}
                  onClick={() => isMyTurn && playCard(index)}
                  isDragging={draggedCardIndex === index}
                  onDragStart={() => isMyTurn && handleDragStart(index)}
                  onDragEnd={(event, info) => handleDragEnd(event, info, index)}
                  dragConstraints={handRef}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default PlayerHand
