import React, { useState } from 'react'

const RoomDisplay = ({ sessionId }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!sessionId) return null

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-lg px-4 py-2 flex items-center gap-3">
      <div className="flex flex-col">
        <span className="text-white/60 text-xs">Room ID</span>
        <span className="text-white font-mono text-sm">{sessionId}</span>
      </div>
      <button
        onClick={copyToClipboard}
        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
      >
        {copied ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  )
}

export default RoomDisplay
