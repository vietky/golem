import { useState, useEffect } from 'react'
import EventList from './EventList'
import GameStateViewer from './GameStateViewer'
import AddActionForm from './AddActionForm'

function GameEventViewer() {
  const [gameId, setGameId] = useState('')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchEvents = async () => {
    if (!gameId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events?gameId=${encodeURIComponent(gameId)}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setEvents(data.events || [])
      
      // Auto-select the first event if none selected
      if (!selectedEvent && data.events && data.events.length > 0) {
        setSelectedEvent(data.events[0])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEventSelect = (event) => {
    setSelectedEvent(event)
  }

  const handleActionAdded = () => {
    // Refresh events after adding a new action
    fetchEvents()
  }

  useEffect(() => {
    if (gameId) {
      fetchEvents()
    }
  }, [gameId])

  useEffect(() => {
    if (autoRefresh && gameId) {
      const interval = setInterval(fetchEvents, 2000) // Refresh every 2 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, gameId])

  return (
    <div className="space-y-6">
      {/* Game ID Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="gameId" className="block text-sm font-medium text-gray-700 mb-2">
              Game ID
            </label>
            <input
              type="text"
              id="gameId"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter game ID (e.g., session-123)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchEvents}
              disabled={!gameId || loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load Events'}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
            </label>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      {gameId && events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event List */}
          <div className="bg-white rounded-lg shadow">
            <EventList 
              events={events} 
              selectedEvent={selectedEvent}
              onEventSelect={handleEventSelect}
            />
          </div>

          {/* Game State Viewer */}
          <div className="space-y-6">
            {selectedEvent && (
              <div className="bg-white rounded-lg shadow">
                <GameStateViewer event={selectedEvent} />
              </div>
            )}
            
            {/* Add Action Form */}
            <div className="bg-white rounded-lg shadow">
              <AddActionForm 
                gameId={gameId}
                onActionAdded={handleActionAdded}
              />
            </div>
          </div>
        </div>
      )}

      {gameId && events.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No events found for this game ID</p>
          <p className="text-gray-400 text-sm mt-2">Try a different game ID or create a new game</p>
        </div>
      )}
    </div>
  )
}

export default GameEventViewer
