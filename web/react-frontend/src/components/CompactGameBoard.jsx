import React, { useState, useEffect } from 'react'
import useGameStore from '../store/gameStore'
import CompactCard from './CompactCard'
import DepositModal from './DepositModal'

const CompactGameBoard = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard } = useGameStore()
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(60)

  if (!gameState?.market) return null

  const { actionCards, pointCards, coins } = gameState.market
  const isMyTurn = currentPlayer?.id === myPlayer?.id
  const turnTimeLimit = 60 // seconds

  // Timer effect - reset when current player changes
  useEffect(() => {
    setTurnTimeRemaining(turnTimeLimit)
    
    const timer = setInterval(() => {
      setTurnTimeRemaining((prev) => {
        if (prev <= 0) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState?.currentPlayer])

  const turnProgress = Math.max(0, Math.min(100, (turnTimeRemaining / turnTimeLimit) * 100))

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

  const handleAcquireCard = (index) => {
    if (!isMyTurn) return
    const card = actionCards[index]
    
    // Card at index 0 (position 1) is always FREE - no deposits needed
    if (index === 0) {
      acquireCard(index, {})
      return
    }
    
    // For cards at index > 0, always show deposit modal
    // This allows player to deposit into previous cards to get it FREE
    // or see the option to pay the cost directly
    setDepositModal({ show: true, card, index })
  }

  const handleClaimPointCard = (index) => {
    if (!isMyTurn) return
    claimPointCard(index)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Turn Info and Timer - Compact and Centered */}
      <div className="flex justify-center">
        <div className="bg-black/40 backdrop-blur-md rounded-full px-6 py-2 border border-white/30 shadow-lg inline-flex items-center gap-4">
          <div className="text-white font-semibold text-sm">
            Turn {gameState.turnNumber || 1} - <span className="text-yellow-300">{currentPlayer?.name || 'Waiting...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/90 text-sm font-semibold">⏱️ {turnTimeRemaining}s</span>
            <div className="w-12 bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-full transition-all duration-1000"
                style={{ width: `${turnProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards Market */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 border border-white/30 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm">Merchant Cards</h3>
          <span className="text-white/60 text-xs">
            {gameState.market.actionDeck || 0} remaining
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {actionCards.map((cardData, index) => {
            const cost = cardData.cost || {}
            const isAffordable = isMyTurn && canAfford(cost)
            const deposits = cardData.deposits || {}
            const depositCount = Object.values(deposits).reduce((a, b) => 
              parseInt(a || 0) + parseInt(b || 0), 0
            )

            return (
              <div key={`action-${index}`} className="relative">
                {/* Position Badge */}
                <div className="absolute -top-2 -left-2 bg-purple-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow-lg border border-white">
                  {index + 1}
                </div>
                
                {/* Deposit Count Badge */}
                {depositCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow-lg border border-white">
                    +{depositCount}
                  </div>
                )}
                
                <CompactCard
                  card={cardData}
                  type="action"
                  index={index}
                  cost={cost}
                  isAffordable={isAffordable}
                  onClick={() => handleAcquireCard(index)}
                  size="normal"
                  showDetails={true}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Point Cards Market */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 border border-white/30 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm">Point Cards</h3>
          <span className="text-white/60 text-xs">
            {gameState.market.pointDeck || 0} remaining
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pointCards.map((cardData, index) => {
            const canClaim = isMyTurn && canClaimPointCard(cardData)
            const coinBonus = index <= 1 && coins && coins[index] && coins[index].amount > 0

            return (
              <div key={`point-${index}`} className="relative">
                {/* Position Badge */}
                <div className="absolute -top-2 -left-2 bg-yellow-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow-lg border border-white">
                  {index + 1}
                </div>
                
                {/* Coin Bonus Badge */}
                {coinBonus && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs z-20 shadow-lg border border-white" title={index === 0 ? "Copper Token (3 pts)" : "Silver Token (1 pt)"}>
                    🪙
                  </div>
                )}
                
                <CompactCard
                  card={cardData}
                  type="point"
                  index={index}
                  isAffordable={canClaim}
                  onClick={() => handleClaimPointCard(index)}
                  size="normal"
                  showDetails={true}
                />
              </div>
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
    </div>
  )
}

export default CompactGameBoard
