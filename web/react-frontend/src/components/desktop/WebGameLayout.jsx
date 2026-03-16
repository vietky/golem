import React, { useState, useEffect } from 'react'
import useGameStore from '../../store/gameStore'
import CompactCard from '../CompactCard'
import PlayerCard from '../PlayerCard'
import GraveyardPanel from '../GraveyardPanel'
import MyGolemsPanel from '../MyGolemsPanel'
import HistorySection from '../HistorySection'
import UpgradeModal from '../UpgradeModal'
import TradeModal from '../TradeModal'
import DepositModal from '../DepositModal'
import ConfirmGolemModal from '../ConfirmGolemModal'
import AcquiredCardOverlay from '../AcquiredCardOverlay'
import CollapsibleInfo from '../CollapsibleInfo'
import { showToast } from '../../utils/toast'

const WebGameLayout = () => {
  const {
    gameState,
    myPlayer,
    currentPlayer,
    playerName,
    sessionId,
    roundNumber,
    acquireCard,
    claimPointCard,
    playCard,
    playCardWithUpgrade,
    playCardWithTrade,
    rest,
    startGame,
  } = useGameStore()

  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const [upgradeModal, setUpgradeModal] = useState({ show: false, card: null, index: null })
  const [tradeModal, setTradeModal] = useState({ show: false, card: null, index: null })
  const [confirmGolem, setConfirmGolem] = useState({ show: false, golem: null, index: null })

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

  // Get player name for chat (before early return)
  const chatPlayerName = myPlayer?.name || playerName || 'Player'
  // Get maxChatMessages from gameState (from backend config)
  const maxChatMessages = gameState?.maxChatMessages || 10

  // Get isSpectator state
  const isSpectator = useGameStore((state) => state.isSpectator)

  // Check if game is in waiting status
  // When waiting: backend doesn't send currentPlayer field, market is empty object {} or missing, and players have id: 0
  // When playing: backend always sends currentPlayer (number) and market has actionCards/pointCards
  const hasEmptyMarket = !gameState.market || Object.keys(gameState.market).length === 0
  const isWaiting = gameState.status === 'waiting' || hasEmptyMarket

  // Only require market if not in waiting mode (v2 sessions don't send market in waiting mode)
  if (!isWaiting && !gameState?.market) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    )
  }

  // For spectators, myPlayer will be null - handle this case (but not in waiting mode)
  if (!isSpectator && !myPlayer && !isWaiting) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    )
  }

  // Get ALL other players (not me) - show all in top row
  // For spectators, show all players. For players, show all players including yourself
  const otherPlayers = gameState.players || []

  // Get cards directly from current state (empty arrays in waiting mode)
  const actionCards = gameState.market?.actionCards || []
  const pointCards = gameState.market?.pointCards || []
  const coins = gameState.market?.coins || []

  // In waiting mode, currentPlayer is 0/null, so isMyTurn should be false
  const isMyTurn = !isSpectator && !isWaiting && currentPlayer?.id === myPlayer?.id

  // Handle start game button click
  const handleStartGame = async () => {
    const result = await startGame()
    if (!result.success) {
      showToast(result.error || 'Failed to start game', 'error')
    }
  }
  const hand = myPlayer?.hand || []
  const playedCards = myPlayer?.playedCards || []
  const canRest = isMyTurn && playedCards.length > 0

  // Timer progress percentage
  const turnProgress = Math.max(0, Math.min(100, (turnTimeRemaining / turnTimeLimit) * 100))

  // Check if can afford
  const canAfford = (cost) => {
    if (isSpectator || !myPlayer?.caravan) return false
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
    if (isSpectator || !card?.requirement || !myPlayer?.caravan) return false
    return (
      (myPlayer.caravan.yellow || 0) >= (card.requirement.yellow || 0) &&
      (myPlayer.caravan.green || 0) >= (card.requirement.green || 0) &&
      (myPlayer.caravan.blue || 0) >= (card.requirement.blue || 0) &&
      (myPlayer.caravan.pink || 0) >= (card.requirement.pink || 0)
    )
  }

  const handleAcquireCard = (index) => {
    if (isSpectator) {
      showToast('You are spectating - cannot perform actions', 'info')
      return
    }
    if (!isMyTurn) {
      showToast('Not your turn!', 'error')
      return
    }
    const card = actionCards[index]

    // Card at index 0 (position 1) is always FREE - no deposits needed
    if (index === 0) {
      acquireCard(index, {}, card)
      return
    }

    // Check if player has any crystals to deposit
    const totalCrystals =
      (myPlayer?.caravan?.yellow || 0) +
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
    if (isSpectator) {
      showToast('You are spectating - cannot perform actions', 'info')
      return
    }
    if (!isMyTurn) {
      showToast('Not your turn!', 'error')
      return
    }

    const card = pointCards[index]
    if (!canClaimPointCard(card)) {
      // Show what's missing
      const req = card?.requirement || {}
      const have = myPlayer?.caravan || {}
      const missing = []

      if ((req.yellow || 0) > (have.yellow || 0)) missing.push(`${(req.yellow || 0) - (have.yellow || 0)} Yellow`)
      if ((req.green || 0) > (have.green || 0)) missing.push(`${(req.green || 0) - (have.green || 0)} Green`)
      if ((req.blue || 0) > (have.blue || 0)) missing.push(`${(req.blue || 0) - (have.blue || 0)} Blue`)
      if ((req.pink || 0) > (have.pink || 0)) missing.push(`${(req.pink || 0) - (have.pink || 0)} Pink`)

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

  const handleCardClick = (card, index) => {
    if (isSpectator) {
      showToast('You are spectating - cannot perform actions', 'info')
      return
    }
    if (!isMyTurn) {
      showToast('Not your turn!', 'error')
      return
    }

    // Check card type
    if (card.actionType === 1) {
      setUpgradeModal({ show: true, card, index })
    } else if (card.actionType === 2) {
      setTradeModal({ show: true, card, index })
    } else {
      playCard(index, card)
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
    pink: 'bg-pink-400',
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Collapsible Info with Activity Feed */}
      <CollapsibleInfo sessionId={gameState?.sessionID || sessionId || 'unknown'} />
      
      <div className="h-full w-full grid p-2 sm:p-4 gap-2 overflow-auto" style={{ gridTemplateRows: 'auto minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 1fr)', minHeight: '100%' }}>

        {/* Round Number Display */}
        {!isWaiting && roundNumber > 0 && (
          <div className="absolute top-4 left-4 z-40">
            <div className="bg-blue-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg shadow-lg border border-blue-300/30 flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <span className="font-bold text-sm">Round {roundNumber}</span>
            </div>
          </div>
        )}

        {/* Row 1 - ALL Players in one row (auto height) */}
        <div className="flex gap-2 sm:gap-3 justify-center items-center flex-wrap overflow-x-auto">
          {otherPlayers.map((player) => (
            <div key={player.id || player.name} className="w-48 sm:w-64 flex-shrink-0">
              {/* In waiting mode, don't highlight current player (currentPlayer is 0/null) */}
              <PlayerCard player={player} isCurrentPlayer={!isWaiting && currentPlayer?.id === player.id} />
            </div>
          ))}
        </div>

        {/* Waiting Mode UI - spans rows 2-4 */}
        {isWaiting && (
          <div className="row-span-3 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-purple-900/40 to-blue-900/40 backdrop-blur-md rounded-xl border-2 border-purple-400/50 p-6 relative shadow-2xl" style={{ minHeight: '400px' }}>
            {/* Waiting message with high visibility */}
            <div className="text-white text-lg sm:text-2xl font-bold text-center px-4 py-3 bg-black/50 rounded-lg border border-white/30 shadow-xl">
              ⏳ Waiting for other players to join
            </div>
            
            {/* Player count indicator */}
            <div className="text-green-300 text-base font-semibold bg-black/40 px-4 py-2 rounded-lg">
              {otherPlayers.length} player(s) in lobby
            </div>
            
            {!isSpectator && (
              <>
                {/* Desktop button */}
                <button
                  onClick={handleStartGame}
                  className="hidden sm:flex px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:from-green-700 active:to-green-800 text-white font-bold rounded-xl border-2 border-green-300 transition-all shadow-2xl text-lg whitespace-nowrap min-w-[200px] items-center justify-center gap-2"
                >
                  <span>🎮</span>
                  <span>Start Game</span>
                </button>
                
                {/* Mobile button - visible and prominent */}
                <button
                  onClick={handleStartGame}
                  className="sm:hidden flex px-12 py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:from-green-700 active:to-green-800 text-white font-extrabold rounded-xl border-4 border-green-300 transition-all shadow-2xl text-xl whitespace-nowrap items-center justify-center gap-3 touch-manipulation"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    minWidth: '280px',
                    minHeight: '70px'
                  }}
                >
                  <span className="text-2xl">🎮</span>
                  <span>Start Game</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Row 2 - Market (Action Cards) - Hidden in waiting mode */}
        {!isWaiting && (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 p-2 flex flex-col min-h-[120px] sm:min-h-0 overflow-hidden">
          <div className="text-white/70 text-xs font-semibold mb-1">Market</div>
          <div className="flex-1 grid grid-cols-6 gap-1 place-items-center min-h-0">
            {actionCards.slice(0, 6).map((card, index) => {
              const cost = card.cost || {}
              const isAffordable = isMyTurn && canAfford(cost)
              const deposits = card.deposits || {}

              // Build crystal badges array
              const crystalBadges = []
              const crystalImages = {
                yellow: 'https://statics.vietky.io.vn/images/stone_yellow.JPG',
                green: 'https://statics.vietky.io.vn/images/stone_green.JPG',
                blue: 'https://statics.vietky.io.vn/images/stone_blue.JPG',
                pink: 'https://statics.vietky.io.vn/images/stone_pink.JPG',
              }
              Object.entries(deposits).forEach(([type, count]) => {
                for (let i = 0; i < parseInt(count || 0); i++) {
                  crystalBadges.push({ type, src: crystalImages[type] || crystalImages.yellow })
                }
              })

              return (
                <div
                  key={card.id || `action-${index}`}
                  className="relative cursor-pointer h-full aspect-[2/3]"
                  onClick={() => handleAcquireCard(index)}
                >
                  {/* Position Badge */}
                  <div className="absolute -top-1 -left-1 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] z-20 shadow-lg border border-white pointer-events-none">
                    {index + 1}
                  </div>

                  {/* Deposit Crystals Badge */}
                  {crystalBadges.length > 0 && (
                    <div className="absolute -top-1 -right-1 z-20 flex flex-wrap gap-0.5 max-w-[40px] justify-end pointer-events-none">
                      {crystalBadges.map((crystal, i) => (
                        <img
                          key={i}
                          src={crystal.src}
                          alt={crystal.type}
                          className="w-3.5 h-3.5 rounded-full object-cover border border-white shadow"
                          onError={(e) => {
                            e.target.src = 'https://statics.vietky.io.vn/images/stone_yellow.JPG'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <CompactCard card={card} type="action" index={index} cost={cost} isAffordable={isAffordable} size="flexible" />
                </div>
              )
            })}
          </div>
        </div>
        )}

        {/* Row 3 - Golems (Point Cards) - Hidden in waiting mode */}
        {!isWaiting && (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 p-2 flex flex-col min-h-[120px] sm:min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <div className="text-white/70 text-xs font-semibold">Golems</div>
            {/* Coins remaining info */}
            <div className="flex items-center gap-2 text-[10px]">
              {coins[0]?.amount > 0 && (
                <span className="text-orange-400" title="Copper coins (3pts each)">
                  🥉{coins[0].amount}
                </span>
              )}
              {coins[1]?.amount > 0 && (
                <span className="text-gray-300" title="Silver coins (1pt each)">
                  🥈{coins[1].amount}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-5 gap-1 place-items-center min-h-0">
            {pointCards.slice(0, 5).map((card, index) => {
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

              return (
                <div
                  key={card.id || `point-${index}`}
                  className="relative cursor-pointer h-full aspect-[2/3]"
                  onClick={() => handleClaimPointCard(index)}
                >
                  {/* Position Badge */}
                  <div className="absolute -top-1 -left-1 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[9px] z-20 shadow-lg border border-white pointer-events-none">
                    {index + 1}
                  </div>

                  {/* Coin Bonus Badge */}
                  {coinBonus && (
                    <div
                      className="absolute -top-1 -right-1 z-20 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded-full px-1 py-0.5 border border-white/30 pointer-events-none"
                      title={`${isCopperCoin ? 'Copper (3pts)' : 'Silver (1pt)'} - ${coinAmount} left`}
                    >
                      <span className="text-xs">{coinEmoji}</span>
                      <span className="text-[8px] text-white font-bold">{coinAmount}</span>
                    </div>
                  )}

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
        )}

        {/* Row 4 - Bottom Row: History | Graveyard | My Hand + Crystals + Timer | My Golems - Hidden in waiting mode */}
        {!isWaiting && (
        <div className="flex gap-2 sm:gap-3 min-h-[150px] overflow-x-auto overflow-y-hidden">
          {/* History */}
          <div className="w-44 flex-shrink-0 bg-black/30 backdrop-blur-md rounded-xl border border-white/20 flex flex-col min-h-0 overflow-hidden">
            <HistorySection />
          </div>

          {/* Graveyard */}
          <div className="w-28 flex-shrink-0 bg-black/30 backdrop-blur-md rounded-xl border border-white/20 py-2 flex flex-col min-h-0">
            <GraveyardPanel playedCards={playedCards} />
          </div>

          {/* My Hand + Info + Timer (Hidden for spectators) */}
          {!isSpectator ? (
            <>
              <div
                className={`flex-1 bg-black/30 backdrop-blur-md rounded-xl p-2 flex flex-col min-w-0 min-h-0 transition-all duration-300 ${
                  isMyTurn ? 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'border border-white/20'
                }`}
              >
                {/* Header with info */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar & Name */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center font-bold text-sm border-2 border-white">
                        {myPlayer?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-white font-bold text-sm">{myPlayer?.name || 'You'}</div>
                    </div>

                    {/* Crystals - always show all 4 colors */}
                    <div className="flex items-center gap-1.5 ml-2">
                      {['yellow', 'green', 'blue', 'pink'].map((color) => {
                        const count = myPlayer?.caravan?.[color] || 0
                        return (
                          <div key={color} className="flex items-center gap-0.5">
                            <div className={`w-4 h-4 rounded-full ${crystalColors[color]}`} />
                            <span className="text-white text-sm font-bold">{count}</span>
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
                            turnProgress > 50 ? 'bg-green-500' : turnProgress > 20 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${turnProgress}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold min-w-[2rem] text-right ${
                          turnProgress > 50 ? 'text-green-400' : turnProgress > 20 ? 'text-yellow-400' : 'text-red-400'
                        }`}
                      >
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
                      <div className="px-3 py-1 bg-white/10 text-white/50 rounded-lg text-sm">Waiting...</div>
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
                      <CompactCard card={card} type="action" index={index} isPlayable={isMyTurn} size="flexible" />
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
                <MyGolemsPanel pointCards={myPlayer?.pointCards || []} coins={myPlayer?.coins || []} />
              </div>
            </>
          ) : (
            /* Spectator Info Area */
            <div className="flex-1 bg-black/30 backdrop-blur-md rounded-xl p-2 flex flex-col min-w-0 min-h-0 border border-purple-400/40">
              <div className="flex items-center justify-between mb-2">

                {/* Timer for spectators */}
                <div className="flex items-center gap-3">
                  {/* Timer */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          turnProgress > 50 ? 'bg-green-500' : turnProgress > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${turnProgress}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold min-w-[2rem] text-right ${
                        turnProgress > 50 ? 'text-green-400' : turnProgress > 20 ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      {turnTimeRemaining}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Spectator message */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <p className="text-sm">You are watching this game</p>
                  <p className="text-xs mt-1">You cannot perform any actions</p>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

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
              playCardWithUpgrade(upgradeModal.index, inputResources, outputResources, upgradeModal.card)
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
              playCardWithTrade(tradeModal.index, multiplier, tradeModal.card)
              setTradeModal({ show: false, card: null, index: null })
            }}
            onCancel={() => setTradeModal({ show: false, card: null, index: null })}
          />
        )}

        {/* Confirm Golem Modal */}
        <ConfirmGolemModal
          isOpen={confirmGolem.show}
          golem={confirmGolem.golem}
          onConfirm={handleConfirmClaim}
          onCancel={() => setConfirmGolem({ show: false, golem: null, index: null })}
        />

        {/* Card acquisition overlay animation */}
        <AcquiredCardOverlay />
      </div>
    </div>
  )
}

export default WebGameLayout
