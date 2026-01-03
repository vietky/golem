import { create } from "zustand";
import { createLogger } from '../utils/logger';
import { getClientIDFromCookie, apiFetch } from '../utils/api';
import { showToast } from '../utils/toast';

const logger = createLogger('GameStore');

const useGameStore = create((set, get) => ({
  // Connection state
  ws: null,
  sessionId: null,
  playerId: null,
  spectatorId: null,
  isSpectator: false,
  playerName: "",
  playerAvatar: "4",
  connected: false,
  isReconnecting: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000, // Start with 1 second
  maxReconnectDelay: 30000, // Max 30 seconds
  reconnectTimeoutId: null,
  connectionTimeoutId: null, // Timeout for connection attempt
  connectionError: null, // Error message from connection failure
  isConnecting: false, // Track if currently attempting to connect

  // Game state
  gameState: null,
  previousGameState: null, // Track previous state to detect opponent actions
  currentPlayer: null,
  myPlayer: null,
  opponents: [],
  roundNumber: 0, // Track number of times players have played in current game

  // UI state
  selectedCard: null,
  actionHistory: [], // Rich action history with card details
  isDragging: false,
  invalidAction: null, // Card name that triggered invalid action
  collectAnimations: [], // Array of {type, from, to} for flying crystals (initialized as empty array)
  upgradeModalCard: null, // Card for which upgrade modal is shown
  upgradeModalCardIndex: null, // Card index for upgrade modal
  tradeModalCard: null, // Card for which trade modal is shown
  tradeModalCardIndex: null, // Card index for trade modal
  acquiringCardIds: [], // Array of card IDs that are being acquired (for animation)
  acquiredCardOverlay: null, // { card, type: 'market'|'golem', playerName } for overlay animation
  
  // Sound settings
  soundsMuted: typeof window !== 'undefined' ? localStorage.getItem('gameSoundsMuted') === 'true' : false,

  // Actions
  connectWebSocket: (sessionId, playerName, playerAvatar, asSpectator = false) => {
    // Cancel any pending reconnect attempts
    const existingTimeoutId = get().reconnectTimeoutId;
    if (existingTimeoutId) {
      clearTimeout(existingTimeoutId);
      set({ reconnectTimeoutId: null });
    }

    // Cancel any existing connection timeout
    const existingConnectionTimeout = get().connectionTimeoutId;
    if (existingConnectionTimeout) {
      clearTimeout(existingConnectionTimeout);
      set({ connectionTimeoutId: null });
    }

    // Clear previous errors and mark as connecting
    set({ 
      connectionError: null, 
      isConnecting: true,
    });

    // In development with Vite, always connect to the dev server (localhost:3000)
    // which will proxy WebSocket connections to the backend
    // In production, use the configured API host or current window location
    const isDevelopment = import.meta.env.DEV;
    
    // Log environment detection
    logger.info(`Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    logger.info(`import.meta.env.DEV: ${import.meta.env.DEV}`);
    logger.info(`import.meta.env.VITE_API_HOST: ${import.meta.env.VITE_API_HOST}`);
    logger.info(`window.location: ${window.location.protocol}//${window.location.host}`);
    
    const configuredHost = isDevelopment 
      ? `${window.location.protocol}//${window.location.host}` // Use Vite dev server
      : (import.meta.env.VITE_API_HOST || `${window.location.protocol}//${window.location.host}`);
    
    logger.info(`Configured host for WebSocket: ${configuredHost}`);
    
    const toWs = (host) => {
      if (host.startsWith('https://')) return host.replace(/^https:\/\//, 'wss://')
      if (host.startsWith('http://')) return host.replace(/^http:\/\//, 'ws://')
      return host
    }

    const hostForWs = configuredHost.replace(/\/$/, '')
    const wsBase = toWs(hostForWs)
    const spectateParam = asSpectator ? '&spectate=true' : ''
    // Get client ID from cookie and add it as query parameter
    const clientID = getClientIDFromCookie()
    const clientIDParam = clientID ? `&clientID=${encodeURIComponent(clientID)}` : ''
    const wsUrl = `${wsBase}/ws?session=${sessionId}&name=${encodeURIComponent(playerName)}&avatar=${playerAvatar}${spectateParam}${clientIDParam}`

    logger.info(`🔌 Attempting WebSocket connection...`);
    logger.info(`   URL: ${wsUrl}`);
    logger.info(`   Session: ${sessionId}`);
    logger.info(`   Player: ${playerName} (avatar: ${playerAvatar})`);
    logger.info(`   Spectator: ${asSpectator}`);

    // Set a 5-second timeout for connection
    const connectionTimeoutId = setTimeout(() => {
      const currentWs = get().ws;
      const isConnected = get().connected;
      
      if (!isConnected && currentWs) {
        logger.error('⏱️ Connection timeout after 5 seconds');
        currentWs.close();
        set({ 
          connectionError: 'Connection timeout. The server may be down or unreachable.',
          isConnecting: false,
          connectionTimeoutId: null,
        });
        showToast('Connection timeout. Please try again.', 'error');
      }
    }, 5000);

    set({ connectionTimeoutId });

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // Clear connection timeout on successful connection
      const timeoutId = get().connectionTimeoutId;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Reset reconnection state on successful connection
      set({ 
        connected: true, 
        ws, 
        isSpectator: asSpectator,
        isReconnecting: false,
        reconnectAttempts: 0,
        reconnectDelay: 1000,
        connectionTimeoutId: null,
        connectionError: null,
        isConnecting: false,
      });
      logger.info(`✅ WebSocket connected successfully${asSpectator ? ' as spectator' : ''}`);
      logger.info(`   Ready state: ${ws.readyState}`);
      showToast('Connected to game server', 'success');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "playerAssigned") {
        set({ playerId: message.playerID });
      } else if (message.type === "spectatorAssigned") {
        set({ spectatorId: message.spectatorID, isSpectator: true });
      } else if (message.type === "memberStatusChanged") {
        // Handle both join and leave events for players and spectators
        const action = message.online ? "rejoined" : "left";
        const statusMessage = message.isSpectator
          ? `${message.playerName} ${action === "rejoined" ? "is now spectating" : "stopped spectating"}`
          : `${message.playerName} ${action} the game`;
        logger.info(statusMessage);
        // Show toast notification in top right corner
        showToast(statusMessage, 'info');
      } else if (message.type === "playerJoined") {
        // Show notification when a player joins
        const joinMessage = message.isSpectator 
          ? `${message.playerName} is now spectating`
          : `${message.playerName} joined the game`;
        logger.info(joinMessage);
      } else if (message.type === "state") {
        const isSpectator = get().isSpectator;
        const myPlayer = isSpectator ? null : message.players.find((p) => p.id === get().playerId);
        const opponents = isSpectator ? message.players : message.players.filter((p) => p.id !== get().playerId);
        const currentPlayer = message.players.find((p) => p.id === message.currentPlayer);
        const previousState = get().gameState;
        const previousOpponents = get().opponents || [];
        const previousMyPlayer = get().myPlayer;

        // Debug: log deposits on market cards
        if (message.market?.actionCards) {
          logger.debug(`Received ${message.market.actionCards.length} market cards`);
          // Log raw message to see if deposits field exists
          if (message.market.actionCards.length > 1) {
            logger.debug(`Raw message market.actionCards[1]:`, JSON.stringify(message.market.actionCards[1], null, 2));
            logger.debug(`Raw message keys:`, Object.keys(message.market.actionCards[1]));
          }
          message.market.actionCards.forEach((card, idx) => {
            const hasDepositsField = 'deposits' in card;
            const depositsType = typeof card.deposits;
            logger.debug(`Card ${idx} (position ${idx + 1}):`, {
              name: card.name,
              hasDepositsField,
              depositsType,
              deposits: card.deposits,
              depositsValue: JSON.stringify(card.deposits),
              depositsCount: card.deposits ? Object.keys(card.deposits).length : 0
            });
            if (card.deposits && typeof card.deposits === 'object' && Object.keys(card.deposits).length > 0) {
              logger.debug(`✓ Card ${idx} (position ${idx + 1}) HAS deposits:`, card.deposits);
            } else {
              logger.debug(`✗ Card ${idx} (position ${idx + 1}) has NO deposits (field: ${hasDepositsField}, type: ${depositsType}, value: ${JSON.stringify(card.deposits)})`);
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
                // Add to action history for opponents
                get().addActionToHistory({
                  type: 'acquire',
                  playerName: playerName,
                  playerAvatar: acquiringPlayer?.avatar,
                  card: card,
                  isOpponent: true,
                })
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
                // Add to action history for opponents
                get().addActionToHistory({
                  type: 'claim',
                  playerName: playerName,
                  playerAvatar: claimingPlayer?.avatar,
                  card: card,
                  isOpponent: true,
                })
              }
            }
          })
        }

        // Detect when opponents play cards or rest
        const currentPlayerId = get().playerId
        if (previousOpponents && previousOpponents.length > 0 && opponents) {
          for (const currentOpponent of opponents) {
            const prevOpponent = previousOpponents.find(p => p.id === currentOpponent.id)
            if (prevOpponent) {
              const prevPlayedCount = prevOpponent.playedCards?.length || 0
              const currentPlayedCount = currentOpponent.playedCards?.length || 0
              const prevHandCount = prevOpponent.hand?.length || 0
              const currentHandCount = currentOpponent.hand?.length || 0
              
              // If opponent played a new card
              if (currentPlayedCount > prevPlayedCount && currentOpponent.id !== currentPlayerId) {
                // Get the newly played card (last card in playedCards)
                const playedCard = currentOpponent.playedCards[currentPlayedCount - 1]
                if (playedCard) {
                  get().showAcquiredCard(playedCard, 'played', currentOpponent.name)
                  // Increment round number
                  set((state) => ({ roundNumber: state.roundNumber + 1 }))
                  // Add to action history
                  get().addActionToHistory({
                    type: 'play',
                    playerName: currentOpponent.name,
                    playerAvatar: currentOpponent.avatar,
                    card: playedCard,
                    isOpponent: true,
                  })
                }
              }
              
              // Detect rest: hand increased significantly and playedCards is now empty
              if (currentPlayedCount === 0 && prevPlayedCount > 0 && 
                  currentHandCount > prevHandCount && currentOpponent.id !== currentPlayerId) {
                get().addActionToHistory({
                  type: 'rest',
                  playerName: currentOpponent.name,
                  playerAvatar: currentOpponent.avatar,
                  card: null,
                  isOpponent: true,
                })
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

        // Log turn changes
        const isSpectatorMode = get().isSpectator;
        if (currentPlayer) {
          if (!isSpectatorMode && currentPlayer.id === get().playerId) {
            logger.info(`Your turn!`);
          } else if (isSpectatorMode) {
            logger.info(`${currentPlayer.name}'s turn`);
          }
        }
      } else if (message.type === "chat") {
        // Handle chat message from server
        if (get().onChatMessage) {
          get().onChatMessage({
            id: Date.now(),
            player: message.player,
            playerID: message.playerID,
            message: message.message,
            timestamp: new Date(message.timestamp * 1000),
            visible: true,
          });
        }
      } else if (message.type === "error") {
        logger.error("Game error:", message.error);
        showToast(`Error: ${message.error}`, 'error');
      }
    };

    ws.onerror = (error) => {
      logger.error("❌ WebSocket error occurred:", error);
      logger.error(`   Ready state: ${ws.readyState}`);
      logger.error(`   URL attempted: ${wsUrl}`);
      
      // Clear connection timeout
      const timeoutId = get().connectionTimeoutId;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      set({ 
        connected: false,
        connectionError: 'Failed to connect to server. Please check your connection.',
        isConnecting: false,
        connectionTimeoutId: null,
      });
      
      // Don't show toast here - let onclose handle it with better messages
    };

    ws.onclose = (event) => {
      // Clear connection timeout if it's still running
      const timeoutId = get().connectionTimeoutId;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      set({ 
        connected: false, 
        ws: null,
        connectionTimeoutId: null,
        isConnecting: false,
      });
      logger.warn(`🔌 WebSocket disconnected`);
      logger.warn(`   Code: ${event.code}`);
      logger.warn(`   Reason: ${event.reason || 'No reason provided'}`);
      logger.warn(`   Clean: ${event.wasClean}`);
      
      // Code 1000 is normal closure, don't reconnect
      if (event.code === 1000) {
        logger.info(`Normal WebSocket closure, not reconnecting`);
        set({ connectionError: null });
        return;
      }

      // Get current state
      const currentState = get();
      const sessionId = currentState.sessionId;
      const reconnectAttempts = currentState.reconnectAttempts || 0;
      const maxReconnectAttempts = currentState.maxReconnectAttempts || 10;
      
      // Check if we've exceeded max reconnect attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        logger.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) exceeded`);
        showToast(`Failed to reconnect after ${maxReconnectAttempts} attempts. Please refresh the page.`, 'error');
        return;
      }

      // Show appropriate message based on close code
      let errorMessage = null;
      if (!event.wasClean) {
        const closeMessages = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Connection lost',
          1007: 'Invalid frame payload',
          1008: 'Policy violation',
          1009: 'Message too big',
          1011: 'Server error',
        };
        errorMessage = closeMessages[event.code] || `Connection closed (code: ${event.code})`;
        const displayMessage = event.reason || errorMessage;
        showToast(displayMessage + ' - attempting to reconnect...', 'warning');
        set({ connectionError: displayMessage });
      }

      // Implement exponential backoff reconnection
      const newAttempts = reconnectAttempts + 1;
      let reconnectDelay = currentState.reconnectDelay * Math.pow(1.5, reconnectAttempts); // 1.5x multiplier
      reconnectDelay = Math.min(reconnectDelay, currentState.maxReconnectDelay); // Cap at max delay
      
      logger.info(`🔄 Attempting to reconnect... (attempt ${newAttempts}/${maxReconnectAttempts})`);
      logger.info(`   Waiting ${Math.round(reconnectDelay / 1000)} seconds before retry...`);
      
      set({ 
        isReconnecting: true, 
        reconnectAttempts: newAttempts,
        reconnectDelay: reconnectDelay,
      });

      // Only auto-reconnect if delay is less than 5 seconds
      // For longer delays, require manual retry
      if (reconnectDelay <= 5000) {
        const timeoutId = setTimeout(() => {
          logger.info(`🔄 Reconnecting now (attempt ${newAttempts})...`);
          get().connectWebSocket(sessionId, currentState.playerName, currentState.playerAvatar, currentState.isSpectator);
          set({ reconnectTimeoutId: null });
        }, reconnectDelay);

        set({ reconnectTimeoutId: timeoutId });
      } else {
        // Wait is too long, show manual retry option
        logger.info(`⏸️ Waiting for manual retry (delay would be ${Math.round(reconnectDelay / 1000)}s)`);
        set({ 
          isReconnecting: false,
          connectionError: errorMessage || 'Connection lost. Please retry manually.',
        });
      }
    };

    set({ ws, sessionId });
  },

  // Manual reconnection trigger (for testing)
  forceReconnect: () => {
    const { sessionId, playerName, playerAvatar, isSpectator } = get();
    if (!sessionId) {
      logger.warn("Cannot reconnect: no session ID");
      return;
    }
    logger.info(`🔄 Force reconnecting...`);
    get().connectWebSocket(sessionId, playerName, playerAvatar, isSpectator);
  },

  // Cancel reconnection attempt
  cancelReconnect: () => {
    const timeoutId = get().reconnectTimeoutId;
    if (timeoutId) {
      clearTimeout(timeoutId);
      set({ 
        reconnectTimeoutId: null,
        isReconnecting: false,
        reconnectAttempts: 0,
        reconnectDelay: 1000,
      });
      logger.info(`🔴 Reconnection attempt cancelled`);
    }
  },

  // Get reconnection status
  getReconnectionStatus: () => {
    const state = get();
    return {
      isReconnecting: state.isReconnecting,
      reconnectAttempts: state.reconnectAttempts,
      maxReconnectAttempts: state.maxReconnectAttempts,
      reconnectDelay: state.reconnectDelay,
      canRetry: state.reconnectAttempts < state.maxReconnectAttempts,
    };
  },

  sendAction: (actionType, cardIndex = null, inputResources = null, outputResources = null, multiplier = null, deposits = null) => {
    const { ws, isSpectator } = get();
    
    // Spectators cannot send actions
    if (isSpectator) {
      logger.warn("Spectators cannot perform actions");
      return;
    }
    
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

  playCard: (cardIndex, card = null) => {
    const { myPlayer } = get();
    const cardData = card || myPlayer?.hand?.[cardIndex];
    get().sendAction("playCard", cardIndex);
    logger.info(`Playing card from hand`);
    get().addActionToHistory({
      type: 'play',
      playerName: myPlayer?.name || 'You',
      playerAvatar: myPlayer?.avatar,
      card: cardData,
    });
  },

  playCardWithUpgrade: (cardIndex, inputResources, outputResources, card = null) => {
    const { myPlayer } = get();
    const cardData = card || myPlayer?.hand?.[cardIndex];
    get().sendAction("playCard", cardIndex, inputResources, outputResources);
    logger.info(`Playing upgrade card`);
    get().addActionToHistory({
      type: 'upgrade',
      playerName: myPlayer?.name || 'You',
      playerAvatar: myPlayer?.avatar,
      card: cardData,
      input: inputResources,
      output: outputResources,
    });
    set({
      upgradeModalCard: null,
      upgradeModalCardIndex: null,
    });
  },

  playCardWithTrade: (cardIndex, multiplier, card = null) => {
    const { myPlayer } = get();
    const cardData = card || myPlayer?.hand?.[cardIndex];
    get().sendAction("playCard", cardIndex, null, null, multiplier);
    logger.info(`Playing trade card (x${multiplier})`);
    get().addActionToHistory({
      type: 'trade',
      playerName: myPlayer?.name || 'You',
      playerAvatar: myPlayer?.avatar,
      card: cardData,
      multiplier,
    });
    set({
      tradeModalCard: null,
      tradeModalCardIndex: null,
    });
  },

  showUpgradeModal: (card, cardIndex) => set({ upgradeModalCard: card, upgradeModalCardIndex: cardIndex }),
  hideUpgradeModal: () => set({ upgradeModalCard: null, upgradeModalCardIndex: null }),

  showTradeModal: (card, cardIndex) => set({ tradeModalCard: card, tradeModalCardIndex: cardIndex }),
  hideTradeModal: () => set({ tradeModalCard: null, tradeModalCardIndex: null }),

  acquireCard: (cardIndex, deposits = [], card = null) => {
    const { myPlayer, gameState } = get();
    const cardData = card || gameState?.market?.actionCards?.[cardIndex];
    get().sendAction("acquireCard", cardIndex, null, null, null, deposits);
    logger.info(`Acquiring card from market`);
    get().addActionToHistory({
      type: 'acquire',
      playerName: myPlayer?.name || 'You',
      playerAvatar: myPlayer?.avatar,
      card: cardData,
    });
  },

  claimPointCard: (cardIndex, card = null) => {
    const { myPlayer, gameState } = get();
    const cardData = card || gameState?.market?.pointCards?.[cardIndex];
    get().sendAction("claimPointCard", cardIndex);
    logger.info(`Claiming point card`);
    get().addActionToHistory({
      type: 'claim',
      playerName: myPlayer?.name || 'You',
      playerAvatar: myPlayer?.avatar,
      card: cardData,
    });
  },

  rest: () => {
    const { myPlayer } = get();
    get().sendAction("rest");
    logger.info(`Resting - returning cards to hand`);
    get().addActionToHistory({
      type: 'rest',
      playerName: myPlayer?.name || 'You',
      playerAvatar: myPlayer?.avatar,
      card: null,
    });
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
    logger.info(`Discarding ${Object.values(discard).reduce((a, b) => a + b, 0)} crystals`)
    
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
    logger.info(`Depositing crystals on card (target: position ${targetPosition})`)
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
    logger.info(`Collecting ${positions.length} crystals from card`)
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
    logger.info(`Auto-collecting crystals from card`)
  },

  setSelectedCard: (card) => set({ selectedCard: card }),
  clearSelectedCard: () => set({ selectedCard: null }),

  // Add rich action to history
  addActionToHistory: (action) => {
    const history = get().actionHistory;
    const newHistory = [
      { ...action, timestamp: Date.now() },
      ...history
    ].slice(0, 4); // Keep last 4
    set({ actionHistory: newHistory });
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

  // Chat message callback
  onChatMessage: null,
  setChatMessageCallback: (callback) => set({ onChatMessage: callback }),

  // Send chat message via WebSocket (both players and spectators can chat)
  sendChatMessage: (message) => {
    const { ws, isSpectator } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const chatMsg = {
      type: "chat",
      message: message,
    };

    ws.send(JSON.stringify(chatMsg));
    logger.info(`${isSpectator ? 'Spectator' : 'Player'} sent chat message:`, message);
  },

  startGame: async () => {
    const { sessionId } = get();
    if (!sessionId) {
      logger.error("No session ID available");
      return { success: false, error: "No session ID available" };
    }

    try {
      const response = await apiFetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionID: sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start game' }));
        logger.error("Failed to start game:", errorData);
        return { success: false, error: errorData.error || 'Failed to start game' };
      }

      const data = await response.json();
      logger.info("Game started successfully:", data);
      return { success: true, data };
    } catch (error) {
      logger.error("Error starting game:", error);
      return { success: false, error: error.message || 'Failed to start game' };
    }
  },

  // Sound settings actions
  toggleSoundsMuted: () => {
    const newMutedState = !get().soundsMuted;
    set({ soundsMuted: newMutedState });
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameSoundsMuted', newMutedState.toString());
    }
    return newMutedState;
  },

  setSoundsMuted: (muted) => {
    set({ soundsMuted: muted });
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameSoundsMuted', muted.toString());
    }
  },
}));

export default useGameStore;
