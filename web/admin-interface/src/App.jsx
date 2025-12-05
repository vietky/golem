import { useState, useEffect } from 'react'
import GameEventViewer from './components/GameEventViewer'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Game Event Viewer</h1>
          <p className="text-indigo-200 mt-2">View and replay game events in real-time</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <GameEventViewer />
      </main>
    </div>
  )
}

export default App
