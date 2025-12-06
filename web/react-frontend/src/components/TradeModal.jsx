import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CrystalStack from "./CrystalStack";

const TradeModal = ({ card, playerResources, onConfirm, onCancel }) => {
  const [multiplier, setMultiplier] = useState(1);
  const [error, setError] = useState("");

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
      setError(`You can only trade up to ${maxMultiplier} times`);
      return false;
    }

    // Check if player has enough resources for the calculated required input
    const hasEnoughYellow = requiredInput.yellow <= (playerResources?.yellow || 0);
    const hasEnoughGreen = requiredInput.green <= (playerResources?.green || 0);
    const hasEnoughBlue = requiredInput.blue <= (playerResources?.blue || 0);
    const hasEnoughPink = requiredInput.pink <= (playerResources?.pink || 0);
    
    if (!hasEnoughYellow || !hasEnoughGreen || !hasEnoughBlue || !hasEnoughPink) {
      setError("Not enough resources for this trade");
      return false;
    }

    setError("");
    return true;
  };

  const handleConfirm = () => {
    if (validateTrade()) {
      if (typeof onConfirm === "function") onConfirm(multiplier);
      setError(""); // Clear error on successful confirmation
    }
  };

  const handleCancel = () => {
    setError(""); // Clear error when cancelling
    if (typeof onCancel === "function") onCancel();
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

  // Keep multiplier within bounds when resources or card change
  useEffect(() => {
    const mm = calculateMaxMultiplier();
    if (mm === 0) {
      setMultiplier(0);
      setError("Not enough resources for this trade");
    } else {
      setMultiplier((prev) => {
        if (prev < 1) return 1;
        if (prev > mm) return mm;
        return prev;
      });
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerResources, card]);

  // Validate whenever multiplier changes (for UI error updates)
  useEffect(() => {
    validateTrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiplier]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Trade - {card?.name || "Trade Card"}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Select how many times you want to perform this trade
          </p>

          {/* Trade Info */}
          <div className="mb-6 space-y-4">
            {/* Input Section */}
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">You Pay (x{multiplier})</h3>
              <div className="flex items-center gap-3">
                <div title="Yellow crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 border border-yellow-600 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{requiredInput.yellow || 0}</div>
                </div>

                <div title="Green crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-green-500 border border-green-700 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{requiredInput.green || 0}</div>
                </div>

                <div title="Blue crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 border border-blue-700 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{requiredInput.blue || 0}</div>
                </div>

                <div title="Pink crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-pink-400 border border-pink-600 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{requiredInput.pink || 0}</div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-3xl text-gray-400"
              >
                ↓
              </motion.div>
            </div>

            {/* Output Section */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">You Receive (x{multiplier})</h3>
              <div className="flex items-center gap-3">
                <div title="Yellow crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 border border-yellow-600 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{outputResult.yellow || 0}</div>
                </div>

                <div title="Green crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-green-500 border border-green-700 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{outputResult.green || 0}</div>
                </div>

                <div title="Blue crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 border border-blue-700 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{outputResult.blue || 0}</div>
                </div>

                <div title="Pink crystals" className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-pink-400 border border-pink-600 shadow-sm" />
                  <div className="text-gray-800 font-semibold text-sm">{outputResult.pink || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Multiplier Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Multiplier (Max: {maxMultiplier})
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => adjustMultiplier(-1)}
                disabled={multiplier <= 1}
                className="w-12 h-12 rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 transition text-xl"
              >
                -
              </button>
              <div className="w-20 text-center">
                <input
                  type="number"
                  min="1"
                  max={maxMultiplier}
                  value={multiplier}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (val >= 1 && val <= maxMultiplier) {
                      setMultiplier(val);
                    }
                  }}
                  className="w-full text-3xl font-bold text-center text-gray-800 bg-transparent border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => adjustMultiplier(1)}
                disabled={multiplier >= maxMultiplier}
                className="w-12 h-12 rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition text-xl"
              >
                +
              </button>
            </div>
            <div className="mt-2 text-center text-sm text-gray-600">
              {multiplier === 1
                ? "Single trade"
                : `${multiplier}x trade`}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4"
            >
              {error}
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!!error || multiplier < 1}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition"
            >
              Confirm Trade
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TradeModal;

