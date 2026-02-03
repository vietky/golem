import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SinglePlayerLobby from './components/SinglePlayerLobby'
import Lobby from './components/Lobby'
import PlayersInfoBar from './components/PlayersInfoBar'
import CompactGameBoard from './components/mobile/CompactGameBoard'
import CompactPlayerHand from './components/mobile/CompactPlayerHand'
import CollapsibleInfo from './components/CollapsibleInfo'
import DiscardModal from './components/DiscardModal'
import AcquiredCardOverlay from './components/AcquiredCardOverlay'
import GameOverModal from './components/GameOverModal'
import Toast from './components/Toast'
import WebGameLayout from './components/desktop/WebGameLayout'
import ThemeToggleButton from './components/ThemeToggleButton'
import SoundToggleButton from './components/SoundToggleButton'
import FantasyGameLayout from './components/desktop/FantasyGameLayout'
import useGameStore from './store/gameStore'
import useOrientation from './hooks/useOrientation'
import useGameSounds from './hooks/useGameSounds'
import { MobileLayoutProvider } from './contexts/MobileLayoutContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

// Game Content with Theme Support
function GameContentWithTheme({ useWebLayout, isMobile, isPortrait, sessionId, setInGame, setGameMode }) {
  const { isFantasy } = useTheme()
  
  // Initialize game sounds hook
  useGameSounds()

  const handleNewGame = () => {
    setInGame(false)
    setGameMode(null)
    window.location.reload()
  }

  const handleBackToMenu = () => {
    setInGame(false)
    setGameMode(null)
    window.location.reload()
  }

  // Fantasy Theme Layout
  if (isFantasy) {
    return (
      <>
        <ThemeToggleButton />
        <SoundToggleButton />
        <FantasyGameLayout 
          onNewGame={handleNewGame}
          onBackToMenu={handleBackToMenu}
        />
        <Toast />
      </>
    )
  }

  // Default Theme Layout
  return (
    <>
      {/* Theme Toggle Button - Always visible */}
      <ThemeToggleButton />
      
      {/* Sound Toggle Button - Always visible */}
      <SoundToggleButton />

      {/* Blurred Background Layer */}
      <div className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/assets/images/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          filter: isMobile ? 'blur(4px) brightness(0.8)' : 'blur(8px) brightness(0.7)',
        }}
      />
      
      {useWebLayout ? (
        /* Desktop/Tablet - WebGameLayout */
        <div className="h-screen h-[100dvh] relative z-10">
          <WebGameLayout />

          {/* Discard Modal (when crystals exceed max) */}
          <DiscardModal />
        </div>
      ) : (
        /* Mobile - CompactGameBoard with mobile-specific layout */
        <div className={`
          ${isPortrait 
            ? 'h-screen h-[100dvh] flex flex-col relative z-10 overflow-hidden' 
            : 'min-h-screen min-h-[100dvh] flex flex-col relative z-10'
          }
          ${isPortrait ? 'mobile-portrait' : 'mobile-landscape'}
        `}>
          {/* Players Info Bar - Top */}
          <PlayersInfoBar />

          {/* Central Game Board */}
          <div 
            className={`
            ${isPortrait 
              ? 'flex-1 overflow-hidden relative z-10 min-h-0 pb-[130px]' 
              : 'flex-1 overflow-y-auto pb-24 relative z-10 min-h-0'
            }
          `}
          >
            <CompactGameBoard />
          </div>

          {/* Player Hand - Bottom (Fixed on mobile, relative on desktop) */}
          {!isPortrait && (
            <div className="flex-shrink-0 relative z-30">
              <CompactPlayerHand />
            </div>
          )}
          
          {/* Player Hand - Fixed on mobile portrait */}
          {isPortrait && <CompactPlayerHand />}

          {/* Discard Modal (when crystals exceed max) */}
          <DiscardModal />
          
          {/* Overlay when other players acquire or play cards */}
          <AcquiredCardOverlay />

          {/* Activity Feed (Chat & History) - Works on all screen sizes */}
          <CollapsibleInfo sessionId={sessionId} />
        </div>
      )}

      {/* Game Over Modal */}
      <GameOverModal 
        onNewGame={handleNewGame}
        onBackToMenu={handleBackToMenu}
      />
      
      {/* Global Toast Notifications */}
      <Toast />
    </>
  )
}

function SinglePlayerApp() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [gameMode, setGameMode] = useState(null) // null, 'single', 'multi'
  const [inGame, setInGame] = useState(false)
  const { 
    connectWebSocket, 
    gameState, 
    connected, 
    sessionId,
    isConnecting,
    connectionError,
    isReconnecting,
    reconnectAttempts,
    forceReconnect,
    playerName: storedPlayerName,
    playerAvatar: storedPlayerAvatar,
    isSpectator,
  } = useGameStore()
  const { isPortrait, isLandscape, isMobile, isTablet, isDesktop, width } = useOrientation()

  // Auto-join if roomId is in URL
  useEffect(() => {
    if (roomId && !inGame && !isConnecting) {
      setGameMode('multi')
      setInGame(true)
    }
  }, [roomId, inGame, isConnecting])

  const handleStartSinglePlayer = (sessionId, playerName, playerAvatar) => {
    connectWebSocket(sessionId, playerName, playerAvatar)
    setGameMode('single')
    setInGame(true)
    navigate(`/room/${sessionId}`)
  }

  const handleJoinMultiplayer = (sessionId, playerName, playerAvatar, asSpectator) => {
    connectWebSocket(sessionId, playerName, playerAvatar, asSpectator)
    setGameMode('multi')
    setInGame(true)
    navigate(`/room/${sessionId}`)
  }

  const handleBackToMenu = () => {
    setGameMode(null)
    setInGame(false)
    navigate('/')
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
          backgroundImage: 'url(/assets/images/background.jpg)',
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
    const showRetryButton = connectionError || (isReconnecting && reconnectAttempts >= 2);
    
    return (
      <>
        <Toast />
        <div 
          className={`
            min-h-screen min-h-[100dvh] flex items-center justify-center
            ${isMobile ? 'p-3' : 'p-6'}
          `}
          style={{
            backgroundImage: 'url(/assets/images/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: isMobile ? 'scroll' : 'fixed'
          }}
        >
          <div className={`
            bg-white/90 backdrop-blur-md rounded-2xl text-center
            ${isMobile ? 'p-4 max-w-[280px]' : 'p-8 max-w-md'}
          `}>
            {/* Spinner - only show when actively connecting */}
            {(isConnecting || isReconnecting) && !showRetryButton && (
              <div className={`
                animate-spin rounded-full border-b-2 border-purple-500 mx-auto mb-4
                ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}
              `}></div>
            )}

            {/* Error Icon */}
            {showRetryButton && (
              <div className={`
                mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100
                ${isMobile ? 'h-12 w-12' : 'h-16 w-16'}
              `}>
                <svg className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-red-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}

            {/* Title */}
            <h2 className={`font-bold text-gray-800 mb-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              {connectionError 
                ? 'Connection Failed' 
                : isReconnecting 
                  ? `Reconnecting (${reconnectAttempts}/${10})`
                  : !connected 
                    ? 'Connecting...' 
                    : 'Loading...'}
            </h2>

            {/* Error Message */}
            {connectionError && (
              <p className={`text-red-600 mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
                {connectionError}
              </p>
            )}

            {/* Status Message */}
            {!connectionError && (
              <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                {isReconnecting ? 'Attempting to reconnect...' : 'Please wait...'}
              </p>
            )}

            {/* Retry Button */}
            {showRetryButton && (
              <button
                onClick={() => {
                  if (sessionId && storedPlayerName) {
                    forceReconnect();
                  }
                }}
                className={`
                  mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg
                  transition-colors duration-200 shadow-md hover:shadow-lg
                  ${isMobile ? 'text-sm' : 'text-base'}
                `}
              >
                Retry Connection
              </button>
            )}

            {/* Back to Menu - show after multiple failed attempts */}
            {reconnectAttempts >= 3 && (
              <button
                onClick={() => {
                  setInGame(false);
                  setGameMode(null);
                }}
                className={`
                  mt-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium
                  transition-colors duration-200
                  ${isMobile ? 'text-xs' : 'text-sm'}
                `}
              >
                Back to Menu
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // Use WebGameLayout for desktop/tablet (>= 768px), CompactGameBoard for mobile (< 768px)
  const useWebLayout = !isMobile

  return (
    <ThemeProvider>
      <MobileLayoutProvider>
        <GameContentWithTheme
          useWebLayout={useWebLayout}
          isMobile={isMobile}
          isPortrait={isPortrait}
          sessionId={sessionId}
          setInGame={setInGame}
          setGameMode={setGameMode}
        />
      </MobileLayoutProvider>
    </ThemeProvider>
  )
}

export default SinglePlayerApp
