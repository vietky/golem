function GameStateViewer({ event }) {
  const gameState = event.gameState

  const formatResources = (resources) => {
    if (!resources) return 'None'
    const parts = []
    if (resources.Yellow > 0) parts.push(`🟡 ${resources.Yellow}`)
    if (resources.Green > 0) parts.push(`🟢 ${resources.Green}`)
    if (resources.Blue > 0) parts.push(`🔵 ${resources.Blue}`)
    if (resources.Pink > 0) parts.push(`🟣 ${resources.Pink}`)
    return parts.length > 0 ? parts.join(' ') : 'None'
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Game State (Event #{event.sequenceNum})
      </h2>
      
      <div className="space-y-4">
        {/* Game Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Game Info</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Round:</span>
              <span className="ml-2 font-medium">{gameState.Round}</span>
            </div>
            <div>
              <span className="text-gray-600">Current Turn:</span>
              <span className="ml-2 font-medium">{gameState.CurrentTurn + 1}</span>
            </div>
            <div>
              <span className="text-gray-600">Current Player:</span>
              <span className="ml-2 font-medium">Player {(gameState.CurrentTurn % gameState.Players.length) + 1}</span>
            </div>
            <div>
              <span className="text-gray-600">Game Over:</span>
              <span className="ml-2 font-medium">{gameState.GameOver ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-3">Players</h3>
          <div className="space-y-3">
            {gameState.Players.map((player, index) => (
              <div key={player.ID} className="bg-white p-3 rounded border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-800">
                    {player.Name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {player.Points} points
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-600">Resources:</span>
                    <span className="ml-2">{formatResources(player.Resources)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Hand: {player.Hand.length} cards</div>
                    <div>Played: {player.PlayedCards.length} cards</div>
                    <div>Point Cards: {player.PointCards.length}</div>
                    <div>Coins: {player.Coins.length}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-3">Market</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Action Cards:</span>
              <span className="ml-2 font-medium">{gameState.Market.ActionCards.length} visible</span>
              <span className="ml-2 text-gray-500">({gameState.Market.ActionDeck.length} in deck)</span>
            </div>
            <div>
              <span className="text-gray-600">Point Cards:</span>
              <span className="ml-2 font-medium">{gameState.Market.PointCards.length} visible</span>
              <span className="ml-2 text-gray-500">({gameState.Market.PointDeck.length} in deck)</span>
            </div>
          </div>
        </div>

        {/* Action Details */}
        {event.action.Type >= 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Action Taken</h3>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-gray-600">Player:</span>
                <span className="ml-2 font-medium">Player {event.playerId}</span>
              </div>
              {event.action.CardIndex >= 0 && (
                <div>
                  <span className="text-gray-600">Card Index:</span>
                  <span className="ml-2 font-medium">{event.action.CardIndex}</span>
                </div>
              )}
              {event.action.InputResources && (
                <div>
                  <span className="text-gray-600">Input:</span>
                  <span className="ml-2">{formatResources(event.action.InputResources)}</span>
                </div>
              )}
              {event.action.OutputResources && (
                <div>
                  <span className="text-gray-600">Output:</span>
                  <span className="ml-2">{formatResources(event.action.OutputResources)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameStateViewer
