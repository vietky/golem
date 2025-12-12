import React, { useState, useEffect } from 'react'
import useGameStore from '../store/gameStore'
import CompactCard from './CompactCard'
import PlayerCard from './PlayerCard'
import GraveyardPanel from './GraveyardPanel'
import MyGolemsPanel from './MyGolemsPanel'
import UpgradeModal from './UpgradeModal'
import TradeModal from './TradeModal'
import DepositModal from './DepositModal'
import AcquiredCardOverlay from './AcquiredCardOverlay'
import { showToast } from '../utils/toast'

const WebGameLayout = () => {
  const { 
    gameState, 
    myPlayer, 
    currentPlayer, 
    acquireCard, 
    claimPointCard, 
    playCard,
    playCardWithUpgrade, 
    playCardWithTrade,
    rest
  } = useGameStore()

  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const [upgradeModal, setUpgradeModal] = useState({ show: false, card: null, index: null })
  const [tradeModal, setTradeModal] = useState({ show: false, card: null, index: null })
  
  // Timer state
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(60)
  const turnTimeLimit = 60

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

  if (!gameState?.market || !myPlayer) return null

  // Get ALL other players (not me) - show all in top row
  const otherPlayers = gameState.players?.filter(p => p.id !== myPlayer.id) || []

  // Get cards directly from current state
  const actionCards = gameState.market.actionCards || []
  const pointCards = gameState.market.pointCards || []

  const isMyTurn = currentPlayer?.id === myPlayer.id
  const hand = myPlayer.hand || []
  const playedCards = myPlayer.playedCards || []
  const canRest = isMyTurn && playedCards.length > 0

  // Timer progress percentage
  const turnProgress = Math.max(0, Math.min(100, (turnTimeRemaining / turnTimeLimit) * 100))

  // Check if can afford
  const canAfford = (cost) => {
    if (!myPlayer?.caravan) return false
    // Empty cost or no cost = always affordable
    if (!cost || Object.keys(cost).length === 0) return true
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

  const handleCardClick = (card, index) => {
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }

    // Check card type
    if (card.actionType === 1) {
      setUpgradeModal({ show: true, card, index })
    } else if (card.actionType === 2) {
      setTradeModal({ show: true, card, index })
    } else {
      playCard(index)
    }
  }

  const handleRest = () => {
    if (canRest) {
      rest()
    }
  }

  // Crystal colors
  const crystalColors = {
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    pink: 'bg-pink-400'
  }

  return (
    <div className="h-full w-full grid p-4 gap-2" style={{ gridTemplateRows: 'auto 1fr 1fr 1fr' }}>
      {/* Row 1 - ALL Players in one row (auto height) */}
      <div className="flex gap-3 justify-center items-center flex-wrap">
        {otherPlayers.map((player) => (
          <div key={player.id} className="w-64">
            <PlayerCard 
              player={player} 
              isCurrentPlayer={currentPlayer?.id === player.id}
            />
          </div>
        ))}
      </div>

      {/* Row 2 - Market (Action Cards) */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 p-2 flex flex-col min-h-0 overflow-hidden">
        <div className="text-white/70 text-xs font-semibold mb-1">Market</div>
        <div className="flex-1 grid grid-cols-6 gap-1 place-items-center min-h-0">
            {actionCards.slice(0, 6).map((card, index) => {
              const cost = card.cost || {}
              const isAffordable = isMyTurn && canAfford(cost)
              const deposits = card.deposits || {}
              const depositCount = Object.values(deposits).reduce((a, b) => 
                parseInt(a || 0) + parseInt(b || 0), 0
              )

              return (
                <div 
                  key={`action-${index}`} 
                  className="relative cursor-pointer h-full aspect-[2/3]"
                  onClick={() => handleAcquireCard(index)}
                >
                  {/* Position Badge */}
                  <div className="absolute -top-1 -left-1 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] z-20 shadow-lg border border-white pointer-events-none">
                    {index + 1}
                  </div>
                  
                  {/* Deposit Count Badge */}
                  {depositCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] z-20 shadow-lg border border-white pointer-events-none">
                      +{depositCount}
                    </div>
                  )}
                  
                  <CompactCard
                    card={card}
                    type="action"
                    index={index}
                    cost={cost}
                    isAffordable={isAffordable}
                    size="flexible"
                  />
                </div>
              )
            })}
          </div>
        </div>

      {/* Row 3 - Golems (Point Cards) */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 p-2 flex flex-col min-h-0 overflow-hidden">
        <div className="text-white/70 text-xs font-semibold mb-1">Golems</div>
        <div className="flex-1 grid grid-cols-5 gap-1 place-items-center min-h-0">
            {pointCards.slice(0, 5).map((card, index) => {
              return (
                <div 
                  key={`point-${index}`}
                  className="relative cursor-pointer h-full aspect-[2/3]"
                  onClick={() => handleClaimPointCard(index)}
                >
                  {/* Position Badge */}
                  <div className="absolute -top-1 -left-1 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] z-20 shadow-lg border border-white pointer-events-none">
                    {index + 1}
                  </div>
                  
                  <CompactCard
                    card={card}
                    type="point"
                    index={index}
                    isAffordable={isMyTurn && canClaimPointCard(card)}
                    size="flexible"
                  />
                </div>
              )
            })}
        </div>
      </div>

      {/* Row 4 - Bottom Row: Graveyard | My Hand + Crystals + Timer | My Golems */}
      <div className="flex gap-3 min-h-0 overflow-hidden">
        {/* Graveyard */}
        <div className="w-28 flex-shrink-0 bg-black/30 backdrop-blur-md rounded-xl border border-white/20 py-2 flex flex-col min-h-0">
          <GraveyardPanel playedCards={playedCards} />
        </div>

        {/* My Hand + Info + Timer */}
        <div className={`flex-1 bg-black/30 backdrop-blur-md rounded-xl p-2 flex flex-col min-w-0 min-h-0 transition-all duration-300 ${
          isMyTurn 
            ? 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
            : 'border border-white/20'
        }`}>
          {/* Header with info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Avatar & Name */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center font-bold text-sm border-2 border-white">
                  {myPlayer.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="text-white font-bold text-sm">{myPlayer.name || 'You'}</div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-400 font-bold">★{myPlayer.points || 0}</span>
                <span className="text-blue-400">📄{myPlayer.pointCards?.length || 0}</span>
                <span className="text-green-400">🃏{hand.length}</span>
              </div>

              {/* Crystals */}
              <div className="flex items-center gap-1.5 ml-2">
                {['yellow', 'green', 'blue', 'pink'].map((color) => {
                  const count = myPlayer.caravan?.[color] || 0
                  if (count === 0) return null
                  return (
                    <div key={color} className="flex items-center gap-0.5">
                      <div className={`w-3.5 h-3.5 rounded-full ${crystalColors[color]}`} />
                      <span className="text-white text-xs font-bold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timer + Actions */}
            <div className="flex items-center gap-3">
              {/* Timer */}
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      turnProgress > 50 ? 'bg-green-500' : 
                      turnProgress > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${turnProgress}%` }}
                  />
                </div>
                <span className={`text-sm font-bold min-w-[2rem] text-right ${
                  turnProgress > 50 ? 'text-green-400' : 
                  turnProgress > 20 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {turnTimeRemaining}s
                </span>
              </div>

              {/* Rest Button */}
              {canRest && (
                <button
                  onClick={handleRest}
                  className="px-3 py-1 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white text-sm border border-green-400 transition-all"
                >
                  Rest
                </button>
              )}
              
              {/* Turn indicator */}
              {isMyTurn ? (
                <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-bold border border-yellow-400">
                  Your Turn
                </div>
              ) : (
                <div className="px-3 py-1 bg-white/10 text-white/50 rounded-lg text-sm">
                  Waiting...
                </div>
              )}
            </div>
          </div>

          {/* Hand Cards */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent min-h-0">
            {hand.map((card, index) => (
              <div 
                key={`hand-${index}`} 
                className="flex-shrink-0 h-full aspect-[2/3] cursor-pointer"
                onClick={() => handleCardClick(card, index)}
              >
                <CompactCard
                  card={card}
                  type="action"
                  index={index}
                  isPlayable={isMyTurn}
                  size="flexible"
                />
              </div>
            ))}
            
            {hand.length === 0 && (
              <div className="h-full aspect-[2/3] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center flex-shrink-0">
                <span className="text-white/40 text-xs">No cards</span>
              </div>
            )}
          </div>
        </div>

        {/* My Golems */}
        <div className="w-28 flex-shrink-0 bg-black/30 backdrop-blur-md rounded-xl border border-white/20 py-2 flex flex-col min-h-0">
          <MyGolemsPanel pointCards={myPlayer.pointCards || []} />
        </div>
      </div>

      {/* Modals */}
      {depositModal.show && (
        <DepositModal
          card={depositModal.card}
          cardIndex={depositModal.index}
          onClose={() => setDepositModal({ show: false, card: null, index: null })}
        />
      )}

      {upgradeModal.show && (
        <UpgradeModal
          card={upgradeModal.card}
          cardIndex={upgradeModal.index}
          playerResources={myPlayer?.resources}
          maxTurnUpgrade={upgradeModal.card?.turnUpgrade || 1}
          onConfirm={(inputResources, outputResources) => {
            playCardWithUpgrade(upgradeModal.index, inputResources, outputResources)
            setUpgradeModal({ show: false, card: null, index: null })
          }}
          onCancel={() => setUpgradeModal({ show: false, card: null, index: null })}
        />
      )}

      {tradeModal.show && (
        <TradeModal
          card={tradeModal.card}
          cardIndex={tradeModal.index}
          playerResources={myPlayer?.resources}
          onConfirm={(multiplier) => {
            playCardWithTrade(tradeModal.index, multiplier)
            setTradeModal({ show: false, card: null, index: null })
          }}
          onCancel={() => setTradeModal({ show: false, card: null, index: null })}
        />
      )}

      {/* Card acquisition overlay animation */}
      <AcquiredCardOverlay />
    </div>
  )
}

export default WebGameLayout
