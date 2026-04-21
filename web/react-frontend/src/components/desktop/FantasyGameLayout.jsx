import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FantasyMarketArea from '../FantasyMarketArea'
import DiscardModal from '../DiscardModal'
import AcquiredCardOverlay from '../AcquiredCardOverlay'
import GameOverModal from '../GameOverModal'
import useGameStore from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import { getCardSpriteStyle, getCardImagePath } from '../../utils/cardNames'

// ============================================
// LAYOUT SETTINGS - Everything uses % based positioning
// ============================================

// Game arena original dimensions
const GAME_ARENA_WIDTH = 1280
const GAME_ARENA_HEIGHT = 580

// Dock takes this % of total container height (each side)
const DOCK_HEIGHT_PERCENT = 15  // 12% top, 12% bottom = 24% total for docks

// Main container aspect ratio: width / total_height
// total_height = game_arena_height + 2 * dock_height
// If dock is 12% each side, game_arena is 76% of total
const TOTAL_HEIGHT = GAME_ARENA_HEIGHT / (1 - DOCK_HEIGHT_PERCENT * 2 / 100)
const MAIN_ASPECT_RATIO = GAME_ARENA_WIDTH / TOTAL_HEIGHT

// Game arena position inside main container (% based)
const GAME_ARENA_TOP = DOCK_HEIGHT_PERCENT  // starts after top docks
const GAME_ARENA_HEIGHT_PERCENT = 100 - DOCK_HEIGHT_PERCENT * 2  // 76%

// ============================================
// DOCK POSITIONS - All % based, relative to MAIN CONTAINER
// ============================================

// Dock size - image is 256x150 (ratio 1.7:1)
// Adjust width to match image ratio with dock height
const DOCK_LAYOUT = {
  width: 18,                       // % of container width
  height: DOCK_HEIGHT_PERCENT - 1  // % of container height (~11%)
  // Ratio: 18/11 ≈ 1.6 (close to image 1.7)
}

// Last played card layout (% based, relative to dock position)
const LAST_CARD_LAYOUT = {
  offsetX: 18.1,  // % - offset từ dock left (dương = qua phải)
  offsetY: 0,     // % - offset từ dock top (dương = xuống dưới)
  width: 6,       // % của container width
  height: DOCK_HEIGHT_PERCENT - 1,     // % của container height
}

// Hand area layout - dynamic based on available space
const HAND_AREA = {
  start: 25,        // % - bắt đầu sau graveyard
  end: 96,          // % - kết thúc trước dock đối phương
  maxCards: 8,      // số card hiển thị đầy đủ không overlap
  cardHeight: DOCK_HEIGHT_PERCENT - 1,  // % của container height
}

const DOCK_POSITIONS = [
  // Player 0 (You) - BOTTOM LEFT
  { left: 0, top: 100 - DOCK_HEIGHT_PERCENT + 0.5 },
  // TOP ROW: Player 1, 2, 3
  { left: 0, top: 0.5 },
  { left: 38, top: 0.5 },
  // Player 4 - BOTTOM RIGHT
  { left: 76, top: 0.5 },
  { left: 76, top: 100 - DOCK_HEIGHT_PERCENT + 0.5 },
]

