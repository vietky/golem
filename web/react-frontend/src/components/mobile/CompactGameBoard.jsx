import React, { useState, useRef } from 'react'
import useGameStore from '../../store/gameStore'
import useOrientation from '../../hooks/useOrientation'
import CompactCard from '../CompactCard'
import DepositModal from '../DepositModal'
import ConfirmGolemModal from '../ConfirmGolemModal'
import { showToast } from '../../utils/toast'

const CompactGameBoard = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard, startGame, isSpectator } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const [confirmGolem, setConfirmGolem] = useState({ show: false, golem: null, index: null })
  const containerRef = useRef(null)

  // Check if game is in waiting status
  const hasEmptyMarket = !gameState.market || Object.keys(gameState.market).length === 0
  const isWaiting = gameState.status === 'waiting' || hasEmptyMarket
  const otherPlayers = gameState.players || []

  // Handle start game button click
  const handleStartGame = async () => {
    const result = await startGame()
    if (!result.success) {
      showToast(result.error || 'Failed to start game', 'error')
    }
  }

  // If waiting mode, show waiting UI with Start Game button
  if (isWaiting) {
    return (
      <div 
        ref={containerRef}
        className={`
          w-full mx-auto flex items-center justify-center h-full
          ${isMobile && isPortrait ? 'px-2 py-2' : isMobile ? 'px-2 py-3' : 'px-4 py-4'}
        `}
      >
        <div className="flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-purple-900/40 to-blue-900/40 backdrop-blur-md rounded-xl border-2 border-purple-400/50 p-6 w-full max-w-md shadow-2xl min-h-[300px]">
          {/* Waiting message */}
          <div className="text-white text-base sm:text-xl font-bold text-center px-4 py-3 bg-black/50 rounded-lg border border-white/30 shadow-xl">
            ⏳ Waiting for other players to join
          </div>
          
          {/* Player count indicator */}
          <div className="text-green-300 text-sm font-semibold bg-black/40 px-4 py-2 rounded-lg">
            {otherPlayers.length} player(s) in lobby
          </div>
          
          {!isSpectator && (
            <button
              onClick={handleStartGame}
              className="flex px-10 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:from-green-700 active:to-green-800 text-white font-extrabold rounded-xl border-4 border-green-300 transition-all shadow-2xl text-lg whitespace-nowrap items-center justify-center gap-2 touch-manipulation w-full max-w-xs"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                minHeight: '60px'
              }}
            >
              <span className="text-xl">🎮</span>
              <span>Start Game</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Get cards directly from current state
  const actionCards = gameState.market.actionCards || []
  const pointCards = gameState.market.pointCards || []
  const { coins } = gameState.market
  const isMyTurn = currentPlayer?.id === myPlayer?.id

  const canAfford = (cost) => {
    if (!cost || !myPlayer?.caravan) return false
    return (
      (myPlayer.caravan.yellow || 0) >= (cost.yellow || 0) &&
      (myPlayer.caravan.green || 0) >= (cost.green || 0) &&
      (myPlayer.caravan.blue || 0) >= (cost.blue || 0) &&
      (myPlayer.caravan.pink || 0) >= (cost.pink || 0)
    )
  }

  const canClaimPointCard = (card) => {
    if (!card?.requirement || !myPlayer?.caravan) return false
    return (
      (myPlayer.caravan.yellow || 0) >= (card.requirement.yellow || 0) &&
      (myPlayer.caravan.green || 0) >= (card.requirement.green || 0) &&
      (myPlayer.caravan.blue || 0) >= (card.requirement.blue || 0) &&
      (myPlayer.caravan.pink || 0) >= (card.requirement.pink || 0)
    )
  }

  const handleAcquireCard = (index, event) => {
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }
    const card = actionCards[index]
    
    // Card at index 0 (position 1) is always FREE - no deposits needed
    if (index === 0) {
      acquireCard(index, {}, card)
      return
    }
    
    // Check if player has any crystals to deposit
    const totalCrystals = (myPlayer?.caravan?.yellow || 0) + 
                          (myPlayer?.caravan?.green || 0) + 
                          (myPlayer?.caravan?.blue || 0) + 
                          (myPlayer?.caravan?.pink || 0)
    
    if (totalCrystals < index) {
      showToast(`Need ${index} crystals to deposit for position ${index + 1}`, 'error')
      return
    }
    
    // Show deposit modal
    setDepositModal({ show: true, card, index })
  }

  const handleClaimPointCard = (index) => {
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }
    
    const card = pointCards[index]
    if (!canClaimPointCard(card)) {
      // Show what's missing
      const req = card?.requirement || {}
      const have = myPlayer?.caravan || {}
      const missing = []
      
      if ((req.yellow || 0) > (have.yellow || 0)) 
        missing.push(`${(req.yellow || 0) - (have.yellow || 0)} Yellow`)
      if ((req.green || 0) > (have.green || 0)) 
        missing.push(`${(req.green || 0) - (have.green || 0)} Green`)
      if ((req.blue || 0) > (have.blue || 0)) 
        missing.push(`${(req.blue || 0) - (have.blue || 0)} Blue`)
      if ((req.pink || 0) > (have.pink || 0)) 
        missing.push(`${(req.pink || 0) - (have.pink || 0)} Pink`)
      
      showToast(`Missing: ${missing.join(', ')}`, 'error')
      return
    }
    
    // Show confirmation modal
    setConfirmGolem({ show: true, golem: card, index })
  }

  const handleConfirmClaim = () => {
    if (confirmGolem.index !== null && confirmGolem.golem) {
      claimPointCard(confirmGolem.index, confirmGolem.golem)
    }
    setConfirmGolem({ show: false, golem: null, index: null })
  }

  return (
    <div 
      ref={containerRef}
      className={`
        w-full mx-auto flex flex-col h-full
        ${isMobile && isPortrait 
          ? 'px-2 py-2 gap-2' 
          : isMobile 
            ? 'flex-1 px-2 py-3 gap-3' 
            : 'flex-1 px-4 py-4 gap-4 max-w-6xl'
        }
      `}
    >
      {/* Action Cards Market */}
      <div className={`
        bg-black/40 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden
        ${isMobile && isPortrait ? 'p-2' : isMobile ? 'p-3' : 'p-4'}
      `}>
        <div className={`flex items-center justify-between ${isMobile && isPortrait ? 'mb-1' : 'mb-2'}`}>
          <h3 className={`text-white/60 font-medium ${isMobile && isPortrait ? 'text-[10px]' : isMobile ? 'text-xs' : 'text-sm'}`}>
            Market
          </h3>
          <span className={`text-white/40 ${isMobile && isPortrait ? 'text-[9px]' : 'text-[10px]'}`}>
            {gameState.market.actionDeck || 0} left
          </span>
        </div>
        
        <div className={`
          grid flex-1 min-h-0
          ${isMobile && isPortrait 
            ? 'grid-cols-3 grid-rows-2 gap-1' 
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2'
          }
        `}>
          {actionCards.map((cardData, index) => {
            const cost = cardData.cost || {}
            const isAffordable = isMyTurn && canAfford(cost)
            const deposits = cardData.deposits || {}
            const depositCount = Object.values(deposits).reduce((a, b) => 
              parseInt(a || 0) + parseInt(b || 0), 0
            )

            // Build crystal badges array
            const crystalBadges = []
            const crystalImages = {
              yellow: 'https://statics.vietky.io.vn/images/stone_yellow.JPG',
              green: 'https://statics.vietky.io.vn/images/stone_green.JPG',
              blue: 'https://statics.vietky.io.vn/images/stone_blue.JPG',
              pink: 'https://statics.vietky.io.vn/images/stone_pink.JPG'
            }
            Object.entries(deposits).forEach(([type, count]) => {
              for (let i = 0; i < parseInt(count || 0); i++) {
                crystalBadges.push({ type, src: crystalImages[type] || crystalImages.yellow })
              }
            })

            return (
              <CompactCard
                key={`action-${index}`}
                card={cardData}
                type="action"
                index={index}
                cost={cost}
                isAffordable={isAffordable}
                onClick={(e) => handleAcquireCard(index, e)}
                size="flexible"
                showDetails={!isMobile}
                position={index + 1}
                badge={crystalBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-0.5 max-w-[60px] justify-end">
                    {crystalBadges.map((crystal, i) => (
                      <img
                        key={i}
                        src={crystal.src}
                        alt={crystal.type}
                        className="w-4 h-4 rounded-full object-cover border border-white/50 shadow"
                        onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/stone_yellow.JPG' }}
                      />
                    ))}
                  </div>
                ) : null}
              />
            )
          })}
        </div>
      </div>

      {/* Point Cards Market */}
      <div className={`
        bg-black/40 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden
        ${isMobile && isPortrait ? 'p-2' : isMobile ? 'p-3' : 'p-4'}
      `}>
        <div className={`flex items-center justify-between ${isMobile && isPortrait ? 'mb-1' : 'mb-2'}`}>
          <h3 className={`text-white/60 font-medium ${isMobile && isPortrait ? 'text-[10px]' : isMobile ? 'text-xs' : 'text-sm'}`}>
            Golems
          </h3>
          <div className={`flex items-center gap-2 ${isMobile && isPortrait ? 'text-[9px]' : 'text-[10px]'}`}>
            {/* Coins remaining info */}
            {coins && coins[0]?.amount > 0 && (
              <span className="text-orange-400" title="Copper coins (3pts each)">
                🥉{coins[0].amount}
              </span>
            )}
            {coins && coins[1]?.amount > 0 && (
              <span className="text-gray-300" title="Silver coins (1pt each)">
                🥈{coins[1].amount}
              </span>
            )}
            <span className="text-white/40">
              {gameState.market.pointDeck || 0} left
            </span>
          </div>
        </div>
        
        <div className={`
          grid flex-1 min-h-0
          ${isMobile && isPortrait 
            ? 'grid-cols-3 grid-rows-2 gap-1' 
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'
          }
        `}>
          {pointCards.map((cardData, index) => {
            const canClaim = isMyTurn && canClaimPointCard(cardData)
            
            // Helper function to get coin for position based on new rules
            // Position 0: First available coin (copper if available, silver if copper is gone)
            // Position 1: Silver coin only if copper is still available
            const getCoinForPosition = (pos) => {
              if (pos === 0) {
                // Position 0: First available coin
                if (coins && coins[0] && coins[0].amount > 0) {
                  return { coin: coins[0], isCopper: coins[0].points === 3 }
                } else if (coins && coins[1] && coins[1].amount > 0) {
                  return { coin: coins[1], isCopper: false }
                }
              } else if (pos === 1) {
                // Position 1: Silver coin only if copper is still available
                if (coins && coins[0] && coins[0].amount > 0 && coins[1] && coins[1].amount > 0) {
                  return { coin: coins[1], isCopper: false }
                }
              }
              return null
            }

            const coinInfo = getCoinForPosition(index)
            const coinBonus = coinInfo !== null
            const coinAmount = coinInfo ? coinInfo.coin.amount : 0
            const isCopperCoin = coinInfo ? coinInfo.isCopper : false
            const coinEmoji = isCopperCoin ? '🥉' : '🥈'
            const coinLabel = isCopperCoin ? 'Copper (3pts)' : 'Silver (1pt)'

            return (
              <CompactCard
                key={`point-${index}`}
                card={cardData}
                type="point"
                index={index}
                isAffordable={canClaim}
                onClick={() => handleClaimPointCard(index)}
                size="flexible"
                showDetails={!isMobile}
                position={index + 1}
                badge={coinBonus ? (
                  <div 
                    className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-white/20"
                    title={`${coinLabel} - ${coinAmount} remaining`}
                  >
                    <span className="text-sm">{coinEmoji}</span>
                    <span className="text-[10px] text-white font-bold">{coinAmount}</span>
                  </div>
                ) : null}
              />
            )
          })}
        </div>
      </div>

      {/* Deposit Modal */}
      {depositModal.show && (
        <DepositModal
          card={depositModal.card}
          cardIndex={depositModal.index}
          onClose={() => setDepositModal({ show: false, card: null, index: null })}
        />
      )}

      {/* Confirm Golem Modal */}
      <ConfirmGolemModal
        isOpen={confirmGolem.show}
        golem={confirmGolem.golem}
        onConfirm={handleConfirmClaim}
        onCancel={() => setConfirmGolem({ show: false, golem: null, index: null })}
      />
    </div>
  )
}

export default CompactGameBoard
