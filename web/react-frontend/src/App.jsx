import React, { useState } from 'react'
import Lobby from './components/Lobby'
import OpponentArea from './components/OpponentArea'
import MarketArea from './components/MarketArea'
import PlayerHand from './components/PlayerHand'
import ResourcePanel from './components/ResourcePanel'
import ActionLog from './components/ActionLog'
import useGameStore from './store/gameStore'

function App() {
  const [inGame, setInGame] = useState(false)
  const { connectWebSocket, gameState, connected } = useGameStore()

  const handleJoinGame = (sessionId, playerName, playerAvatar) => {
    connectWebSocket(sessionId, playerName, playerAvatar)
    setInGame(true)
  }

  if (!inGame) {
    return <Lobby onJoinGame={handleJoinGame} />
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
    <div className="min-h-screen relative" style={{
      backgroundImage: 'url(/images/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      {/* Opponent Area (Top) */}
      <OpponentArea />

      {/* Central Market Area */}
      <MarketArea />

      {/* Player Hand (Bottom) */}
      <PlayerHand />

      {/* Resource Panel (Bottom Right) */}
      <ResourcePanel />

      {/* Action Log (Top Right) */}
      <ActionLog />

      {/* Game Over Modal */}
      {gameState?.gameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
            <p className="text-xl mb-6">
              Winner: {gameState.winner?.name || 'Unknown'}
            </p>
            <button
              onClick={() => {
                setInGame(false)
                window.location.reload()
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600"
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

