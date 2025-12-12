import { create } from "zustand";

const useGameStore = create((set, get) => ({
  // Connection state
  ws: null,
  sessionId: null,
  playerId: null,
  playerName: "",
  playerAvatar: "4",
  connected: false,

  // Game state
  gameState: null,
  previousGameState: null, // Track previous state to detect opponent actions
  currentPlayer: null,
  myPlayer: null,
  opponents: [],

  // UI state
  selectedCard: null,
  actionLog: [],
  isDragging: false,
  invalidAction: null, // Card name that triggered invalid action
  collectAnimations: [], // Array of {type, from, to} for flying crystals (initialized as empty array)
  upgradeModalCard: null, // Card for which upgrade modal is shown
  upgradeModalCardIndex: null, // Card index for upgrade modal
  tradeModalCard: null, // Card for which trade modal is shown
  tradeModalCardIndex: null, // Card index for trade modal
  acquiringCardIds: [], // Array of card IDs that are being acquired (for animation)
  acquiredCardOverlay: null, // { card, type: 'market'|'golem', playerName } for overlay animation

  // Actions
  connectWebSocket: (sessionId, playerName, playerAvatar) => {
    // Allow overriding backend host via Vite env `VITE_API_HOST`.
    // Example: VITE_API_HOST="http://backend-host:8080"
    const configuredHost = import.meta.env.VITE_API_HOST || `${window.location.protocol}//${window.location.host}`;
    const toWs = (host) => {
      if (host.startsWith('https://')) return host.replace(/^https:\/\//, 'wss://')
      if (host.startsWith('http://')) return host.replace(/^http:\/\//, 'ws://')
      return host
    }

    const hostForWs = configuredHost.replace(/\/$/, '')
    const wsBase = toWs(hostForWs)
    const wsUrl = `${wsBase}/ws?session=${sessionId}&name=${encodeURIComponent(playerName)}&avatar=${playerAvatar}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      set({ connected: true, ws });
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "playerAssigned") {
        set({ playerId: message.playerID });
      } else if (message.type === "state") {
        const myPlayer = message.players.find((p) => p.id === get().playerId);
        const opponents = message.players.filter((p) => p.id !== get().playerId);
        const currentPlayer = message.players.find((p) => p.id === message.currentPlayer);
        const previousState = get().gameState;
        const previousOpponents = get().opponents || [];
        const previousMyPlayer = get().myPlayer;

        // Debug: log deposits on market cards
        if (message.market?.actionCards) {
          console.log(`[DEBUG State] Received ${message.market.actionCards.length} market cards`);
          // Log raw message to see if deposits field exists
          if (message.market.actionCards.length > 1) {
            console.log(`[DEBUG State] Raw message market.actionCards[1]:`, JSON.stringify(message.market.actionCards[1], null, 2));
            console.log(`[DEBUG State] Raw message keys:`, Object.keys(message.market.actionCards[1]));
          }
          message.market.actionCards.forEach((card, idx) => {
            const hasDepositsField = 'deposits' in card;
            const depositsType = typeof card.deposits;
            console.log(`[DEBUG State] Card ${idx} (position ${idx + 1}):`, {
              name: card.name,
              hasDepositsField,
              depositsType,
              deposits: card.deposits,
              depositsValue: JSON.stringify(card.deposits),
              depositsCount: card.deposits ? Object.keys(card.deposits).length : 0
            });
            if (card.deposits && typeof card.deposits === 'object' && Object.keys(card.deposits).length > 0) {
              console.log(`[DEBUG State] ✓ Card ${idx} (position ${idx + 1}) HAS deposits:`, card.deposits);
            } else {
              console.log(`[DEBUG State] ✗ Card ${idx} (position ${idx + 1}) has NO deposits (field: ${hasDepositsField}, type: ${depositsType}, value: ${JSON.stringify(card.deposits)})`);
            }
          });
        }

        // Detect when cards are acquired (by anyone) to show animation and overlay
        // Set acquiringCardIds BEFORE updating state so animation can run
        if (previousState && previousState.market) {
          const prevActionCards = previousState.market.actionCards || []
          const currentActionCards = message.market?.actionCards || []
          
          // Find cards that were removed (acquired)
          // Create maps of card identifiers to card data
          const prevActionCardMap = new Map(
            prevActionCards.map((card, idx) => [card.id || card.name || `action-${idx}`, card])
          )
          const currentActionCardIds = new Set(
            currentActionCards.map((card, idx) => card.id || card.name || `action-${idx}`)
          )
          
          // Find which player acquired the card by comparing hand sizes
          let acquiringPlayer = null
          if (previousOpponents && opponents) {
            // Check each player's hand to see who gained a card
            const allPrevPlayers = previousMyPlayer ? [...previousOpponents, previousMyPlayer] : previousOpponents
            const allCurrentPlayers = myPlayer ? [...opponents, myPlayer] : opponents
            
            for (const currentP of allCurrentPlayers) {
              const prevP = allPrevPlayers.find(p => p.id === currentP.id)
              if (prevP && currentP.hand?.length > prevP.hand?.length) {
                acquiringPlayer = currentP
                break
              }
            }
          }
          
          // Find cards that exist in previous but not in current
          prevActionCardMap.forEach((card, cardId) => {
            if (!currentActionCardIds.has(cardId)) {
              // Card was acquired - trigger animation BEFORE state update
              get().addAcquiringCard(cardId)
              // Only show overlay if someone else acquired the card (not the current player)
              const currentPlayerId = get().playerId
              if (acquiringPlayer && acquiringPlayer.id !== currentPlayerId) {
                const playerName = acquiringPlayer?.name || 'A player'
                get().showAcquiredCard(card, 'market', playerName)
              }
            }
          })
          
          const prevPointCards = previousState.market.pointCards || []
          const currentPointCards = message.market?.pointCards || []
          
          // Find point cards that were removed (claimed)
          const prevPointCardMap = new Map(
            prevPointCards.map((card, idx) => [card.id || card.name || `point-${idx}`, card])
          )
          const currentPointCardIds = new Set(
            currentPointCards.map((card, idx) => card.id || card.name || `point-${idx}`)
          )
          
          // Find which player claimed the point card by comparing point card counts
          let claimingPlayer = null
          if (previousOpponents && opponents) {
            const allPrevPlayers = previousMyPlayer ? [...previousOpponents, previousMyPlayer] : previousOpponents
            const allCurrentPlayers = myPlayer ? [...opponents, myPlayer] : opponents
            
            for (const currentP of allCurrentPlayers) {
              const prevP = allPrevPlayers.find(p => p.id === currentP.id)
              if (prevP && (currentP.pointCards?.length || 0) > (prevP.pointCards?.length || 0)) {
                claimingPlayer = currentP
                break
              }
            }
          }
          
          // Find cards that exist in previous but not in current
          prevPointCardMap.forEach((card, cardId) => {
            if (!currentPointCardIds.has(cardId)) {
              // Point card was claimed - trigger animation BEFORE state update
              get().addAcquiringCard(cardId)
              // Only show overlay if someone else claimed the card (not the current player)
              const currentPlayerId = get().playerId
              if (claimingPlayer && claimingPlayer.id !== currentPlayerId) {
                const playerName = claimingPlayer?.name || 'A player'
                get().showAcquiredCard(card, 'golem', playerName)
              }
            }
          })
        }

        // Detect when opponents play cards
        const currentPlayerId = get().playerId
        if (previousOpponents && previousOpponents.length > 0 && opponents) {
          for (const currentOpponent of opponents) {
            const prevOpponent = previousOpponents.find(p => p.id === currentOpponent.id)
            if (prevOpponent) {
              const prevPlayedCount = prevOpponent.playedCards?.length || 0
              const currentPlayedCount = currentOpponent.playedCards?.length || 0
              
              // If opponent played a new card
              if (currentPlayedCount > prevPlayedCount && currentOpponent.id !== currentPlayerId) {
                // Get the newly played card (last card in playedCards)
                const playedCard = currentOpponent.playedCards[currentPlayedCount - 1]
                if (playedCard) {
                  get().showAcquiredCard(playedCard, 'played', currentOpponent.name)
                }
              }
            }
          }
        }

        // Update state immediately - we'll keep acquiring cards visible in render
        set({
          gameState: message,
          previousGameState: previousState,
          myPlayer,
          opponents,
          currentPlayer,
        });

        // Add to log when turn changes
        if (currentPlayer && currentPlayer.id === get().playerId) {
          get().addToLog(`Your turn!`);
        }
      } else if (message.type === "error") {
        console.error("Game error:", message.error);
        get().addToLog(`Error: ${message.error}`);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      set({ connected: false });
    };

    ws.onclose = () => {
      set({ connected: false, ws: null });
      console.log("WebSocket disconnected");
    };

    set({ ws, sessionId });
  },

  sendAction: (actionType, cardIndex = null, inputResources = null, outputResources = null, multiplier = null, deposits = null) => {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: "action",
      actionType,
      cardIndex,
    };

    if (inputResources) {
      message.inputResources = inputResources;
    }
    if (outputResources) {
      message.outputResources = outputResources;
    }
    if (multiplier !== null && multiplier !== undefined) {
      message.multiplier = multiplier;
    }
    if (deposits) {
      message.deposits = deposits;
    }

    ws.send(JSON.stringify(message));
  },

  playCard: (cardIndex) => {
    get().sendAction("playCard", cardIndex);
    get().addToLog(`Playing card from hand`);
  },

  playCardWithUpgrade: (cardIndex, inputResources, outputResources) => {
    get().sendAction("playCard", cardIndex, inputResources, outputResources);
    get().addToLog(`Playing upgrade card`);
    set({
      upgradeModalCard: null,
      upgradeModalCardIndex: null,
    });
  },

  playCardWithTrade: (cardIndex, multiplier) => {
    get().sendAction("playCard", cardIndex, null, null, multiplier);
    get().addToLog(`Playing trade card (x${multiplier})`);
    set({
      tradeModalCard: null,
      tradeModalCardIndex: null,
    });
  },

  showUpgradeModal: (card, cardIndex) => set({ upgradeModalCard: card, upgradeModalCardIndex: cardIndex }),
  hideUpgradeModal: () => set({ upgradeModalCard: null, upgradeModalCardIndex: null }),

  showTradeModal: (card, cardIndex) => set({ tradeModalCard: card, tradeModalCardIndex: cardIndex }),
  hideTradeModal: () => set({ tradeModalCard: null, tradeModalCardIndex: null }),

  acquireCard: (cardIndex, deposits = []) => {
    get().sendAction("acquireCard", cardIndex, null, null, null, deposits);
    get().addToLog(`Acquiring card from market`);
  },

  claimPointCard: (cardIndex) => {
    get().sendAction("claimPointCard", cardIndex);
    get().addToLog(`Claiming point card`);
  },

  rest: () => {
    get().sendAction("rest");
    get().addToLog(`Resting - returning cards to hand`);
  },

  discardCrystals: (discard) => {
    const { ws, myPlayer } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message = {
      type: 'action',
      actionType: 'discard',
      discardResources: {
        yellow: discard.yellow || 0,
        green: discard.green || 0,
        blue: discard.blue || 0,
        pink: discard.pink || 0
      }
    }

    ws.send(JSON.stringify(message))
    get().addToLog(`Discarding ${Object.values(discard).reduce((a, b) => a + b, 0)} crystals`)
    
    // Optimistically update crystals and reset pendingDiscard to close modal immediately
    if (myPlayer) {
      const newCaravan = {
        yellow: Math.max(0, (myPlayer.caravan?.yellow || 0) - (discard.yellow || 0)),
        green: Math.max(0, (myPlayer.caravan?.green || 0) - (discard.green || 0)),
        blue: Math.max(0, (myPlayer.caravan?.blue || 0) - (discard.blue || 0)),
        pink: Math.max(0, (myPlayer.caravan?.pink || 0) - (discard.pink || 0))
      }
      set({ 
        myPlayer: { 
          ...myPlayer, 
          pendingDiscard: 0,
          caravan: newCaravan
        } 
      })
    }
  },

  depositCrystals: (cardIndex, deposits, targetPosition) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message = {
      type: 'action',
      actionType: 'depositCrystals',
      cardIndex,
      deposits,
      targetPosition
    }

    ws.send(JSON.stringify(message))
    get().addToLog(`Depositing crystals on card (target: position ${targetPosition})`)
  },

  collectCrystals: (cardIndex, positions) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message = {
      type: 'action',
      actionType: 'collectCrystals',
      cardIndex,
      positions
    }

    ws.send(JSON.stringify(message))
    get().addToLog(`Collecting ${positions.length} crystals from card`)
  },

  collectAllCrystals: (cardIndex) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message = {
      type: 'action',
      actionType: 'collectAllCrystals',
      cardIndex
    }

    ws.send(JSON.stringify(message))
    get().addToLog(`Auto-collecting crystals from card`)
  },

  setSelectedCard: (card) => set({ selectedCard: card }),
  clearSelectedCard: () => set({ selectedCard: null }),

  addToLog: (message) => {
    const log = get().actionLog;
    const newLog = [message, ...log].slice(0, 3); // Keep last 3
    set({ actionLog: newLog });
  },

  setIsDragging: (isDragging) => set({ isDragging }),

  // Trigger collect animation (flying crystals)
  triggerCollectAnimation: (type, fromPos, toPos) => {
    const animations = get().collectAnimations || [];
    set({
      collectAnimations: [...animations, { type, from: fromPos, to: toPos }],
    });
  },

  // Card acquire animation
  addAcquiringCard: (cardId) => {
    const acquiring = get().acquiringCardIds || []
    if (!acquiring.includes(cardId)) {
      set({ acquiringCardIds: [...acquiring, cardId] })
      
      // Remove after animation completes (0.8s)
      setTimeout(() => {
        const current = get().acquiringCardIds || []
        set({ acquiringCardIds: current.filter(id => id !== cardId) })
      }, 800)
    }
  },

  // Show acquired card overlay
  showAcquiredCard: (card, type, playerName) => {
    set({ acquiredCardOverlay: { card, type, playerName } })
    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      set({ acquiredCardOverlay: null })
    }, 2000)
  },

  // Clear acquired card overlay
  clearAcquiredCardOverlay: () => {
    set({ acquiredCardOverlay: null })
  },
}));

export default useGameStore;
