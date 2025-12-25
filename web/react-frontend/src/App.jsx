import React, { useState } from 'react'
import { createLogger } from './utils/logger'
import EnhancedLobby from './components/EnhancedLobby'
import ThemeToggleButton from './components/ThemeToggleButton'
import FantasyGameLayout from './components/FantasyGameLayout'
import WebGameLayout from './components/WebGameLayout'
import useGameStore from './store/gameStore'
import { MobileLayoutProvider } from './contexts/MobileLayoutContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

const logger = createLogger('App');

// Game Content - Switches between layouts based on theme
function GameContent({ setInGame }) {
  const { isFantasy } = useTheme()

  logger.debug('Rendering, isFantasy:', isFantasy)

  const handleNewGame = () => {
    setInGame(false)
    window.location.reload()
  }

  const handleBackToMenu = () => {
    setInGame(false)
    window.location.reload()
  }

  return (
    <>
      {/* Theme Toggle Button - Always visible */}
      <ThemeToggleButton />

      {/* Conditional Layout Rendering */}
      {isFantasy ? (
        <FantasyGameLayout 
          onNewGame={handleNewGame}
          onBackToMenu={handleBackToMenu}
        />
      ) : (
        <WebGameLayout />
      )}
    </>
  )
}

function App() {
  const [inGame, setInGame] = useState(false)
  const { connectWebSocket, gameState, connected } = useGameStore()

  const handleJoinGame = (sessionId, playerName, playerAvatar, asSpectator = false) => {
    connectWebSocket(sessionId, playerName, playerAvatar, asSpectator)
    setInGame(true)
  }
  logger.debug(`Render: inGame=${inGame}, connected=${connected}, gameState=${!!gameState}`);

  if (!inGame) {
    return <EnhancedLobby onJoinGame={handleJoinGame} />
  }

  // Show loading screen while connecting or waiting for game state
  if (!connected || !gameState) {
    return (
      <div 
        className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(/images/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            {!connected ? 'Connecting to game...' : 'Loading game state...'}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">Please wait...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <MobileLayoutProvider>
        <GameContent setInGame={setInGame} />
      </MobileLayoutProvider>
    </ThemeProvider>
  )
}

export default App
