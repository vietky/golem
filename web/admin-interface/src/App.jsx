import { useState, useEffect } from 'react'
import GameEventViewer from './components/GameEventViewer'
import RoomHistory from './components/RoomHistory'

function App() {
  const [activeTab, setActiveTab] = useState('rooms') // 'rooms' or 'events'

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Century: Golem Edition - Admin Panel</h1>
          <p className="text-indigo-200 mt-2">Monitor active rooms and view game history</p>
        </div>
      </header>
      
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'rooms'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Room Management
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'events'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Event Viewer
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'rooms' ? <RoomHistory /> : <GameEventViewer />}
      </main>
    </div>
  )
}

export default App
