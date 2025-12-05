import React, { useState } from 'react'
import SimpleCard from './SimpleCard'
import DepositModal from './DepositModal'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const SimpleMarketArea = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })

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
      acquireCard(index);
      return;
    }

    // For other positions, show deposit modal
    setDepositModal({ show: true, card, index });
  };

  const handleClaimPointCard = (index) => {
    if (!isMyTurn) return;
    claimPointCard(index);
  };

  const canClaimPointCard = (card) => {
    if (!card.requirement || !myPlayer?.resources) return false;
    return canAfford(card.requirement);
  };

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
              const depositCount = Object.values(deposits).reduce((a, b) => 
                parseInt(a || 0) + parseInt(b || 0), 0
              );

              return (
                <div key={`action-${index}`} className="relative">
                  {/* Position Badge */}
                  <div className="absolute -top-2 -left-2 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* Deposit Count Badge */}
                  {depositCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg">
                      +{depositCount}
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
            <span className="text-white/60 text-xs">
              {gameState.market.pointDeck || 0} remaining
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 justify-items-center">
            {pointCards.map((cardData, index) => {
              const canClaim = isMyTurn && canClaimPointCard(cardData);
              const coinBonus = index <= 1 && coins && coins[index] && coins[index].amount > 0;

              return (
                <div key={`point-${index}`} className="relative">
                  {/* Position Badge */}
                  <div className="absolute -top-2 -left-2 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* Coin Bonus Badge */}
                  {coinBonus && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg" title={index === 0 ? "Copper Token (3 pts)" : "Silver Token (1 pt)"}>
                      🪙
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
    </div>
  );
};

export default SimpleMarketArea;
