import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../utils/api'
import useOrientation from '../hooks/useOrientation'

const SinglePlayerLobby = ({ onStartGame }) => {
  const [playerName, setPlayerName] = useState('Player 1')
  const [numAI, setNumAI] = useState(1)
  const [selectedAvatar, setSelectedAvatar] = useState('4')
  const [loading, setLoading] = useState(false)
  const { isMobile, isTablet, isPortrait } = useOrientation()

  // Debug log
  console.log('[SinglePlayerLobby] Device:', { isMobile, isTablet, isPortrait })

  const avatars = ['1', '2', '3', '4']
  const difficulties = [
    { value: 1, label: isMobile ? '1 AI (2P)' : '1 AI Opponent (2 Players)' },
    { value: 2, label: isMobile ? '2 AI (3P)' : '2 AI Opponents (3 Players)' },
    { value: 3, label: isMobile ? '3 AI (4P)' : '3 AI Opponents (4 Players)' },
  ]

  const startGame = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numAI,
          seed: Date.now(),
        }),
      })

      const data = await response.json()
      if (response.ok) {
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
      className={`
        min-h-screen min-h-[100dvh] flex items-center justify-center
        ${isMobile ? 'p-2 pt-12' : 'p-6'}
      `}
      style={{
        backgroundImage: 'url(/images/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isMobile ? 'scroll' : 'fixed'
      }}
    >
      <motion.div
        className={`
          backdrop-blur-md border border-white/20 w-full
          ${isMobile 
            ? 'bg-black/40 rounded-xl p-3 max-w-[320px]' 
            : 'bg-white/10 rounded-2xl p-6 sm:p-8 max-w-2xl'
          }
        `}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className={`
          font-bold text-white text-center
          ${isMobile ? 'text-lg mb-1' : 'text-3xl sm:text-4xl mb-2'}
        `}>
          {isMobile ? 'Single Player' : 'Century: Golem Edition'}
        </h1>
        {!isMobile && (
          <h2 className="text-lg sm:text-xl text-white/80 text-center mb-6 sm:mb-8">
            Single Player Mode
          </h2>
        )}

        <div className={`space-y-3 ${isMobile ? '' : 'space-y-6'}`}>
          {/* Player Name */}
          <div>
            <label className={`block text-white font-semibold ${isMobile ? 'text-sm mb-1' : 'mb-2'}`}>
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className={`
                w-full rounded-lg bg-white/20 border border-white/30 text-white 
                placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400
                ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3'}
              `}
              placeholder="Enter your name"
            />
          </div>

          {/* Number of AI Opponents */}
          <div>
            <label className={`block text-white font-semibold ${isMobile ? 'text-sm mb-1' : 'mb-2'}`}>
              AI Opponents
            </label>
            <div className={`${isMobile ? 'space-y-1' : 'space-y-2'}`}>
              {difficulties.map((diff) => (
                <label
                  key={diff.value}
                  className={`
                    flex items-center rounded-lg cursor-pointer transition-all
                    ${isMobile ? 'p-2' : 'p-3'}
                    ${numAI === diff.value
                      ? 'bg-purple-500/40 border-2 border-purple-400'
                      : 'bg-white/10 border-2 border-white/20 hover:bg-white/20'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="numAI"
                    value={diff.value}
                    checked={numAI === diff.value}
                    onChange={(e) => setNumAI(parseInt(e.target.value))}
                    className="mr-2 sm:mr-3"
                  />
                  <span className={`text-white font-medium ${isMobile ? 'text-sm' : ''}`}>
                    {diff.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className={`block text-white font-semibold ${isMobile ? 'text-sm mb-1' : 'mb-2'}`}>
              Your Avatar
            </label>
            <div className={`
              grid gap-2
              ${isMobile ? 'grid-cols-4' : 'grid-cols-4 md:grid-cols-4 gap-3'}
            `}>
              {avatars.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden transition-all 
                    transform hover:scale-105 touch-target
                    ${selectedAvatar === avatar
                      ? 'ring-4 ring-purple-400 scale-105'
                      : 'ring-2 ring-white/30'
                    }
                  `}
                >
                  <img
                    src={`/images/avatar/${avatar}.webp`}
                    alt={`Avatar ${avatar}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl">${avatar}</div>`
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
            className={`
              w-full rounded-lg font-bold transition-all text-white shadow-lg touch-target
              ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'}
              ${loading || !playerName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className={`animate-spin rounded-full border-b-2 border-white mr-2 ${isMobile ? 'h-4 w-4' : 'h-6 w-6 mr-3'}`}></div>
                {isMobile ? 'Creating...' : 'Creating Game...'}
              </div>
            ) : (
              isMobile ? 'Start Game' : 'Start Single Player Game'
            )}
          </button>

          {/* Info Text - Hidden on mobile */}
          {!isMobile && (
            <div className="text-center text-white/70 text-sm mt-4">
              <p>Play against AI opponents in this classic spice trading game.</p>
              <p className="mt-1">Collect and upgrade crystals to claim point cards!</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default SinglePlayerLobby
