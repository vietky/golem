import React, { useState } from "react";
import { motion } from "framer-motion";
import Card from "./Card";
import useGameStore from "../store/gameStore";

const MarketArea = () => {
  const { gameState, myPlayer, currentPlayer, acquireCard, claimPointCard } = useGameStore();
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Show loading state if market data not ready
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

  return (
    <div
      className="fixed top-24 sm:top-28 md:top-32 left-0 right-0 bottom-4 sm:bottom-6 md:bottom-8 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 z-0"
      data-drop-zone="market"
    >
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 pb-8 sm:pb-12 md:pb-16">
        {/* Action Cards Market */}
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-2">
            Market - Action Cards
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {actionCards.map((cardData, index) => {
              const cost = cardData.cost || {};
              const isAffordable = canAfford(cost);
              const isDragOver = dragOverIndex === `action-${index}`;

              return (
                <motion.div
                  key={`action-${index}`}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                  animate={{
                    opacity: 1,
                    scale: isDragOver ? 1.1 : 1,
                    rotateY: 0,
                  }}
                  style={{
                    border: isDragOver ? "2px solid #10b981" : "2px solid transparent",
                  }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  whileHover={{ y: -5 }}
                  onDragOver={() => handleDragOver(index, "action")}
                  onDragLeave={handleDragLeave}
                  className={isDragOver ? "rounded-xl" : ""}
                >
                  <Card
                    card={cardData}
                    type="action"
                    index={index}
                    cost={cost}
                    isAffordable={isAffordable}
                    isPlaying={isAffordable && myPlayer?.id === currentPlayer?.id}
                    onClick={() => isAffordable && acquireCard(index)}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Point Cards Market */}
        <div className="pr-0 sm:pr-[200px] md:pr-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-2">Point Cards</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
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
                <motion.div
                  key={`point-${index}`}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                  animate={{
                    opacity: 1,
                    scale: isDragOver ? 1.1 : 1,
                    rotateY: 0,
                  }}
                  style={{
                    border: isDragOver ? "2px solid #10b981" : "2px solid transparent",
                  }}
                  transition={{
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  whileHover={{ y: -5 }}
                  onDragOver={() => handleDragOver(index, "point")}
                  onDragLeave={handleDragLeave}
                  className={isDragOver ? "rounded-xl" : ""}
                >
                  <Card
                    card={cardData}
                    type="point"
                    index={index}
                    isPlayable={canClaim}
                    isPlaying={canClaim && myPlayer?.id === currentPlayer?.id}
                    onClick={() => canClaim && claimPointCard(index)}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketArea;
