import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import useOrientation from "../hooks/useOrientation";

const TradeModal = ({ card, playerResources, onConfirm, onCancel }) => {
  const [multiplier, setMultiplier] = useState(1);
  const [error, setError] = useState("");
  const { isMobile } = useOrientation();

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Calculate required input and output based on multiplier
  const requiredInput = {
    yellow: (card?.input?.yellow || 0) * multiplier,
    green: (card?.input?.green || 0) * multiplier,
    blue: (card?.input?.blue || 0) * multiplier,
    pink: (card?.input?.pink || 0) * multiplier,
  };

  const outputResult = {
    yellow: (card?.output?.yellow || 0) * multiplier,
    green: (card?.output?.green || 0) * multiplier,
    blue: (card?.output?.blue || 0) * multiplier,
    pink: (card?.output?.pink || 0) * multiplier,
  };

  // Calculate maximum possible multiplier
  const calculateMaxMultiplier = () => {
    if (!card?.input || !playerResources) return 0;

    let maxMultiplier = Infinity;
    let hasAnyInput = false;

    if ((card.input.yellow || 0) > 0) {
      hasAnyInput = true;
      const possible = Math.floor((playerResources.yellow || 0) / card.input.yellow);
      maxMultiplier = Math.min(maxMultiplier, possible);
    }
    if ((card.input.green || 0) > 0) {
      hasAnyInput = true;
      const possible = Math.floor((playerResources.green || 0) / card.input.green);
      maxMultiplier = Math.min(maxMultiplier, possible);
    }
    if ((card.input.blue || 0) > 0) {
      hasAnyInput = true;
      const possible = Math.floor((playerResources.blue || 0) / card.input.blue);
      maxMultiplier = Math.min(maxMultiplier, possible);
    }
    if ((card.input.pink || 0) > 0) {
      hasAnyInput = true;
      const possible = Math.floor((playerResources.pink || 0) / card.input.pink);
      maxMultiplier = Math.min(maxMultiplier, possible);
    }

    if (!hasAnyInput) return 0;
    if (maxMultiplier === Infinity) return 0;
    return Math.max(0, maxMultiplier);
  };

  const maxMultiplier = calculateMaxMultiplier();

  // Validate trade
  const validateTrade = () => {
    if (multiplier < 1) {
      setError("Multiplier must be at least 1");
      return false;
    }

    if (multiplier > maxMultiplier) {
      setError(`Max ${maxMultiplier} times`);
      return false;
    }

    const hasEnoughYellow = requiredInput.yellow <= (playerResources?.yellow || 0);
    const hasEnoughGreen = requiredInput.green <= (playerResources?.green || 0);
    const hasEnoughBlue = requiredInput.blue <= (playerResources?.blue || 0);
    const hasEnoughPink = requiredInput.pink <= (playerResources?.pink || 0);
    
    if (!hasEnoughYellow || !hasEnoughGreen || !hasEnoughBlue || !hasEnoughPink) {
      setError("Not enough resources");
      return false;
    }

    setError("");
    return true;
  };

  const handleConfirm = () => {
    if (validateTrade()) {
      if (typeof onConfirm === "function") onConfirm(multiplier);
    }
  };

  const adjustMultiplier = (delta) => {
    setMultiplier((prev) => {
      const minVal = maxMultiplier === 0 ? 0 : 1;
      const newVal = prev + delta;
      if (newVal < minVal) return minVal;
      if (maxMultiplier > 0 && newVal > maxMultiplier) return maxMultiplier;
      return newVal;
    });
  };

  useEffect(() => {
    const mm = calculateMaxMultiplier();
    if (mm === 0) {
      setMultiplier(0);
      setError("Not enough resources");
    } else {
      setMultiplier((prev) => {
        if (prev < 1) return 1;
        if (prev > mm) return mm;
        return prev;
      });
      setError("");
    }
  }, [playerResources, card]);

  useEffect(() => {
    validateTrade();
  }, [multiplier]);

  const crystalTypes = [
    { key: "yellow", label: "Yellow", image: "/images/stone_yellow.JPG" },
    { key: "green", label: "Green", image: "/images/stone_green.JPG" },
    { key: "blue", label: "Blue", image: "/images/stone_blue.JPG" },
    { key: "pink", label: "Pink", image: "/images/stone_pink.JPG" },
  ];

  const canConfirm = !error && multiplier >= 1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className={`
            bg-white rounded-xl sm:rounded-2xl shadow-2xl border-4 border-pink-500 w-full overflow-y-auto
            max-h-[85vh]
            ${isMobile ? 'max-w-[95vw] p-3 mx-2' : 'max-w-2xl p-6 mx-4'}
          `}
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
            <h2 className={`font-bold text-pink-600 ${isMobile ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>
              🔄 Trade Crystals
            </h2>
            <p className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-base'}`}>
              {card?.name || "Trade Card"} - Select multiplier (max {maxMultiplier}x)
            </p>
          </div>

          {/* Input Section - You Pay */}
          <div className={`bg-red-50 rounded-lg ${isMobile ? 'p-2 mb-2' : 'p-4 mb-4'}`}>
            <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm mb-2' : 'text-lg mb-3'}`}>
              You Pay (x{multiplier})
            </h3>
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-4' : 'grid-cols-4 gap-3'}`}>
              {crystalTypes.map(({ key, label, image }) => {
                const amount = requiredInput[key] || 0;
                return (
                  <div
                    key={key}
                    className={`
                      rounded-lg border-2 text-center
                      ${isMobile ? 'p-1.5' : 'p-2'}
                      ${amount > 0 ? 'border-red-400 bg-red-100' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <img
                      src={image}
                      alt={label}
                      className={`mx-auto rounded-full object-cover ${isMobile ? 'w-6 h-6' : 'w-10 h-10'}`}
                      onError={(e) => { e.target.src = '/images/stone_yellow.JPG' }}
                    />
                    <div className={`font-bold text-gray-800 ${isMobile ? 'text-sm' : 'text-lg'}`}>
                      {amount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-2">
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`text-pink-400 ${isMobile ? 'text-2xl' : 'text-4xl'}`}
            >
              ↓
            </motion.div>
          </div>

          {/* Output Section - You Receive */}
          <div className={`bg-green-50 rounded-lg ${isMobile ? 'p-2 mb-3' : 'p-4 mb-4'}`}>
            <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm mb-2' : 'text-lg mb-3'}`}>
              You Receive (x{multiplier})
            </h3>
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-4' : 'grid-cols-4 gap-3'}`}>
              {crystalTypes.map(({ key, label, image }) => {
                const amount = outputResult[key] || 0;
                return (
                  <div
                    key={key}
                    className={`
                      rounded-lg border-2 text-center
                      ${isMobile ? 'p-1.5' : 'p-2'}
                      ${amount > 0 ? 'border-green-400 bg-green-100' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <img
                      src={image}
                      alt={label}
                      className={`mx-auto rounded-full object-cover ${isMobile ? 'w-6 h-6' : 'w-10 h-10'}`}
                      onError={(e) => { e.target.src = '/images/stone_yellow.JPG' }}
                    />
                    <div className={`font-bold text-gray-800 ${isMobile ? 'text-sm' : 'text-lg'}`}>
                      {amount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multiplier Selection */}
          <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-2 mb-3' : 'p-4 mb-4'}`}>
            <h3 className={`font-semibold text-gray-800 text-center ${isMobile ? 'text-sm mb-2' : 'text-base mb-3'}`}>
              Trade Multiplier
            </h3>
            <div className="flex items-center justify-center gap-3">
              <motion.button
                onClick={() => adjustMultiplier(-1)}
                disabled={multiplier <= 1}
                className={`
                  rounded-full bg-red-500 text-white font-bold 
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                  ${isMobile ? 'w-10 h-10 text-xl' : 'w-12 h-12 text-2xl'}
                `}
                whileTap={{ scale: 0.9 }}
              >
                −
              </motion.button>
              <div className={`
                font-bold text-gray-800 text-center bg-white border-2 border-gray-300 rounded-lg
                ${isMobile ? 'w-16 py-2 text-2xl' : 'w-20 py-2 text-3xl'}
              `}>
                {multiplier}
              </div>
              <motion.button
                onClick={() => adjustMultiplier(1)}
                disabled={multiplier >= maxMultiplier}
                className={`
                  rounded-full bg-green-500 text-white font-bold 
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                  ${isMobile ? 'w-10 h-10 text-xl' : 'w-12 h-12 text-2xl'}
                `}
                whileTap={{ scale: 0.9 }}
              >
                +
              </motion.button>
            </div>
            <div className={`text-center text-gray-600 ${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
              {multiplier === 1 ? "Single trade" : `${multiplier}x trade`}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`bg-red-50 border border-red-300 text-red-700 rounded-lg text-center ${isMobile ? 'px-2 py-1.5 mb-3 text-xs' : 'px-4 py-2 mb-4 text-sm'}`}>
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div className={`flex ${isMobile ? 'gap-2' : 'gap-4'}`}>
            <motion.button
              onClick={onCancel}
              className={`
                flex-1 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition-all
                ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'}
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`
                flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold 
                rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl
                ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'}
              `}
              whileHover={canConfirm ? { scale: 1.02 } : {}}
              whileTap={canConfirm ? { scale: 0.95 } : {}}
            >
              Confirm Trade
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default TradeModal;
