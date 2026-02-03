import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createLogger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import LoginButton from './LoginButton';
import useGameStore from "../store/gameStore";
import useOrientation from "../hooks/useOrientation";
import { apiFetch } from "../utils/api";

const logger = createLogger('Lobby');

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

const Lobby = ({ onJoinGame }) => {
  const { user, isAuthenticated, loading: authLoading, authAvailable } = useAuth();
  const [playerName, setPlayerName] = useState(getInitialPlayerName);
  const [numPlayers, setNumPlayers] = useState(2);
  const [customSessionId, setCustomSessionId] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("4");
  const [sessionInfo, setSessionInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [authError, setAuthError] = useState(null);
  const { isMobile, isTablet, isPortrait, isLandscape } = useOrientation();

  // Auto-populate player name from user profile
  useEffect(() => {
    if (user?.display_name && !playerName) {
      setPlayerName(user.display_name);
    }
  }, [user]);

  // Fetch available rooms
  const fetchRooms = async () => {
    try {
      const response = await apiFetch("/api/list");
      const data = await response.json();
      if (response.ok) {
        setRooms(data.sessions || []);
      }
    } catch (error) {
      logger.error("Error fetching rooms:", error);
    }
  };

  // Cache playerName to localStorage whenever it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem("playerName", playerName);
    }
  }, [playerName]);

  // Auto-refresh rooms list
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 2000);
    return () => clearInterval(interval);
  }, []);

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
    if (authAvailable && !isAuthenticated) {
      setAuthError("Please login to create a game");
      logger.warn("User attempted to create game without authentication");
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const response = await apiFetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          numPlayers,
          seed: Date.now(),
          sessionID: customSessionId || undefined,
          creatorName: playerName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSessionInfo(data.sessionID);
        setTimeout(() => {
          fetchRooms();
          setActiveTab("join");
        }, 500);
      } else if (response.status === 401) {
        setAuthError("Authentication required. Please login to create a game.");
        logger.warn("Authentication required for game creation");
      } else {
        logger.error("Error creating game:", data);
      }
    } catch (error) {
      logger.error("Error creating game:", error);
      setAuthError("Failed to create game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const joinGame = (sessionId, asSpectator = false) => {
    if (authAvailable && !asSpectator && !isAuthenticated) {
      setAuthError("Please login to join a game as a player");
      logger.warn("User attempted to join game without authentication");
      return;
    }

    setAuthError(null);
    if (sessionId) {
      // For spectators, use a random name
      const name = asSpectator ? generatePlayerName() : playerName;
      onJoinGame(sessionId, name, selectedAvatar, asSpectator);
    }
  };

  const copySessionId = (sessionId) => {
    navigator.clipboard.writeText(sessionId);
  };

  // Responsive layout helpers
  const isMobileLayout = isMobile && isPortrait;
  const isCompactLayout = isMobile || (isTablet && isPortrait);

  // Debug: log layout mode
  logger.debug("Layout:", { isMobile, isTablet, isPortrait, isMobileLayout, isCompactLayout });

  return (
    <div
      className={`
        min-h-screen min-h-[100dvh] flex items-center justify-center safe-top safe-bottom
        ${isMobileLayout ? "p-2" : isCompactLayout ? "p-3" : "p-4 md:p-6"}
      `}
      style={{
        backgroundImage: "url(/assets/images/background.jpg)",
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
              : "bg-white/10 rounded-2xl p-6 sm:p-8 max-w-4xl border border-white/20"
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

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-white/20">
          <button
            onClick={() => setActiveTab("create")}
            className={`
              px-3 sm:px-6 py-2 font-bold transition-all
              ${isMobileLayout ? "text-sm flex-1" : ""}
              ${activeTab === "create" ? "text-white border-b-2 border-purple-400" : "text-white/60 hover:text-white"}
            `}
          >
            Create Room
          </button>
          <button
            onClick={() => {
              setActiveTab("join");
              fetchRooms();
            }}
            className={`
              px-3 sm:px-6 py-2 font-bold transition-all
              ${isMobileLayout ? "text-sm flex-1" : ""}
              ${activeTab === "join" ? "text-white border-b-2 border-blue-400" : "text-white/60 hover:text-white"}
            `}
          >
            Join ({rooms.length})
          </button>
        </div>

        {/* Content - Single column on mobile, two columns on desktop */}
        <div
          className={`
          ${isMobileLayout || isCompactLayout ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-6"}
        `}
        >
          {/* Auth Status Section */}
          {authLoading ? (
            <div className="col-span-full text-center text-white">
              <p>Loading authentication...</p>
            </div>
          ) : (
            <div className="col-span-full space-y-3">
              {authAvailable && <LoginButton />}
              
              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-white text-sm">
                  {authError}
                </div>
              )}
              
              {authAvailable && !isAuthenticated && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-white text-sm">
                  <p className="font-semibold mb-1">Login Required</p>
                  <p>You need to login to create or join a game as a player. Spectators can view games without logging in.</p>
                </div>
              )}
            </div>
          )}

          {/* Left Column - Player Info (Always visible) */}
          <div className="space-y-4">
            {/* Player Name */}
            <div>
              <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Your Name</label>
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
              <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Choose Your Character</label>
              <div
                className={`
                flex gap-2 sm:gap-4 justify-center
                ${isMobileLayout ? "flex-wrap" : ""}
              `}
              >
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
                      src={`/assets/images/avatar/${num}.webp`}
                      alt={`Avatar ${num}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/assets/images/avatar/1.webp";
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Create Game Section */}
            {activeTab === "create" && (
              <>
                {/* Number of Players */}
                <div>
                  <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Number of Players</label>
                  <select
                    value={numPlayers}
                    onChange={(e) => setNumPlayers(parseInt(e.target.value))}
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

                {/* Custom Session ID */}
                <div>
                  <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Custom Room ID (optional)</label>
                  <input
                    type="text"
                    value={customSessionId}
                    onChange={(e) => setCustomSessionId(e.target.value)}
                    className={`
                      w-full rounded-lg bg-white/20 border border-white/30 
                      text-white placeholder-white/50
                      ${isMobileLayout ? "px-3 py-2 text-sm" : "px-4 py-2.5"}
                    `}
                    placeholder="Leave empty for auto-generated"
                  />
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
                    touch-target
                    ${isMobileLayout ? "py-2.5 text-sm" : "py-3 px-6"}
                  `}
                >
                  {loading ? "Creating..." : "Create Game"}
                </button>

                {/* Session Info */}
                {sessionInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/20 border border-green-500 rounded-lg p-3 sm:p-4"
                  >
                    <p className="text-white text-sm font-bold mb-1.5 sm:mb-2">Game Created!</p>
                    <p className="text-white/80 text-xs mb-2">Share this Room ID:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sessionInfo}
                        readOnly
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-white/20 text-white text-xs sm:text-sm font-mono"
                      />
                      <button
                        onClick={() => copySessionId(sessionInfo)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-all text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Available Rooms (Join tab) */}
          {activeTab === "join" && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`font-bold text-white ${isMobileLayout ? "text-base" : "text-lg sm:text-xl"}`}>
                  Available Rooms
                </h2>
                <button
                  onClick={fetchRooms}
                  className="px-2 sm:px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30 transition-all text-xs sm:text-sm"
                >
                  🔄 Refresh
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="bg-white/10 rounded-lg p-6 sm:p-8 text-center">
                  <p className="text-white/60 text-sm sm:text-base">No rooms available</p>
                  <p className="text-white/40 text-xs sm:text-sm mt-2">Create a new room to get started!</p>
                </div>
              ) : (
                <div
                  className={`
                  space-y-2 sm:space-y-3 overflow-y-auto
                  ${isMobileLayout ? "max-h-[40vh]" : "max-h-[50vh] sm:max-h-96"}
                `}
                >
                  <AnimatePresence>
                    {rooms.map((room) => {
                      const timeUntilDelete = room.timeUntilDelete || 0;
                      const minutes = Math.floor(timeUntilDelete / 60);
                      const seconds = timeUntilDelete % 60;
                      const isExpiringSoon = timeUntilDelete > 0 && timeUntilDelete < 60;

                      return (
                        <motion.div
                          key={room.sessionID}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20, scale: 0.8 }}
                          className={`
                            bg-white/10 border rounded-lg p-3 sm:p-4 
                            hover:bg-white/15 transition-all
                            ${isExpiringSoon ? "border-red-500/50 bg-red-500/10" : "border-white/20"}
                          `}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                <span
                                  className={`
                                  text-white font-bold truncate
                                  ${isMobileLayout ? "text-xs max-w-[120px]" : "text-sm"}
                                `}
                                >
                                  {room.sessionID.length > (isMobileLayout ? 15 : 20)
                                    ? room.sessionID.substring(0, isMobileLayout ? 15 : 20) + "..."
                                    : room.sessionID}
                                </span>
                                <span className="bg-green-500/30 text-green-300 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                                  {room.connectedPlayers}/{room.numPlayers}
                                </span>
                                {room.spectatorCount > 0 && (
                                  <span className="bg-blue-500/30 text-blue-300 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                                    👁️ {room.spectatorCount}
                                  </span>
                                )}
                              </div>

                              {room.players && room.players.length > 0 && (
                                <p className="text-white/60 text-[10px] sm:text-xs truncate">
                                  Players: {room.players.join(", ")}
                                </p>
                              )}

                              {timeUntilDelete > 0 && room.connectedPlayers === 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <motion.span
                                    className={`
                                      text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-bold
                                      ${
                                        isExpiringSoon
                                          ? "bg-red-500/50 text-red-200 animate-pulse"
                                          : "bg-orange-500/30 text-orange-300"
                                      }
                                    `}
                                    animate={
                                      isExpiringSoon
                                        ? {
                                            scale: [1, 1.05, 1],
                                            opacity: [1, 0.7, 1],
                                          }
                                        : {}
                                    }
                                    transition={{ duration: 1, repeat: Infinity }}
                                  >
                                    ⏱️ {minutes}:{String(seconds).padStart(2, "0")}
                                  </motion.span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() => copySessionId(room.sessionID)}
                                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/20 text-white rounded hover:bg-white/30 transition-all text-xs"
                                title="Copy Session ID"
                              >
                                📋
                              </button>
                              <motion.button
                                onClick={() => joinGame(room.sessionID, true)}
                                className={`
                                  bg-gradient-to-r from-purple-500 to-indigo-500 
                                  text-white rounded hover:from-purple-600 hover:to-indigo-600 
                                  transition-all font-bold touch-target
                                  ${isMobileLayout ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"}
                                `}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                title="Watch as spectator"
                              >
                                👁️
                              </motion.button>
                              <motion.button
                                onClick={() => joinGame(room.sessionID, false)}
                                disabled={room.connectedPlayers >= room.numPlayers}
                                className={`
                                  bg-gradient-to-r from-blue-500 to-cyan-500 
                                  text-white rounded hover:from-blue-600 hover:to-cyan-600 
                                  transition-all font-bold touch-target
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  ${isMobileLayout ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
                                `}
                                whileHover={{ scale: room.connectedPlayers >= room.numPlayers ? 1 : 1.03 }}
                                whileTap={{ scale: room.connectedPlayers >= room.numPlayers ? 1 : 0.97 }}
                              >
                                Join
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Manual Join by Session ID */}
              <div className="pt-4 sm:pt-6 border-t border-white/20">
                <label className="block text-white mb-1.5 sm:mb-2 text-sm sm:text-base">Or join by Room ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste room ID here"
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
                    className={`
                      bg-gradient-to-r from-blue-500 to-cyan-500 
                      text-white rounded hover:from-blue-600 hover:to-cyan-600 
                      transition-all font-bold touch-target
                      ${isMobileLayout ? "px-4 py-2 text-sm" : "px-6 py-2.5"}
                    `}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Lobby;
