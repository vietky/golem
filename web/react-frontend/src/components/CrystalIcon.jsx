import React from 'react'

const CrystalIcon = ({ color, count = 1, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const colorClasses = {
    yellow: 'bg-golem-yellow border-yellow-400',
    green: 'bg-golem-green border-green-600',
    blue: 'bg-golem-blue border-blue-600',
    pink: 'bg-golem-pink border-pink-600',
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full border-2 shadow-lg flex items-center justify-center`}
      >
        <span className="text-white text-xs font-bold drop-shadow-md">
          {count > 1 ? count : ''}
        </span>
      </div>
    </div>
  )
}

export default CrystalIcon

