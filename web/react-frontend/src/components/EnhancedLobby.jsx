import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createLogger } from '../utils/logger';
import useOrientation from "../hooks/useOrientation";
import { apiFetch } from "../utils/api";

const logger = createLogger('EnhancedLobby');

// Generate a random player name
const generatePlayerName = () => {
  const adjectives = ["Swift", "Bold", "Clever", "Brave", "Wise", "Noble", "Mighty", "Bright", "Fierce", "Calm"];
  const nouns = ["Golem", "Warrior", "Mage", "Explorer", "Guardian", "Seeker", "Champion", "Hero", "Sage", "Knight"];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdjective} ${randomNoun} ${randomNum}`;
};

// Load player name from localStorage or generate a new one
const getInitialPlayerName = () => {
  const cachedName = localStorage.getItem("playerName");
  if (cachedName) {
    return cachedName;
  }
  const newName = generatePlayerName();
  localStorage.setItem("playerName", newName);
  return newName;
};

const EnhancedLobby = ({ onJoinGame }) => {
  const [playerName, setPlayerName] = useState(getInitialPlayerName);
  const [selectedAvatar, setSelectedAvatar] = useState("4");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const { isMobile, isTablet, isPortrait } = useOrientation();

  // Create game form state
  const [gameName, setGameName] = useState("");
  const [numPlayers, setNumPlayers] = useState(2);
  const [turnTimeout, setTurnTimeout] = useState(60);
  const [aiPlayers, setAiPlayers] = useState(Array(5).fill(""));
  const [sessionInfo, setSessionInfo] = useState(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Cache playerName to localStorage whenever it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem("playerName", playerName);
    }
  }, [playerName]);

  // Fetch available rooms with filters
  const fetchRooms = useCallback(async () => {
    try {
      let url = "/api/list";
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await apiFetch(url);
      const data = await response.json();
      if (response.ok) {
        setRooms(data.sessions || []);
      }
    } catch (error) {
      logger.error("Error fetching rooms:", error);
    }
  }, [searchQuery, statusFilter]);

  // Auto-refresh rooms list every 10 seconds
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Update countdown timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room.timeUntilDelete > 0 && room.connectedPlayers === 0) {
            return { ...room, timeUntilDelete: Math.max(0, room.timeUntilDelete - 1) };
          }
          return room;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const createGame = async () => {
    setLoading(true);
    try {
      // Filter out empty AI slots
      const filteredAiPlayers = aiPlayers.slice(0, numPlayers);
      
      const response = await apiFetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numPlayers,
          seed: Date.now(),
          gameName: gameName || undefined,
          turnTimeout: turnTimeout || 60,
          aiPlayers: filteredAiPlayers,
          hostName: playerName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSessionInfo(data.sessionID);
        setTimeout(() => {
          fetchRooms();
          // Auto-join the created game
          joinGame(data.sessionID, false);
        }, 500);
      }
    } catch (error) {
      logger.error("Error creating game:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = (sessionId, asSpectator = false) => {
    if (sessionId) {
      onJoinGame(sessionId, playerName, selectedAvatar, asSpectator);
    }
  };

  const copySessionId = (sessionId) => {
    navigator.clipboard.writeText(sessionId);
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Responsive layout helpers
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
              ? "bg-black/40 rounded-xl p-3 max-w-[340px] border border-white/10"
              : isCompactLayout
              ? "bg-white/10 rounded-xl p-4 max-w-md border border-white/20"
              : "bg-white/10 rounded-2xl p-6 sm:p-8 max-w-6xl border border-white/20"
          }
        `}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Title */}
        <h1
          className={`
          font-bold text-white text-center
          ${isMobileLayout ? "text-lg mb-3" : isCompactLayout ? "text-xl mb-4" : "text-2xl sm:text-3xl md:text-4xl mb-6 md:mb-8"}
        `}
        >
          {isMobileLayout ? "Golem Edition" : "Century: Golem Edition"}
        </h1>

        {/* Player Info Section - Always visible */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Player Name */}
            <div>
              <label className="block text-white mb-1.5 text-sm sm:text-base font-semibold">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className={`
                  w-full rounded-lg bg-white/20 border border-white/30 
                  text-white placeholder-white/50
                  ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                `}
                placeholder="Enter your name"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-white mb-1.5 text-sm sm:text-base font-semibold">Choose Character</label>
              <div className="flex gap-2 sm:gap-3">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedAvatar(num.toString())}
                    className={`
                      rounded-full border-2 overflow-hidden transition-all touch-target
                      ${isMobileLayout ? "w-12 h-12" : "w-14 h-14 sm:w-16 sm:h-16"}
                      ${
                        selectedAvatar === num.toString()
                          ? "border-yellow-400 ring-2 ring-yellow-400 scale-110"
                          : "border-white/30 hover:border-white/50"
                      }
                    `}
                  >
                    <img
                      src={`/images/avatar/${num}.webp`}
                      alt={`Avatar ${num}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/images/avatar/1.webp";
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-white/20">
          <button
            onClick={() => setActiveTab("browse")}
            className={`
              px-3 sm:px-6 py-2 font-bold transition-all
              ${isMobileLayout ? "text-sm flex-1" : ""}
              ${activeTab === "browse" ? "text-white border-b-2 border-blue-400" : "text-white/60 hover:text-white"}
            `}
          >
            Browse Games ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`
              px-3 sm:px-6 py-2 font-bold transition-all
              ${isMobileLayout ? "text-sm flex-1" : ""}
              ${activeTab === "create" ? "text-white border-b-2 border-purple-400" : "text-white/60 hover:text-white"}
            `}
          >
            Create Game
          </button>
        </div>

        {/* Browse Games Tab */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`
                    w-full rounded-lg bg-white/20 border border-white/30 
                    text-white placeholder-white/50
                    ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                  `}
                  placeholder="🔍 Search games, hosts, players..."
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`
                    w-full rounded-lg bg-white/20 border border-white/30 text-white
                    ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                  `}
                >
                  <option value="all">All Games</option>
                  <option value="waiting">Waiting for Players</option>
                  <option value="playing">In Progress</option>
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-between items-center">
              <p className="text-white/60 text-xs sm:text-sm">
                Auto-refreshes every 10 seconds
              </p>
              <button
                onClick={fetchRooms}
                className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all text-xs sm:text-sm"
              >
                🔄 Refresh Now
              </button>
            </div>

            {/* Games List */}
            {rooms.length === 0 ? (
              <div className="bg-white/10 rounded-lg p-8 text-center">
                <p className="text-white/60 text-sm sm:text-base mb-2">No games available</p>
                <p className="text-white/40 text-xs sm:text-sm">Create a new game to get started!</p>
              </div>
            ) : (
              <div className={`space-y-3 overflow-y-auto ${isMobileLayout ? "max-h-[50vh]" : "max-h-[60vh]"}`}>
                <AnimatePresence>
                  {rooms.map((room) => {
                    const timeUntilDelete = room.timeUntilDelete || 0;
                    const minutes = Math.floor(timeUntilDelete / 60);
                    const seconds = timeUntilDelete % 60;
                    const isExpiringSoon = timeUntilDelete > 0 && timeUntilDelete < 60;
                    const isFull = room.connectedPlayers >= room.numPlayers;
                    const isWaiting = room.status === "waiting";

                    return (
                      <motion.div
                        key={room.sessionID}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`
                          bg-white/10 border rounded-lg p-4 
                          hover:bg-white/15 transition-all
                          ${isExpiringSoon ? "border-red-500/50 bg-red-500/10" : "border-white/20"}
                        `}
                      >
                        {/* Game Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-sm sm:text-base truncate mb-1">
                              {room.sessionID}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-white/60">
                                🎮 Host: <span className="text-white">{room.host || "Unknown"}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {isWaiting ? (
                              <span className="bg-yellow-500/30 text-yellow-200 text-xs px-2 py-1 rounded font-semibold">
                                Waiting
                              </span>
                            ) : (
                              <span className="bg-green-500/30 text-green-200 text-xs px-2 py-1 rounded font-semibold">
                                Playing
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Game Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="bg-white/10 rounded p-2">
                            <div className="text-white/60 mb-1">Players</div>
                            <div className="text-white font-bold">
                              {room.connectedPlayers}/{room.numPlayers}
                              {isFull && " 🔒"}
                            </div>
                          </div>
                          <div className="bg-white/10 rounded p-2">
                            <div className="text-white/60 mb-1">Spectators</div>
                            <div className="text-white font-bold">
                              👁️ {room.spectatorCount || 0}
                            </div>
                          </div>
                          <div className="bg-white/10 rounded p-2 col-span-2">
                            <div className="text-white/60 mb-1">Created</div>
                            <div className="text-white font-bold">
                              {formatTimeAgo(room.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Player List */}
                        {room.players && room.players.length > 0 && (
                          <div className="mb-3">
                            <p className="text-white/60 text-xs mb-1">Players:</p>
                            <p className="text-white text-xs truncate">
                              {room.players.join(", ")}
                            </p>
                          </div>
                        )}

                        {/* Expiry Warning */}
                        {timeUntilDelete > 0 && room.connectedPlayers === 0 && (
                          <motion.div
                            className={`
                              text-xs px-2 py-1 rounded font-bold mb-3
                              ${
                                isExpiringSoon
                                  ? "bg-red-500/50 text-red-200"
                                  : "bg-orange-500/30 text-orange-300"
                              }
                            `}
                            animate={
                              isExpiringSoon
                                ? {
                                    opacity: [1, 0.7, 1],
                                  }
                                : {}
                            }
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            ⏱️ Deleting in {minutes}:{String(seconds).padStart(2, "0")}
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => copySessionId(room.sessionID)}
                            className="flex-1 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all text-xs sm:text-sm font-semibold"
                            title="Copy Session ID"
                          >
                            📋 Copy ID
                          </button>
                          <button
                            onClick={() => joinGame(room.sessionID, true)}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all text-xs sm:text-sm font-semibold px-3 py-2"
                            title="Watch as spectator"
                          >
                            👁️ Spectate
                          </button>
                          <button
                            onClick={() => joinGame(room.sessionID, false)}
                            disabled={isFull}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-xs sm:text-sm font-semibold px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isFull ? "🔒 Full" : "▶️ Join"}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Manual Join */}
            <div className="pt-4 border-t border-white/20">
              <label className="block text-white mb-2 text-sm font-semibold">Join by Game ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste game ID here"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && e.target.value) {
                      joinGame(e.target.value);
                    }
                  }}
                  className={`
                    flex-1 rounded-lg bg-white/20 border border-white/30 
                    text-white placeholder-white/50
                    ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                  `}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.previousElementSibling;
                    if (input.value) {
                      joinGame(input.value);
                    }
                  }}
                  className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-semibold text-sm"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Game Tab */}
        {activeTab === "create" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Game Name */}
              <div className="md:col-span-2">
                <label className="block text-white mb-2 text-sm font-semibold">Game Name</label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className={`
                    w-full rounded-lg bg-white/20 border border-white/30 
                    text-white placeholder-white/50
                    ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                  `}
                  placeholder="My Awesome Game (optional)"
                />
              </div>

              {/* Number of Players */}
              <div>
                <label className="block text-white mb-2 text-sm font-semibold">Total Players</label>
                <select
                  value={numPlayers}
                  onChange={(e) => {
                    const newNum = parseInt(e.target.value);
                    setNumPlayers(newNum);
                    // Reset AI players when changing number
                    setAiPlayers(Array(5).fill(""));
                  }}
                  className={`
                    w-full rounded-lg bg-white/20 border border-white/30 text-white
                    ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                  `}
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={5}>5 Players</option>
                </select>
              </div>

              {/* Turn Timeout */}
              <div>
                <label className="block text-white mb-2 text-sm font-semibold">Max Time Per Turn</label>
                <select
                  value={turnTimeout}
                  onChange={(e) => setTurnTimeout(parseInt(e.target.value))}
                  className={`
                    w-full rounded-lg bg-white/20 border border-white/30 text-white
                    ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                  `}
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>2 minutes</option>
                  <option value={180}>3 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            </div>

            {/* AI/Human Player Configuration */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">
                Configure Players (You are Player 1)
              </h3>
              <div className="space-y-2">
                {Array.from({ length: numPlayers }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-white text-sm w-20 flex-shrink-0">
                      Player {idx + 1}:
                    </span>
                    {idx === 0 ? (
                      <span className="text-green-300 text-sm font-semibold">
                        You ({playerName})
                      </span>
                    ) : (
                      <select
                        value={aiPlayers[idx] || ""}
                        onChange={(e) => {
                          const newAiPlayers = [...aiPlayers];
                          newAiPlayers[idx] = e.target.value;
                          setAiPlayers(newAiPlayers);
                        }}
                        className={`
                          flex-1 rounded-lg bg-white/20 border border-white/30 text-white
                          ${isMobileLayout ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"}
                        `}
                      >
                        <option value="">Human Player</option>
                        <option value="basic">AI (Basic)</option>
                        <option value="rest">AI (Rest Only)</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={createGame}
              disabled={loading}
              className={`
                w-full bg-gradient-to-r from-purple-500 to-pink-500 
                text-white font-bold rounded-lg 
                hover:from-purple-600 hover:to-pink-600 
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${isMobileLayout ? "py-3 text-sm" : "py-4 text-base"}
              `}
            >
              {loading ? "Creating Game..." : "🎮 Create Game & Join"}
            </button>

            {/* Session Info */}
            {sessionInfo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/20 border border-green-500 rounded-lg p-4"
              >
                <p className="text-white text-sm font-bold mb-2">✅ Game Created Successfully!</p>
                <p className="text-white/80 text-xs mb-2">Game ID:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sessionInfo}
                    readOnly
                    className="flex-1 px-3 py-2 rounded bg-white/20 text-white text-sm font-mono"
                  />
                  <button
                    onClick={() => copySessionId(sessionInfo)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-all text-sm font-semibold"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-white/60 text-xs mt-2">
                  Joining game...
                </p>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EnhancedLobby;
