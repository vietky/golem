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

  const { actionCards, pointCards } = gameState.market;
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
    <div className={`fixed left-0 right-0 overflow-y-auto px-4 py-4 z-0 ${
      isMobile && isPortrait ? 'top-14 bottom-36' : 'top-28 bottom-8'
    }`}>
      <div className="mx-auto space-y-6 pb-8 max-w-6xl">
        {/* Action Cards Market */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 px-2">
            Market - Action Cards
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {actionCards.map((cardData, index) => {
              const cost = cardData.cost || {};
              const isAffordable = isMyTurn && canAfford(cost);

              return (
                <div key={`action-${index}`} className="relative">
                  {/* Position number */}
                  <div className="absolute -top-2 -left-2 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10">
                    {index + 1}
                  </div>
                  
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

        {/* Point Cards Market */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 px-2">
            Point Cards
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {pointCards.map((cardData, index) => {
              const canClaim = isMyTurn && canClaimPointCard(cardData);

              return (
                <div key={`point-${index}`} className="relative">
                  {/* Position number */}
                  <div className="absolute -top-2 -left-2 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10">
                    {index + 1}
                  </div>
                  
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
