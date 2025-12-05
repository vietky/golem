import React from 'react'
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
      className={`${sizeClasses[size]} ${borderColor} border-2 rounded-lg p-2 flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform ${
        canInteract ? 'opacity-100' : 'opacity-70'
      } ${canInteract ? 'ring-2 ring-white' : ''}`}
    >
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
