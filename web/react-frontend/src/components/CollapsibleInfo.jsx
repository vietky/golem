import React, { useState } from 'react'
import RoomDisplay from './RoomDisplay'
import ActionLog from './ActionLog'

const CollapsibleInfo = ({ sessionId }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed State - Icon Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all hover:scale-110"
          title="Show Info"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </button>
      )}

      {/* Expanded State - Show Room ID and Action Log */}
      {isExpanded && (
        <div className="bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl overflow-hidden min-w-[320px] max-w-md">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between bg-purple-600 px-4 py-2">
            <h3 className="text-white font-bold text-sm">Game Info</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Room ID Section */}
            <div>
              <h4 className="text-white/70 text-xs font-semibold mb-2">Room ID</h4>
              <RoomDisplay sessionId={sessionId} />
            </div>

            {/* Action Log Section */}
            <div>
              <h4 className="text-white/70 text-xs font-semibold mb-2">Action Log</h4>
              <div className="bg-black/40 rounded-lg p-2 max-h-64 overflow-y-auto">
                <ActionLog compact={true} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CollapsibleInfo
