import React, { useState } from 'react'
import CrystalStack from './CrystalStack'
import { getVietnameseCardName } from '../utils/cardNames'

const SimpleCard = ({ 
  card, 
  type, 
  index, 
  cost = null, 
  isPlayable = false, 
  isAffordable = false, 
  onClick,
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  
  if (!card) return null

  const cardTypeColors = {
    produce: 'border-green-500 bg-green-900/30',
    upgrade: 'border-blue-500 bg-blue-900/30',
    trade: 'border-pink-500 bg-pink-900/30',
    points: 'border-yellow-500 bg-yellow-900/30',
  }

  const actionType = card?.actionType !== undefined 
    ? ['produce', 'upgrade', 'trade'][card.actionType] 
    : type === 'point' ? 'points' : 'produce'

  const sizeClasses = {
    small: 'w-20 h-28 text-[8px]',
    normal: 'w-32 h-44 text-xs',
    large: 'w-40 h-56 text-sm'
  }

  const handleClick = () => {
    if (onClick && (isPlayable || isAffordable)) {
      onClick()
    }
  }

  const borderColor = cardTypeColors[actionType] || 'border-gray-500 bg-gray-900/30'
  const canInteract = isPlayable || isAffordable

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`${sizeClasses[size]} ${borderColor} border-2 rounded-lg p-2 flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform relative ${
        canInteract ? 'opacity-100' : 'opacity-70'
      } ${canInteract ? 'ring-2 ring-white' : ''}`}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-28 left-1/2 transform -translate-x-1/2 bg-black/95 backdrop-blur-md text-white p-3 rounded-lg text-xs whitespace-nowrap z-50 border border-white/30 shadow-xl min-w-[200px]">
          <div className="font-bold mb-2">{card.name}</div>
          <div className="text-gray-400 text-[10px] mb-2">ID: #{card.id || index}</div>
          
          {/* Card Type */}
          {actionType === 'produce' && <div className="text-green-400 font-semibold">Type: Produce Card</div>}
          {actionType === 'upgrade' && <div className="text-blue-400 font-semibold">Type: Upgrade Card (Lv.{card.upgradeLevel || card.turnUpgrade || 2})</div>}
          {actionType === 'trade' && <div className="text-pink-400 font-semibold">Type: Trade Card</div>}
          {actionType === 'points' && (
            <>
              <div className="text-yellow-400 font-semibold">Type: Point Card</div>
              <div className="text-yellow-300 mt-1">Point Value: {card.points}</div>
            </>
          )}
          
          {/* Crystal Cost (for market cards) */}
          {cost && (cost.yellow + cost.green + cost.blue + cost.pink > 0) && (
            <div className="mt-1 text-red-400">
              Crystal Cost: 🟡{cost.yellow || 0} 🟢{cost.green || 0} 🔵{cost.blue || 0} 🟣{cost.pink || 0}
            </div>
          )}

          {/* Crystal Requirement (for point cards) */}
          {card.requirement && (card.requirement.yellow + card.requirement.green + card.requirement.blue + card.requirement.pink > 0) && (
            <div className="mt-1 text-orange-400">
              Crystal Cost: 🟡{card.requirement.yellow || 0} 🟢{card.requirement.green || 0} 🔵{card.requirement.blue || 0} 🟣{card.requirement.pink || 0}
            </div>
          )}

          {/* Crystal Produced (for produce cards) */}
          {actionType === 'produce' && card.output && (card.output.yellow + card.output.green + card.output.blue + card.output.pink > 0) && (
            <div className="mt-1 text-green-300">
              Crystal Produced: 🟡{card.output.yellow || 0} 🟢{card.output.green || 0} 🔵{card.output.blue || 0} 🟣{card.output.pink || 0}
            </div>
          )}
          
          {/* Input → Output (for trade/upgrade cards) */}
          {(actionType === 'upgrade' || actionType === 'trade') && card.input && card.output && (
            <div className="mt-1">
              <div className="text-red-300">Input: 🟡{card.input.yellow || 0} 🟢{card.input.green || 0} 🔵{card.input.blue || 0} 🟣{card.input.pink || 0}</div>
              <div className="text-white">↓</div>
              <div className="text-green-300">Output: 🟡{card.output.yellow || 0} 🟢{card.output.green || 0} 🔵{card.output.blue || 0} 🟣{card.output.pink || 0}</div>
            </div>
          )}

          {/* Upgrade Level */}
          {actionType === 'upgrade' && (
            <div className="mt-1 text-blue-300">
              Upgrade Level: {card.upgradeLevel || card.turnUpgrade || 2}
            </div>
          )}
        </div>
      )}
      
      {/* Card Name */}
      <div className="font-bold text-white text-center leading-tight mb-1">
        {getVietnameseCardName(card.name)}
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-1">
        {/* Input Resources (for trade/upgrade) */}
        {card.input && card.input.yellow + card.input.green + card.input.blue + card.input.pink > 0 && (
          <div className="flex items-center justify-center gap-1">
            <CrystalStack resources={card.input} size="xs" />
          </div>
        )}

        {/* Arrow for trade cards */}
        {card.actionType === 2 && card.output && (
          <div className="text-white text-lg">↓</div>
        )}

        {/* Output Resources or Point value */}
        {card.output && card.output.yellow + card.output.green + card.output.blue + card.output.pink > 0 && (
          <div className="flex items-center justify-center gap-1">
            <CrystalStack resources={card.output} size="xs" />
          </div>
        )}

        {card.points !== undefined && card.points > 0 && (
          <div className="text-yellow-400 font-bold text-lg">{card.points}★</div>
        )}

        {/* Requirement for point cards */}
        {card.requirement && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <CrystalStack resources={card.requirement} size="xs" />
          </div>
        )}
      </div>

      {/* Cost (for market cards) */}
      {cost && (cost.yellow + cost.green + cost.blue + cost.pink > 0) && (
        <div className="flex items-center justify-center gap-1 bg-black/40 rounded p-1 mt-1">
          <span className="text-white text-[10px]">Cost:</span>
          <CrystalStack resources={cost} size="xs" />
        </div>
      )}

      {/* Deposits indicator */}
      {card.deposits && Object.keys(card.deposits).length > 0 && (
        <div className="text-center text-[10px] text-green-400 mt-1">
          +{Object.values(card.deposits).reduce((a, b) => parseInt(a) + parseInt(b), 0)} 💎
        </div>
      )}
    </div>
  )
}

export default SimpleCard
