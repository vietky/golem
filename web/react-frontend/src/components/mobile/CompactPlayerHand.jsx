import React, { useState, useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'
import useOrientation from '../../hooks/useOrientation'
import CompactCard from '../CompactCard'
import UpgradeModal from '../UpgradeModal'
import TradeModal from '../TradeModal'
import PlayedCardsView from '../PlayedCardsView'
import { getImageUrl } from '../../utils/cdnPaths'

const CompactPlayerHand = () => {
  const { myPlayer, currentPlayer, playCard, playCardWithUpgrade, playCardWithTrade, rest } = useGameStore()
  const { isMobile, isPortrait, height } = useOrientation()
  const [upgradeModal, setUpgradeModal] = useState({ show: false, card: null, index: null })
  const [tradeModal, setTradeModal] = useState({ show: false, card: null, index: null })
  const [showPlayedCards, setShowPlayedCards] = useState(false)
  const [showMyGolems, setShowMyGolems] = useState(false)
  const [rowHeight, setRowHeight] = useState(null)
  const containerRef = useRef(null)

  // Calculate row height based on viewport height
  // Formula: (viewport - playersInfoBar) / 5 rows = rowHeight
  useEffect(() => {
    if (!isMobile || !isPortrait) {
      setRowHeight(null)
      // Remove CSS variable
      document.documentElement.style.setProperty('--hand-height', '')
      return
    }

    const calculateRowHeight = () => {
      const viewportHeight = window.innerHeight || window.visualViewport?.height || height
      
      // Get height of PlayersInfoBar
      const playersInfoBar = document.querySelector('[data-players-info-bar]')
      const playersInfoBarHeight = playersInfoBar?.offsetHeight || 0
      
      // Available height = viewport - playersInfoBar
      const availableHeight = viewportHeight - playersInfoBarHeight
      
      // Total padding: turn info + market padding + point padding + gaps + hand padding
      // Approximate: turn info ~30px, market padding ~4px, point padding ~4px, gaps ~4px, hand padding ~4px = ~46px
      const totalPadding = 46
      
      // 5 rows total: 4 market rows + 1 hand row
      const rowHeight = (availableHeight - totalPadding) / 5
      const finalRowHeight = Math.max(60, rowHeight) // Minimum 60px
      
      setRowHeight(finalRowHeight)
      // Set CSS variable for game board padding
      document.documentElement.style.setProperty('--hand-height', `${finalRowHeight}px`)
    }

    // Initial calculation
    setTimeout(calculateRowHeight, 100)
    
    // Recalculate on resize
    const handleResize = () => {
      setTimeout(calculateRowHeight, 100)
    }
    
    window.addEventListener('resize', handleResize)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
      document.documentElement.style.setProperty('--hand-height', '')
    }
  }, [isMobile, isPortrait, height])

  if (!myPlayer) return null

  const isMyTurn = currentPlayer?.id === myPlayer.id
  const hand = myPlayer.hand || []
  const playedCards = myPlayer.playedCards || []
  const myGolems = myPlayer.pointCards || []
  const canRest = isMyTurn && playedCards.length > 0

  const handleRest = () => {
    if (canRest) {
      rest()
    }
  }

  const handleCardClick = (card, index) => {
    if (!isMyTurn) return

    if (card.actionType === 0) {
      playCard(index, card)
    } else if (card.actionType === 1) {
      setUpgradeModal({ show: true, card, index })
    } else if (card.actionType === 2) {
      setTradeModal({ show: true, card, index })
    }
  }

  return (
    <div 
      ref={containerRef}
      data-hand-container
      className={`
        w-full flex-shrink-0 z-30
        ${isMobile && isPortrait 
          ? 'fixed bottom-0 left-0 right-0 px-2 py-2 bg-black/70' 
          : isMobile 
            ? 'relative py-2 px-2 bg-black/50' 
            : 'relative py-4 px-4 bg-black/40'
        }
      `}
      style={isMobile && isPortrait ? { height: '130px' } : {}}
    >
      <div className={`mx-auto flex h-full ${isMobile && isPortrait ? 'gap-2' : 'gap-3'} ${isMobile ? '' : 'max-w-6xl'}`}
      >
        {/* Player Info Panel - Left Side (Mobile Portrait) */}
        {isMobile && isPortrait && (
          <div className="flex-shrink-0 bg-black/50 rounded-lg p-2 flex flex-col justify-center gap-1.5 min-w-[80px]">
            {/* Row 1: Avatar + Name + Points */}
            <div className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                ${isMyTurn ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'}
              `}>
                {myPlayer.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-[11px] font-medium">{myPlayer.name || 'Player'}</span>
                <span className="text-yellow-400 text-[11px] font-bold">★ {myPlayer.points || 0}</span>
              </div>
            </div>
            
            {/* Row 2: Crystals */}
            <div className="flex items-center gap-1.5">
              {['yellow', 'green', 'blue', 'pink'].map((color) => {
                const count = myPlayer.caravan?.[color] || 0
                const bgClass = {
                  yellow: 'bg-yellow-400',
                  green: 'bg-green-500',
                  blue: 'bg-blue-500',
                  pink: 'bg-pink-400'
                }[color]
                
                return (
                  <div key={color} className="flex items-center gap-0.5">
                    <div className={`w-3 h-3 rounded-full ${bgClass}`}/>
                    <span className="text-white text-[10px] font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Row 3: Badges + Rest */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowMyGolems(true)}
                className="flex-1 py-1 rounded bg-amber-700 text-[10px] text-white font-medium"
              >
                🎭 {myGolems.length}
              </button>
              <button
                onClick={() => setShowPlayedCards(true)}
                className="flex-1 py-1 rounded bg-stone-600 text-[10px] text-white font-medium"
              >
                🃏 {playedCards.length}
              </button>
              {canRest && (
                <button
                  onClick={handleRest}
                  className="flex-1 py-1 rounded text-[10px] font-bold bg-emerald-700 text-white"
                >
                  Rest
                </button>
              )}
            </div>
          </div>
        )}

        {/* Player Info Panel - Desktop/Tablet */}
        {!isMobile || !isPortrait ? (
          <div className={`
            flex-shrink-0 bg-black/40 rounded-xl
            flex items-center gap-3 ${isMobile ? 'p-2' : 'p-2 px-4'}
          `}>
            {/* Avatar & Name */}
            <div className="flex items-center gap-2">
              <div className={`rounded-lg bg-yellow-500 text-black flex items-center justify-center font-bold ${isMobile ? 'w-8 h-8 text-sm' : 'w-9 h-9 text-base'}`}>
                {myPlayer.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className={`text-white font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {myPlayer.name || 'You'}
                </div>
                <span className="text-yellow-400 text-xs font-bold">★{myPlayer.points || 0}</span>
              </div>
            </div>

            {/* Crystals */}
            <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
              {['yellow', 'green', 'blue', 'pink'].map((color) => {
                const count = myPlayer.caravan?.[color] || 0
                const bgClass = {
                  yellow: 'bg-yellow-400',
                  green: 'bg-green-500',
                  blue: 'bg-blue-500',
                  pink: 'bg-pink-400'
                }[color]
                
                return (
                  <div key={color} className="flex items-center gap-0.5">
                    <div className={`rounded-full ${bgClass} w-3 h-3`}/>
                    <span className="text-white text-xs font-medium">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Badges + Rest */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMyGolems(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium"
              >
                🎭 {myGolems.length}
              </button>
              <button
                onClick={() => setShowPlayedCards(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-600 text-white text-xs font-medium"
              >
                🃏 {playedCards.length}
              </button>
              {canRest && (
                <button
                  onClick={handleRest}
                  className="px-3 py-1.5 rounded-lg font-bold bg-emerald-700 text-white text-xs"
                >
                  Rest
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Hand Cards Area - Right Side */}
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile && isPortrait ? 'h-full' : 'mt-2'}`}>
          {/* Hand Cards - Horizontal Scroll */}
          <div className={`
            flex overflow-x-auto items-center h-full
            ${isMobile && isPortrait 
              ? 'gap-2 scrollbar-none' 
              : isMobile 
                ? 'gap-1.5 scrollbar-none pb-1' 
                : 'gap-3 justify-center md:justify-start scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent pb-1'
            }
          `}
          >
          {hand.map((card, index) => {
            const isPlayable = isMyTurn

            return (
              <div 
                key={`hand-${index}`} 
                className={`relative flex-shrink-0 ${isMobile && isPortrait ? 'h-full' : ''}`}
                style={isMobile && isPortrait ? { aspectRatio: '2/3' } : {}}
              >
                <CompactCard
                  card={card}
                  type="action"
                  index={index}
                  isPlayable={isPlayable}
                  onClick={() => handleCardClick(card, index)}
                  size={isMobile && isPortrait ? 'flexible' : isMobile ? 'sm' : 'normal'}
                  showDetails={!isMobile}
                />
              </div>
            )
          })}
          
          {/* Empty slot indicator */}
          {hand.length === 0 && (
            <div className={`
              card-base relative overflow-hidden flex-shrink-0
              ${isMobile ? 'w-[100px] h-[150px]' : 'w-28 h-44'}
              border-2 border-dashed border-white/30 bg-white/5
            `}
              style={{
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#222'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/50 text-xs font-semibold">Empty</span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Played Cards View */}
      {showPlayedCards && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowPlayedCards(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div 
            className="relative bg-slate-900/95 rounded-2xl p-4 max-w-sm w-full border border-white/20 shadow-2xl max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              🃏 My Played Cards
            </h3>
            {playedCards.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {playedCards.map((card, idx) => (
                  <div key={idx} className="aspect-[2/3] rounded-xl overflow-hidden bg-white/10 shadow-lg">
                    <img 
                      src={getImageUrl(`${card.name}.JPG`)} 
                      alt={card.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-center py-8">No cards played yet</p>
            )}
            <button 
              onClick={() => setShowPlayedCards(false)}
              className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* My Golems View */}
      {showMyGolems && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowMyGolems(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div 
            className="relative bg-slate-900/95 rounded-2xl p-4 max-w-sm w-full border border-white/20 shadow-2xl max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              🎭 My Golems
            </h3>
            {myGolems.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {myGolems.map((card, idx) => (
                  <div key={idx} className="aspect-[2/3] rounded-xl overflow-hidden bg-white/10 shadow-lg">
                    <img 
                      src={getImageUrl(`${card.name}.JPG`)} 
                      alt={card.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-center py-8">No golems collected yet</p>
            )}
            <button 
              onClick={() => setShowMyGolems(false)}
              className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {upgradeModal.show && (
        <UpgradeModal
          card={upgradeModal.card}
          cardIndex={upgradeModal.index}
          playerResources={myPlayer?.resources}
          maxTurnUpgrade={upgradeModal.card?.turnUpgrade || 1}
          onConfirm={(inputResources, outputResources) => {
            playCardWithUpgrade(upgradeModal.index, inputResources, outputResources, upgradeModal.card)
            setUpgradeModal({ show: false, card: null, index: null })
          }}
          onCancel={() => setUpgradeModal({ show: false, card: null, index: null })}
        />
      )}

      {/* Trade Modal */}
      {tradeModal.show && (
        <TradeModal
          card={tradeModal.card}
          cardIndex={tradeModal.index}
          playerResources={myPlayer?.resources}
          onConfirm={(multiplier) => {
            playCardWithTrade(tradeModal.index, multiplier, tradeModal.card)
            setTradeModal({ show: false, card: null, index: null })
          }}
          onCancel={() => setTradeModal({ show: false, card: null, index: null })}
        />
      )}
    </div>
  )
}

export default CompactPlayerHand
