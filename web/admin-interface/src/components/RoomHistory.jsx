import React, { useState, useEffect } from 'react'

const RoomHistory = () => {
  const [sessions, setSessions] = useState([])
  const [allGames, setAllGames] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRooms()
    fetchAllGames()
    const interval = setInterval(() => {
      fetchRooms()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/list')
      const data = await response.json()
      if (response.ok) {
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllGames = async () => {
    try {
      const response = await fetch('/api/games')
      const data = await response.json()
      if (response.ok) {
        setAllGames(data.games || [])
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  const fetchRoomEvents = async (gameId) => {
    try {
      const response = await fetch(`/api/events?gameID=${gameId}`)
      const data = await response.json()
      if (response.ok) {
        setSelectedRoom({ gameId, events: data.events || [] })
      }
    } catch (error) {
      console.error('Error fetching room events:', error)
    }
  }

  const copyRoomId = (sessionId) => {
    navigator.clipboard.writeText(sessionId)
    alert('Room ID copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Rooms</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No active rooms
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <div
                key={session.sessionID}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800">
                    Room #{session.sessionID.slice(-8)}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    session.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span className="font-medium">{session.connectedPlayers}/{session.numPlayers}</span>
                  </div>
                  {session.players && session.players.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Joined: </span>
                      <span className="text-xs">{session.players.join(', ')}</span>
                    </div>
                  )}
                  {session.timeUntilDelete > 0 && session.connectedPlayers === 0 && (
                    <div className="text-xs text-red-600">
                      Deleting in {Math.floor(session.timeUntilDelete / 60)}m {session.timeUntilDelete % 60}s
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyRoomId(session.sessionID)}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Copy ID
                  </button>
                  <button
                    onClick={() => fetchRoomEvents(session.sessionID)}
                    className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    View Events
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">All Game History</h2>
        {allGames.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No games recorded
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Game ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allGames.map((game) => (
                  <tr key={game.gameID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {game.gameID}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {game.eventCount || 0} events
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {game.lastUpdated ? new Date(game.lastUpdated).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => fetchRoomEvents(game.gameID)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                Room Events: {selectedRoom.gameId}
              </h3>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedRoom.events.length === 0 ? (
                <p className="text-gray-500 text-center">No events recorded</p>
              ) : (
                <div className="space-y-3">
                  {selectedRoom.events.map((event, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-700">Event #{index + 1}</span>
                        <span className="text-xs text-gray-500">
                          {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><span className="font-medium">Player:</span> {event.playerID || 'System'}</div>
                        <div><span className="font-medium">Action:</span> {event.actionType || 'Unknown'}</div>
                        {event.details && (
                          <div className="mt-2 bg-white p-2 rounded border border-gray-100">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomHistory
