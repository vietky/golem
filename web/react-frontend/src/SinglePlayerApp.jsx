import React, { useState } from 'react'
import SinglePlayerLobby from './components/SinglePlayerLobby'
import Lobby from './components/Lobby'
import PlayersInfoBar from './components/PlayersInfoBar'
import CompactGameBoard from './components/CompactGameBoard'
import CompactPlayerHand from './components/CompactPlayerHand'
import CollapsibleInfo from './components/CollapsibleInfo'
import DiscardModal from './components/DiscardModal'
import Toast from './components/Toast'
import useGameStore from './store/gameStore'
import useOrientation from './hooks/useOrientation'
import { MobileLayoutProvider } from './contexts/MobileLayoutContext'

function SinglePlayerApp() {
  const [gameMode, setGameMode] = useState(null) // null, 'single', 'multi'
  const [inGame, setInGame] = useState(false)
  const { connectWebSocket, gameState, connected, sessionId } = useGameStore()
  const { isPortrait, isLandscape, isMobile, isTablet, isDesktop, width } = useOrientation()

  // Debug log
  console.log('[SinglePlayerApp] Device:', { isMobile, isTablet, isDesktop, isPortrait, width })

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

  // Mode selection screen - RESPONSIVE
  if (gameMode === null) {
    return (
      <>
      <Toast />
      <div 
        className={`
          min-h-screen min-h-[100dvh] flex items-center justify-center 
          ${isMobile ? 'p-3' : 'p-6'}
        `}
        style={{
          backgroundImage: 'url(/images/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: isMobile ? 'scroll' : 'fixed'
        }}
      >
        <div className={`
          backdrop-blur-md border border-white/20 w-full
          ${isMobile 
            ? 'bg-black/40 rounded-xl p-4 max-w-[320px]' 
            : 'bg-white/10 rounded-2xl p-8 max-w-md'
          }
        `}>
          <h1 className={`
            font-bold text-white text-center
            ${isMobile ? 'text-xl mb-4' : 'text-3xl sm:text-4xl mb-8'}
          `}>
            {'Century: Golem Edition'}
          </h1>
          
          <div className={`space-y-3 ${isMobile ? '' : 'space-y-4'}`}>
            <button
              onClick={() => setGameMode('single')}
              className={`
                w-full rounded-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 
                hover:from-purple-600 hover:to-pink-600 text-white shadow-lg 
                transform hover:scale-105 transition-all
                ${isMobile ? 'py-4 text-base' : 'py-6 text-xl'}
              `}
            >
              🤖 Single Player
              <div className={`font-normal text-white/90 ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                Play against AI opponents
              </div>
            </button>
            
            <button
              onClick={() => setGameMode('multi')}
              className={`
                w-full rounded-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-500 
                hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg 
                transform hover:scale-105 transition-all
                ${isMobile ? 'py-4 text-base' : 'py-6 text-xl'}
              `}
            >
              👥 Multiplayer
              <div className={`font-normal text-white/90 ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                Play with friends online
              </div>
            </button>
          </div>

          <div className={`text-center text-white/70 ${isMobile ? 'text-xs mt-4' : 'text-sm mt-6'}`}>
            <p>A classic spice trading game</p>
          </div>
        </div>
      </div>
      </>
    )
  }

  // Show appropriate lobby based on mode
  if (!inGame) {
    if (gameMode === 'single') {
      return (
        <>
          <Toast />
          <div>
            <button
              onClick={handleBackToMenu}
              className={`
                absolute z-50 bg-white/20 backdrop-blur-md rounded-lg text-white font-semibold 
                hover:bg-white/30 transition-all
                ${isMobile ? 'top-2 left-2 px-3 py-1.5 text-sm' : 'top-4 left-4 px-4 py-2'}
              `}
            >
              ← Back
            </button>
            <SinglePlayerLobby onStartGame={handleStartSinglePlayer} />
          </div>
        </>
      )
    } else {
      return (
        <>
          <Toast />
          <div>
            <button
              onClick={handleBackToMenu}
              className={`
                absolute z-50 bg-white/20 backdrop-blur-md rounded-lg text-white font-semibold 
                hover:bg-white/30 transition-all
                ${isMobile ? 'top-2 left-2 px-3 py-1.5 text-sm' : 'top-4 left-4 px-4 py-2'}
              `}
            >
              ← Back
            </button>
            <Lobby onJoinGame={handleJoinMultiplayer} />
          </div>
        </>
      )
    }
  }

  // Show loading screen while connecting or waiting for game state
  if (!connected || !gameState) {
    return (
      <>
        <Toast />
        <div 
          className={`
            min-h-screen min-h-[100dvh] flex items-center justify-center
            ${isMobile ? 'p-3' : 'p-6'}
          `}
          style={{
            backgroundImage: 'url(/images/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: isMobile ? 'scroll' : 'fixed'
          }}
        >
          <div className={`
            bg-white/90 backdrop-blur-md rounded-2xl text-center
            ${isMobile ? 'p-4 max-w-[280px]' : 'p-8'}
          `}>
            <div className={`
              animate-spin rounded-full border-b-2 border-purple-500 mx-auto mb-4
              ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}
            `}></div>
            <h2 className={`font-bold text-gray-800 mb-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {!connected ? 'Connecting...' : 'Loading...'}
            </h2>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>Please wait...</p>
          </div>
        </div>
      </>
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
          filter: isMobile ? 'blur(4px) brightness(0.8)' : 'blur(8px) brightness(0.7)',
        }}
      />
      
      <div className={`
        min-h-screen min-h-[100dvh] flex flex-col relative z-10
        ${isMobile ? (isPortrait ? 'mobile-portrait' : 'mobile-landscape') : ''}
        ${isTablet ? 'tablet' : ''}
      `}>
        {/* Players Info Bar - Top */}
        <PlayersInfoBar />

        {/* Central Game Board - Scrollable */}
        <div className={`
          flex-1 overflow-y-auto
          ${isMobile && isPortrait ? 'pb-32' : 'pb-24'}
        `}>
          <CompactGameBoard />
        </div>

        {/* Player Hand - Bottom (Fixed) */}
        <CompactPlayerHand />

        {/* Collapsible Info (Room ID + Action Log) - Bottom Right */}
        {!isMobile && <CollapsibleInfo sessionId={sessionId} />}

        {/* Discard Modal (when crystals exceed max) */}
        <DiscardModal />

        {/* Game Over Modal */}
        {gameState?.gameOver && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`
              bg-white rounded-2xl text-center
              ${isMobile ? 'p-4 max-w-[300px]' : 'p-8 max-w-md mx-4'}
            `}>
              <h2 className={`font-bold mb-4 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Game Over!</h2>
              <p className={`mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                Winner: {gameState.winner?.name || 'Unknown'}
              </p>
              <p className={`text-gray-600 mb-6 ${isMobile ? 'text-base' : 'text-lg'}`}>
                Final Score: {gameState.winner?.points || 0} points
              </p>
              <button
                onClick={() => {
                  setInGame(false)
                  setGameMode(null)
                  window.location.reload()
                }}
                className={`
                  bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold 
                  rounded-lg hover:from-purple-600 hover:to-pink-600 touch-target
                  ${isMobile ? 'py-2 px-4 text-sm' : 'py-3 px-6'}
                `}
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Global Toast Notifications */}
      <Toast />
    </MobileLayoutProvider>
  )
}

export default SinglePlayerApp
