import React from 'react'

const CrystalStack = ({ resources, size = 'md' }) => {
  const crystals = [
    { color: 'yellow', count: resources?.yellow || 0 },
    { color: 'green', count: resources?.green || 0 },
    { color: 'blue', count: resources?.blue || 0 },
    { color: 'pink', count: resources?.pink || 0 },
  ].filter((c) => c.count > 0)

  if (crystals.length === 0) {
    return <span className="text-gray-400 text-xs sm:text-sm">No crystals</span>
  }

  // Size classes for different screen sizes
  const sizeClasses = {
    xs: {
      icon: 'w-3 h-3',
      text: 'text-[10px]',
      gap: 'gap-1',
      innerGap: 'gap-0.5'
    },
    sm: {
      icon: 'w-4 h-4',
      text: 'text-xs',
      gap: 'gap-1.5',
      innerGap: 'gap-1'
    },
    md: {
      icon: 'w-5 h-5',
      text: 'text-sm',
      gap: 'gap-2',
      innerGap: 'gap-1'
    },
    lg: {
      icon: 'w-6 h-6',
      text: 'text-base',
      gap: 'gap-2',
      innerGap: 'gap-1.5'
    }
  }

  const currentSize = sizeClasses[size] || sizeClasses.md

  const colorClasses = {
    yellow: 'bg-yellow-400 border-yellow-600',
    green: 'bg-green-500 border-green-700',
    blue: 'bg-blue-500 border-blue-700',
    pink: 'bg-pink-400 border-pink-600',
  }

  return (
    <div className={`flex items-center flex-wrap ${currentSize.gap}`}>
      {crystals.map((crystal, idx) => (
        <div key={idx} className={`flex items-center ${currentSize.innerGap}`}>
          <div
            title={`${crystal.color} crystals`}
            className={`${currentSize.icon} rounded-full ${colorClasses[crystal.color]} border shadow-sm flex-shrink-0`}
          />
          <div className={`text-gray-800 font-semibold ${currentSize.text}`}>
            {crystal.count}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CrystalStack
