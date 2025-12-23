import React, { useState } from 'react'
import Lobby from './components/Lobby'
import OpponentArea from './components/OpponentArea'
import MarketArea from './components/MarketArea'
import PlayerHand from './components/PlayerHand'
import ResourcePanel from './components/ResourcePanel'
import ActionLog from './components/ActionLog'
import DiscardModal from './components/DiscardModal'
import AcquiredCardOverlay from './components/AcquiredCardOverlay'
import GameOverModal from './components/GameOverModal'
import ThemeToggleButton from './components/ThemeToggleButton'
import FantasyGameLayout from './components/FantasyGameLayout'
import useGameStore from './store/gameStore'
import useOrientation from './hooks/useOrientation'
import { MobileLayoutProvider } from './contexts/MobileLayoutContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

// Default Layout Component (Original layout)
function DefaultGameLayout({ onNewGame, onBackToMenu }) {
  const { isPortrait, isLandscape, isMobile, isTablet, isDesktop } = useOrientation()

  // Determine layout mode
  const layoutMode = isMobile && isPortrait ? 'mobile-portrait' 
    : isMobile && isLandscape ? 'mobile-landscape'
    : isTablet ? 'tablet'
    : 'desktop'

  return (
    <div 
      className={`
        min-h-screen min-h-[100dvh] 
        flex flex-col
        overflow-hidden
        ${layoutMode}
      `}
      style={{
        backgroundImage: 'url(/images/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isMobile ? 'scroll' : 'fixed'
      }}
    >
      {/* Main Game Layout - Flexbox for proper stacking */}
      <div className="flex flex-col h-screen h-[100dvh] relative">
        
        {/* Top Section - Opponent Area */}
        <header className={`
          flex-shrink-0 z-20
          ${isMobile && isPortrait ? 'h-auto' : 'h-auto'}
        `}>
          <OpponentArea />
        </header>

        {/* Middle Section - Market Area (scrollable) */}
        <main className={`
          flex-1 overflow-y-auto overflow-x-hidden
          ${isMobile && isPortrait 
            ? 'pt-2 pb-40' 
            : isTablet 
              ? 'pt-4 pb-32' 
              : 'pt-4 pb-24 pr-52'
          }
        `}>
          <MarketArea />
        </main>

        {/* Bottom Section - Player Hand & Resource Panel */}
        <footer className={`
          flex-shrink-0 z-30
          ${isMobile && isPortrait 
            ? 'fixed bottom-0 left-0 right-0' 
            : 'fixed bottom-0 left-0 right-0'
          }
        `}>
          {/* Player Hand */}
          <PlayerHand />
          
          {/* Resource Panel */}
          <ResourcePanel />
        </footer>

        {/* Action Log (desktop only, top right) */}
        {isDesktop && <ActionLog />}

        {/* Discard Modal (when crystals exceed max) */}
        <DiscardModal />

        {/* Overlay when other players acquire or play cards */}
        <AcquiredCardOverlay />

        {/* Game Over Modal */}
        <GameOverModal 
          onNewGame={onNewGame}
          onBackToMenu={onBackToMenu}
        />
      </div>
    </div>
  )
}

// Game Content - Switches between layouts based on theme
function GameContent({ setInGame }) {
  const { isFantasy } = useTheme()

  console.log('[GameContent] Rendering, isFantasy:', isFantasy)

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
        <DefaultGameLayout 
          onNewGame={handleNewGame}
          onBackToMenu={handleBackToMenu}
        />
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

  if (!inGame) {
    return <Lobby onJoinGame={handleJoinGame} />
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
