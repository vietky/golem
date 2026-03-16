import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import useOrientation from "../hooks/useOrientation";

const UpgradeModal = ({ card, playerResources, onConfirm, onCancel, maxTurnUpgrade }) => {
  const [inputResources, setInputResources] = useState({ yellow: 0, green: 0, blue: 0, pink: 0 });
  const [outputResources, setOutputResources] = useState({ yellow: 0, green: 0, blue: 0, pink: 0 });
  const [error, setError] = useState("");
  const { isMobile } = useOrientation();

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const availableResources = {
    yellow: (playerResources?.yellow || 0) - inputResources.yellow,
    green: (playerResources?.green || 0) - inputResources.green,
    blue: (playerResources?.blue || 0) - inputResources.blue,
    pink: (playerResources?.pink || 0) - inputResources.pink,
  };

  const totalInput = inputResources.yellow + inputResources.green + inputResources.blue + inputResources.pink;
  const totalOutput = outputResources.yellow + outputResources.green + outputResources.blue + outputResources.pink;

  const getValidationError = () => {
    if (totalInput === 0) return "Please select crystals to upgrade";
    if (totalInput !== totalOutput) return "Input and output must be equal";

    const inputLevel = inputResources.yellow * 1 + inputResources.green * 2 + inputResources.blue * 3 + inputResources.pink * 4;
    const outputLevel = outputResources.yellow * 1 + outputResources.green * 2 + outputResources.blue * 3 + outputResources.pink * 4;
    const levelDiff = outputLevel - inputLevel;

    if (levelDiff <= 0) return "Output must be higher level";
    if (levelDiff > maxTurnUpgrade) return `Max ${maxTurnUpgrade} levels`;

    const before = [inputResources.yellow, inputResources.green, inputResources.blue, inputResources.pink];
    const after = [outputResources.yellow, outputResources.green, outputResources.blue, outputResources.pink];

    let aidx = 0;
    for (let bidx = 0; bidx < before.length; bidx++) {
      let stones = before[bidx];
      while (stones > 0) {
        while (aidx < after.length && after[aidx] === 0) aidx++;
        if (aidx >= after.length || aidx < bidx) return "Invalid upgrade";
        stones--;
        after[aidx]--;
      }
    }
    while (aidx < after.length && after[aidx] === 0) aidx++;
    if (aidx < after.length) return "Invalid upgrade";

    return "";
  };

  const handleConfirm = () => {
    const validationError = getValidationError();
    if (validationError === "") {
      onConfirm(inputResources, outputResources);
    }
  };

  const adjustInput = (color, delta) => {
    setInputResources((prev) => {
      const current = prev[color] || 0;
      const available = playerResources?.[color] || 0;
      const newVal = current + delta;
      if (newVal < 0 || newVal > available) return prev;
      return { ...prev, [color]: newVal };
    });
  };

  const adjustOutput = (color, delta) => {
    setOutputResources((prev) => {
      const current = prev[color] || 0;
      const currentTotal = prev.yellow + prev.green + prev.blue + prev.pink;
      const newVal = current + delta;
      if (newVal < 0) return prev;
      const newTotal = currentTotal - current + newVal;
      if (newTotal > totalInput) return prev;
      return { ...prev, [color]: newVal };
    });
  };

  useEffect(() => {
    if (totalInput === 0) {
      setOutputResources({ yellow: 0, green: 0, blue: 0, pink: 0 });
      setError("");
    }
  }, [totalInput]);

  useEffect(() => {
    setError(getValidationError());
  }, [inputResources, outputResources, totalInput, totalOutput, maxTurnUpgrade]);

  const crystalTypes = [
    { key: "yellow", label: "Yellow", level: 1, image: "https://statics.vietky.io.vn/images/stone_yellow.JPG" },
    { key: "green", label: "Green", level: 2, image: "https://statics.vietky.io.vn/images/stone_green.JPG" },
    { key: "blue", label: "Blue", level: 3, image: "https://statics.vietky.io.vn/images/stone_blue.JPG" },
    { key: "pink", label: "Pink", level: 4, image: "https://statics.vietky.io.vn/images/stone_pink.JPG" },
  ];

  const canConfirm = totalInput > 0 && totalInput === totalOutput && error === "";

  return createPortal(
    <AnimatePresence>
      {/* Fixed overlay - rendered via portal to escape stacking context */}
      <div 
        className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        {/* Centering wrapper */}
        <div className="min-h-full flex items-center justify-center p-2 sm:p-4">
          <motion.div
            className={`
              bg-white rounded-xl sm:rounded-2xl shadow-2xl border-4 border-blue-500 w-full
              max-h-[85vh] overflow-y-auto
              ${isMobile ? 'max-w-[95vw] p-3' : 'max-w-2xl p-6'}
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
            <h2 className={`font-bold text-blue-600 ${isMobile ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>
              💎 Upgrade Crystals
            </h2>
            <p className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-base'}`}>
              Select crystals to upgrade (max {maxTurnUpgrade} levels)
            </p>
          </div>

          {/* Input Section */}
          <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-2 mb-3' : 'p-4 mb-4'}`}>
            <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm mb-2' : 'text-lg mb-3'}`}>
              Input Crystals (You have)
            </h3>
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-4 gap-3'}`}>
              {crystalTypes.map(({ key, label, level, image }) => {
                const hasResources = availableResources[key] + inputResources[key] > 0;
                return (
                  <div
                    key={key}
                    className={`
                      relative rounded-lg border-2 transition-all text-center
                      ${isMobile ? 'p-2' : 'p-3'}
                      ${inputResources[key] > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <img
                      src={image}
                      alt={label}
                      className={`mx-auto rounded-full object-cover ${isMobile ? 'w-8 h-8 mb-1' : 'w-10 h-10 mb-2'}`}
                      onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/stone_yellow.JPG' }}
                    />
                    <div className={`font-medium text-gray-700 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      {label} (Lv.{level})
                    </div>
                    <div className={`text-gray-500 ${isMobile ? 'text-[9px]' : 'text-xs'}`}>
                      Have: {availableResources[key] + inputResources[key]}
                    </div>
                    {/* Controls */}
                    <div className={`flex items-center justify-center ${isMobile ? 'gap-1 mt-1' : 'gap-2 mt-2'}`}>
                      <motion.button
                        onClick={() => adjustInput(key, -1)}
                        disabled={inputResources[key] <= 0}
                        className={`rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 ${isMobile ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
                        whileTap={{ scale: 0.9 }}
                      >
                        −
                      </motion.button>
                      <span className={`font-bold text-gray-800 ${isMobile ? 'w-5 text-sm' : 'w-6 text-base'}`}>
                        {inputResources[key]}
                      </span>
                      <motion.button
                        onClick={() => adjustInput(key, 1)}
                        disabled={availableResources[key] <= 0}
                        className={`rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 ${isMobile ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
                        whileTap={{ scale: 0.9 }}
                      >
                        +
                      </motion.button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`font-semibold text-gray-700 ${isMobile ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
              Total: {totalInput} crystals
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-2">
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`text-blue-400 ${isMobile ? 'text-2xl' : 'text-4xl'}`}
            >
              ↓
            </motion.div>
          </div>

          {/* Output Section */}
          <div className={`bg-green-50 rounded-lg ${isMobile ? 'p-2 mb-3' : 'p-4 mb-4'}`}>
            <h3 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm mb-2' : 'text-lg mb-3'}`}>
              Output Crystals (You receive)
            </h3>
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-4 gap-3'}`}>
              {crystalTypes.map(({ key, label, level, image }) => (
                <div
                  key={key}
                  className={`
                    relative rounded-lg border-2 transition-all text-center
                    ${isMobile ? 'p-2' : 'p-3'}
                    ${outputResources[key] > 0 ? 'border-green-500 bg-green-100' : 'border-gray-200 bg-white'}
                  `}
                >
                  <img
                    src={image}
                    alt={label}
                    className={`mx-auto rounded-full object-cover ${isMobile ? 'w-8 h-8 mb-1' : 'w-10 h-10 mb-2'}`}
                    onError={(e) => { e.target.src = 'https://statics.vietky.io.vn/images/stone_yellow.JPG' }}
                  />
                  <div className={`font-medium text-gray-700 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                    {label} (Lv.{level})
                  </div>
                  {/* Controls */}
                  <div className={`flex items-center justify-center ${isMobile ? 'gap-1 mt-1' : 'gap-2 mt-2'}`}>
                    <motion.button
                      onClick={() => adjustOutput(key, -1)}
                      disabled={outputResources[key] <= 0}
                      className={`rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 ${isMobile ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      −
                    </motion.button>
                    <span className={`font-bold text-gray-800 ${isMobile ? 'w-5 text-sm' : 'w-6 text-base'}`}>
                      {outputResources[key]}
                    </span>
                    <motion.button
                      onClick={() => adjustOutput(key, 1)}
                      disabled={totalOutput >= totalInput || totalInput === 0}
                      className={`rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 ${isMobile ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
            <div className={`font-semibold text-gray-700 ${isMobile ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
              Total: {totalOutput} crystals
              {totalInput > 0 && totalInput === totalOutput && (
                <span className="text-green-600 ml-2">
                  (⬆️ +{outputResources.yellow * 1 + outputResources.green * 2 + outputResources.blue * 3 + outputResources.pink * 4 -
                    (inputResources.yellow * 1 + inputResources.green * 2 + inputResources.blue * 3 + inputResources.pink * 4)} levels)
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`bg-red-50 border border-red-300 text-red-700 rounded-lg ${isMobile ? 'px-2 py-1.5 mb-3 text-xs' : 'px-4 py-2 mb-4 text-sm'}`}>
              ⚠️ {error}
            </div>
          )}
          {!error && totalInput > 0 && (
            <div className={`bg-green-50 border border-green-300 text-green-700 rounded-lg ${isMobile ? 'px-2 py-1.5 mb-3 text-xs' : 'px-4 py-2 mb-4 text-sm'}`}>
              ✅ You can upgrade now
            </div>
          )}
          {!error && totalInput === 0 && (
            <div className={`bg-red-50 border border-red-300 text-red-700 rounded-lg ${isMobile ? 'px-2 py-1.5 mb-3 text-xs' : 'px-4 py-2 mb-4 text-sm'}`}>
              ❌ No crystals to upgrade
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
                flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold 
                rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl
                ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'}
              `}
              whileHover={canConfirm ? { scale: 1.02 } : {}}
              whileTap={canConfirm ? { scale: 0.95 } : {}}
            >
              {isMobile ? 'Confirm Upgrade' : 'Confirm Upgrade'}
            </motion.button>
          </div>
        </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UpgradeModal;
