import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DepositModal from './DepositModal'
import ConfirmGolemModal from './ConfirmGolemModal'
import UpgradeModal from './UpgradeModal'
import TradeModal from './TradeModal'
import useGameStore from '../store/gameStore'
import { getVietnameseCardName, getCardImagePath, getCardSpriteStyle } from '../utils/cardNames'
import { showToast } from '../utils/toast'

// Position constants for background game_dock.jpg (1280x580)
// These are percentage-based positions matching the card slots in the background
const LAYOUT = {
  // Point cards row (top row with wooden slots under awning) - Golems
  pointCards: {
    top: '13.1%',
    height: '37%',
    left: '32%',
    width: '52%',
    slots: 5,
    gap: '0.1%'
  },
  // Action cards row (bottom row with stone slots)
  actionCards: {
    top: '53.5%',
    height: '36.5%',
    left: '21%',
    width: '63.2%',
    slots: 6,
    gap: '0%'
  },
  // Deck area (right side) - golem_0 on top, card_0 on bottom
  deckGolem: {
    right: '4.5%',
    top: '13.8%',
    width: '9.5%',
    height: '35.5%'
  },
  deckAction: {
    right: '4.5%',
    top: '54.1%',
    width: '9.5%',
    height: '35.5%'
  },
  // Player hand area (bottom)
  playerHand: {
    bottom: '2%',
    left: '22%',
    width: '76%',
    height: '20%'
  }
}

