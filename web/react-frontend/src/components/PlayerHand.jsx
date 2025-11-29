import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import Card from "./Card";
import UpgradeModal from "./UpgradeModal";
import TradeModal from "./TradeModal";
import DepositModal from "./DepositModal";
import useGameStore from "../store/gameStore";

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
  const handRef = useRef(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragControls = useDragControls();
  const [depositModal, setDepositModal] = useState({ show: false, card: null, index: null });

  // Show empty state if player data not ready yet
  if (!myPlayer) {
    return null;
  }

  if (!myPlayer.hand || myPlayer.hand.length === 0) {
    return (
      <div className="fixed bottom-4 left-4 z-30">
        <div className="bg-slate-800/90 backdrop-blur-md rounded-lg px-4 py-2 border-2 border-gray-600">
          <p className="text-white text-sm">No cards in hand</p>
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
      {/* Collapsed Button */}
      {!isExpanded && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-4 left-4 z-30 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold px-6 py-4 rounded-xl shadow-2xl border-2 border-white/20 flex items-center gap-3 transition-all"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {hand.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {hand.length}
              </span>
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">Your Hand</div>
            <div className="text-xs opacity-90">
              {isMyTurn ? <span className="text-green-300">Your Turn</span> : `${hand.length} cards`}
            </div>
          </div>
        </motion.button>
      )}

      {/* Expanded Hand Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-4 left-4 z-30 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-purple-500/50 p-4 max-h-[70vh] w-[90vw] sm:w-[500px] md:w-[600px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-lg font-bold">
                  Your Hand
                  {isMyTurn && <span className="ml-2 text-green-400 text-sm">(Your Turn)</span>}
                </h3>
                <p className="text-gray-400 text-sm">{hand.length} cards</p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cards Container */}
            <div
              ref={handRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
              style={{
                scrollbarWidth: "thin",
              }}
            >
              <AnimatePresence>
                {hand.map((card, index) => (
                  <motion.div
                    key={`${card.name}-${index}`}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="flex-shrink-0 w-36 sm:w-40 md:w-44"
                    whileHover={{ y: -8, scale: 1.05 }}
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
                      onDragStart={() => isMyTurn && handleDragStart(index)}
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
