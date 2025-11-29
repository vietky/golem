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

  // Actions
  connectWebSocket: (sessionId, playerName, playerAvatar) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?session=${sessionId}&name=${encodeURIComponent(
      playerName
    )}&avatar=${playerAvatar}`;

    const ws = new WebSocket(wsUrl);

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

        set({
          gameState: message,
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

  sendAction: (actionType, cardIndex = null, inputResources = null, outputResources = null, multiplier = null) => {
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

  acquireCard: (cardIndex) => {
    const { gameState, myPlayer } = get();
    const card = gameState?.market?.actionCards?.[cardIndex];
    const cost = card?.cost || {};

    // Check if can afford
    const canAfford =
      myPlayer?.resources &&
      (cost.yellow || 0) <= myPlayer.resources.yellow &&
      (cost.green || 0) <= myPlayer.resources.green &&
      (cost.blue || 0) <= myPlayer.resources.blue &&
      (cost.pink || 0) <= myPlayer.resources.pink;

    if (!canAfford) {
      // Trigger invalid action animation
      set({ invalidAction: card?.name });
      setTimeout(() => set({ invalidAction: null }), 300);
      get().addToLog(`Cannot afford this card!`);
      return;
    }

    get().sendAction("acquireCard", cardIndex);
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
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message = {
      type: 'action',
      actionType: 'discardCrystals',
      discard: {
        yellow: discard.yellow || 0,
        green: discard.green || 0,
        blue: discard.blue || 0,
        pink: discard.pink || 0
      }
    }

    ws.send(JSON.stringify(message))
    get().addToLog(`Discarding ${Object.values(discard).reduce((a, b) => a + b, 0)} crystals`)
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
}));

export default useGameStore;
