import React from 'react'

const PlayerCard = ({ player, isCurrentPlayer }) => {
  if (!player) return null

  const golemsCount = player.pointCards?.length || 0
  
  // Crystal colors
  const crystalColors = {
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    pink: 'bg-pink-400'
  }

  return (
    <div 
      className={`
        relative bg-white/10 backdrop-blur-md rounded-xl border p-2
        ${isCurrentPlayer 
          ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-yellow-500/10' 
          : 'border-white/20'
        }
      `}
    >
      {/* Current Turn Indicator */}
      {isCurrentPlayer && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
      )}

      {/* Row 1: Avatar + Name + Golems (top right) */}
      <div className="flex items-center gap-2 mb-1">
        {/* Avatar with online status indicator */}
        <div className="relative flex-shrink-0">
          <div className={`
            w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs
            border-2 border-white shadow
            ${isCurrentPlayer ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}
            ${player.online === false ? 'opacity-50' : ''}
          `}>
            {player.isAI ? '🤖' : player.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {/* Online/Offline status indicator */}
          {player.online !== undefined && (
            <div 
              className={`
                absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow
                ${player.online ? 'bg-green-500' : 'bg-gray-500'}
              `}
              title={player.online ? 'Online' : 'Offline'}
            />
          )}
        </div>
        
        {/* Name */}
        <div className={`text-white font-bold text-sm flex-1 ${player.online === false ? 'opacity-60' : ''}`}>
          {player.name || 'Player'}
          {player.online === false && (
            <span className="text-gray-400 text-xs ml-1">(offline)</span>
          )}
        </div>
        
        {/* Golems count (top right) */}
        <div className={`flex items-center gap-1 bg-purple-600/50 rounded-lg px-2 py-0.5 ${golemsCount >= 4 ? 'animate-bounce ring-2 ring-red-500' : ''}`}>
          <span className="text-base">🗿</span>
          <span className="text-white font-bold text-sm">{golemsCount}</span>
        </div>
      </div>

      {/* Row 2: Crystals */}
      <div className="flex items-center gap-1.5 justify-center">
        {['yellow', 'green', 'blue', 'pink'].map((color) => {
          const count = player.caravan?.[color] || 0
          return (
            <div key={color} className="flex items-center">
              <div className={`w-4 h-4 rounded-full ${crystalColors[color]}`} />
              <span className="text-white text-sm font-bold">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlayerCard

