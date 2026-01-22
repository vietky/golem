import React, { useState } from 'react'
import CardRenderer, { TokenRenderer } from './CardRenderer'
import { getCardRenderConfig, getTokenRenderConfig } from '../utils/cardNames'

/**
 * Example component demonstrating both sprite and individual image rendering
 * This shows how to use the new card resource system
 */
const CardRenderingExample = () => {
  const [useSprite, setUseSprite] = useState(true)
  
  // Sample cards to demonstrate
  const sampleCards = [
    'golem_0022',
    'golem_1111',
    'mint_0002',
    'trade_0002_0020',
    'upgrade_2'
  ]
  
  const sampleTokens = [
    'yellow_stone',
    'pink_stone',
    'blue_stone',
    'green_stone',
    'gold_coin',
    'silver_coin'
  ]

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          Card Rendering System Demo
        </h1>
        
        {/* Mode Toggle */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            <label className="text-white font-semibold">Rendering Mode:</label>
            <button
              onClick={() => setUseSprite(true)}
              className={`px-4 py-2 rounded ${
                useSprite 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              Sprite Mode (Optimized)
            </button>
            <button
              onClick={() => setUseSprite(false)}
              className={`px-4 py-2 rounded ${
                !useSprite 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              Individual Images
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {useSprite 
              ? '✅ Using CSS sprites (3 images total, better performance)'
              : '⚠️ Using individual images (more HTTP requests)'}
          </p>
        </div>

        {/* Cards Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Cards</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sampleCards.map((cardName) => {
              const config = getCardRenderConfig(cardName, { useSprite })
              return (
                <div key={cardName} className="bg-gray-800 p-4 rounded-lg">
                  <CardRenderer 
                    cardName={cardName}
                    useSprite={useSprite}
                    className="w-full aspect-[2/3] rounded-lg shadow-lg"
                  />
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    <div className="font-semibold text-white">{cardName}</div>
                    <div className="mt-1">
                      Mode: <span className="text-yellow-400">{config.mode}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tokens Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Tokens</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {sampleTokens.map((tokenName) => {
              const config = getTokenRenderConfig(tokenName, { useSprite })
              return (
                <div key={tokenName} className="bg-gray-800 p-4 rounded-lg">
                  <TokenRenderer 
                    tokenName={tokenName}
                    useSprite={useSprite}
                    className="w-16 h-16 mx-auto rounded-lg shadow-lg"
                  />
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    <div className="font-semibold text-white">{tokenName.replace('_', ' ')}</div>
                    <div className="mt-1">
                      <span className="text-yellow-400">{config.mode}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Manual Rendering Example */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Manual Rendering (Advanced)</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <p className="text-gray-400 mb-4">
              Using <code className="bg-gray-900 px-2 py-1 rounded">getCardRenderConfig</code> directly:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {sampleCards.slice(0, 2).map((cardName) => {
                const config = getCardRenderConfig(cardName, { useSprite })
                return (
                  <div key={cardName} className="bg-gray-900 p-4 rounded">
                    {config.mode === 'sprite' ? (
                      <div 
                        className="w-full aspect-[2/3] rounded-lg"
                        style={config.style}
                      />
                    ) : (
                      <img
                        src={config.imagePath}
                        alt={cardName}
                        className="w-full aspect-[2/3] rounded-lg object-cover"
                        onError={(e) => { e.target.src = '/assets/images/golem_bg.JPG' }}
                      />
                    )}
                    <pre className="text-xs text-green-400 mt-2 overflow-auto">
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Performance Info */}
        <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-blue-300 mb-2">💡 Performance Tips</h3>
          <ul className="text-blue-200 space-y-2">
            <li>
              <strong>Sprite Mode:</strong> Best for production - loads only 3 images regardless of card count
            </li>
            <li>
              <strong>Individual Mode:</strong> Better for development and debugging
            </li>
            <li>
              <strong>Default Setting:</strong> Change <code className="bg-blue-950 px-2 py-1 rounded">USE_SPRITE_IMAGES</code> in cardNames.js
            </li>
            <li>
              <strong>Per-Component:</strong> Override with <code className="bg-blue-950 px-2 py-1 rounded">useSprite</code> prop
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CardRenderingExample
