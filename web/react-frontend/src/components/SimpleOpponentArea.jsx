import React from 'react'
import useGameStore from '../store/gameStore'

const SimpleOpponentArea = () => {
  const { opponents, currentPlayer } = useGameStore()

  return (
    <div className="fixed top-4 left-4 right-4 z-20 pointer-events-none">
      <div className="flex justify-center gap-3">
        {opponents.map((opponent) => {
          const isCurrentTurn = currentPlayer?.id === opponent.id
          const isAI = opponent.isAI
          
          return (
            <div
              key={opponent.id}
              className={`bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border ${
                isCurrentTurn 
                  ? 'border-green-400 shadow-lg shadow-green-400/30' 
                  : 'border-white/20'
              } transition-all pointer-events-auto`}
            >
              <div className="flex items-center gap-3">
                {/* Minimal Avatar */}
                <div className="relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isAI ? 'bg-purple-600' : 'bg-blue-600'
                  } text-white`}>
                    {isAI ? '🤖' : opponent.name.charAt(0).toUpperCase()}
                  </div>
                  {isCurrentTurn && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>

                {/* Essential Info Only */}
                <div className="text-white text-sm">
                  <div className="font-semibold">{opponent.name}</div>
                  <div className="flex gap-3 text-xs opacity-90">
                    <span title="Points">★ {opponent.points}</span>
                    <span title="Point Cards">🎴 {opponent.pointCards?.length || 0}</span>
                    <span title="Hand Size">🃏 {opponent.hand?.length || 0}</span>
                  </div>
                </div>

                {/* Crystals - Icon Representation */}
                <div className="flex gap-1 text-xs">
                  {opponent.resources?.yellow > 0 && (
                    <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">
                      {opponent.resources.yellow}
                    </span>
                  )}
                  {opponent.resources?.green > 0 && (
                    <span className="bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">
                      {opponent.resources.green}
                    </span>
                  )}
                  {opponent.resources?.blue > 0 && (
                    <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">
                      {opponent.resources.blue}
                    </span>
                  )}
                  {opponent.resources?.pink > 0 && (
                    <span className="bg-pink-500 text-white px-1.5 py-0.5 rounded font-bold">
                      {opponent.resources.pink}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SimpleOpponentArea
