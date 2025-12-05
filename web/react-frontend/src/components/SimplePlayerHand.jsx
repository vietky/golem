import React, { useState } from 'react'
import SimpleCard from './SimpleCard'
import UpgradeModal from './UpgradeModal'
import TradeModal from './TradeModal'
import useGameStore from '../store/gameStore'

const SimplePlayerHand = ({ showDetailed = false }) => {
  const { myPlayer, currentPlayer, playCard } = useGameStore()
  const [upgradeModal, setUpgradeModal] = useState({ show: false, card: null, index: null })
  const [tradeModal, setTradeModal] = useState({ show: false, card: null, index: null })

  if (!myPlayer || !myPlayer.hand) return null

  const isMyTurn = currentPlayer?.id === myPlayer?.id

  const handleCardClick = (card, index) => {
    if (!isMyTurn) return

    // Upgrade card needs modal
    if (card.actionType === 1) {
      setUpgradeModal({ show: true, card, index })
      return
    }

    // Trade card needs modal
    if (card.actionType === 2) {
      setTradeModal({ show: true, card, index })
      return
    }

    // Produce card can be played directly
    playCard(index)
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-64 z-20">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-white/20 p-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-semibold text-sm">
              Your Hand ({myPlayer.hand.length} cards)
            </h3>
            {myPlayer.playedCards && myPlayer.playedCards.length > 0 && (
              <span className="text-xs text-gray-300">
                {myPlayer.playedCards.length} played
              </span>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {myPlayer.hand.map((card, index) => (
              <div key={`hand-${index}`} className="relative">
                <SimpleCard
                  card={card}
                  type="action"
                  index={index}
                  isPlayable={isMyTurn}
                  onClick={() => handleCardClick(card, index)}
                  size={showDetailed ? 'normal' : 'small'}
                />
              </div>
            ))}
          </div>

          {/* Played Cards */}
          {myPlayer.playedCards && myPlayer.playedCards.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-white text-xs mb-2 opacity-75">Played Cards:</div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                {myPlayer.playedCards.map((card, index) => (
                  <div key={`played-${index}`} className="opacity-60">
                    <SimpleCard
                      card={card}
                      type="action"
                      index={index}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {upgradeModal.show && (
        <UpgradeModal
          card={upgradeModal.card}
          cardIndex={upgradeModal.index}
          onClose={() => setUpgradeModal({ show: false, card: null, index: null })}
        />
      )}

      {tradeModal.show && (
        <TradeModal
          card={tradeModal.card}
          cardIndex={tradeModal.index}
          onClose={() => setTradeModal({ show: false, card: null, index: null })}
        />
      )}
    </>
  )
}

export default SimplePlayerHand
