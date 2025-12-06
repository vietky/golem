import React, { useState } from 'react'
import Lobby from './components/Lobby'
import OpponentArea from './components/OpponentArea'
import MarketArea from './components/MarketArea'
import PlayerHand from './components/PlayerHand'
import ResourcePanel from './components/ResourcePanel'
import ActionLog from './components/ActionLog'
import DiscardModal from './components/DiscardModal'
import useGameStore from './store/gameStore'
import useOrientation from './hooks/useOrientation'
import { MobileLayoutProvider } from './contexts/MobileLayoutContext'

function App() {
  const [inGame, setInGame] = useState(false)
  const { connectWebSocket, gameState, connected } = useGameStore()
  const { isPortrait, isLandscape, isMobile, isTablet } = useOrientation()

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
    <MobileLayoutProvider>
      <div className={`min-h-screen relative ${
        isMobile ? (isPortrait ? 'mobile-portrait' : 'mobile-landscape') : ''
      } ${isTablet ? 'tablet' : ''}`} 
      style={{
        backgroundImage: 'url(/images/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isMobile ? 'scroll' : 'fixed'
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
        {!isMobile && <ActionLog />}

        {/* Discard Modal (when crystals exceed max) */}
        <DiscardModal />

        {/* Game Over Modal */}
        {gameState?.gameOver && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-6 md:p-8 max-w-4xl w-full mx-auto my-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-yellow-300">🏆 Game Over! 🏆</h2>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-center mb-4 text-yellow-200">
                  Winner: {gameState.winner?.name || 'Unknown'}
                </h3>
                <p className="text-xl text-center text-white">
                  Total Points: {gameState.winner?.points || 0}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <h3 className="text-xl font-bold text-white mb-3">Final Scores</h3>
                {gameState.players?.map((player, idx) => {
                  const pointCardPoints = player.pointCards?.reduce((sum, card) => sum + (card.points || 0), 0) || 0
                  const coinPoints = player.coins?.reduce((sum, coin) => sum + (coin.points || 0), 0) || 0
                  const copperCount = player.coins?.filter(c => c.points === 3).length || 0
                  const silverCount = player.coins?.filter(c => c.points === 1).length || 0
                  const crystalPoints = (player.resources?.green || 0) + (player.resources?.blue || 0) + (player.resources?.pink || 0)
                  const totalPoints = pointCardPoints + coinPoints + crystalPoints
                  const isWinner = player.id === gameState.winner?.id

                  return (
                    <div key={player.id} className={`p-4 rounded-lg ${
                      isWinner ? 'bg-yellow-500/30 border-2 border-yellow-300' : 'bg-white/10'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isWinner && <span className="text-2xl">👑</span>}
                          <span className="font-bold text-white text-lg">{player.name}</span>
                        </div>
                        <span className="text-2xl font-bold text-yellow-300">{totalPoints} pts</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-gray-300 mb-1">Point Cards</div>
                          <div className="text-white font-semibold">
                            {player.pointCards?.length || 0} cards = {pointCardPoints} pts
                          </div>
                        </div>
                        
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-gray-300 mb-1">Bonus Coins</div>
                          <div className="text-white font-semibold">
                            {copperCount > 0 && `${copperCount}🥉(${copperCount * 3}pts) `}
                            {silverCount > 0 && `${silverCount}🥈(${silverCount * 1}pts)`}
                            {copperCount === 0 && silverCount === 0 && 'None'}
                          </div>
                        </div>
                        
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-gray-300 mb-1">Crystals</div>
                          <div className="text-white font-semibold">
                            🟢{player.resources?.green || 0} 🔵{player.resources?.blue || 0} 🟣{player.resources?.pink || 0} = {crystalPoints} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => {
                  setInGame(false)
                  window.location.reload()
                }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-orange-600 touch-target shadow-lg"
              >
                🎮 New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileLayoutProvider>
  )
}

export default App

