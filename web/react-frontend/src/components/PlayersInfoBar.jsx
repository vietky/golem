import React from 'react'
import useGameStore from '../store/gameStore'

const PlayersInfoBar = () => {
  const { gameState, myPlayer, currentPlayer, rest } = useGameStore()

  if (!gameState?.players) return null

  const allPlayers = gameState.players

  const getTotalCrystals = (resources) => {
    if (!resources) return 0
    return (resources.yellow || 0) + (resources.green || 0) + (resources.blue || 0) + (resources.pink || 0)
  }

  const handleRest = (playerId) => {
    if (currentPlayer?.id === playerId && myPlayer?.id === playerId) {
      rest()
    }
  }

  return (
    <div className="w-full bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm border-b border-white/10 py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
        {allPlayers.map((player) => {
          const isCurrentPlayer = currentPlayer?.id === player.id
          const isMe = myPlayer?.id === player.id
          const crystalCount = getTotalCrystals(player.caravan)
          const cardCount = (player.hand?.length || 0) + (player.playedCards?.length || 0)

          return (
            <div
              key={player.id}
              className={`relative flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                isCurrentPlayer 
                  ? 'bg-yellow-500/30 ring-2 ring-yellow-400 scale-105' 
                  : 'bg-white/10'
              }`}
            >
              {/* Player Avatar/Name */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                isCurrentPlayer ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'
              } border-2 border-white shadow-lg`}>
                {player.isAI ? '🤖' : player.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Player Info */}
              <div className="flex flex-col">
                <div className="text-white font-bold text-sm">
                  {player.name || 'Player'}
                  {isMe && <span className="text-yellow-300 ml-1">(You)</span>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {/* Score */}
                  <span className="text-yellow-400 font-bold">
                    ★{player.points || 0}
                  </span>
                  
                  {/* Cards */}
                  <span className="text-white/80">
                    🃏{cardCount}
                  </span>
                  
                  {/* Crystals with color indicators */}
                  <div className="flex items-center gap-1">
                    {player.caravan?.yellow > 0 && (
                      <span className="bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded border border-yellow-600 shadow-md">
                        {player.caravan.yellow}
                      </span>
                    )}
                    {player.caravan?.green > 0 && (
                      <span className="bg-green-500 text-black text-xs font-black px-2 py-0.5 rounded border border-green-700 shadow-md">
                        {player.caravan.green}
                      </span>
                    )}
                    {player.caravan?.blue > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-black px-2 py-0.5 rounded border border-blue-700 shadow-md">
                        {player.caravan.blue}
                      </span>
                    )}
                    {player.caravan?.pink > 0 && (
                      <span className="bg-pink-400 text-black text-xs font-black px-2 py-0.5 rounded border border-pink-600 shadow-md">
                        {player.caravan.pink}
                      </span>
                    )}
                    {crystalCount === 0 && (
                      <span className="text-white/50 text-xs">0💎</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rest Button - only for current player if it's me */}
              {isCurrentPlayer && isMe && (player.playedCards?.length || 0) > 0 && (
                <button
                  onClick={() => handleRest(player.id)}
                  className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transition-all hover:scale-110"
                >
                  Rest
                </button>
              )}

              {/* Current Turn Indicator */}
              {isCurrentPlayer && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  TURN
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
