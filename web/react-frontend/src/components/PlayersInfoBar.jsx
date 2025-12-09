import React from 'react'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const PlayersInfoBar = () => {
  const { gameState, myPlayer, currentPlayer, rest } = useGameStore()
  const { isMobile } = useOrientation()

  if (!gameState?.players) return null

  const allPlayers = gameState.players

  const handleRest = (playerId) => {
    if (currentPlayer?.id === playerId && myPlayer?.id === playerId) {
      rest()
    }
  }

  return (
    <div className={`
      w-full bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm 
      border-b border-white/10 overflow-x-auto scrollbar-none
      ${isMobile ? 'py-1 px-1' : 'py-3 px-4'}
    `}>
      <div className={`
        flex items-center
        ${isMobile ? 'gap-1.5 justify-start' : 'gap-4 max-w-7xl mx-auto justify-center'}
      `}>
        {allPlayers.map((player) => {
          const isCurrentPlayer = currentPlayer?.id === player.id
          const isMe = myPlayer?.id === player.id

          return (
            <div
              key={player.id}
              className={`
                relative flex items-center flex-shrink-0
                ${isMobile ? 'gap-1 px-1.5 py-1 rounded-md' : 'gap-3 px-4 py-2 rounded-lg'}
                ${isCurrentPlayer 
                  ? 'bg-yellow-500/30 ring-2 ring-yellow-400' 
                  : 'bg-white/10'
                }
              `}
            >
              {/* Player Avatar */}
              <div className={`
                rounded-full flex items-center justify-center font-bold 
                border-2 border-white shadow-lg flex-shrink-0
                ${isMobile ? 'w-6 h-6 text-[10px]' : 'w-10 h-10 text-lg'}
                ${isCurrentPlayer ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}
              `}>
                {player.isAI ? '🤖' : player.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Player Info */}
              <div className="flex flex-col">
                <div className={`text-white font-bold whitespace-nowrap ${isMobile ? 'text-[9px]' : 'text-sm'}`}>
                  {player.name || 'Player'}
                </div>
                
                {/* Stats row */}
                <div className={`flex flex-col ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                  {/* First row: Points, Point Cards, Hand Cards */}
                  <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                    {/* Score */}
                    <span className={`text-yellow-400 font-bold ${isMobile ? 'text-[9px]' : 'text-xs'}`}>
                      ★{player.points || 0}
                    </span>
                    
                    {/* Point Cards Count */}
                    <span className={`text-blue-400 font-semibold ${isMobile ? 'text-[9px]' : 'text-xs'}`}>
                      📄{(player.pointCards?.length || 0)}
                    </span>
                    
                    {/* Hand Cards Count */}
                    <span className={`text-green-400 font-semibold ${isMobile ? 'text-[9px]' : 'text-xs'}`}>
                      🃏{(player.hand?.length || 0)}
                    </span>
                  </div>
                  
                  {/* Second row: Crystals - Only show if count > 0 */}
                  <div className={`flex items-center ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                    {['yellow', 'green', 'blue', 'pink'].map((color) => {
                      const count = player.caravan?.[color] || 0
                      if (count === 0) return null // Don't show if 0
                      
                      const bgClass = {
                        yellow: 'bg-yellow-400',
                        green: 'bg-green-500',
                        blue: 'bg-blue-500',
                        pink: 'bg-pink-400'
                      }[color]
                      
                      return (
                        <div key={color} className={`flex items-center ${isMobile ? 'gap-0.5' : 'gap-0.5'}`}>
                          <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-4 h-4'} rounded-full ${bgClass}`}/>
                          <span className={`text-white/90 ${isMobile ? 'text-[8px]' : 'text-xs'}`}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Rest Button - Only show if current player */}
              {isCurrentPlayer && isMe && (player.playedCards?.length || 0) > 0 && (
                <button
                  onClick={() => handleRest(player.id)}
                  className={`
                    bg-green-600 text-white font-bold rounded-full shadow-lg flex-shrink-0
                    ${isMobile ? 'text-[8px] px-1.5 py-0.5' : 'text-xs px-3 py-1'}
                  `}
                >
                  Rest
                </button>
              )}

              {/* Current Turn Indicator */}
              {isCurrentPlayer && (
                <div className={`
                  absolute bg-yellow-500 text-black font-bold rounded-full animate-pulse
                  ${isMobile 
                    ? '-top-1 -right-1 text-[6px] w-3 h-3 flex items-center justify-center' 
                    : '-top-1 -right-1 text-[10px] px-2 py-0.5'
                  }
                `}>
                  {isMobile ? '!' : 'TURN'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlayersInfoBar
