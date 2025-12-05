import React, { useState } from 'react'
import useGameStore from '../store/gameStore'
import CompactCard from './CompactCard'
import UpgradeModal from './UpgradeModal'
import TradeModal from './TradeModal'

const CompactPlayerHand = () => {
  const { myPlayer, currentPlayer, playCard } = useGameStore()
  const [upgradeModal, setUpgradeModal] = useState({ show: false, card: null, index: null })
  const [tradeModal, setTradeModal] = useState({ show: false, card: null, index: null })

  if (!myPlayer) return null

  const isMyTurn = currentPlayer?.id === myPlayer.id
  const hand = myPlayer.hand || []
  const playedCards = myPlayer.playedCards || []

  const handleCardClick = (card, index) => {
    if (!isMyTurn) return

    // Check if card can be played
    if (card.actionType === 0) {
      // Produce card - play directly
      playCard(index)
    } else if (card.actionType === 1) {
      // Upgrade card - show modal
      setUpgradeModal({ show: true, card, index })
    } else if (card.actionType === 2) {
      // Trade card - show modal
      setTradeModal({ show: true, card, index })
    }
  }

  return (
    <div className="w-full bg-gradient-to-t from-black/50 to-transparent backdrop-blur-lg border-t-2 border-white/20 py-4 px-4 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        {/* Player Hand Title */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base drop-shadow-lg">
            Your Hand ({hand.length} cards)
          </h3>
          {playedCards.length > 0 && (
            <span className="text-white/80 text-sm font-semibold">
              {playedCards.length} played this turn
            </span>
          )}
        </div>

        {/* Hand Cards - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50 justify-center md:justify-start">
          {hand.map((card, index) => {
            const isPlayable = isMyTurn

            return (
              <div key={`hand-${index}`} className="relative flex-shrink-0">
                <CompactCard
                  card={card}
                  type="action"
                  index={index}
                  isPlayable={isPlayable}
                  onClick={() => handleCardClick(card, index)}
                  size="normal"
                  showDetails={true}
                />
              </div>
            )
          })}
          
          {/* Empty slot indicator */}
          {hand.length === 0 && (
            <div className="w-20 h-30 border-2 border-dashed border-white/30 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <span className="text-white/50 text-xs">Empty</span>
            </div>
          )}
        </div>

        {/* Played Cards This Turn */}
        {playedCards.length > 0 && (
          <div className="mt-3">
            <h4 className="text-white/80 font-bold text-sm mb-2">
              Played This Turn:
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
              {playedCards.map((card, index) => (
                <div key={`played-${index}`} className="flex-shrink-0">
                  <CompactCard
                    card={card}
                    type="action"
                    index={index}
                    size="small"
                    showDetails={false}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {upgradeModal.show && (
        <UpgradeModal
          card={upgradeModal.card}
          cardIndex={upgradeModal.index}
          onClose={() => setUpgradeModal({ show: false, card: null, index: null })}
        />
      )}

      {/* Trade Modal */}
      {tradeModal.show && (
        <TradeModal
          card={tradeModal.card}
          cardIndex={tradeModal.index}
          onClose={() => setTradeModal({ show: false, card: null, index: null })}
        />
      )}
    </div>
  )
}

export default CompactPlayerHand
