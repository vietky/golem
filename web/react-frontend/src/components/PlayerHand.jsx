import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import UpgradeModal from "./UpgradeModal";
import TradeModal from "./TradeModal";
import DepositModal from "./DepositModal";
import useGameStore from "../store/gameStore";
import useOrientation from "../hooks/useOrientation";
import { createPanHandlers } from "../utils/gestures";

const PlayerHand = () => {
  const {
    myPlayer,
    currentPlayer,
    playCard,
    playCardWithUpgrade,
    playCardWithTrade,
    setIsDragging,
    upgradeModalCard,
    upgradeModalCardIndex,
    tradeModalCard,
    tradeModalCardIndex,
    showUpgradeModal,
    hideUpgradeModal,
    showTradeModal,
    hideTradeModal,
  } = useGameStore();
  const { isMobile, isPortrait } = useOrientation();
  const handRef = useRef(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null });

  // Pan handlers for swipe to dismiss (portrait mode)
  const panHandlers = createPanHandlers({
    onSwipe: (direction) => {
      if (direction === 'down' && isMobile && isPortrait && isExpanded) {
        setIsExpanded(false);
      }
    }
  });

  // Show empty state if player data not ready yet
  if (!myPlayer) {
    return null;
  }

  if (!myPlayer.hand || myPlayer.hand.length === 0) {
    return (
      <div className={`fixed z-30 ${
        isMobile && isPortrait ? 'bottom-16 left-2' : 'bottom-4 left-4'
      }`}>
        <div className="bg-slate-800/90 backdrop-blur-md rounded-lg px-3 sm:px-4 py-2 border-2 border-gray-600">
          <p className="text-white text-xs sm:text-sm">No cards in hand</p>
        </div>
      </div>
    );
  }

  const isMyTurn = currentPlayer?.id === myPlayer.id;
  const hand = myPlayer.hand || [];

  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedCardIndex(index);
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = (event, info, cardIndex) => {
    setIsDragging(false);
    setDraggedCardIndex(null);

    // Check if dropped over valid area (market area)
    const marketArea = document.querySelector('[data-drop-zone="market"]');
    if (marketArea) {
      const rect = marketArea.getBoundingClientRect();
      const x = event.clientX || info.point.x;
      const y = event.clientY || info.point.y;

      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Valid drop - play card
        if (isMyTurn) {
          handleCardClick(cardIndex);
        }
      } else {
        // Invalid drop - shake back to position
        // Animation handled by Card component
      }
    }
  };

  // Handle card click - show modal if upgrade/trade card, otherwise play directly
  const handleCardClick = (cardIndex) => {
    if (!isMyTurn) return;

    const card = hand[cardIndex];
    if (card && card.actionType === 1) {
      // 1 = Upgrade action type
      showUpgradeModal(card, cardIndex);
    } else if (card && card.actionType === 2) {
      // 2 = Trade action type
      showTradeModal(card, cardIndex);
    } else {
      playCard(cardIndex);
    }
  };

  // Handle upgrade confirmation
  const handleUpgradeConfirm = (inputResources, outputResources) => {
    if (upgradeModalCardIndex !== null) {
      playCardWithUpgrade(upgradeModalCardIndex, inputResources, outputResources);
    }
  };

  // Handle trade confirmation
  const handleTradeConfirm = (multiplier) => {
    if (tradeModalCardIndex !== null) {
      playCardWithTrade(tradeModalCardIndex, multiplier);
    }
  };

  return (
    <>
      {/* Backdrop overlay (mobile portrait only) */}
      {isExpanded && isMobile && isPortrait && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-35"
        />
      )}

      {/* Collapsed Button */}
      {!isExpanded && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-4 left-4 z-30 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-2xl border-2 border-white/20 flex items-center gap-2 sm:gap-3 transition-all touch-target px-5 py-3 sm:px-6 sm:py-4"
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {hand.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white font-bold rounded-full flex items-center justify-center text-[10px] w-4 h-4 sm:text-xs sm:w-5 sm:h-5">
                {hand.length}
              </span>
            )}
          </div>
          <div className="text-left">
            <div className="font-semibold text-xs sm:text-sm">Your Hand</div>
            <div className="opacity-90 text-[10px] sm:text-xs">
              {isMyTurn ? <span className="text-green-300">Your Turn ▶</span> : `${hand.length} cards`}
            </div>
          </div>
        </motion.button>
      )}

      {/* Expanded Hand Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ 
              y: isMobile && isPortrait ? 400 : 0, 
              x: isMobile && isPortrait ? 0 : -400, 
              opacity: isMobile && isPortrait ? 1 : 0 
            }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={{ 
              y: isMobile && isPortrait ? 400 : 0, 
              x: isMobile && isPortrait ? 0 : -400, 
              opacity: isMobile && isPortrait ? 1 : 0 
            }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            {...(isMobile && isPortrait ? panHandlers : {})}
            className={`fixed bg-slate-900/95 backdrop-blur-xl shadow-2xl border-purple-500/50 ${
              isMobile && isPortrait
                ? 'bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t-2 max-h-[70vh] safe-bottom'
                : 'bottom-0 left-0 right-0 z-30 border-t-2 py-3 px-4 pr-[260px]'
            }`}
          >
            {/* Drag handle (portrait only) */}
            {isMobile && isPortrait && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-400 rounded-full opacity-50" />
              </div>
            )}

            {/* Header */}
            <div className={`flex items-center justify-between ${
              isMobile && isPortrait ? 'px-4 pb-3 mb-3 border-b border-gray-700' : 'mb-2'
            }`}>
              <div className="flex items-center gap-3">
                <h3 className="text-white font-bold text-base">
                  Your Hand
                  {isMyTurn && (
                    <span className="ml-2 inline-flex items-center gap-1 text-green-400 text-xs bg-green-500/20 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      Your Turn
                    </span>
                  )}
                </h3>
                <span className="text-gray-400 text-sm">{hand.length} cards</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg touch-target"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cards Container */}
            <div
              ref={handRef}
              className={`${
                isMobile && isPortrait
                  ? 'grid grid-cols-2 gap-3 overflow-y-auto max-h-[50vh] px-4 pb-2'
                  : 'flex gap-4 overflow-x-auto snap-x scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800 pb-2'
              }`}
              style={{
                scrollbarWidth: "thin",
              }}
            >
              <AnimatePresence>
                {hand.map((card, index) => (
                  <motion.div
                    key={`${card.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className={`${
                      isMobile && isPortrait 
                        ? 'w-full' 
                        : 'flex-shrink-0 snap-center w-36 sm:w-40'
                    }`}
                    whileHover={{ y: -8, scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    <Card
                      card={card}
                      type="action"
                      index={index}
                      isPlayable={isMyTurn}
                      isPlaying={isMyTurn}
                      onClick={() => handleCardClick(index)}
                      isDragging={draggedCardIndex === index}
                      onDragStart={() => !isMobile && isMyTurn && handleDragStart(index)}
                      onDragEnd={(event, info) => handleDragEnd(event, info, index)}
                      dragConstraints={handRef}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      {upgradeModalCard && (
        <UpgradeModal
          card={upgradeModalCard}
          playerResources={myPlayer?.resources}
          maxTurnUpgrade={upgradeModalCard?.turnUpgrade || 1}
          onConfirm={handleUpgradeConfirm}
          onCancel={hideUpgradeModal}
        />
      )}

      {/* Trade Modal */}
      {tradeModalCard && (
        <TradeModal
          card={tradeModalCard}
          playerResources={myPlayer?.resources}
          onConfirm={handleTradeConfirm}
          onCancel={hideTradeModal}
        />
      )}

      {/* Deposit Modal */}
      {depositModal.show && (
        <DepositModal
          card={depositModal.card}
          cardIndex={depositModal.index}
          isHandCard={true}
          onClose={() => setDepositModal({ show: false, card: null, index: null })}
        />
      )}
    </>
  );
};

export default PlayerHand;
