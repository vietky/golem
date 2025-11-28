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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upgrade Crystals - {card?.name || "Upgrade Card"}</h2>
          <p className="text-sm text-gray-600 mb-6">
            Select crystals you want to upgrade and crystals you want to receive (max {maxTurnUpgrade} levels)
          </p>

          {/* Input Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Input Crystals (Crystals you have)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {crystalColors.map(({ key, name, level }) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CrystalIcon color={key} count={0} size="md" />
                      <div>
                        <div className="font-semibold text-gray-700">{name}</div>
                        <div className="text-xs text-gray-500">Level {level}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Have: {availableResources[key] + inputResources[key]}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustInput(key, -1)}
                        disabled={inputResources[key] <= 0}
                        className="w-8 h-8 rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 transition"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-gray-800">{inputResources[key]}</span>
                      <button
                        onClick={() => adjustInput(key, 1)}
                        disabled={availableResources[key] <= 0}
                        className="w-8 h-8 rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">Total: {totalInput} crystals</div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-4">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl text-gray-400"
            >
              ↓
            </motion.div>
          </div>

          {/* Output Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Output Crystals (Crystals you want to receive)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {crystalColors.map(({ key, name, level }) => (
                <div key={key} className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CrystalIcon color={key} count={0} size="md" />
                      <div>
                        <div className="font-semibold text-gray-700">{name}</div>
                        <div className="text-xs text-gray-500">Level {level}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustOutput(key, -1)}
                        disabled={outputResources[key] <= 0}
                        className="w-8 h-8 rounded-full bg-red-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 transition"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-gray-800">{outputResources[key]}</span>
                      <button
                        onClick={() => adjustOutput(key, 1)}
                        disabled={totalOutput >= totalInput || totalInput === 0}
                        className="w-8 h-8 rounded-full bg-green-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">Total: {totalOutput} crystals</div>
            {totalInput > 0 && totalInput === totalOutput && (
              <div className="mt-2 text-sm text-green-600 font-semibold">
                Upgrade: +
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
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalInput === 0 || totalInput !== totalOutput || error !== ""}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition"
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpgradeModal;
