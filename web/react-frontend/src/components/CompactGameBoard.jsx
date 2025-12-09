import React, { useState, useEffect } from 'react'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'
import CompactCard from './CompactCard'
import DepositModal from './DepositModal'
import { showToast } from '../utils/toast'

const CompactGameBoard = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard } = useGameStore()
  const { isMobile, isTablet, isPortrait, isLandscape } = useOrientation()
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
    console.log('[CompactGameBoard] handleAcquireCard', index, 'isMyTurn:', isMyTurn)
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }
    const card = actionCards[index]
    
    // Card at index 0 (position 1) is always FREE - no deposits needed
    if (index === 0) {
      acquireCard(index, {})
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
    
    claimPointCard(index)
  }

  return (
    <div className={`
      w-full mx-auto
      ${isMobile ? 'px-1 py-2 space-y-2' : 'px-4 py-6 space-y-4 max-w-6xl'}
    `}>
      {/* Turn Info and Timer - Compact and Centered */}
      <div className="flex justify-center">
        <div className={`
          bg-black/40 backdrop-blur-md rounded-full border border-white/30 shadow-lg 
          inline-flex items-center
          ${isMobile ? 'px-3 py-1.5 gap-2' : 'px-6 py-2 gap-4'}
        `}>
          <div className={`text-white font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {isMobile ? '' : 'Turn '}{gameState.turnNumber || 1} - <span className="text-yellow-300">{currentPlayer?.name || 'Waiting...'}</span>
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
      <div className={`
        bg-black/40 backdrop-blur-md rounded-xl border border-white/30 shadow-2xl
        ${isMobile ? 'p-2 pt-3' : 'p-5'}
      `}>
        <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-3'}`}>
          <h3 className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {isMobile ? 'Action Cards' : 'Merchant Cards'}
          </h3>
          <span className={`text-white/60 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            {gameState.market.actionDeck || 0} left
          </span>
        </div>
        
        <div className={`
          ${isMobile && isPortrait 
            ? 'flex gap-3 overflow-x-auto scrollbar-none pb-2 px-1' 
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3'
          }
        `}>
          {actionCards.map((cardData, index) => {
            const cost = cardData.cost || {}
            const isAffordable = isMyTurn && canAfford(cost)
            const deposits = cardData.deposits || {}
            const depositCount = Object.values(deposits).reduce((a, b) => 
              parseInt(a || 0) + parseInt(b || 0), 0
            )

            return (
              <div key={`action-${index}`} className={`
                relative
                ${isMobile && isPortrait ? 'flex-shrink-0 w-[100px]' : ''}
              `}>
                {/* Position Badge */}
                <div className={`
                  absolute bg-purple-600 text-white rounded-full flex items-center justify-center 
                  font-bold z-20 shadow-lg border border-white
                  ${isMobile ? 'top-0 left-0 w-4 h-4 text-[8px]' : '-top-2 -left-2 w-5 h-5 text-[10px]'}
                `}>
                  {index + 1}
                </div>
                
                {/* Deposit Count Badge */}
                {depositCount > 0 && (
                  <div className={`
                    absolute bg-green-500 text-white rounded-full flex items-center justify-center 
                    font-bold z-20 shadow-lg border border-white
                    ${isMobile ? 'top-0 right-0 w-4 h-4 text-[8px]' : '-top-2 -right-2 w-5 h-5 text-[10px]'}
                  `}>
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
                  size={isMobile ? 'sm' : 'normal'}
                  showDetails={!isMobile}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Point Cards Market */}
      <div className={`
        bg-black/40 backdrop-blur-md rounded-xl border border-white/30 shadow-2xl
        ${isMobile ? 'p-2 pt-3' : 'p-5'}
      `}>
        <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-3'}`}>
          <h3 className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>Point Cards</h3>
          <span className={`text-white/60 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            {gameState.market.pointDeck || 0} left
          </span>
        </div>
        
        <div className={`
          ${isMobile && isPortrait 
            ? 'flex gap-3 overflow-x-auto scrollbar-none pb-2 px-1' 
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3'
          }
        `}>
          {pointCards.map((cardData, index) => {
            const canClaim = isMyTurn && canClaimPointCard(cardData)
            const coinBonus = index <= 1 && coins && coins[index] && coins[index].amount > 0

            return (
              <div key={`point-${index}`} className={`
                relative
                ${isMobile && isPortrait ? 'flex-shrink-0 w-[100px]' : ''}
              `}>
                {/* Position Badge */}
                <div className={`
                  absolute bg-yellow-600 text-white rounded-full flex items-center justify-center 
                  font-bold z-20 shadow-lg border border-white
                  ${isMobile ? 'top-0 left-0 w-4 h-4 text-[8px]' : '-top-2 -left-2 w-5 h-5 text-[10px]'}
                `}>
                  {index + 1}
                </div>
                
                {/* Coin Bonus Badge */}
                {coinBonus && (
                  <div className={`
                    absolute bg-amber-500 text-white rounded-full flex items-center justify-center 
                    z-20 shadow-lg border border-white
                    ${isMobile ? 'top-0 right-0 w-4 h-4 text-[10px]' : '-top-2 -right-2 w-5 h-5 text-xs'}
                  `} title={index === 0 ? "Copper Token (3 pts)" : "Silver Token (1 pt)"}>
                    🪙
                  </div>
                )}
                
                <CompactCard
                  card={cardData}
                  type="point"
                  index={index}
                  isAffordable={canClaim}
                  onClick={() => handleClaimPointCard(index)}
                  size={isMobile ? 'sm' : 'normal'}
                  showDetails={!isMobile}
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
