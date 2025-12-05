import React, { useState } from 'react'
import { motion } from 'framer-motion'

const SinglePlayerLobby = ({ onStartGame }) => {
  const [playerName, setPlayerName] = useState('Player 1')
  const [numAI, setNumAI] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState('4')
  const [loading, setLoading] = useState(false)

  const avatars = ['1', '2', '3', '4', '5', '6', '7', '8']
  const difficulties = [
    { value: 1, label: '1 AI Opponent (2 Players)' },
    { value: 2, label: '2 AI Opponents (3 Players)' },
    { value: 3, label: '3 AI Opponents (4 Players)' },
  ]

  const startGame = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numAI,
          seed: Date.now(),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        // Join the created single-player game
        onStartGame(data.sessionID, playerName, selectedAvatar)
      } else {
        console.error('Failed to create single-player game:', data.error)
        alert('Failed to create game: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating single-player game:', error)
      alert('Error creating game: ' + error.message)
    } finally {
      setLoading(false)
    }
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
        className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full border border-white/20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          Century: Golem Edition
        </h1>
        <h2 className="text-xl text-white/80 text-center mb-8">
          Single Player Mode
        </h2>

        <div className="space-y-6">
          {/* Player Name */}
          <div>
            <label className="block text-white mb-2 font-semibold">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Enter your name"
            />
          </div>

          {/* Number of AI Opponents */}
          <div>
            <label className="block text-white mb-2 font-semibold">Number of AI Opponents</label>
            <div className="space-y-2">
              {difficulties.map((diff) => (
                <label
                  key={diff.value}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                    numAI === diff.value
                      ? 'bg-purple-500/40 border-2 border-purple-400'
                      : 'bg-white/10 border-2 border-white/20 hover:bg-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="numAI"
                    value={diff.value}
                    checked={numAI === diff.value}
                    onChange={(e) => setNumAI(parseInt(e.target.value))}
                    className="mr-3"
                  />
                  <span className="text-white font-medium">{diff.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-white mb-2 font-semibold">Choose Your Avatar</label>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {avatars.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative aspect-square rounded-lg overflow-hidden transition-all transform hover:scale-105 ${
                    selectedAvatar === avatar
                      ? 'ring-4 ring-purple-400 scale-105'
                      : 'ring-2 ring-white/30'
                  }`}
                >
                  <img
                    src={`/images/avatar/${avatar}.png`}
                    alt={`Avatar ${avatar}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-2xl">${avatar}</div>`
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={loading || !playerName.trim()}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              loading || !playerName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
            } text-white shadow-lg`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Creating Game...
              </div>
            ) : (
              'Start Single Player Game'
            )}
          </button>

          {/* Info Text */}
          <div className="text-center text-white/70 text-sm mt-4">
            <p>Play against AI opponents in this classic spice trading game.</p>
            <p className="mt-1">Collect and upgrade crystals to claim point cards!</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SinglePlayerLobby
