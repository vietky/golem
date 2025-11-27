import React from 'react'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'

const OpponentArea = () => {
  const { opponents, currentPlayer } = useGameStore()

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-b from-slate-900 via-slate-800 to-transparent p-6 z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center gap-6 flex-wrap">
          {opponents.map((opponent) => {
            const isCurrentTurn = currentPlayer?.id === opponent.id
            return (
              <div
                key={opponent.id}
                className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 ${
                  isCurrentTurn ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={`/images/avatar/${opponent.avatar || opponent.id}.webp`}
                      alt={opponent.name}
                      className="w-16 h-16 rounded-full border-2 border-white"
                      onError={(e) => {
                        e.target.src = '/images/avatar/1.webp'
                      }}
                    />
                    {isCurrentTurn && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        TURN
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="space-y-2">
                    <h4 className="text-white font-bold">{opponent.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <span>Points: <strong className="text-white">{opponent.points}</strong></span>
                      <span>Cards: <strong className="text-white">{opponent.hand?.length || 0}</strong></span>
                    </div>
                    <CrystalStack resources={opponent.resources} size="sm" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default OpponentArea

