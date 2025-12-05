import React, { useState } from 'react'

const getCardImagePath = (card, type) => {
//   if (type === 'point' || card?.points !== undefined) {
//     const pointValue = card.points || 0
//     return `/images/golem_${pointValue.toString().padStart(4, '0')}.JPG`
//   }
  
  if (card?.name) {
    return `/images/${card.name}.JPG`
  }
  
  return null
}

const CompactCard = ({ 
  card, 
  type, 
  index, 
  cost = null, 
  isPlayable = false, 
  isAffordable = false, 
  onClick,
  size = 'normal', // 'small', 'normal'
  showDetails = false
}) => {
  const [showHover, setShowHover] = useState(false)
  
  if (!card) return null

  const imagePath = getCardImagePath(card, type)
  
  const sizeClasses = {
    small: 'w-16 h-24',
    normal: 'w-28 h-44'
  }

  const handleClick = () => {
    if (onClick && (isPlayable || isAffordable)) {
      onClick()
    }
  }

  const canInteract = isPlayable || isAffordable
  
  // Calculate total crystals for display
  const getTotalCrystals = (resources) => {
    if (!resources) return 0
    return (resources.yellow || 0) + (resources.green || 0) + (resources.blue || 0) + (resources.pink || 0)
  }

  const inputTotal = getTotalCrystals(card.input)
  const outputTotal = getTotalCrystals(card.output)
  const costTotal = getTotalCrystals(cost)
  
  // Get upgrade level for upgrade cards
  const upgradeLevel = card.actionType === 1 ? (card.upgradeLevel || 1) : null

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
      className={`card-base ${sizeClasses[size]} relative overflow-hidden cursor-pointer transition-all`} // use card-base for shared styling
      style={{
        backgroundImage: imagePath ? `url(${encodeURI(imagePath)})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#222' // fallback background to ensure visibility
      }}
    >
      {/* Provide a real image element with alt text for accessibility and to satisfy "alt" requirement */}
      {imagePath && (
        <img src={imagePath} alt={`card #${card.id || index}`} className="sr-only" />
      )}
      {/* Upgrade Icon - Center */}
      {upgradeLevel !== null && (
        <div className="card-upgrade z-10">
          <div className="card-upgrade-icon">
            <span className="text-white text-3xl font-bold">↑</span>
          </div>
          <div className="card-upgrade-level">Lv.{upgradeLevel}</div>
        </div>
      )}

      {/* Card ID - Hidden but available via tooltip */}
      {/* <div className="card-id z-10">#{card.id || index}</div> */}

      {/* Hover Details - Enhanced Tooltip */}
      {showHover && (
        <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 bg-black/95 backdrop-blur-md text-white p-3 rounded-lg text-xs whitespace-nowrap z-50 border border-white/30 shadow-xl min-w-[200px]">
          <div className="font-bold mb-2">{card.name}</div>
          <div className="text-gray-400 text-[10px] mb-2">ID: #{card.id || index}</div>
          
          {/* Card Type */}
          {card.actionType === 0 && <div className="text-green-400 font-semibold">Type: Produce Card</div>}
          {card.actionType === 1 && <div className="text-blue-400 font-semibold">Type: Upgrade Card (Lv.{upgradeLevel})</div>}
          {card.actionType === 2 && <div className="text-pink-400 font-semibold">Type: Trade Card</div>}
          {type === 'point' && (
            <>
              <div className="text-yellow-400 font-semibold">Type: Point Card</div>
              <div className="text-yellow-300 mt-1">Point Value: {card.points}</div>
            </>
          )}
          
          {/* Crystal Cost (for market cards) */}
          {cost && costTotal > 0 && (
            <div className="mt-1 text-red-400">
              Crystal Cost: 
              {cost.yellow > 0 && ` 🟡${cost.yellow}`}
              {cost.green > 0 && ` 🟢${cost.green}`}
              {cost.blue > 0 && ` 🔵${cost.blue}`}
              {cost.pink > 0 && ` 🟣${cost.pink}`}
            </div>
          )}

          {/* Crystal Requirement (for point cards) */}
          {card.requirement && getTotalCrystals(card.requirement) > 0 && (
            <div className="mt-1 text-orange-400">
              Crystal Cost: 
              {card.requirement.yellow > 0 && ` 🟡${card.requirement.yellow}`}
              {card.requirement.green > 0 && ` 🟢${card.requirement.green}`}
              {card.requirement.blue > 0 && ` 🔵${card.requirement.blue}`}
              {card.requirement.pink > 0 && ` 🟣${card.requirement.pink}`}
            </div>
          )}

          {/* Crystal Produced (for produce cards) */}
          {card.actionType === 0 && card.output && outputTotal > 0 && (
            <div className="mt-1 text-green-300">
              Crystal Produced: 
              {card.output.yellow > 0 && ` 🟡${card.output.yellow}`}
              {card.output.green > 0 && ` 🟢${card.output.green}`}
              {card.output.blue > 0 && ` 🔵${card.output.blue}`}
              {card.output.pink > 0 && ` 🟣${card.output.pink}`}
            </div>
          )}
          
          {/* Input → Output (for trade/upgrade cards) */}
          {(card.actionType === 1 || card.actionType === 2) && card.input && card.output && (
            <div className="mt-1">
              <span className="text-red-300">Input: </span>
              {card.input.yellow > 0 && `🟡${card.input.yellow} `}
              {card.input.green > 0 && `🟢${card.input.green} `}
              {card.input.blue > 0 && `🔵${card.input.blue} `}
              {card.input.pink > 0 && `🟣${card.input.pink} `}
              <span className="text-white">→</span>
              <span className="text-green-300"> Output: </span>
              {card.output.yellow > 0 && `🟡${card.output.yellow} `}
              {card.output.green > 0 && `🟢${card.output.green} `}
              {card.output.blue > 0 && `🔵${card.output.blue} `}
              {card.output.pink > 0 && `🟣${card.output.pink}`}
            </div>
          )}

          {/* Upgrade Level */}
          {card.actionType === 1 && upgradeLevel && (
            <div className="mt-1 text-blue-300">
              Upgrade Level: {upgradeLevel}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CompactCard
