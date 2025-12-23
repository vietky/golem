import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useOrientation from "../hooks/useOrientation";

const RoomLobby = ({ sessionId, playerName, playerAvatar, onBack, onGameStart }) => {
  const [lobbyState, setLobbyState] = useState(null);
  const [myPlayerID, setMyPlayerID] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);
  const { isMobile, isTablet, isPortrait } = useOrientation();

  const isMobileLayout = isMobile && isPortrait;
  const isCompactLayout = isMobile || (isTablet && isPortrait);

  useEffect(() => {
    // Connect to WebSocket for lobby
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?session=${sessionId}&name=${encodeURIComponent(
      playerName
    )}&avatar=${playerAvatar}`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("Connected to lobby");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Lobby message:", data);

        switch (data.type) {
          case "lobbyAssigned":
            setMyPlayerID(data.playerID);
            setIsHost(data.isHost || false);
            break;

          case "lobbyState":
            setLobbyState(data);
            break;

          case "gameStarted":
            // Game has started, notify parent
            if (onGameStart) {
              onGameStart(websocket);
            }
            break;

          case "error":
            setError(data.message);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection error");
    };

    websocket.onclose = () => {
      console.log("WebSocket closed");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [sessionId, playerName, playerAvatar]);

  const handleSetSlotAI = (slotIndex, aiType) => {
    if (!isHost || !ws) return;

    ws.send(
      JSON.stringify({
        type: "setSlotAI",
        slotIndex,
        aiType,
      })
    );
  };

  const handleClearSlot = (slotIndex) => {
    if (!isHost || !ws) return;

    ws.send(
      JSON.stringify({
        type: "clearSlot",
        slotIndex,
      })
    );
  };

  const handleStartGame = () => {
    if (!isHost || !ws) return;

    if (!lobbyState?.canStart) {
      setError("Need at least 2 players to start");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "startGame",
      })
    );
  };

  const getSlotContent = (slot) => {
    if (slot.type === "player") {
      return (
        <div className="flex items-center gap-2">
          {slot.playerAvatar && (
            <img
              src={`/images/avatar/${slot.playerAvatar}.webp`}
              alt="Avatar"
              className="w-10 h-10 rounded-full border-2 border-yellow-400"
              onError={(e) => {
                e.target.src = "/images/avatar/1.webp";
              }}
            />
          )}
          <div>
            <div className="text-white font-bold">{slot.playerName}</div>
            {slot.isHost && (
              <span className="text-xs bg-yellow-500/50 text-yellow-200 px-2 py-0.5 rounded">
                Host
              </span>
            )}
          </div>
        </div>
      );
    } else if (slot.type === "ai") {
      return (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-purple-500/30 border-2 border-purple-400 flex items-center justify-center">
            🤖
          </div>
          <div>
            <div className="text-white font-bold">{slot.playerName}</div>
            <span className="text-xs bg-purple-500/50 text-purple-200 px-2 py-0.5 rounded">
              {slot.aiType === "basic" ? "Smart AI" : "Passive AI"}
            </span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-white/40 italic">
          Empty Slot
        </div>
      );
    }
  };

  if (!lobbyState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading lobby...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex items-center justify-center safe-top safe-bottom p-4"
      style={{
        backgroundImage: "url(/images/background.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
      }}
    >
      <motion.div
        className={`backdrop-blur-xl bg-black/70 rounded-2xl border border-white/30 shadow-2xl w-full max-w-4xl ${
          isMobileLayout ? "p-4" : "p-8"
        }`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Game Lobby</h1>
            <p className="text-white/60 text-sm">Room: {sessionId}</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30 transition-all"
          >
            Leave
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4"
          >
            <p className="text-red-200">{error}</p>
          </motion.div>
        )}

        {/* Slots */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {lobbyState.slots?.map((slot) => (
              <motion.div
                key={slot.index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-black/40 backdrop-blur-sm border rounded-lg p-4 shadow-lg ${
                  slot.playerID === myPlayerID
                    ? "border-yellow-400 bg-yellow-500/20"
                    : "border-white/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">{getSlotContent(slot)}</div>

                  {/* Actions (only for host) */}
                  {isHost && !slot.isHost && (
                    <div className="flex gap-2">
                      {slot.type === "empty" && (
                        <>
                          <button
                            onClick={() => handleSetSlotAI(slot.index, "basic")}
                            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-all text-sm"
                          >
                            Add Smart AI
                          </button>
                          <button
                            onClick={() => handleSetSlotAI(slot.index, "rest")}
                            className="px-3 py-1 bg-purple-400 text-white rounded hover:bg-purple-500 transition-all text-sm"
                          >
                            Add Passive AI
                          </button>
                        </>
                      )}
                      {slot.type === "ai" && (
                        <button
                          onClick={() => handleClearSlot(slot.index)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all text-sm"
                        >
                          Remove AI
                        </button>
                      )}
                      {slot.type === "player" && slot.playerID !== myPlayerID && (
                        <button
                          onClick={() => handleClearSlot(slot.index)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all text-sm"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Info and Actions */}
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
          <p className="text-white text-sm font-medium">
            {lobbyState.canStart
              ? isHost
                ? "Ready to start! Click the button below when everyone is ready."
                : "Waiting for host to start the game..."
              : "Need at least 2 players to start the game"}
          </p>
        </div>

        {/* Start Button (only for host) */}
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!lobbyState.canStart}
            className={`w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg
              transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${lobbyState.canStart ? "hover:from-green-600 hover:to-emerald-600" : ""}`}
          >
            {lobbyState.canStart ? "Start Game" : "Waiting for Players..."}
          </button>
        )}

        {!isHost && (
          <div className="w-full py-3 bg-black/40 backdrop-blur-sm text-white/80 text-center font-bold rounded-lg border border-white/20">
            Waiting for host to start...
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RoomLobby;
