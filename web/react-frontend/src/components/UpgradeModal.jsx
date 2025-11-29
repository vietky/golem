import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CrystalIcon from "./CrystalIcon";

const UpgradeModal = ({ card, playerResources, onConfirm, onCancel, maxTurnUpgrade }) => {
  const [inputResources, setInputResources] = useState({ yellow: 0, green: 0, blue: 0, pink: 0 });
  const [outputResources, setOutputResources] = useState({ yellow: 0, green: 0, blue: 0, pink: 0 });
  const [error, setError] = useState("");

  // Calculate available resources (what player has minus what they've selected as input)
  const availableResources = {
    yellow: (playerResources?.yellow || 0) - inputResources.yellow,
    green: (playerResources?.green || 0) - inputResources.green,
    blue: (playerResources?.blue || 0) - inputResources.blue,
    pink: (playerResources?.pink || 0) - inputResources.pink,
  };

  // Calculate total input and output
  const totalInput = inputResources.yellow + inputResources.green + inputResources.blue + inputResources.pink;
  const totalOutput = outputResources.yellow + outputResources.green + outputResources.blue + outputResources.pink;

  // Validate upgrade and return error message (empty string if valid)
  const getValidationError = () => {
    if (totalInput === 0) {
      return "Please select crystals to upgrade";
    }

    if (totalInput !== totalOutput) {
      return "Input and output crystal counts must be equal";
    }

    // Calculate levels
    const inputLevel = inputResources.yellow * 1 + inputResources.green * 2 + inputResources.blue * 3 + inputResources.pink * 4;
    const outputLevel =
      outputResources.yellow * 1 + outputResources.green * 2 + outputResources.blue * 3 + outputResources.pink * 4;

    const levelDiff = outputLevel - inputLevel;

    if (levelDiff <= 0) {
      return "Output crystals must have higher level than input crystals";
    }

    if (levelDiff > maxTurnUpgrade) {
      return `Can only upgrade up to ${maxTurnUpgrade} levels`;
    }

    // Check if upgrade is valid (can't downgrade colors)
    const before = [inputResources.yellow, inputResources.green, inputResources.blue, inputResources.pink];
    const after = [outputResources.yellow, outputResources.green, outputResources.blue, outputResources.pink];

    let aidx = 0;
    for (let bidx = 0; bidx < before.length; bidx++) {
      let stones = before[bidx];
      while (stones > 0) {
        while (aidx < after.length && after[aidx] === 0) {
          aidx++;
        }
        if (aidx >= after.length || aidx < bidx) {
          return "Cannot upgrade in this way";
        }
        stones--;
        after[aidx]--;
      }
    }
    while (aidx < after.length && after[aidx] === 0) {
      aidx++;
    }
    if (aidx < after.length) {
      return "Cannot upgrade in this way";
    }

    return "";
  };

  // Validate upgrade (for button click)
  const validateUpgrade = () => {
    const validationError = getValidationError();
    setError(validationError);
    return validationError === "";
  };

  const handleConfirm = () => {
    if (validateUpgrade()) {
      onConfirm(inputResources, outputResources);
    }
  };

  const adjustInput = (color, delta) => {
    setInputResources((prev) => {
      const current = prev[color] || 0;
      const available = playerResources?.[color] || 0;
      const newVal = current + delta;

      // Clamp between 0 and available
      if (newVal < 0) return prev;
      if (newVal > available) return prev;

      return { ...prev, [color]: newVal };
    });
  };

  const adjustOutput = (color, delta) => {
    setOutputResources((prev) => {
      const current = prev[color] || 0;
      const currentTotal = prev.yellow + prev.green + prev.blue + prev.pink;
      const newVal = current + delta;

      // Don't allow negative or exceed total input
      if (newVal < 0) return prev;
      const newTotal = currentTotal - current + newVal;
      if (newTotal > totalInput) return prev;

      return { ...prev, [color]: newVal };
    });
  };

  // Reset output when input changes to 0
  useEffect(() => {
    if (totalInput === 0) {
      setOutputResources({ yellow: 0, green: 0, blue: 0, pink: 0 });
      setError("");
    }
  }, [totalInput]);

  // Validate in real-time whenever resources change
  useEffect(() => {
    const validationError = getValidationError();
    setError(validationError);
  }, [inputResources, outputResources, totalInput, totalOutput, maxTurnUpgrade]);

  const crystalColors = [
    { key: "yellow", name: "Yellow", level: 1 },
    { key: "green", name: "Green", level: 2 },
    { key: "blue", name: "Blue", level: 3 },
    { key: "pink", name: "Pink", level: 4 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">💎 Upgrade Crystals</h2>
            <p className="text-sm text-gray-600">
              Select crystals to upgrade and receive (max {maxTurnUpgrade} levels per turn)
            </p>
          </div>

          {/* Input Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Input Crystals (Crystals you have)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
              {crystalColors.map(({ key, name, level }) => (
                <div key={key} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 flex flex-col">
                  {/* Header - Fixed height */}
                  <div className="flex items-center gap-2 mb-3 h-10">
                    <CrystalIcon color={key} count={0} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm leading-tight truncate">{name}</div>
                      <div className="text-xs text-gray-500 leading-tight">Level {level}</div>
                    </div>
                  </div>
                  
                  {/* Spacer */}
                  <div className="flex-1" />
                  
                  {/* Info - Fixed height */}
                  <div className="text-xs text-gray-600 mb-3 text-center h-4 leading-4">
                    Have: <span className="font-semibold">{availableResources[key] + inputResources[key]}</span>
                  </div>
                  
                  {/* Controls - Fixed height */}
                  <div className="flex items-center justify-center gap-2 h-8">
                    <button
                      onClick={() => adjustInput(key, -1)}
                      disabled={inputResources[key] <= 0}
                      className="w-8 h-8 rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 transition-all flex items-center justify-center text-lg shrink-0"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-gray-800 text-xl leading-none">{inputResources[key]}</span>
                    <button
                      onClick={() => adjustInput(key, 1)}
                      disabled={availableResources[key] <= 0}
                      className="w-8 h-8 rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-all flex items-center justify-center text-lg shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-700">Total: {totalInput} crystals</div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-3">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-5xl text-blue-400"
            >
              ↓
            </motion.div>
          </div>

          {/* Output Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Output Crystals (Crystals you want to receive)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
              {crystalColors.map(({ key, name, level }) => (
                <div key={key} className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 flex flex-col">
                  {/* Header - Fixed height (same as Input) */}
                  <div className="flex items-center gap-2 mb-3 h-10">
                    <CrystalIcon color={key} count={0} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm leading-tight truncate">{name}</div>
                      <div className="text-xs text-gray-500 leading-tight">Level {level}</div>
                    </div>
                  </div>
                  
                  {/* Spacer */}
                  <div className="flex-1" />
                  
                  {/* Info - placeholder to match input height */}
                  <div className="text-xs text-gray-600 mb-3 text-center h-4 leading-4 opacity-0 pointer-events-none select-none" aria-hidden="true">
                    Placeholder
                  </div>
                  
                  {/* Controls - Fixed height (same as Input) */}
                  <div className="flex items-center justify-center gap-2 h-8">
                    <button
                      onClick={() => adjustOutput(key, -1)}
                      disabled={outputResources[key] <= 0}
                      className="w-8 h-8 rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 transition-all flex items-center justify-center text-lg shrink-0"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-gray-800 text-xl leading-none">{outputResources[key]}</span>
                    <button
                      onClick={() => adjustOutput(key, 1)}
                      disabled={totalOutput >= totalInput || totalInput === 0}
                      className="w-8 h-8 rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition-all flex items-center justify-center text-lg shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-700">Total: {totalOutput} crystals</div>
            {totalInput > 0 && totalInput === totalOutput && (
              <div className="mt-2 text-sm text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg inline-block">
                ⬆️ Upgrade: +
                {outputResources.yellow * 1 +
                  outputResources.green * 2 +
                  outputResources.blue * 3 +
                  outputResources.pink * 4 -
                  (inputResources.yellow * 1 +
                    inputResources.green * 2 +
                    inputResources.blue * 3 +
                    inputResources.pink * 4)}{" "}
                levels
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalInput === 0 || totalInput !== totalOutput || error !== ""}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              Confirm Upgrade
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpgradeModal;
