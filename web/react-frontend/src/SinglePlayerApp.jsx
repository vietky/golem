import React, { useState } from 'react'
import SinglePlayerLobby from './components/SinglePlayerLobby'
import Lobby from './components/Lobby'
import PlayersInfoBar from './components/PlayersInfoBar'
import CompactGameBoard from './components/CompactGameBoard'
import CompactPlayerHand from './components/CompactPlayerHand'
import CollapsibleInfo from './components/CollapsibleInfo'
import DiscardModal from './components/DiscardModal'
import useGameStore from './store/gameStore'
import useOrientation from './hooks/useOrientation'
import { MobileLayoutProvider } from './contexts/MobileLayoutContext'

function SinglePlayerApp() {
  const [gameMode, setGameMode] = useState(null) // null, 'single', 'multi'
  const [inGame, setInGame] = useState(false)
  const { connectWebSocket, gameState, connected, sessionId } = useGameStore()
  const { isPortrait, isLandscape, isMobile, isTablet } = useOrientation()

  const handleStartSinglePlayer = (sessionId, playerName, playerAvatar) => {
    connectWebSocket(sessionId, playerName, playerAvatar)
    setGameMode('single')
    setInGame(true)
  }

  const handleJoinMultiplayer = (sessionId, playerName, playerAvatar) => {
    connectWebSocket(sessionId, playerName, playerAvatar)
    setGameMode('multi')
    setInGame(true)
  }

  const handleBackToMenu = () => {
    setGameMode(null)
    setInGame(false)
  }

  // Mode selection screen
  if (gameMode === null) {
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
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full border border-white/20">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            Century: Golem Edition
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={() => setGameMode('single')}
              className="w-full py-6 rounded-lg font-bold text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transform hover:scale-105 transition-all"
            >
              🤖 Single Player
              <div className="text-sm font-normal mt-1 text-white/90">
                Play against AI opponents
              </div>
            </button>
            
            <button
              onClick={() => setGameMode('multi')}
              className="w-full py-6 rounded-lg font-bold text-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg transform hover:scale-105 transition-all"
            >
              👥 Multiplayer
              <div className="text-sm font-normal mt-1 text-white/90">
                Play with friends online
              </div>
            </button>
          </div>

          <div className="text-center text-white/70 text-sm mt-6">
            <p>A classic spice trading game</p>
          </div>
        </div>
      </div>
    )
  }

  // Show appropriate lobby based on mode
  if (!inGame) {
    if (gameMode === 'single') {
      return (
        <div>
          <button
            onClick={handleBackToMenu}
            className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-white font-semibold hover:bg-white/30 transition-all"
          >
            ← Back
          </button>
          <SinglePlayerLobby onStartGame={handleStartSinglePlayer} />
        </div>
      )
    } else {
      return (
        <div>
          <button
            onClick={handleBackToMenu}
            className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-white font-semibold hover:bg-white/30 transition-all"
          >
            ← Back
          </button>
          <Lobby onJoinGame={handleJoinMultiplayer} />
        </div>
      )
    }
  }

  // Show loading screen while connecting or waiting for game state
  if (!connected || !gameState) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {!connected ? 'Connecting to game...' : 'Loading game state...'}
          </h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    )
  }

  return (
    <MobileLayoutProvider>
      {/* Blurred Background Layer */}
      <div className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px) brightness(0.7)',
        }}
      />
      
      <div className={`min-h-screen flex flex-col relative z-10 ${
        isMobile ? (isPortrait ? 'mobile-portrait' : 'mobile-landscape') : ''
      } ${isTablet ? 'tablet' : ''}`}>
        {/* Players Info Bar - Top */}
        <PlayersInfoBar />

        {/* Central Game Board - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <CompactGameBoard />
        </div>

        {/* Player Hand - Bottom (Fixed) */}
        <CompactPlayerHand />

        {/* Collapsible Info (Room ID + Action Log) - Bottom Right */}
        <CollapsibleInfo sessionId={sessionId} />

        {/* Discard Modal (when crystals exceed max) */}
        <DiscardModal />

        {/* Game Over Modal */}
        {gameState?.gameOver && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md text-center mx-4">
              <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
              <p className="text-xl mb-2">
                Winner: {gameState.winner?.name || 'Unknown'}
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Final Score: {gameState.winner?.points || 0} points
              </p>
              <button
                onClick={() => {
                  setInGame(false)
                  setGameMode(null)
                  window.location.reload()
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 touch-target"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileLayoutProvider>
  )
}

export default SinglePlayerApp
