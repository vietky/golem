import React, { useState } from 'react'
import useGameStore from '../store/gameStore'
import useOrientation from '../hooks/useOrientation'
import CompactCard from './CompactCard'
import UpgradeModal from './UpgradeModal'
import TradeModal from './TradeModal'

const CompactPlayerHand = () => {
  const { myPlayer, currentPlayer, playCard, playCardWithUpgrade, playCardWithTrade } = useGameStore()
  const { isMobile, isPortrait } = useOrientation()
  const [upgradeModal, setUpgradeModal] = useState({ show: false, card: null, index: null })
  const [tradeModal, setTradeModal] = useState({ show: false, card: null, index: null })

  if (!myPlayer) return null

  const isMyTurn = currentPlayer?.id === myPlayer.id
  const hand = myPlayer.hand || []
  const playedCards = myPlayer.playedCards || []

  const handleCardClick = (card, index) => {
    if (!isMyTurn) return

    if (card.actionType === 0) {
      playCard(index)
    } else if (card.actionType === 1) {
      setUpgradeModal({ show: true, card, index })
    } else if (card.actionType === 2) {
      setTradeModal({ show: true, card, index })
    }
  }

  return (
    <div className={`
      w-full bg-gradient-to-t from-black/60 to-transparent backdrop-blur-lg 
      border-t-2 border-white/20 shadow-2xl
      ${isMobile ? 'py-2 px-2' : 'py-4 px-4'}
    `}>
      <div className={`mx-auto ${isMobile ? '' : 'max-w-6xl'}`}>
        {/* Player Hand Title */}
        <div className={`flex items-center justify-between ${isMobile ? 'mb-1' : 'mb-3'}`}>
          <h3 className={`text-white font-bold drop-shadow-lg ${isMobile ? 'text-xs' : 'text-base'}`}>
            Your Hand ({hand.length})
          </h3>
          {playedCards.length > 0 && (
            <span className={`text-yellow-400 font-semibold ${isMobile ? 'text-[10px]' : 'text-sm'}`}>
              {playedCards.length} played
            </span>
          )}
        </div>

        {/* Hand Cards - Horizontal Scroll */}
        <div className={`
          flex overflow-x-auto pb-1
          ${isMobile ? 'gap-1.5 scrollbar-none' : 'gap-3 justify-center md:justify-start scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent'}
        `}>
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
                  size={isMobile ? 'sm' : 'normal'}
                  showDetails={!isMobile}
                />
              </div>
            )
          })}
          
          {/* Empty slot indicator */}
          {hand.length === 0 && (
            <div className={`
              border-2 border-dashed border-white/30 rounded-lg bg-white/5 
              flex items-center justify-center flex-shrink-0
              ${isMobile ? 'w-16 h-20' : 'w-20 h-28'}
            `}>
              <span className="text-white/50 text-xs">Empty</span>
            </div>
          )}
        </div>

        {/* Played Cards This Turn - Always show */}
        {playedCards.length > 0 && (
          <div className={`${isMobile ? 'mt-1.5 pt-1.5 border-t border-white/10' : 'mt-3'}`}>
            <h4 className={`text-white/80 font-bold ${isMobile ? 'text-[10px] mb-1' : 'text-sm mb-2'}`}>
              Played:
            </h4>
            <div className={`flex overflow-x-auto pb-1 ${isMobile ? 'gap-1 scrollbar-none' : 'gap-1.5 scrollbar-thin scrollbar-thumb-white/30'}`}>
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
          playerResources={myPlayer?.resources}
          maxTurnUpgrade={upgradeModal.card?.turnUpgrade || 1}
          onConfirm={(inputResources, outputResources) => {
            playCardWithUpgrade(upgradeModal.index, inputResources, outputResources)
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
            playCardWithTrade(tradeModal.index, multiplier)
            setTradeModal({ show: false, card: null, index: null })
          }}
          onCancel={() => setTradeModal({ show: false, card: null, index: null })}
        />
      )}
    </div>
  )
}

export default CompactPlayerHand