// Fantasy Card Component - Minimal version, only shows image
const FantasyCard = ({ 
  card, 
  type, 
  index, 
  cost = null,
  isAffordable = false,
  isPlayable = false,
  onClick,
  style = {}
}) => {
  return (
    <motion.div
      className={`
        relative rounded-md overflow-hidden cursor-pointer
        ${isAffordable || isPlayable ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-black/50' : ''}
      `}
      style={{
        ...style,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}
      onClick={onClick}
      whileHover={{ scale: 1.03, zIndex: 20 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Card Image Only */}
      <div className="w-full h-full overflow-hidden">
        {card?.name ? (() => {
          const spriteStyle = getCardSpriteStyle(card.name)
          if (spriteStyle) {
            return (
              <div 
                className="w-full h-full"
                style={spriteStyle}
                title={getVietnameseCardName(card.name)}
              />
            )
          }
          // Fallback to individual image
          return (
            <img
              src={getCardImagePath(card.name)}
              alt={getVietnameseCardName(card.name)}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                if (!e.target.dataset.fallback) {
                  e.target.dataset.fallback = 'true'
                  e.target.src = '/images/golem_bg.JPG'
                }
              }}
            />
          )
        })() : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
            ?
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Player Hand Card for Fantasy Theme
const FantasyHandCard = ({ card, index, isMyTurn, onClick }) => {
  const actionType = card?.actionType !== undefined 
    ? ['produce', 'upgrade', 'trade'][card.actionType] 
    : 'produce'

  const cardTypeColors = {
    produce: 'border-golem-green',
    upgrade: 'border-golem-blue', 
    trade: 'border-golem-pink',
  }

  return (
    <motion.div
      className={`
        relative rounded-lg overflow-hidden cursor-pointer
        border-2 ${cardTypeColors[actionType]}
        ${isMyTurn ? 'ring-2 ring-green-400' : ''}
        bg-white shadow-lg
      `}
      style={{ width: '60px', height: '85px' }}
      whileHover={{ y: -10, scale: 1.1, zIndex: 20 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(index)}
    >
      {card?.name ? (() => {
        const spriteStyle = getCardSpriteStyle(card.name)
        if (spriteStyle) {
          return (
            <div 
              className="w-full h-full"
              style={spriteStyle}
              title={getVietnameseCardName(card.name)}
            />
          )
        }
        return (
          <img
            src={getCardImagePath(card.name)}
            alt={getVietnameseCardName(card.name)}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              if (!e.target.dataset.fallback) {
                e.target.dataset.fallback = 'true'
                e.target.src = '/images/golem_bg.JPG'
              }
            }}
          />
        )
      })() : null}
    </motion.div>
  )
}

const FantasyMarketArea = () => {
  const { 
    gameState, 
    myPlayer, 
    currentPlayer, 
    acquireCard, 
    claimPointCard,
    playCard,
    playCardWithUpgrade,
    playCardWithTrade,
    rest,
    showUpgradeModal,
    hideUpgradeModal,
    showTradeModal,
    hideTradeModal,
    upgradeModalCard,
    upgradeModalCardIndex,
    tradeModalCard,
    tradeModalCardIndex
  } = useGameStore()
  
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const [confirmGolem, setConfirmGolem] = useState({ show: false, golem: null, index: null })
  const [showHand, setShowHand] = useState(false)

  // Loading state
  if (!gameState?.market) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm">Loading market...</p>
        </div>
      </div>
    )
  }

  const { actionCards, pointCards } = gameState.market
  const isMyTurn = currentPlayer?.id === myPlayer?.id
  const hand = myPlayer?.hand || []

  // Check if player can afford a card
  const canAfford = (cost) => {
    if (!cost || !myPlayer?.resources) return false
    return (
      (cost.yellow || 0) <= myPlayer.resources.yellow &&
      (cost.green || 0) <= myPlayer.resources.green &&
      (cost.blue || 0) <= myPlayer.resources.blue &&
      (cost.pink || 0) <= myPlayer.resources.pink
    )
  }

  // Handle action card click
  const handleActionCardClick = (cardData, index) => {
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }
    
    if (index === 0) {
      acquireCard(index, [], cardData)
    } else {
      setDepositModal({ show: true, card: cardData, index: index })
    }
  }

  // Handle point card click
  const handlePointCardClick = (card, index) => {
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }
    
    const canClaim = myPlayer?.resources && card.requirement
      ? (card.requirement.yellow || 0) <= myPlayer.resources.yellow &&
        (card.requirement.green || 0) <= myPlayer.resources.green &&
        (card.requirement.blue || 0) <= myPlayer.resources.blue &&
        (card.requirement.pink || 0) <= myPlayer.resources.pink
      : false
    
    if (!canClaim) {
      showToast("Not enough crystals!", 'error')
      return
    }
    
    setConfirmGolem({ show: true, golem: card, index })
  }

  // Handle golem claim confirmation
  const handleConfirmClaim = () => {
    if (confirmGolem.index !== null && confirmGolem.golem) {
      claimPointCard(confirmGolem.index, confirmGolem.golem)
    }
    setConfirmGolem({ show: false, golem: null, index: null })
  }

  // Handle hand card click
  const handleHandCardClick = (cardIndex) => {
    if (!isMyTurn) return

    const card = hand[cardIndex]
    if (card && card.actionType === 1) {
      showUpgradeModal(card, cardIndex)
    } else if (card && card.actionType === 2) {
      showTradeModal(card, cardIndex)
    } else {
      playCard(cardIndex, card)
    }
    setShowHand(false)
  }

  // Handle upgrade confirmation
  const handleUpgradeConfirm = (inputResources, outputResources) => {
    if (upgradeModalCardIndex !== null && upgradeModalCard) {
      playCardWithUpgrade(upgradeModalCardIndex, inputResources, outputResources, upgradeModalCard)
    }
  }

  // Handle trade confirmation
  const handleTradeConfirm = (multiplier) => {
    if (tradeModalCardIndex !== null && tradeModalCard) {
      playCardWithTrade(tradeModalCardIndex, multiplier, tradeModalCard)
    }
  }

  // Calculate slot dimensions
  const getSlotStyle = (index, layout) => {
    const slotWidth = (100 - (layout.slots - 1) * parseFloat(layout.gap)) / layout.slots
    const leftOffset = index * (slotWidth + parseFloat(layout.gap))
    
    return {
      position: 'absolute',
      left: `${leftOffset}%`,
      width: `${slotWidth}%`,
      height: '100%'
    }
  }

  return (
    <>
      {/* Point Cards Row (Top - Golems) */}
      <div 
        className="absolute"
        style={{
          top: LAYOUT.pointCards.top,
          left: LAYOUT.pointCards.left,
          width: LAYOUT.pointCards.width,
          height: LAYOUT.pointCards.height
        }}
      >
        <div className="relative w-full h-full">
          {pointCards.map((cardData, index) => {
            const canClaim = myPlayer?.resources && cardData.requirement
              ? (cardData.requirement.yellow || 0) <= myPlayer.resources.yellow &&
                (cardData.requirement.green || 0) <= myPlayer.resources.green &&
                (cardData.requirement.blue || 0) <= myPlayer.resources.blue &&
                (cardData.requirement.pink || 0) <= myPlayer.resources.pink
              : false
            
            // Coin bonus for first 2 positions
            const coins = gameState?.market?.coins || []
            const coinBonus = index <= 1 && coins[index] && coins[index].amount > 0
            const coinAmount = coins[index] ? coins[index].amount : 0
            const isCopperCoin = index === 0
            const coinEmoji = isCopperCoin ? '🥉' : '🥈'

            return (
              <div key={`point-${index}`} style={getSlotStyle(index, LAYOUT.pointCards)}>
                <div className="w-full h-full flex items-center justify-center p-[4%] relative">
                  {/* Coin Bonus Badge - Top Right */}
                  {coinBonus && (
                    <div 
                      className="absolute top-0 right-0 z-30 flex items-center gap-0.5 bg-black/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-yellow-500/50 pointer-events-none shadow-lg"
                      title={`${isCopperCoin ? 'Copper (3pts)' : 'Silver (1pt)'} - ${coinAmount} left`}
                    >
                      <span className="text-sm">{coinEmoji}</span>
                      <span className="text-[10px] text-white font-bold">{coinAmount}</span>
                    </div>
                  )}
                  <FantasyCard
                    card={cardData}
                    type="point"
                    index={index}
                    isPlayable={canClaim && isMyTurn}
                    onClick={() => handlePointCardClick(cardData, index)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Cards Row (Bottom - Market) */}
      <div 
        className="absolute"
        style={{
          top: LAYOUT.actionCards.top,
          left: LAYOUT.actionCards.left,
          width: LAYOUT.actionCards.width,
          height: LAYOUT.actionCards.height
        }}
      >
        <div className="relative w-full h-full">
          {actionCards.map((cardData, index) => {
            const cost = cardData.cost || {}
            const isAffordable = canAfford(cost)
            const deposits = cardData.deposits || {}
            
            // Build crystal badges array for deposits
            const crystalBadges = []
            const crystalImages = {
              yellow: '/images/stone_yellow.JPG',
              green: '/images/stone_green.JPG',
              blue: '/images/stone_blue.JPG',
              pink: '/images/stone_pink.JPG'
            }
            Object.entries(deposits).forEach(([type, count]) => {
              for (let i = 0; i < parseInt(count || 0); i++) {
                crystalBadges.push({ type, src: crystalImages[type] || crystalImages.yellow })
              }
            })

            return (
              <div key={`action-${index}`} style={getSlotStyle(index, LAYOUT.actionCards)}>
                <div className="w-full h-full flex items-center justify-center p-[3%] relative">
                  {/* Deposit Crystals Badge - Top Right */}
                  {crystalBadges.length > 0 && (
                    <div className="absolute top-0 right-0 z-30 flex flex-wrap gap-0.5 max-w-[50%] justify-end p-1 pointer-events-none">
                      {crystalBadges.map((crystal, i) => (
                        <img
                          key={i}
                          src={crystal.src}
                          alt={crystal.type}
                          className="w-4 h-4 rounded-full object-cover border-2 border-white shadow-lg"
                          onError={(e) => { e.target.src = '/images/stone_yellow.JPG' }}
                        />
                      ))}
                    </div>
                  )}
                  <FantasyCard
                    card={cardData}
                    type="action"
                    index={index}
                    cost={cost}
                    isAffordable={isAffordable && isMyTurn}
                    onClick={() => handleActionCardClick(cardData, index)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deck Area - Right Side */}
      {/* Golem Deck (Top) - Hide if pointDeck <= 5 */}
      {(gameState?.market?.pointDeck || 0) > 5 && (
        <div 
          className="absolute"
          style={{
            right: LAYOUT.deckGolem.right,
            top: LAYOUT.deckGolem.top,
            width: LAYOUT.deckGolem.width,
            height: LAYOUT.deckGolem.height
          }}
        >
          <div className="w-full h-full overflow-hidden rounded-md">
            {(() => {
              const spriteStyle = getCardSpriteStyle('golem_0')
              if (spriteStyle) {
                return (
                  <div 
                    className="w-full h-full"
                    style={spriteStyle}
                    title="Golem Deck"
                  />
                )
              }
              return (
                <img
                  src={getCardImagePath('golem_0')}
                  alt="Golem Deck"
                  className="w-full h-full object-cover"
                />
              )
            })()}
          </div>
        </div>
      )}

      {/* Action Deck (Bottom) - Hide if actionDeck <= 6 */}
      {(gameState?.market?.actionDeck || 0) > 6 && (
        <div 
          className="absolute"
          style={{
            right: LAYOUT.deckAction.right,
            top: LAYOUT.deckAction.top,
            width: LAYOUT.deckAction.width,
            height: LAYOUT.deckAction.height
          }}
        >
          <div className="w-full h-full overflow-hidden rounded-md">
            {(() => {
              const spriteStyle = getCardSpriteStyle('card_0')
              if (spriteStyle) {
                return (
                  <div 
                    className="w-full h-full"
                    style={spriteStyle}
                    title="Action Deck"
                  />
                )
              }
              return (
                <img
                  src={getCardImagePath('card_0')}
                  alt="Action Deck"
                  className="w-full h-full object-cover"
                />
              )
            })()}
          </div>
        </div>
      )}

      {/* Player Hand Button & Panel - HIDDEN: Now using MyHandCards in FantasyGameLayout */}
      {myPlayer && (
        <>
          {/* Hand Panel */}
          <AnimatePresence>
            {showHand && (
              <>
                {/* Backdrop */}
                <motion.div
                  className="absolute inset-0 bg-black/50 z-40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowHand(false)}
                />
                
                {/* Hand Cards */}
                <motion.div
                  className="absolute z-50 bg-slate-900/95 backdrop-blur-xl rounded-t-xl shadow-2xl border-t-2 border-purple-500/50"
                  style={{
                    bottom: '0%',
                    left: '20%',
                    right: '10%',
                    padding: '12px'
                  }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-sm">Your Hand</h3>
                      {isMyTurn && (
                        <span className="text-green-400 text-[10px] bg-green-500/20 px-2 py-0.5 rounded-full">
                          Your Turn
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowHand(false)}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {hand.map((card, index) => (
                      <FantasyHandCard
                        key={`hand-${index}`}
                        card={card}
                        index={index}
                        isMyTurn={isMyTurn}
                        onClick={handleHandCardClick}
                      />
                    ))}
                    {hand.length === 0 && (
                      <div className="text-gray-400 text-xs">No cards in hand</div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Modals */}
      {depositModal.show && (
        <DepositModal
          card={depositModal.card}
          cardIndex={depositModal.index}
          onClose={() => setDepositModal({ show: false, card: null, index: null })}
        />
      )}

      <ConfirmGolemModal
        isOpen={confirmGolem.show}
        golem={confirmGolem.golem}
        onConfirm={handleConfirmClaim}
        onCancel={() => setConfirmGolem({ show: false, golem: null, index: null })}
      />

      {upgradeModalCard && (
        <UpgradeModal
          card={upgradeModalCard}
          playerResources={myPlayer?.resources}
          maxTurnUpgrade={upgradeModalCard?.turnUpgrade || 1}
          onConfirm={handleUpgradeConfirm}
          onCancel={hideUpgradeModal}
        />
      )}

      {tradeModalCard && (
        <TradeModal
          card={tradeModalCard}
          playerResources={myPlayer?.resources}
          onConfirm={handleTradeConfirm}
          onCancel={hideTradeModal}
        />
      )}
    </>
  )
}

export default FantasyMarketArea

