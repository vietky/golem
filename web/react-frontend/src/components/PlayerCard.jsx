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

      {/* Top row: Avatar + Name + Stats */}
      <div className="flex items-center gap-2 mb-1">
        {/* Avatar */}
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
          border-2 border-white shadow
          ${isCurrentPlayer ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}
        `}>
          {player.isAI ? '🤖' : player.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        
        {/* Name */}
        <div className="text-white font-bold text-sm">{player.name || 'Player'}</div>
        
        {/* Points */}
        <div className="text-yellow-300 text-xs ml-auto">★{player.points || 0}</div>
      </div>

      {/* Bottom row: Crystals + Hand + Golems */}
      <div className="flex items-center justify-between">
        {/* Crystals */}
        <div className="flex items-center gap-1">
          {['yellow', 'green', 'blue', 'pink'].map((color) => {
            const count = player.caravan?.[color] || 0
            return (
              <div key={color} className="flex items-center">
                <div className={`w-3.5 h-3.5 rounded-full ${crystalColors[color]}`} />
                <span className="text-white text-xs font-bold">{count}</span>
              </div>
            )
          })}
        </div>

        {/* Hand & Golems count */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400">🃏{player.hand?.length || 0}</span>
          <span className="text-purple-400">🏆{golemsCount}</span>
        </div>
      </div>
    </div>
  )
}

export default PlayerCard

