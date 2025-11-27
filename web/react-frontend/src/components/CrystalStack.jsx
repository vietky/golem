import React from 'react'
import CrystalIcon from './CrystalIcon'

const CrystalStack = ({ resources, size = 'md' }) => {
  const crystals = [
    { color: 'yellow', count: resources?.yellow || 0 },
    { color: 'green', count: resources?.green || 0 },
    { color: 'blue', count: resources?.blue || 0 },
    { color: 'pink', count: resources?.pink || 0 },
  ].filter(c => c.count > 0)

  if (crystals.length === 0) {
    return <span className="text-gray-400 text-sm">No crystals</span>
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {crystals.map((crystal, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <CrystalIcon color={crystal.color} count={crystal.count} size={size} />
        </div>
      ))}
    </div>
  )
}

export default CrystalStack

