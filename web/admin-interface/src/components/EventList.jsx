function EventList({ events, selectedEvent, onEventSelect }) {
  const getActionTypeLabel = (action) => {
    const types = {
      0: 'Play Card',
      1: 'Acquire Card',
      2: 'Claim Point Card',
      3: 'Rest'
    }
    return types[action.Type] || 'Unknown'
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Event History ({events.length})
      </h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {events.map((event, index) => {
          const isInitial = event.action.Type === -1
          const isSelected = selectedEvent && selectedEvent.sequenceNum === event.sequenceNum
          
          return (
            <div
              key={event.id || index}
              onClick={() => onEventSelect(event)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm font-semibold text-gray-600">
                    Event #{event.sequenceNum}
                  </span>
                  {isInitial ? (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Initial State
                    </span>
                  ) : (
                    <>
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Player {event.playerId}
                      </span>
                      <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        {getActionTypeLabel(event.action)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                {formatTimestamp(event.timestamp)}
              </p>
              
              {!isInitial && event.action.CardIndex >= 0 && (
                <p className="text-sm text-gray-700 mt-2">
                  Card Index: {event.action.CardIndex}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EventList
