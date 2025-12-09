import React, { useState } from 'react'
import RoomDisplay from './RoomDisplay'
import ActionLog from './ActionLog'
import useOrientation from '../hooks/useOrientation'

const CollapsibleInfo = ({ sessionId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isMobile, isPortrait } = useOrientation()

  // Hide completely on mobile portrait (already hidden in SinglePlayerApp)
  if (isMobile && isPortrait) {
    return null
  }

  return (
    <div className={`
      fixed z-50
      ${isMobile 
        ? 'bottom-2 right-2' 
        : 'bottom-4 right-4'
      }
    `}>
      {/* Collapsed State - Icon Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            bg-purple-600 hover:bg-purple-700 text-white rounded-full 
            flex items-center justify-center shadow-lg transition-all hover:scale-110
            ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}
          `}
          title="Show Info"
        >
          <svg 
            className={isMobile ? 'w-5 h-5' : 'w-6 h-6'}
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
        <div className={`
          bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl overflow-hidden
          ${isMobile 
            ? 'min-w-[240px] max-w-[280px]' 
            : 'min-w-[320px] max-w-md'
          }
        `}>
          {/* Header with Close Button */}
          <div className={`
            flex items-center justify-between bg-purple-600
            ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'}
          `}>
            <h3 className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>Game Info</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className={`
                text-white hover:bg-white/20 rounded-full flex items-center justify-center transition-all
                ${isMobile ? 'w-5 h-5 text-xs' : 'w-6 h-6'}
              `}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className={`
            space-y-3 overflow-y-auto
            ${isMobile 
              ? 'p-2 max-h-[40vh]' 
              : 'p-4 space-y-4 max-h-[60vh]'
            }
          `}>
            {/* Room ID Section */}
            <div>
              <h4 className={`text-white/70 font-semibold ${isMobile ? 'text-[10px] mb-1' : 'text-xs mb-2'}`}>
                Room ID
              </h4>
              <RoomDisplay sessionId={sessionId} />
            </div>

            {/* Action Log Section */}
            <div>
              <h4 className={`text-white/70 font-semibold ${isMobile ? 'text-[10px] mb-1' : 'text-xs mb-2'}`}>
                Action Log
              </h4>
              <div className={`
                bg-black/40 rounded-lg overflow-y-auto
                ${isMobile ? 'p-1.5 max-h-40' : 'p-2 max-h-64'}
              `}>
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
