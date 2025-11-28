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
