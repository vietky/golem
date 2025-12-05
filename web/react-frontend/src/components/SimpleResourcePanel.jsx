import React from 'react'
import useGameStore from '../store/gameStore'

const SimpleResourcePanel = ({ showDetailed = false }) => {
  const { myPlayer, rest, currentPlayer, gameState } = useGameStore()

  if (!myPlayer) return null

  const isMyTurn = currentPlayer?.id === myPlayer?.id
  const resources = myPlayer.resources || {}
  const total = (resources.yellow || 0) + (resources.green || 0) + (resources.blue || 0) + (resources.pink || 0)
  const maxCrystals = 10

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <div className="bg-black/30 backdrop-blur-md rounded-lg border border-white/20 p-4 min-w-[200px]">
        {/* Player Name & Turn Indicator */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">{myPlayer.name}</h3>
          {isMyTurn && (
            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded animate-pulse">
              YOUR TURN
            </div>
          )}
        </div>

        {/* Score & Point Cards */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-white text-sm">
          <div className="bg-white/10 rounded px-2 py-1">
            <div className="text-xs opacity-75">Score</div>
            <div className="text-lg font-bold">{myPlayer.points || 0}</div>
          </div>
          <div className="bg-white/10 rounded px-2 py-1">
            <div className="text-xs opacity-75">Cards</div>
            <div className="text-lg font-bold">{myPlayer.pointCards?.length || 0}/5</div>
          </div>
        </div>

        {/* Crystals with Icons */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center text-white text-xs mb-1">
            <span className="opacity-75">Crystals</span>
            <span className="font-bold">{total}/{maxCrystals}</span>
          </div>
          
          {/* Crystal Count Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                total > maxCrystals ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((total / maxCrystals) * 100, 100)}%` }}
            />
          </div>

          {/* Individual Crystals */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between bg-yellow-500/20 rounded px-2 py-1">
              <span className="text-yellow-300 text-xs">●</span>
              <span className="text-white font-bold">{resources.yellow || 0}</span>
            </div>
            <div className="flex items-center justify-between bg-green-500/20 rounded px-2 py-1">
              <span className="text-green-300 text-xs">●</span>
              <span className="text-white font-bold">{resources.green || 0}</span>
            </div>
            <div className="flex items-center justify-between bg-blue-500/20 rounded px-2 py-1">
              <span className="text-blue-300 text-xs">●</span>
              <span className="text-white font-bold">{resources.blue || 0}</span>
            </div>
            <div className="flex items-center justify-between bg-pink-500/20 rounded px-2 py-1">
              <span className="text-pink-300 text-xs">●</span>
              <span className="text-white font-bold">{resources.pink || 0}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={rest}
            disabled={!isMyTurn || myPlayer.playedCards?.length === 0}
            className={`w-full py-2 rounded font-semibold text-sm transition-colors ${
              isMyTurn && myPlayer.playedCards?.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Rest ({myPlayer.playedCards?.length || 0} played)
          </button>
        </div>

        {/* Game Status */}
        {showDetailed && (
          <div className="mt-3 pt-3 border-t border-white/10 text-white text-xs space-y-1">
            <div className="flex justify-between opacity-75">
              <span>Round:</span>
              <span>{gameState?.round || 1}</span>
            </div>
            <div className="flex justify-between opacity-75">
              <span>Hand:</span>
              <span>{myPlayer.hand?.length || 0} cards</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleResourcePanel
