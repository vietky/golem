import React from 'react'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const OpponentArea = () => {
  const { opponents, currentPlayer } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()

  return (
    <div className={`fixed top-0 left-0 right-0 z-10 ${
      isMobile && isPortrait
        ? 'bg-gradient-to-b from-slate-900/95 via-slate-800/95 to-transparent p-2'
        : 'bg-gradient-to-b from-slate-900 via-slate-800 to-transparent p-4 sm:p-6'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className={`flex justify-center flex-wrap ${
          isMobile && isPortrait ? 'gap-2 overflow-x-auto snap-x' : 'gap-4 sm:gap-6'
        }`}>
          {opponents.map((opponent) => {
            const isCurrentTurn = currentPlayer?.id === opponent.id
            return (
              <div
                key={opponent.id}
                className={`bg-white/10 backdrop-blur-md rounded-lg border-2 ${
                  isCurrentTurn ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-gray-600'
                } ${
                  isMobile && isPortrait 
                    ? 'p-2 flex-shrink-0 snap-center' 
                    : 'p-3 sm:p-4'
                }`}
              >
                <div className={`flex items-center ${
                  isMobile && isPortrait ? 'gap-2' : 'gap-3 sm:gap-4'
                }`}>
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={`/images/avatar/${opponent.avatar || opponent.id}.webp`}
                      alt={opponent.name}
                      className={`rounded-full border-2 border-white ${
                        isMobile && isPortrait ? 'w-10 h-10' : 'w-12 h-12 sm:w-16 sm:h-16'
                      }`}
                      onError={(e) => {
                        e.target.src = '/images/avatar/1.webp'
                      }}
                    />
                    {isCurrentTurn && (
                      <div className={`absolute -top-1 -right-1 bg-green-500 text-white rounded-full font-bold ${
                        isMobile && isPortrait ? 'text-[8px] px-1 py-0.5' : 'text-xs px-2 py-1'
                      }`}>
                        {isMobile && isPortrait ? '▶' : 'TURN'}
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className={isMobile && isPortrait ? 'space-y-1' : 'space-y-2'}>
                    <h4 className={`text-white font-bold ${
                      isMobile && isPortrait ? 'text-xs' : 'text-sm sm:text-base'
                    }`}>{opponent.name}</h4>
                    <div className={`flex items-center gap-2 sm:gap-4 text-gray-300 ${
                      isMobile && isPortrait ? 'text-[10px]' : 'text-xs sm:text-sm'
                    }`}>
                      <span>P: <strong className="text-white">{opponent.points}</strong></span>
                      <span>C: <strong className="text-white">{opponent.hand?.length || 0}</strong></span>
                    </div>
                    {!isMobile || !isPortrait ? (
                      <CrystalStack resources={opponent.resources} size="sm" />
                    ) : null}
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

