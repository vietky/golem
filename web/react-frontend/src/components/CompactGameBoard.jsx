import React, { useState, useRef } from 'react'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'
import CompactCard from './CompactCard'
import DepositModal from './DepositModal'
import { showToast } from '../utils/toast'

const CompactGameBoard = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const containerRef = useRef(null)

  if (!gameState?.market) return null

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
                badge={depositCount > 0 ? (
                  <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
                    +{depositCount}
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
          <span className={`text-white/40 ${isMobile && isPortrait ? 'text-[9px]' : 'text-[10px]'}`}>
            {gameState.market.pointDeck || 0} left
          </span>
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
            const coinBonus = index <= 1 && coins && coins[index] && coins[index].amount > 0

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
                  <div className="text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" title={index === 0 ? "Copper Token (3 pts)" : "Silver Token (1 pt)"}>
                    🪙
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
    </div>
  )
}

export default CompactGameBoard
