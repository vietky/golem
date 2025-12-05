import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'

const Lobby = ({ onJoinGame }) => {
  const [playerName, setPlayerName] = useState('Player 1')
  const [numPlayers, setNumPlayers] = useState(2)
  const [customSessionId, setCustomSessionId] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('4')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('create') // 'create' or 'join'

  // Fetch available rooms
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/list')
      const data = await response.json()
      if (response.ok) {
        setRooms(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  // Auto-refresh rooms list
  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 2000) // Refresh every 2 seconds
    return () => clearInterval(interval)
  }, [])

  // Update countdown timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setRooms(prevRooms => 
        prevRooms.map(room => {
          if (room.timeUntilDelete > 0 && room.connectedPlayers === 0) {
            return { ...room, timeUntilDelete: Math.max(0, room.timeUntilDelete - 1) }
          }
          return room
        })
      )
    }, 1000) // Update every second
    return () => clearInterval(timer)
  }, [])

  const createGame = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numPlayers,
          seed: Date.now(),
          sessionID: customSessionId || undefined,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setSessionInfo(data.sessionID)
        // Refresh rooms list
        setTimeout(() => {
          fetchRooms()
          setActiveTab('join')
        }, 500)
      }
    } catch (error) {
      console.error('Error creating game:', error)
    } finally {
      setLoading(false)
    }
  }

  const joinGame = (sessionId) => {
    if (sessionId) {
      onJoinGame(sessionId, playerName, selectedAvatar)
    }
  }

  const copySessionId = (sessionId) => {
    navigator.clipboard.writeText(sessionId)
    // You could add a toast notification here
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundImage: 'url(/images/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <motion.div
        className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl w-full border border-white/20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Century: Golem Edition
        </h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/20">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-2 font-bold transition-all ${
              activeTab === 'create'
                ? 'text-white border-b-2 border-purple-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => {
              setActiveTab('join')
              fetchRooms()
            }}
            className={`px-6 py-2 font-bold transition-all ${
              activeTab === 'join'
                ? 'text-white border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Join Room ({rooms.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Player Info */}
          <div className="space-y-6">
            {/* Player Name */}
            <div>
              <label className="block text-white mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50"
                placeholder="Enter your name"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-white mb-2">Choose Your Character</label>
              <div className="flex gap-4 justify-center">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedAvatar(num.toString())}
                    className={`w-16 h-16 rounded-full border-2 overflow-hidden transition-all ${
                      selectedAvatar === num.toString()
                        ? 'border-yellow-400 ring-2 ring-yellow-400 scale-110'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                  >
                    <img
                      src={`/images/avatar/${num}.webp`}
                      alt={`Avatar ${num}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/images/avatar/1.webp'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Create Game Section */}
            {activeTab === 'create' && (
              <>
                {/* Number of Players */}
                <div>
                  <label className="block text-white mb-2">Number of Players</label>
                  <select
                    value={numPlayers}
                    onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white"
                  >
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                    <option value={5}>5 Players</option>
                  </select>
                </div>

                {/* Custom Session ID */}
                <div>
                  <label className="block text-white mb-2">Custom Session ID (optional)</label>
                  <input
                    type="text"
                    value={customSessionId}
                    onChange={(e) => setCustomSessionId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50"
                    placeholder="Leave empty for auto-generated"
                  />
                </div>

                {/* Create Button */}
                <button
                  onClick={createGame}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Game'}
                </button>

                {/* Session Info */}
                {sessionInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/20 border border-green-500 rounded-lg p-4"
                  >
                    <p className="text-white text-sm mb-2 font-bold">Game Created!</p>
                    <p className="text-white/80 text-xs mb-2">Share this Session ID:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sessionInfo}
                        readOnly
                        className="flex-1 px-3 py-2 rounded bg-white/20 text-white text-sm font-mono"
                      />
                      <button
                        onClick={() => copySessionId(sessionInfo)}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Available Rooms */}
          {activeTab === 'join' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Available Rooms</h2>
                <button
                  onClick={fetchRooms}
                  className="px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30 transition-all text-sm"
                >
                  🔄 Refresh
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="bg-white/10 rounded-lg p-8 text-center">
                  <p className="text-white/60">No rooms available</p>
                  <p className="text-white/40 text-sm mt-2">Create a new room to get started!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {rooms.map((room) => {
                      const timeUntilDelete = room.timeUntilDelete || 0
                      const minutes = Math.floor(timeUntilDelete / 60)
                      const seconds = timeUntilDelete % 60
                      const isExpiringSoon = timeUntilDelete > 0 && timeUntilDelete < 60 // Less than 1 minute
                      
                      return (
                        <motion.div
                          key={room.sessionID}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20, scale: 0.8 }}
                          className={`bg-white/10 border rounded-lg p-4 hover:bg-white/15 transition-all ${
                            isExpiringSoon ? 'border-red-500/50 bg-red-500/10' : 'border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-white font-bold text-sm">
                                  {room.sessionID.length > 20
                                    ? room.sessionID.substring(0, 20) + '...'
                                    : room.sessionID}
                                </span>
                                <span className="bg-green-500/30 text-green-300 text-xs px-2 py-1 rounded">
                                  {room.connectedPlayers}/{room.numPlayers} Players
                                </span>
                                {timeUntilDelete > 0 && room.connectedPlayers === 0 && (
                                  <motion.span
                                    className={`text-xs px-2 py-1 rounded font-bold ${
                                      isExpiringSoon
                                        ? 'bg-red-500/50 text-red-200 animate-pulse'
                                        : 'bg-orange-500/30 text-orange-300'
                                    }`}
                                    animate={isExpiringSoon ? {
                                      scale: [1, 1.1, 1],
                                      opacity: [1, 0.7, 1]
                                    } : {}}
                                    transition={{ duration: 1, repeat: Infinity }}
                                  >
                                    ⏱️ {minutes}:{String(seconds).padStart(2, '0')}
                                  </motion.span>
                                )}
                              </div>
                              {room.players && room.players.length > 0 && (
                                <p className="text-white/60 text-xs">
                                  Players: {room.players.join(', ')}
                                </p>
                              )}
                              {timeUntilDelete > 0 && room.connectedPlayers === 0 && (
                                <p className="text-white/40 text-[10px] mt-1">
                                  Auto-delete in {minutes}m {seconds}s
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => copySessionId(room.sessionID)}
                                className="px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30 transition-all text-xs"
                                title="Copy Session ID"
                              >
                                📋
                              </button>
                              <motion.button
                                onClick={() => joinGame(room.sessionID)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-bold"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Join
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Manual Join by Session ID */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <label className="block text-white mb-2">Or join by Session ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste session ID here"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        joinGame(e.target.value)
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50"
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousElementSibling
                      if (input.value) {
                        joinGame(input.value)
                      }
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded hover:from-blue-600 hover:to-cyan-600 transition-all font-bold"
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
  )
}

export default Lobby
