import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createLogger } from '../utils/logger';
import useOrientation from "../hooks/useOrientation";

const logger = createLogger('WaitingRoom');

const WaitingRoom = ({ 
  sessionId, 
  hostName, 
  numPlayers, 
  connectedPlayers, 
  players, 
  onLeave 
}) => {
  const [copied, setCopied] = useState(false);
  const { isMobile, isTablet, isPortrait } = useOrientation();

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMobileLayout = isMobile && isPortrait;
  const isCompactLayout = isMobile || (isTablet && isPortrait);

  return (
    <div
      className={`
        min-h-screen min-h-[100dvh] flex items-center justify-center safe-top safe-bottom
        ${isMobileLayout ? "p-2" : isCompactLayout ? "p-3" : "p-4 md:p-6"}
      `}
      style={{
        backgroundImage: "url(/images/background.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
      }}
    >
      <motion.div
        className={`
          backdrop-blur-md w-full overflow-hidden
          ${
            isMobileLayout
              ? "bg-black/40 rounded-xl p-4 max-w-[340px] border border-white/10"
              : isCompactLayout
              ? "bg-white/10 rounded-xl p-6 max-w-md border border-white/20"
              : "bg-white/10 rounded-2xl p-8 max-w-2xl border border-white/20"
          }
        `}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Title */}
        <h1
          className={`
          font-bold text-white text-center mb-6
          ${isMobileLayout ? "text-xl" : isCompactLayout ? "text-2xl" : "text-3xl md:text-4xl"}
        `}
        >
          Waiting Room
        </h1>

        {/* Game Info */}
        <div className="bg-white/10 rounded-lg p-4 mb-6 space-y-3">
          <div>
            <h2 className="text-white/60 text-sm mb-1">Game ID</h2>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={sessionId}
                readOnly
                className="flex-1 px-3 py-2 rounded bg-white/20 text-white text-sm font-mono border border-white/30"
              />
              <button
                onClick={copySessionId}
                className={`
                  px-4 py-2 rounded font-semibold transition-all text-sm
                  ${copied 
                    ? "bg-green-500 text-white" 
                    : "bg-blue-500 text-white hover:bg-blue-600"
                  }
                `}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <h2 className="text-white/60 text-sm mb-1">Host</h2>
              <p className="text-white font-semibold">{hostName || "Unknown"}</p>
            </div>
            <div>
              <h2 className="text-white/60 text-sm mb-1">Players</h2>
              <p className="text-white font-semibold">
                {connectedPlayers}/{numPlayers}
              </p>
            </div>
          </div>
        </div>

        {/* Player List */}
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-3 text-lg">
            Players ({connectedPlayers}/{numPlayers})
          </h2>
          <div className="space-y-2">
            {Array.from({ length: numPlayers }).map((_, idx) => {
              const player = players?.[idx];
              const isConnected = !!player;

              return (
                <motion.div
                  key={idx}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    ${isConnected 
                      ? "bg-green-500/20 border border-green-500/50" 
                      : "bg-white/10 border border-white/30 border-dashed"
                    }
                  `}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                      ${isConnected ? "bg-green-500" : "bg-white/20"}
                    `}
                  >
                    {isConnected ? (
                      player.avatar ? (
                        <img
                          src={`/images/avatar/${player.avatar}.webp`}
                          alt={`Avatar ${player.avatar}`}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.target.src = "/images/avatar/1.webp";
                          }}
                        />
                      ) : (
                        idx + 1
                      )
                    ) : (
                      "?"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {isConnected ? player.name : `Waiting for player ${idx + 1}...`}
                    </p>
                    <p className="text-white/60 text-xs">
                      {isConnected ? "✓ Connected" : "⏳ Not joined yet"}
                    </p>
                  </div>
                  {isConnected && (
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Waiting Message */}
        <motion.div
          className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6 text-center"
          animate={{
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <p className="text-blue-200 text-sm">
            {connectedPlayers >= numPlayers 
              ? "🎮 All players connected! Starting game..."
              : `⏳ Waiting for ${numPlayers - connectedPlayers} more player${numPlayers - connectedPlayers > 1 ? 's' : ''}...`
            }
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={copySessionId}
            className="flex-1 px-4 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all font-semibold"
          >
            📋 Share Game ID
          </button>
          {onLeave && (
            <button
              onClick={onLeave}
              className="px-4 py-3 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-all font-semibold"
            >
              Leave
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="text-white/60 text-xs text-center">
            💡 Share the Game ID with friends to invite them to join
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default WaitingRoom;
