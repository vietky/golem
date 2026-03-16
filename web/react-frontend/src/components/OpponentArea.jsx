import React from 'react'
import CrystalStack from './CrystalStack'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'

const OpponentArea = () => {
  const { opponents, currentPlayer, gameState } = useGameStore()
  const { isMobile, isTablet, isPortrait, isLandscape, isDesktop } = useOrientation()

  // Get container styles based on device
  const getContainerStyles = () => {
    if (isMobile && isPortrait) {
      return 'bg-gradient-to-b from-slate-900/95 via-slate-800/90 to-transparent p-2 pt-safe-top'
    }
    if (isMobile && isLandscape) {
      return 'bg-gradient-to-b from-slate-900/95 to-transparent p-2'
    }
    return 'bg-gradient-to-b from-slate-900 via-slate-800 to-transparent p-3 sm:p-4 md:p-6'
  }

  // Get card styles based on device
  const getCardStyles = (isCurrentTurn) => {
    const baseStyles = 'bg-white/10 backdrop-blur-md rounded-lg'
    const borderStyles = isCurrentTurn 
      ? 'border-2 border-green-400 shadow-lg shadow-green-400/30' 
      : 'border border-gray-600/50'
    
    if (isMobile && isPortrait) {
      return `${baseStyles} ${borderStyles} p-1.5 flex-shrink-0 min-w-[100px] snap-center`
    }
    if (isMobile && isLandscape) {
      return `${baseStyles} ${borderStyles} p-2 flex-shrink-0 min-w-[120px]`
    }
    return `${baseStyles} ${borderStyles} p-3 sm:p-4`
  }

  return (
    <div className={`
      w-full
      ${getContainerStyles()}
    `}>
      {/* Game Info Bar - Compact on mobile */}
      <div className={`
        flex items-center justify-between mb-2
        ${isMobile ? 'text-xs' : 'text-sm max-w-7xl mx-auto'}
      `}>
        <div className="flex items-center gap-2 text-white/80">
          <span className="font-semibold">Round {gameState?.round || 1}</span>
          {gameState?.lastRound && (
            <span className="bg-red-500/80 text-white text-[10px] px-1.5 py-0.5 rounded animate-pulse">
              FINAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <span>Turn {gameState?.currentTurn || 1}</span>
        </div>
      </div>

      {/* Opponents List */}
      <div className={`
        ${isMobile && isPortrait 
          ? 'flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-thin' 
          : isMobile && isLandscape
            ? 'flex gap-2 overflow-x-auto pb-1'
            : 'flex justify-center flex-wrap gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto'
        }
      `}>
        {opponents.map((opponent) => {
          const isCurrentTurn = currentPlayer?.id === opponent.id
          
          return (
            <div
              key={opponent.id}
              className={getCardStyles(isCurrentTurn)}
            >
              <div className={`
                flex items-center 
                ${isMobile && isPortrait ? 'gap-1.5' : isMobile ? 'gap-2' : 'gap-3 sm:gap-4'}
              `}>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={`https://statics.vietky.io.vn/images/avatar/${opponent.avatar || opponent.id}.webp`}
                    alt={opponent.name}
                    className={`
                      rounded-full border-2 border-white object-cover
                      ${isMobile && isPortrait 
                        ? 'w-8 h-8' 
                        : isMobile 
                          ? 'w-10 h-10' 
                          : 'w-12 h-12 sm:w-14 sm:h-14'
                      }
                    `}
                    onError={(e) => {
                      e.target.src = 'https://statics.vietky.io.vn/images/avatar/1.webp'
                    }}
                  />
                  {isCurrentTurn && (
                    <div className={`
                      absolute -top-1 -right-1 bg-green-500 text-white rounded-full font-bold
                      flex items-center justify-center
                      ${isMobile ? 'text-[8px] w-4 h-4' : 'text-[10px] w-5 h-5'}
                    `}>
                      ▶
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className={`
                  flex flex-col
                  ${isMobile && isPortrait ? 'gap-0.5' : 'gap-1'}
                `}>
                  {/* Name */}
                  <h4 className={`
                    text-white font-bold truncate
                    ${isMobile && isPortrait 
                      ? 'text-[10px] max-w-[60px]' 
                      : isMobile 
                        ? 'text-xs max-w-[80px]' 
                        : 'text-sm sm:text-base'
                    }
                  `}>
                    {opponent.name}
                  </h4>
                  
                  {/* Stats Row */}
                  <div className={`
                    flex items-center text-gray-300 
                    ${isMobile && isPortrait 
                      ? 'gap-1.5 text-[9px]' 
                      : isMobile 
                        ? 'gap-2 text-[10px]' 
                        : 'gap-3 text-xs sm:text-sm'
                    }
                  `}>
                    <span title="Points">
                      <strong className="text-yellow-300">{opponent.points}</strong>
                      <span className="text-white/50 ml-0.5">pts</span>
                    </span>
                    <span title="Cards in hand">
                      <strong className="text-white">{opponent.hand?.length || 0}</strong>
                      <span className="text-white/50 ml-0.5">🃏</span>
                    </span>
                  </div>
                  
                  {/* Crystals - Hidden on mobile portrait, compact on mobile landscape */}
                  {(!isMobile || isLandscape || isTablet) && (
                    <div className="mt-1">
                      <CrystalStack 
                        resources={opponent.resources} 
                        size={isMobile ? "xs" : "sm"} 
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Crystal summary for mobile portrait - compact inline */}
              {isMobile && isPortrait && opponent.resources && (
                <div className="flex gap-0.5 mt-1 justify-center text-[8px]">
                  <span className="text-yellow-400">{opponent.resources.yellow || 0}</span>
                  <span className="text-green-400">{opponent.resources.green || 0}</span>
                  <span className="text-blue-400">{opponent.resources.blue || 0}</span>
                  <span className="text-pink-400">{opponent.resources.pink || 0}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OpponentArea