// ============================================
// Player Dock Component
// ============================================
const PlayerDock = ({ player, isCurrentTurn, isMe, position }) => {
  const spriteStyle = getCardSpriteStyle('normal_dock')
  const [showGolems, setShowGolems] = useState(false)
  const golemCount = player.pointCards?.length || 0
  
  return (
    <>
      <motion.div 
        className={`
          absolute rounded-xl overflow-hidden shadow-lg
          ${isCurrentTurn ? 'ring-4 ring-green-500' : ''}
          ${isMe && !isCurrentTurn ? 'ring-2 ring-blue-400' : ''}
        `}
        style={{ 
          left: `${position.left}%`,
          top: `${position.top}%`,
          width: `${DOCK_LAYOUT.width}%`,
          height: `${DOCK_LAYOUT.height}%`,
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          boxShadow: isCurrentTurn 
            ? ['0 0 20px rgba(34,197,94,0.5)', '0 0 40px rgba(34,197,94,0.9)', '0 0 20px rgba(34,197,94,0.5)'] 
            : '0 10px 25px rgba(0,0,0,0.3)'
        }}
        transition={{ 
          duration: 0.3,
          boxShadow: isCurrentTurn ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}
        }}
      >
        {/* normal_dock background - scale to fill container */}
        <img 
          src="https://statics.vietky.io.vn/images/normal_dock.JPG" 
          alt="dock"
          className="absolute inset-0 w-full h-full rounded-xl"
          style={{ objectFit: 'fill' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        
        {/* Player info overlay */}
        <div className="absolute inset-0 flex flex-col p-2">
          {/* Top row: Name & Golem count */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1 flex-wrap">
              {player.isAI && <span className="text-sm">🤖</span>}
              <span className="text-white font-bold text-sm" style={{ textShadow: '0 0 4px #000, 0 0 8px #000, 1px 1px 2px #000' }}>
                {player.name || 'Player'}
              </span>
            </div>
            {/* Số golem đã ăn - clickable for self only */}
            <div 
              className={`
                flex items-center gap-1 bg-black/60 rounded px-2 py-1
                ${isMe && golemCount > 0 ? 'cursor-pointer hover:bg-black/80 hover:scale-105 transition-all' : ''}
              `}
              onClick={() => isMe && golemCount > 0 && setShowGolems(true)}
              title={isMe && golemCount > 0 ? 'Click to view golems' : ''}
            >
              <span className="text-lg">🗿</span>
              <span className="text-white font-bold text-base" style={{ textShadow: '0 0 3px #000' }}>
                {golemCount}
              </span>
            </div>
          </div>
          
          {/* Crystals - absolute positioned on dock like cards on arena */}
          {(() => {
            // Gop tat ca da thanh 1 array
            const allStones = [
              ...Array(player.resources?.yellow || 0).fill('yellow'),
              ...Array(player.resources?.pink || 0).fill('pink'),
              ...Array(player.resources?.green || 0).fill('green'),
              ...Array(player.resources?.blue || 0).fill('blue'),
            ]
            const row1 = allStones.slice(0, 5)   // 5 da dau
            const row2 = allStones.slice(5, 10)  // 5 da tiep theo
            
            // ============ STONE LAYOUT - Điều chỉnh vị trí đá (% based) ============
            const STONE_LAYOUT = {
              // Vị trí bắt đầu của row 1
              row1Left: 7,     // % từ trái
              row1Top: 36.5,      // % từ trên
              // Vị trí bắt đầu của row 2
              row2Left: 7,     // % từ trái
              row2Top: 66,      // % từ trên
              // Kích thước và khoảng cách
              stoneSize: 13.5,    // % của dock width
              gapX: 18.4,         // % khoảng cách ngang giữa các đá
            }
            // ========================================================================
            
            return (
              <>
                {/* Row 1: first 5 stones */}
                {row1.map((color, i) => (
                  <img 
                    key={`r1-${i}`} 
                    src={`https://statics.vietky.io.vn/images/stone_${color}.JPG`} 
                    alt={color} 
                    className="absolute object-cover rounded-full"
                    style={{
                      left: `${STONE_LAYOUT.row1Left + i * STONE_LAYOUT.gapX}%`,
                      top: `${STONE_LAYOUT.row1Top}%`,
                      width: `${STONE_LAYOUT.stoneSize}%`,
                      height: 'auto',
                      aspectRatio: '1',
                    }}
                  />
                ))}
                {/* Row 2: next 5 stones */}
                {row2.map((color, i) => (
                  <img 
                    key={`r2-${i}`} 
                    src={`https://statics.vietky.io.vn/images/stone_${color}.JPG`} 
                    alt={color} 
                    className="absolute object-cover rounded-full"
                    style={{
                      left: `${STONE_LAYOUT.row2Left + i * STONE_LAYOUT.gapX}%`,
                      top: `${STONE_LAYOUT.row2Top}%`,
                      width: `${STONE_LAYOUT.stoneSize}%`,
                      height: 'auto',
                      aspectRatio: '1',
                    }}
                  />
                ))}
              </>
            )
          })()}
        </div>
      </motion.div>

      {/* Golem Cards Modal - only for self */}
      <AnimatePresence>
        {isMe && showGolems && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowGolems(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              className="relative bg-gradient-to-br from-amber-900/95 to-stone-900/95 rounded-2xl p-6 max-w-[80vw] max-h-[80vh] overflow-auto border-2 border-amber-500/50 shadow-2xl"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-amber-200 flex items-center gap-2">
                  <span className="text-2xl">🗿</span>
                  My Golems ({golemCount})
                </h3>
                <button
                  onClick={() => setShowGolems(false)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Stats Summary */}
              {golemCount > 0 && (
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-black/40 rounded-xl border border-amber-500/30">
                  {/* Total Golem Points */}
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 text-sm">Golem Points:</span>
                    <span className="text-yellow-400 font-bold text-lg">
                      ★{player.pointCards?.reduce((sum, card) => sum + (card.points || 0), 0) || 0}
                    </span>
                  </div>
                  
                  {/* Coin Bonuses */}
                  {player.coins && player.coins.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300 text-sm">Bonus Coins:</span>
                      <div className="flex items-center gap-1">
                        {/* Copper coins (3pts each) */}
                        {player.coins.filter(c => c.points === 3).length > 0 && (
                          <span className="flex items-center gap-0.5 text-orange-400">
                            <span>🥉</span>
                            <span className="font-bold">{player.coins.filter(c => c.points === 3).length}</span>
                          </span>
                        )}
                        {/* Silver coins (1pt each) */}
                        {player.coins.filter(c => c.points === 1).length > 0 && (
                          <span className="flex items-center gap-0.5 text-gray-300">
                            <span>🥈</span>
                            <span className="font-bold">{player.coins.filter(c => c.points === 1).length}</span>
                          </span>
                        )}
                        <span className="text-yellow-400 font-bold ml-1">
                          (+{player.coins.reduce((sum, c) => sum + (c.points || 0), 0)})
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Total Points */}
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-amber-300 text-sm">Total:</span>
                    <span className="text-green-400 font-bold text-xl">
                      ★{(player.pointCards?.reduce((sum, card) => sum + (card.points || 0), 0) || 0) + 
                         (player.coins?.reduce((sum, c) => sum + (c.points || 0), 0) || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Golem Cards Grid */}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {player.pointCards?.map((card, idx) => (
                  <div 
                    key={idx}
                    className="rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform relative"
                    style={{ aspectRatio: '2/3', minWidth: '100px' }}
                  >
                    {(() => {
                      const spriteStyle = getCardSpriteStyle(card.name)
                      if (spriteStyle) {
                        return <div className="w-full h-full" style={spriteStyle} />
                      }
                      return (
                        <img
                          src={getCardImagePath(card.name)}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/golem_bg.JPG' }}
                        />
                      )
                    })()}
                    {/* Point badge on each card */}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
                      ★{card.points || 0}
                    </div>
                  </div>
                ))}
              </div>
              
              {golemCount === 0 && (
                <p className="text-center text-white/60 py-8">No golems collected yet</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================
// Last Played Card Component - Shows beside dock
// For others: hover to see last card
// For me: click to see graveyard (all played cards)
// ============================================
const LastPlayedCard = ({ player, dockPosition, isMe, isMyTurn }) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [showGraveyard, setShowGraveyard] = React.useState(false)
  const rest = useGameStore(useShallow(state => state.rest))
  const playedCards = player?.playedCards || []
  const lastCard = playedCards.length > 0 ? playedCards[playedCards.length - 1] : null
  const canRest = isMe && isMyTurn && playedCards.length > 0
  
  if (!lastCard) return null
  
  return (
    <>
      {/* Small card beside dock - use sprite */}
      <motion.div
        className="absolute rounded-lg overflow-hidden shadow-lg cursor-pointer z-10"
        style={{
          left: `${dockPosition.left + LAST_CARD_LAYOUT.offsetX}%`,
          top: `${dockPosition.top + LAST_CARD_LAYOUT.offsetY}%`,
          width: `${LAST_CARD_LAYOUT.width}%`,
          height: `${LAST_CARD_LAYOUT.height}%`,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => !isMe && setIsHovered(true)}
        onMouseLeave={() => !isMe && setIsHovered(false)}
        onClick={() => isMe && setShowGraveyard(true)}
      >
        {(() => {
          const spriteStyle = getCardSpriteStyle(lastCard.name)
          if (spriteStyle) {
            return <div className="w-full h-full" style={spriteStyle} />
          }
          return (
            <img
              src={getCardImagePath(lastCard.name)}
              alt={lastCard.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/golem_bg.JPG' }}
            />
          )
        })()}
        {/* Card count badge */}
        {playedCards.length > 1 && (
          <div className="absolute top-0 right-0 bg-black/70 text-white text-xs px-1 rounded-bl">
            {playedCards.length}
          </div>
        )}
        {/* Click hint for me */}
        {isMe && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
            Click
          </div>
        )}
      </motion.div>

      {/* For others: Large card in center when hovered */}
      <AnimatePresence>
        {!isMe && isHovered && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />
            {/* Large card - maintain aspect ratio, use sprite */}
            <motion.div
              className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{ 
                width: 'auto',
                height: '60vh',
                aspectRatio: '2/3',
              }}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {(() => {
                const spriteStyle = getCardSpriteStyle(lastCard.name)
                if (spriteStyle) {
                  return <div className="w-full h-full" style={spriteStyle} />
                }
                return (
                  <img
                    src={getCardImagePath(lastCard.name)}
                    alt={lastCard.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/golem_bg.JPG' }}
                  />
                )
              })()}
              {/* Player name */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-2">
                <span className="font-bold">{player.name}</span>
                <span className="text-gray-300 ml-2">({playedCards.length} cards played)</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* For me: Graveyard modal with all played cards */}
      <AnimatePresence>
        {isMe && showGraveyard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowGraveyard(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" />
            {/* Graveyard panel */}
            <motion.div
              className="relative bg-gray-900/95 rounded-xl p-6 min-w-[60vw] max-w-[90vw] max-h-[85vh] overflow-auto"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-2xl">
                  🗑️ Graveyard ({playedCards.length} cards)
                </h3>
                <div className="flex items-center gap-4">
                  {/* Rest Button */}
                  {canRest && (
                    <button
                      onClick={() => {
                        rest()
                        setShowGraveyard(false)
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg px-6 py-2 text-lg shadow-lg transition-all"
                    >
                      🔄 Rest
                    </button>
                  )}
                  <button 
                    onClick={() => setShowGraveyard(false)}
                    className="text-white/70 hover:text-white text-3xl"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {/* Cards grid - larger cards */}
              <div className="grid grid-cols-4 gap-4">
                {playedCards.map((card, idx) => (
                  <div 
                    key={idx}
                    className="rounded-xl overflow-hidden shadow-lg"
                    style={{ aspectRatio: '2/3', minWidth: '120px' }}
                  >
                    {(() => {
                      const spriteStyle = getCardSpriteStyle(card.name)
                      if (spriteStyle) {
                        return <div className="w-full h-full" style={spriteStyle} />
                      }
                      return (
                        <img
                          src={getCardImagePath(card.name)}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/golem_bg.JPG' }}
                        />
                      )
                    })()}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================
// My Hand Cards Component - Dynamic layout with overlap support
// ============================================
const MyHandCards = ({ dockPosition }) => {
  const { 
    myPlayer, 
    currentPlayer, 
    playCard,
    showUpgradeModal,
    showTradeModal 
  } = useGameStore(useShallow(state => ({
    myPlayer: state.myPlayer,
    currentPlayer: state.currentPlayer,
    playCard: state.playCard,
    showUpgradeModal: state.showUpgradeModal,
    showTradeModal: state.showTradeModal
  })))
  const hand = myPlayer?.hand || []
  const isMyTurn = currentPlayer?.id === myPlayer?.id
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  // Handle card click - same logic as FantasyMarketArea
  const handleCardClick = (cardIndex) => {
    if (!isMyTurn) return
    
    const card = hand[cardIndex]
    if (card && card.actionType === 1) {
      // Upgrade card - show modal
      showUpgradeModal(card, cardIndex)
    } else if (card && card.actionType === 2) {
      // Trade card - show modal
      showTradeModal(card, cardIndex)
    } else {
      // Normal card - play directly
      playCard(cardIndex, card)
    }
  }
  
  if (hand.length === 0) return null
  
  // Calculate dynamic card positions
  const handWidth = HAND_AREA.end - HAND_AREA.start  // 71%
  const cardWidth = handWidth / HAND_AREA.maxCards   // ~8.9% per card
  const cardCount = hand.length
  const isOverlapping = cardCount > HAND_AREA.maxCards
  
  // Calculate offset for each card
  const getCardOffset = (index) => {
    if (!isOverlapping) {
      // Cards fit - show with even spacing
      return index * cardWidth
    } else {
      // Too many cards - overlap them
      const overlapSpacing = (handWidth - cardWidth) / (cardCount - 1)
      return index * overlapSpacing
    }
  }
  
  return (
    <div 
      className="absolute z-10"
      style={{
        left: `${HAND_AREA.start}%`,
        top: `${dockPosition.top}%`,
        width: `${handWidth}%`,
        height: `${HAND_AREA.cardHeight}%`,
      }}
    >
      {hand.map((card, idx) => {
        const offset = getCardOffset(idx)
        const isHovered = hoveredIndex === idx
        
        return (
          <motion.div
            key={card.id || idx}
            className={`
              absolute rounded-lg overflow-hidden shadow-lg cursor-pointer
              ${isMyTurn ? 'ring-2 ring-green-400/50 hover:ring-green-400' : 'opacity-70'}
            `}
            style={{
              left: `${offset}%`,
              width: `${cardWidth}%`,
              height: '100%',
              zIndex: isHovered ? 50 : idx,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: isHovered ? -25 : 0,
              scale: isHovered ? 1.5 : 1,
            }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleCardClick(idx)}
            title={isMyTurn ? 'Click to play' : 'Wait for your turn'}
          >
            {(() => {
              const spriteStyle = getCardSpriteStyle(card.name)
              if (spriteStyle) {
                return <div className="w-full h-full" style={spriteStyle} />
              }
              return (
                <img
                  src={getCardImagePath(card.name)}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/golem_bg.JPG' }}
                />
              )
            })()}
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================
// Main Layout Component
// ============================================
const FantasyGameLayout = ({ onNewGame, onBackToMenu }) => {
  const { gameState, myPlayer, currentPlayer } = useGameStore(useShallow(state => ({
    gameState: state.gameState,
    myPlayer: state.myPlayer,
    currentPlayer: state.currentPlayer
  })))
  const allPlayers = gameState?.players || []

  return (
    <div 
      className="h-screen h-[100dvh] relative overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: 'url(https://statics.vietky.io.vn/images/new_theme_bg.JPG)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* MAIN CONTAINER - Contains both docks and game arena */}
      {/* Scales to fit viewport while maintaining aspect ratio */}
      <div 
        className="relative"
        style={{
          aspectRatio: `${MAIN_ASPECT_RATIO}`,
          width: '98vw',
          height: '98vh',
          maxWidth: `calc(98vh * ${MAIN_ASPECT_RATIO})`,
          maxHeight: `calc(98vw / ${MAIN_ASPECT_RATIO})`,
        }}
      >
        {/* Player Docks - Positioned with % relative to main container */}
        {allPlayers.map((player, idx) => (
          <React.Fragment key={player.id}>
            <PlayerDock
              player={player}
              isCurrentTurn={currentPlayer?.id === player.id}
              isMe={myPlayer?.id === player.id}
              position={DOCK_POSITIONS[idx] || DOCK_POSITIONS[0]}
            />
            {/* Last played card beside dock */}
            <LastPlayedCard
              player={player}
              dockPosition={DOCK_POSITIONS[idx] || DOCK_POSITIONS[0]}
              isMe={myPlayer?.id === player.id}
              isMyTurn={currentPlayer?.id === myPlayer?.id}
            />
            {/* My hand cards - only for me */}
            {myPlayer?.id === player.id && (
              <MyHandCards dockPosition={DOCK_POSITIONS[idx] || DOCK_POSITIONS[0]} />
            )}
          </React.Fragment>
        ))}

        {/* GAME ARENA - Positioned with % relative to main container */}
        <div 
          className="absolute"
          style={{
            left: '0%',
            top: `${GAME_ARENA_TOP}%`,
            width: '100%',
            height: `${GAME_ARENA_HEIGHT_PERCENT}%`,
          }}
        >
          {/* Game Board Background (game_dock.jpg) */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg shadow-2xl"
            style={{
              backgroundImage: 'url(https://statics.vietky.io.vn/images/game_dock.jpg)'
            }}
          />

          {/* Game Info Overlay - Top */}
          <div className="absolute top-0 left-0 right-0 z-20 p-2">
            <div className="flex items-center justify-between text-white text-xs">
              {/* Round Info */}
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="font-semibold">Round {gameState?.round || 1}</span>
                {gameState?.lastRound && (
                  <span className="bg-red-500/80 text-white text-[10px] px-1.5 py-0.5 rounded animate-pulse">
                    FINAL
                  </span>
                )}
              </div>

              {/* Current Turn */}
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                {currentPlayer?.id === myPlayer?.id ? (
                  <span className="text-green-400 font-bold">Your Turn</span>
                ) : (
                  <span className="text-yellow-400">{currentPlayer?.name}'s Turn</span>
                )}
              </div>

              {/* Deck Info */}
              <div className="flex gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span>Action: {gameState?.market?.actionDeck || 0}</span>
                <span>|</span>
                <span>Point: {gameState?.market?.pointDeck || 0}</span>
              </div>
            </div>
          </div>

          {/* Market Area - Center */}
          <FantasyMarketArea />

          {/* Discard Modal */}
          <DiscardModal />

          {/* Acquired Card Overlay */}
          <AcquiredCardOverlay />

          {/* Game Over Modal */}
          <GameOverModal 
            onNewGame={onNewGame}
            onBackToMenu={onBackToMenu}
          />
        </div>
      </div>
    </div>
  )
}

export default FantasyGameLayout
