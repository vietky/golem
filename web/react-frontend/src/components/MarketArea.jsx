import React, { useState } from 'react'
import Card from './Card'
import DepositModal from './DepositModal'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const MarketArea = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard, collectAllCrystals } = useGameStore()
  const { isMobile, isTablet, isPortrait, isLandscape, isDesktop } = useOrientation()
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null })

  // Show loading state if market data not ready
  if (!gameState?.market) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 sm:py-24">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm sm:text-base">Loading market...</p>
        </div>
      </div>
    );
  }

  const { actionCards, pointCards } = gameState.market;

  const canAfford = (cost) => {
    if (!cost || !myPlayer?.resources) return false;
    return (
      (cost.yellow || 0) <= myPlayer.resources.yellow &&
      (cost.green || 0) <= myPlayer.resources.green &&
      (cost.blue || 0) <= myPlayer.resources.blue &&
      (cost.pink || 0) <= myPlayer.resources.pink
    );
  };

  // Handle drop zone hover
  const handleDragOver = (index, type) => {
    setDragOverIndex(`${type}-${index}`);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Determine card grid classes based on device
  const getActionCardGridClasses = () => {
    if (isMobile && isPortrait) {
      // Mobile portrait: horizontal scroll with smaller cards
      return 'flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 px-1 scrollbar-thin -mx-1'
    }
    if (isMobile && isLandscape) {
      // Mobile landscape: 3 columns compact
      return 'grid grid-cols-3 gap-1.5 px-1'
    }
    if (isTablet) {
      // Tablet: 3-4 columns
      return 'grid grid-cols-3 lg:grid-cols-4 gap-2 px-2'
    }
    // Desktop: 6 columns
    return 'grid grid-cols-4 xl:grid-cols-6 gap-3 px-3'
  }

  const getPointCardGridClasses = () => {
    if (isMobile && isPortrait) {
      // Mobile portrait: horizontal scroll with smaller cards
      return 'flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 px-1 scrollbar-thin -mx-1'
    }
    if (isMobile && isLandscape) {
      // Mobile landscape: 3 columns compact
      return 'grid grid-cols-3 gap-1.5 px-1'
    }
    if (isTablet) {
      // Tablet: 3-4 columns
      return 'grid grid-cols-3 lg:grid-cols-4 gap-2 px-2'
    }
    // Desktop: 5 columns
    return 'grid grid-cols-3 xl:grid-cols-5 gap-3 px-3'
  }

  // Card wrapper classes for scroll snap - SMALLER on mobile
  const getCardWrapperClasses = () => {
    if (isMobile && isPortrait) {
      return 'flex-shrink-0 w-[130px] snap-center'
    }
    if (isMobile && isLandscape) {
      return 'w-full'
    }
    return ''
  }

  return (
    <div
      className={`
        w-full h-full
        ${isMobile ? 'px-1 py-1' : 'px-2 sm:px-4 md:px-6 py-2 sm:py-4'}
        ${isMobile ? 'space-y-2' : 'space-y-4 sm:space-y-6'}
      `}
      data-drop-zone="market"
    >
      <div className={`
        mx-auto
        ${isMobile ? 'space-y-2' : 'space-y-4 sm:space-y-6'}
        ${isDesktop ? 'max-w-6xl' : 'max-w-full'}
      `}>
        
        {/* Action Cards Market */}
        <section>
          <div className={`
            flex items-center justify-between px-1
            ${isMobile ? 'mb-1' : 'mb-2 sm:mb-3 px-2'}
          `}>
            <h2 className={`
              font-bold text-white
              ${isMobile ? 'text-xs' : 'text-sm sm:text-lg md:text-xl'}
            `}>
              {isMobile ? 'Action Cards' : 'Market - Action Cards'}
            </h2>
            <span className={`text-white/60 ${isMobile ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
              {gameState.market.actionDeck || 0} left
            </span>
          </div>
          
          <div className={getActionCardGridClasses()}>
            {actionCards.map((cardData, index) => {
              const cost = cardData.cost || {};
              const isAffordable = canAfford(cost);
              const isDragOver = dragOverIndex === `action-${index}`;

              return (
                <div
                  key={`action-${index}`}
                  style={{
                    border: isDragOver ? "2px solid #10b981" : "2px solid transparent",
                  }}
                  onDragOver={() => handleDragOver(index, "action")}
                  onDragLeave={handleDragLeave}
                  className={`
                    ${isDragOver ? "rounded-xl" : ""}
                    ${getCardWrapperClasses()}
                  `}
                >
                  <Card
                    card={cardData}
                    type="action"
                    index={index}
                    cost={cost}
                    isAffordable={isAffordable}
                    isPlaying={isAffordable && myPlayer?.id === currentPlayer?.id}
                    onClick={() => {
                      // If my turn, handle deposit/collect, otherwise acquire card
                      if (myPlayer?.id === currentPlayer?.id) {
                        const hasDeposits = cardData.deposits && Object.keys(cardData.deposits).length > 0
                        // Card position 1 (index 0) doesn't need deposit, acquire directly
                        if (index === 0) {
                          acquireCard(index)
                        } else {
                          // For cards index > 0, open deposit modal
                          setDepositModal({ show: true, card: cardData, index: index })
                        }
                      } else if (isAffordable) {
                        acquireCard(index)
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Point Cards Market */}
        <section>
          <div className={`
            flex items-center justify-between px-1
            ${isMobile ? 'mb-1' : 'mb-2 sm:mb-3 px-2'}
          `}>
            <h2 className={`
              font-bold text-white
              ${isMobile ? 'text-xs' : 'text-sm sm:text-lg md:text-xl'}
            `}>
              Point Cards
            </h2>
            <span className={`text-white/60 ${isMobile ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
              {gameState.market.pointDeck || 0} left
            </span>
          </div>
          
          <div className={getPointCardGridClasses()}>
            {pointCards.map((cardData, index) => {
              const canClaim =
                myPlayer?.resources && cardData.requirement
                  ? (cardData.requirement.yellow || 0) <= myPlayer.resources.yellow &&
                    (cardData.requirement.green || 0) <= myPlayer.resources.green &&
                    (cardData.requirement.blue || 0) <= myPlayer.resources.blue &&
                    (cardData.requirement.pink || 0) <= myPlayer.resources.pink
                  : false;
              const isDragOver = dragOverIndex === `point-${index}`;

              return (
                <div
                  key={`point-${index}`}
                  style={{
                    border: isDragOver ? "2px solid #10b981" : "2px solid transparent",
                  }}
                  onDragOver={() => handleDragOver(index, "point")}
                  onDragLeave={handleDragLeave}
                  className={`
                    ${isDragOver ? "rounded-xl" : ""}
                    ${getCardWrapperClasses()}
                  `}
                >
                  <Card
                    card={cardData}
                    type="point"
                    index={index}
                    isPlayable={canClaim}
                    isPlaying={canClaim && myPlayer?.id === currentPlayer?.id}
                    onClick={() => canClaim && claimPointCard(index)}
                  />
                </div>
              );
            })}
          </div>
        </section>
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

export default MarketArea;
