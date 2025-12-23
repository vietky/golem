import React, { useState } from 'react'
import SimpleCard from './SimpleCard'
import DepositModal from './DepositModal'
import ConfirmGolemModal from './ConfirmGolemModal'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'
import { showToast } from '../utils/toast'

const SimpleMarketArea = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })
  const [confirmGolem, setConfirmGolem] = useState({ show: false, golem: null, index: null })

  if (!gameState?.market) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading market...</p>
        </div>
      </div>
    );
  }

  const { actionCards, pointCards, coins } = gameState.market;
  const isMyTurn = currentPlayer?.id === myPlayer?.id;

  const canAfford = (cost) => {
    if (!cost || !myPlayer?.resources) return false;
    return (
      (cost.yellow || 0) <= myPlayer.resources.yellow &&
      (cost.green || 0) <= myPlayer.resources.green &&
      (cost.blue || 0) <= myPlayer.resources.blue &&
      (cost.pink || 0) <= myPlayer.resources.pink
    );
  };

  const handleAcquireCard = (index) => {
    if (!isMyTurn) return;
    const card = actionCards[index];
    const cost = card.cost || {};
    
    // If this is position 0, just acquire (free)
    if (index === 0) {
      acquireCard(index, [], card);
      return;
    }

    // For other positions, show deposit modal
    setDepositModal({ show: true, card, index });
  };

  const handleClaimPointCard = (index) => {
    if (!isMyTurn) {
      showToast("Not your turn!", 'error')
      return
    }
    
    const card = pointCards[index]
    if (!canClaimPointCard(card)) {
      showToast("Not enough crystals!", 'error')
      return
    }
    
    // Show confirmation modal
    setConfirmGolem({ show: true, golem: card, index })
  };

  const handleConfirmClaim = () => {
    if (confirmGolem.index !== null && confirmGolem.golem) {
      claimPointCard(confirmGolem.index, confirmGolem.golem)
    }
    setConfirmGolem({ show: false, golem: null, index: null })
  };

  const canClaimPointCard = (card) => {
    if (!card.requirement || !myPlayer?.resources) return false;
    return canAfford(card.requirement);
  };

  // Determine coin badge info for a point card position using server-provided coins
  // New logic: Position 0 gets first available coin (copper if available, silver if copper is gone)
  // Position 1 only gets silver coin if copper is still available
  const getCoinBadgeInfo = (position) => {
    if (!gameState?.market?.coins) return null
    const coins = gameState.market.coins
    
    if (position === 0) {
      // Position 0: First available coin
      if (coins[0] && coins[0].amount > 0) {
        const label = coins[0].points === 3 ? 'Copper Token (3 pts)' : coins[0].points === 1 ? 'Silver Token (1 pt)' : `Coin (${coins[0].points} pts)`
        return { label, amount: coins[0].amount, points: coins[0].points }
      } else if (coins[1] && coins[1].amount > 0) {
        const label = coins[1].points === 3 ? 'Copper Token (3 pts)' : coins[1].points === 1 ? 'Silver Token (1 pt)' : `Coin (${coins[1].points} pts)`
        return { label, amount: coins[1].amount, points: coins[1].points }
      }
    } else if (position === 1) {
      // Position 1: Silver coin only if copper is still available
      if (coins[0] && coins[0].amount > 0 && coins[1] && coins[1].amount > 0) {
        const label = coins[1].points === 3 ? 'Copper Token (3 pts)' : coins[1].points === 1 ? 'Silver Token (1 pt)' : `Coin (${coins[1].points} pts)`
        return { label, amount: coins[1].amount, points: coins[1].points }
      }
    }
    
    return null
  }

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 overflow-y-auto z-10 ${
      isMobile && isPortrait ? 'py-4' : 'py-6'
    }`}>
      <div className="space-y-4 pb-4">
        {/* Action Cards Market - Grid Layout */}
        <div className="bg-black/10 backdrop-blur-sm rounded-lg border border-white/10 p-4 mx-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-white font-bold text-sm">
              Market - Action Cards
            </h2>
            <span className="text-white/60 text-xs">
              {gameState.market.actionDeck || 0} remaining
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 justify-items-center">
            {actionCards.map((cardData, index) => {
              const cost = cardData.cost || {};
              const isAffordable = isMyTurn && canAfford(cost);
              const deposits = cardData.deposits || {};

              // Build crystal badges array
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
                <div key={`action-${index}`} className="relative">
                  {/* Position Badge */}
                  <div className="absolute -top-2 -left-2 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* Deposit Crystals Badge */}
                  {crystalBadges.length > 0 && (
                    <div className="absolute -top-2 -right-2 z-10 flex flex-wrap gap-0.5 max-w-[50px] justify-end">
                      {crystalBadges.map((crystal, i) => (
                        <img
                          key={i}
                          src={crystal.src}
                          alt={crystal.type}
                          className="w-5 h-5 rounded-full object-cover border-2 border-white shadow-lg"
                          onError={(e) => { e.target.src = '/images/stone_yellow.JPG' }}
                        />
                      ))}
                    </div>
                  )}
                  
                  <SimpleCard
                    card={cardData}
                    type="action"
                    index={index}
                    cost={cost}
                    isAffordable={isAffordable}
                    onClick={() => handleAcquireCard(index)}
                    size="normal"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Point Cards Market - Grid Layout */}
        <div className="bg-black/10 backdrop-blur-sm rounded-lg border border-white/10 p-4 mx-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-white font-bold text-sm">
              Point Cards
            </h2>
            <div className="flex items-center gap-3 text-xs">
              {/* Coins remaining info */}
              {coins[0]?.amount > 0 && (
                <span className="text-orange-400" title="Copper coins (3pts each)">
                  🥉{coins[0].amount}/10
                </span>
              )}
              {coins[1]?.amount > 0 && (
                <span className="text-gray-300" title="Silver coins (1pt each)">
                  🥈{coins[1].amount}/10
                </span>
              )}
              <span className="text-white/60">
                {gameState.market.pointDeck || 0} cards
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 justify-items-center">
            {pointCards.map((cardData, index) => {
              const canClaim = isMyTurn && canClaimPointCard(cardData);
              const badge = getCoinBadgeInfo(index);
              const isCopperCoin = index === 0;
              const coinEmoji = isCopperCoin ? '🥉' : '🥈';

              return (
                <div key={`point-${index}`} className="relative">
                  {/* Position Badge */}
                  <div className="absolute -top-2 -left-2 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* Coin Bonus Badge */}
                  {badge && (
                    <div 
                      className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-white/30 shadow-lg"
                      title={`${badge.label} - ${badge.amount} remaining`}
                    >
                      <span className="text-sm">{coinEmoji}</span>
                      <span className="text-[10px] text-white font-bold">{badge.amount}</span>
                    </div>
                  )}
                  
                  <SimpleCard
                    card={cardData}
                    type="point"
                    index={index}
                    isAffordable={canClaim}
                    onClick={() => handleClaimPointCard(index)}
                    size="normal"
                  />
                </div>
              );
            })}
          </div>
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
  );
};

export default SimpleMarketArea;
