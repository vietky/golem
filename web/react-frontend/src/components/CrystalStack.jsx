import React from 'react'
import CrystalIcon from './CrystalIcon'

const CrystalStack = ({ resources, size = 'md' }) => {
  const crystals = [
    { color: 'yellow', count: resources?.yellow || 0 },
    { color: 'green', count: resources?.green || 0 },
    { color: 'blue', count: resources?.blue || 0 },
    { color: 'pink', count: resources?.pink || 0 },
  ].filter((c) => c.count > 0)

  if (crystals.length === 0) {
    return <span className="text-gray-400 text-sm">No crystals</span>
  }

  const sizeClass = size === 'xs' ? 'w-4 h-4 text-xs' : size === 'sm' ? 'w-5 h-5 text-sm' : 'w-6 h-6 text-sm'

  const colorClasses = {
    yellow: 'bg-yellow-400 border-yellow-600',
    green: 'bg-green-500 border-green-700',
    blue: 'bg-blue-500 border-blue-700',
    pink: 'bg-pink-400 border-pink-600',
  }

  return (
    <div className="flex items-center gap-2">
      {crystals.map((crystal, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div
            title={`${crystal.color} crystals`}
            className={`${sizeClass} rounded-full ${colorClasses[crystal.color]} border shadow-sm`}
          />
          <div className="text-gray-800 font-semibold text-sm">{crystal.count}</div>
        </div>
      ))}
    </div>
  )
}

export default CrystalStack

