import { useState } from 'react'

function AddActionForm({ gameId, onActionAdded }) {
  const [actionType, setActionType] = useState('0')
  const [cardIndex, setCardIndex] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    // Note: This is a placeholder. In a real implementation, you would need
    // a WebSocket connection or API endpoint to submit actions to the game server
    // For now, we'll just show a message
    
    setTimeout(() => {
      setMessage({
        type: 'info',
        text: 'Note: Direct action submission not yet implemented. Use the game UI to perform actions.'
      })
      setSubmitting(false)
    }, 500)
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Add New Action
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action Type
          </label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="0">Play Card</option>
            <option value="1">Acquire Card</option>
            <option value="2">Claim Point Card</option>
            <option value="3">Rest</option>
          </select>
        </div>

        {actionType !== '3' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Index
            </label>
            <input
              type="number"
              min="0"
              value={cardIndex}
              onChange={(e) => setCardIndex(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Add Action'}
        </button>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

export default AddActionForm
