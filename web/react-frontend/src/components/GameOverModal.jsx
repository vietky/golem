import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'
import { getCardSpriteStyle, getCardImagePath } from '../utils/cardNames'

const GameOverModal = ({ onNewGame, onBackToMenu }) => {
  const { gameState } = useGameStore()
  const { isMobile } = useOrientation()
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Auto-hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!gameState?.gameOver) {
    return null
  }

  const winner = gameState.winner
  const players = gameState.players || []
  const marketCoins = gameState.market?.coins || []
  
  // Get remaining coins
  const copperRemaining = marketCoins[0]?.amount ?? 0
  const silverRemaining = marketCoins[1]?.amount ?? 0

  // Sort players by total points (descending)
  const sortedPlayers = [...players].sort((a, b) => {
    const aPoints = calculateTotalPoints(a)
    const bPoints = calculateTotalPoints(b)
    return bPoints - aPoints
  })

  function calculateTotalPoints(player) {
    const pointCardPoints = player.pointCards?.reduce((sum, card) => sum + (card.points || 0), 0) || 0
    const coinPoints = player.coins?.reduce((sum, coin) => sum + (coin.points || 0), 0) || 0
    // Non-yellow crystals are worth 1 point each
    const crystalPoints = (player.caravan?.green || player.resources?.green || 0) + 
                         (player.caravan?.blue || player.resources?.blue || 0) + 
                         (player.caravan?.pink || player.resources?.pink || 0)
    return pointCardPoints + coinPoints + crystalPoints
  }

  // Confetti particles
  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2
  }))

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-[201]">
            {confettiParticles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: particle.color,
                  left: `${particle.left}%`,
                  top: '-20px'
                }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  y: '100vh',
                  rotate: 720,
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeIn'
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          className={`
            relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 
            rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-yellow-500/50
            w-full overflow-hidden
            ${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-3xl max-h-[85vh]'}
          `}
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Glowing border effect */}
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 opacity-20 blur-xl" />
          
          {/* Content */}
          <div className={`relative z-10 ${isMobile ? 'p-4' : 'p-6 sm:p-8'} overflow-y-auto max-h-[85vh]`}>
            {/* Header */}
            <motion.div 
              className="text-center mb-4 sm:mb-6"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className={`inline-block ${isMobile ? 'text-4xl' : 'text-5xl sm:text-6xl'} mb-2`}
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                🏆
              </motion.div>
              <h2 className={`font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent ${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
                GAME OVER!
              </h2>
            </motion.div>

            {/* Winner Announcement */}
            <motion.div
              className={`bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 rounded-xl border border-yellow-500/30 ${isMobile ? 'p-3 mb-4' : 'p-4 sm:p-6 mb-6'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-3">
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'}`}>👑</span>
                <div className="text-center">
                  <div className={`text-yellow-300 font-bold ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                    {winner?.name || 'Unknown'}
                  </div>
                  <div className={`text-white/80 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Wins with <span className="text-yellow-400 font-bold">{winner?.points || 0}</span> points!
                  </div>
                </div>
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'}`}>👑</span>
              </div>
            </motion.div>

            {/* Bonus Coins Remaining */}
            <motion.div
              className={`bg-slate-800/50 rounded-xl border border-slate-600/30 ${isMobile ? 'p-2 mb-3' : 'p-3 mb-4'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <div className={`text-white/60 text-center ${isMobile ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
                Bonus Coins Remaining
              </div>
              <div className="flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <span className={isMobile ? 'text-lg' : 'text-xl'}>🥉</span>
                  <div className="text-center">
                    <div className={`text-orange-400 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {copperRemaining}/10
                    </div>
                    <div className={`text-white/50 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Copper (3pts)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={isMobile ? 'text-lg' : 'text-xl'}>🥈</span>
                  <div className="text-center">
                    <div className={`text-gray-300 font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {silverRemaining}/10
                    </div>
                    <div className={`text-white/50 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Silver (1pt)</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Players Ranking */}
            <div className={`space-y-3 ${isMobile ? 'mb-4' : 'mb-6'}`}>
              <h3 className={`text-white/80 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
                Ranking
              </h3>
              
              {sortedPlayers.map((player, index) => {
                const isWinner = player.id === winner?.id
                const pointCardPoints = player.pointCards?.reduce((sum, card) => sum + (card.points || 0), 0) || 0
                const coinPoints = player.coins?.reduce((sum, coin) => sum + (coin.points || 0), 0) || 0
                const copperCoins = player.coins?.filter(c => c.points === 3) || []
                const silverCoins = player.coins?.filter(c => c.points === 1) || []
                const resources = player.caravan || player.resources || {}
                const crystalPoints = (resources.green || 0) + (resources.blue || 0) + (resources.pink || 0)
                const totalPoints = pointCardPoints + coinPoints + crystalPoints

                const rankColors = ['from-yellow-500/30 to-amber-600/30 border-yellow-500/50', 
                                   'from-gray-400/20 to-gray-500/20 border-gray-400/40',
                                   'from-orange-700/20 to-orange-800/20 border-orange-600/40']
                const rankEmojis = ['🥇', '🥈', '🥉']

                return (
                  <motion.div
                    key={player.id}
                    className={`
                      bg-gradient-to-r ${rankColors[index] || 'from-slate-700/30 to-slate-800/30 border-slate-600/30'}
                      rounded-xl border backdrop-blur-sm overflow-hidden
                      ${isWinner ? 'ring-2 ring-yellow-400/50' : ''}
                    `}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    {/* Player Header */}
                    <div className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                          {rankEmojis[index] || `#${index + 1}`}
                        </span>
                        {isWinner && <span className="text-lg">👑</span>}
                        <span className={`font-bold text-white ${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>
                          {player.name}
                        </span>
                      </div>
                      <div className={`font-black text-yellow-300 ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                        {totalPoints} pts
                      </div>
                    </div>

                    {/* Points Breakdown */}
                    <div className={`bg-black/30 ${isMobile ? 'p-2' : 'p-3 sm:p-4'}`}>
                      {/* Golems */}
                      <div className={`flex items-center gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                        <span className={`text-white/60 ${isMobile ? 'text-xs w-16' : 'text-sm w-20'}`}>Golems:</span>
                        <div className="flex gap-1 flex-wrap flex-1">
                          {player.pointCards?.length > 0 ? (
                            player.pointCards.map((card, i) => {
                              const cardName = card.name || `golem_${String(card.points).padStart(4, '0')}`
                              const spriteStyle = getCardSpriteStyle(cardName)
                              return (
                                <div key={i} className="relative group">
                                  {spriteStyle ? (
                                    <div
                                      className={`rounded border border-white/30 ${isMobile ? 'w-8 h-10' : 'w-10 h-12 sm:w-12 sm:h-14'}`}
                                      style={spriteStyle}
                                    />
                                  ) : (
                                    <img
                                      src={getCardImagePath(cardName)}
                                      alt={`Golem ${card.points}pts`}
                                      className={`rounded object-cover border border-white/30 ${isMobile ? 'w-8 h-10' : 'w-10 h-12 sm:w-12 sm:h-14'}`}
                                      onError={(e) => { e.target.style.display = 'none' }}
                                    />
                                  )}
                                  <span className={`absolute -bottom-1 -right-1 bg-yellow-500 text-black rounded-full font-bold ${isMobile ? 'text-[8px] w-4 h-4' : 'text-[10px] w-5 h-5'} flex items-center justify-center`}>
                                    {card.points}
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <span className="text-white/40 text-xs">None</span>
                          )}
                        </div>
                        <span className={`text-green-400 font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          = {pointCardPoints}pts
                        </span>
                      </div>

                      {/* Coins */}
                      <div className={`flex items-center gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                        <span className={`text-white/60 ${isMobile ? 'text-xs w-16' : 'text-sm w-20'}`}>Coins:</span>
                        <div className="flex gap-1 flex-1">
                          {copperCoins.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              <span className={isMobile ? 'text-sm' : 'text-base'}>🥉</span>
                              <span className={`text-orange-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>×{copperCoins.length}</span>
                            </div>
                          )}
                          {silverCoins.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              <span className={isMobile ? 'text-sm' : 'text-base'}>🥈</span>
                              <span className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>×{silverCoins.length}</span>
                            </div>
                          )}
                          {copperCoins.length === 0 && silverCoins.length === 0 && (
                            <span className="text-white/40 text-xs">None</span>
                          )}
                        </div>
                        <span className={`text-green-400 font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          = {coinPoints}pts
                        </span>
                      </div>

                      {/* Crystals */}
                      <div className="flex items-center gap-2">
                        <span className={`text-white/60 ${isMobile ? 'text-xs w-16' : 'text-sm w-20'}`}>Crystals:</span>
                        <div className="flex gap-2 flex-1">
                          {resources.green > 0 && (
                            <div className="flex items-center gap-0.5">
                              <img src="/assets/images/stone_green.JPG" alt="green" className={`rounded-full ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                              <span className={`text-green-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>{resources.green}</span>
                            </div>
                          )}
                          {resources.blue > 0 && (
                            <div className="flex items-center gap-0.5">
                              <img src="/assets/images/stone_blue.JPG" alt="blue" className={`rounded-full ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                              <span className={`text-blue-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>{resources.blue}</span>
                            </div>
                          )}
                          {resources.pink > 0 && (
                            <div className="flex items-center gap-0.5">
                              <img src="/assets/images/stone_pink.JPG" alt="pink" className={`rounded-full ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                              <span className={`text-pink-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>{resources.pink}</span>
                            </div>
                          )}
                          {crystalPoints === 0 && (
                            <span className="text-white/40 text-xs">None</span>
                          )}
                        </div>
                        <span className={`text-green-400 font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          = {crystalPoints}pts
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Action Buttons */}
            <motion.div
              className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-row justify-center'}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <motion.button
                onClick={onNewGame}
                className={`
                  flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold 
                  rounded-xl shadow-lg transition-all
                  hover:from-emerald-600 hover:to-green-700 hover:shadow-emerald-500/30
                  ${isMobile ? 'py-3 px-4 text-sm' : 'py-4 px-6 text-base'}
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🎮 Play Again
              </motion.button>
              
              <motion.button
                onClick={onBackToMenu}
                className={`
                  flex-1 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold 
                  rounded-xl shadow-lg transition-all
                  hover:from-slate-700 hover:to-slate-800
                  ${isMobile ? 'py-3 px-4 text-sm' : 'py-4 px-6 text-base'}
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🏠 Back to Menu
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default GameOverModal

