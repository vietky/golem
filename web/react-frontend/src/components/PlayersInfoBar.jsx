import React, { useState, useEffect } from 'react'
import useGameStore from '../store/gameStore'

// Timer Ring around avatar
const TimerRing = ({ duration = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(duration)
  const { gameState } = useGameStore()
  
  useEffect(() => {
    setTimeLeft(duration)
  }, [gameState?.currentPlayer, duration])
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [gameState?.currentPlayer])
  
  const progress = (timeLeft / duration) * 100
  const color = timeLeft > 30 ? '#22c55e' : timeLeft > 10 ? '#eab308' : '#ef4444'
  
  return (
    <div 
      className="absolute inset-[-3px] rounded-full"
      style={{
        background: `conic-gradient(${color} ${progress}%, transparent ${progress}%)`,
      }}
    />
  )
}

const PlayersInfoBar = () => {
  const { gameState, myPlayer, currentPlayer } = useGameStore()

  if (!gameState?.players) return null

  const otherPlayers = gameState.players.filter(p => p.id !== myPlayer?.id)
  if (otherPlayers.length === 0) return null

  return (
    <div data-players-info-bar className="w-full flex-shrink-0 py-1.5 px-2 bg-black/60">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {otherPlayers.map((player) => {
          const isCurrentTurn = currentPlayer?.id === player.id
          
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2 py-1 rounded-xl ${isCurrentTurn ? 'bg-yellow-500/20' : 'bg-white/5'}`}
            >
              {/* Avatar with timer ring for current turn */}
              <div className="relative">
                {isCurrentTurn && <TimerRing duration={60} />}
                <div className={`
                  relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${isCurrentTurn ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}
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

              {/* Info */}
              <div className="flex flex-col text-[10px]">
                {/* Row 1: Name + Points */}
                <div className="flex items-center gap-1">
                  <span className={`text-white font-medium ${player.online === false ? 'opacity-60' : ''}`}>
                    {player.name}
                    {player.online === false && <span className="text-gray-400 ml-1">(offline)</span>}
                  </span>
                  <span className="text-yellow-400 font-bold">★{player.points || 0}</span>
                </div>
                
                {/* Row 2: Crystals + Counts */}
                <div className="flex items-center gap-1.5">
                  {/* Crystals */}
                  {['yellow', 'green', 'blue', 'pink'].map((color) => {
                    const count = player.caravan?.[color] || 0
                    const bg = { yellow: 'bg-yellow-400', green: 'bg-green-500', blue: 'bg-blue-500', pink: 'bg-pink-400' }[color]
                    return (
                      <div key={color} className="flex items-center gap-0.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${bg}`}/>
                        <span className="text-white/80">{count}</span>
                      </div>
                    )
                  })}
                  
                  <span className="text-white/30">|</span>
                  
                  {/* Counts */}
                  <span className="text-blue-300">🎭{player.pointCards?.length || 0}</span>
                  <span className="text-green-300">🃏{player.playedCards?.length || 0}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlayersInfoBar
