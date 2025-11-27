let ws = null;
let sessionId = null;
let playerId = null;
let playerName = '';
let playerAvatar = '4'; // Default avatar
let gameState = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createBtn').addEventListener('click', createGame);
    document.getElementById('joinBtn').addEventListener('click', joinGame);
    document.getElementById('restBtn').addEventListener('click', () => sendAction('rest'));
    document.getElementById('copyBtn').addEventListener('click', copySessionId);
    document.getElementById('newGameBtn').addEventListener('click', () => {
        document.getElementById('gameOverModal').classList.add('hidden');
        document.getElementById('lobby').classList.remove('hidden');
        document.getElementById('game').classList.add('hidden');
        document.getElementById('sessionInfo').classList.add('hidden');
    });
    
    // Avatar selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            playerAvatar = option.dataset.avatar;
            document.getElementById('selectedAvatar').value = playerAvatar;
        });
    });
});

async function createGame() {
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    playerName = document.getElementById('playerName').value || 'Player 1';
    const customSessionId = document.getElementById('customSessionId').value.trim();
    
    try {
        const requestBody = {
            numPlayers: numPlayers,
            seed: Date.now()
        };
        
        // Add custom session ID if provided
        if (customSessionId) {
            requestBody.sessionID = customSessionId;
        }
        
        const response = await fetch('/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            const text = await response.text();
            showStatus(`Error: ${text || response.statusText}`, 'error');
            return;
        }
        
        if (!response.ok) {
            const errorMsg = data.error || data.message || response.statusText;
            showStatus(`Error: ${errorMsg}`, 'error');
            return;
        }
        
        sessionId = data.sessionID;
        playerId = 1; // Creator is always player 1
        
        // Show session ID prominently
        document.getElementById('createdSessionId').value = sessionId;
        document.getElementById('sessionInfo').classList.remove('hidden');
        showStatus('Game created! Share the Session ID above with your friends.', 'success');
        
        // Auto-connect after a short delay
        setTimeout(() => {
            connectWebSocket();
        }, 500);
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}

function copySessionId() {
    const sessionIdInput = document.getElementById('createdSessionId');
    sessionIdInput.select();
    sessionIdInput.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand('copy');
    
    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#28a745';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '';
    }, 2000);
}

async function joinGame() {
    // Try to get session ID from the join field first, then from custom field
    let sessionIdValue = document.getElementById('sessionId').value.trim();
    if (!sessionIdValue) {
        // Also check custom session ID field in case user entered it there
        sessionIdValue = document.getElementById('customSessionId').value.trim();
    }
    
    playerName = document.getElementById('playerName').value || 'Player';
    
    if (!sessionIdValue) {
        showStatus('Please enter a session ID in the "Session ID" field to join an existing game', 'error');
        return;
    }
    
    sessionId = sessionIdValue;
    
    try {
        showStatus('Joining game...', 'success');
        console.log('Joining with session ID:', sessionId); // Debug log
        const response = await fetch(`/api/join?session=${encodeURIComponent(sessionId)}`);
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // If response is not JSON, try to get text
            const text = await response.text();
            showStatus(`Error: ${text || response.statusText}`, 'error');
            return;
        }
        
        if (!response.ok) {
            const errorMsg = data.error || data.message || response.statusText;
            if (response.status === 404) {
                showStatus('Session not found. Please check the Session ID.', 'error');
            } else if (response.status === 403) {
                showStatus('Game is full. Cannot join.', 'error');
            } else {
                showStatus(`Error: ${errorMsg}`, 'error');
            }
            return;
        }
        
        if (data.status === 'ready') {
            // Server will auto-assign player ID, so we don't specify one
            playerId = null; // Will be assigned by server
            showStatus('Joining game...', 'success');
            connectWebSocket();
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Don't send player ID - let server auto-assign
    playerAvatar = document.getElementById('selectedAvatar').value || '4';
    let wsUrl = `${protocol}//${window.location.host}/ws?session=${sessionId}&name=${encodeURIComponent(playerName)}&avatar=${playerAvatar}`;
    if (playerId) {
        wsUrl += `&player=${playerId}`;
    }
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('game').classList.remove('hidden');
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        // Handle player ID assignment
        if (message.type === 'playerAssigned') {
            playerId = message.playerID;
            console.log(`Assigned player ID: ${playerId}`);
        }
        
        handleMessage(message);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showStatus('Connection error', 'error');
    };
    
    ws.onclose = () => {
        console.log('WebSocket closed');
    };
}

function handleMessage(message) {
    if (message.type === 'state') {
        gameState = message;
        updateUI();
    } else if (message.type === 'error') {
        alert(`Error: ${message.error}`);
    }
}

function updateUI() {
    if (!gameState) return;
    
    // Update game info
    const roundEl = document.getElementById('round');
    const turnEl = document.getElementById('turn');
    const maxRoundsEl = document.getElementById('maxRounds');
    
    if (roundEl) roundEl.textContent = gameState.round;
    if (turnEl) turnEl.textContent = gameState.currentTurn + 1;
    if (maxRoundsEl) maxRoundsEl.textContent = '10'; // You can make this dynamic
    
    // Update progress ring
    const progressRing = document.querySelector('.progress-ring-progress');
    if (progressRing) {
        const progress = (gameState.round / 10) * 100;
        const circumference = 2 * Math.PI * 35;
        const offset = circumference - (progress / 100) * circumference;
        progressRing.style.strokeDashoffset = offset;
    }
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
    const currentPlayerNameEl = document.getElementById('currentPlayerName');
    if (currentPlayer && currentPlayerNameEl) {
        currentPlayerNameEl.textContent = currentPlayer.name;
    }
    
    // Update players list
    updatePlayersList();
    
    // Update market
    updateMarket();
    
    // Update player hand
    updatePlayerHand();
    
    // Update resources
    updateResources();
    
    // Check game over
    if (gameState.gameOver) {
        showGameOver();
    }
}

function updatePlayersList() {
    const container = document.getElementById('playersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    gameState.players.forEach(player => {
        const div = createPlayerCardElement(player);
        container.appendChild(div);
    });
}

function createPlayerCardElement(player) {
    const div = document.createElement('div');
    div.className = 'player-card-vertical';
    if (player.id === gameState.currentPlayer) {
        div.classList.add('current-turn');
    }
    
    // Get avatar number (default to player ID if not set)
    const avatarNum = player.avatar || player.id || '1';
    const avatarPath = `images/avatar/${avatarNum}.webp`;
    
    div.innerHTML = `
        <div class="player-avatar-vertical">
            <img src="${avatarPath}" alt="${player.name}" onerror="this.src='images/avatar/1.webp'">
            ${player.id === gameState.currentPlayer ? '<div class="turn-badge-vertical">TURN</div>' : ''}
        </div>
        <div class="player-name-vertical">${player.name}</div>
        <div class="player-badges-vertical">
            <span class="badge-vertical">${player.points} POINTS</span>
            <span class="badge-vertical">${player.pointCards.length} CARDS</span>
        </div>
    `;
    return div;
}

function updateMarket() {
    // Action cards
    const actionContainer = document.getElementById('actionCards');
    actionContainer.innerHTML = '';
    
    gameState.market.actionCards.forEach((card, index) => {
        const cardDiv = createCardElement(card, 'action', index, card.cost);
        actionContainer.appendChild(cardDiv);
    });
    
    // Point cards
    const pointContainer = document.getElementById('pointCards');
    pointContainer.innerHTML = '';
    
    gameState.market.pointCards.forEach((card, index) => {
        const cardDiv = createCardElement(card, 'point', index);
        pointContainer.appendChild(cardDiv);
    });
}

function createCardElement(card, type, index, cost = null) {
    const div = document.createElement('div');
    div.className = `card-vertical ${type}-card`;
    div.dataset.index = index;
    div.dataset.type = type;
    
    let html = '';
    
    // Use Vietnamese name if available
    const displayName = typeof getVietnameseCardName !== 'undefined' 
        ? getVietnameseCardName(card.name) 
        : card.name;
    
    // Card name above image
    html += `<div class="card-name-vertical">${displayName}</div>`;
    
    // Card container
    html += '<div class="card-wrapper-vertical">';
    
    // Card type badge (top left)
    if (type === 'action' && card.actionType !== undefined) {
        const actionTypes = ['produce', 'upgrade', 'trade'];
        const actionType = actionTypes[card.actionType] || '';
        html += `<div class="card-type-badge-vertical ${actionType}">${actionType.toUpperCase()}</div>`;
    } else if (type === 'point') {
        html += `<div class="card-type-badge-vertical points">POINTS</div>`;
    }
    
    // Quantity badge (top right) - for market cards
    if (type === 'action' || type === 'point') {
        html += `<div class="card-quantity-badge">1</div>`;
    }
    
    // Card image
    if (typeof getCardImage !== 'undefined' && card.name) {
        html += `<div class="card-image-container-vertical">${getCardImage(card.name, 'card-image-vertical')}</div>`;
    }
    
    // Point value for point cards (bottom center)
    if (type === 'point' && card.points !== undefined) {
        html += `<div class="card-points-value">${card.points}</div>`;
    }
    
    html += '</div>';
    div.innerHTML = html;
    
    // Add click handler
    div.addEventListener('click', () => handleCardClick(type, index, div));
    
    // Check if card is playable/affordable
    if (type === 'action' && gameState.currentPlayer === playerId) {
        const currentPlayer = gameState.players.find(p => p.id === playerId);
        if (currentPlayer && cost) {
            if (hasResources(currentPlayer.resources, cost)) {
                div.classList.add('affordable');
            }
        }
    } else if (type === 'point' && gameState.currentPlayer === playerId) {
        const currentPlayer = gameState.players.find(p => p.id === playerId);
        if (currentPlayer && card.requirement) {
            if (hasResources(currentPlayer.resources, card.requirement)) {
                div.classList.add('playable');
            }
        }
    }
    
    return div;
}

function updatePlayerHand() {
    const container = document.getElementById('playerHand');
    container.innerHTML = '';
    
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    currentPlayer.hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-vertical action-card';
        if (gameState.currentPlayer === playerId) {
            cardDiv.classList.add('playable');
        }
        cardDiv.dataset.index = index;
        cardDiv.dataset.type = 'hand';
        
        let html = '';
        
        // Use Vietnamese name if available
        const displayName = typeof getVietnameseCardName !== 'undefined' 
            ? getVietnameseCardName(card.name) 
            : card.name;
        
        // Card name above image
        html += `<div class="card-name-vertical">${displayName}</div>`;
        html += '<div class="card-wrapper-vertical">';
        
        // Card type badge
        if (card.actionType !== undefined) {
            const actionTypes = ['produce', 'upgrade', 'trade'];
            const actionType = actionTypes[card.actionType] || '';
            html += `<div class="card-type-badge-vertical ${actionType}">${actionType.toUpperCase()}</div>`;
        }
        
        // Card image
        if (typeof getCardImage !== 'undefined' && card.name) {
            html += `<div class="card-image-container-vertical">${getCardImage(card.name, 'card-image-vertical')}</div>`;
        }
        
        html += '</div>';
        cardDiv.innerHTML = html;
        
        cardDiv.addEventListener('click', () => {
            if (gameState.currentPlayer === playerId) {
                sendAction('playCard', index);
            }
        });
        
        container.appendChild(cardDiv);
    });
}

function updateResources() {
    const container = document.getElementById('playerResources');
    container.innerHTML = '';
    
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    const resources = currentPlayer.resources;
    const resourceTypes = [
        { name: 'Yellow', value: resources.yellow, class: 'yellow' },
        { name: 'Green', value: resources.green, class: 'green' },
        { name: 'Blue', value: resources.blue, class: 'blue' },
        { name: 'Pink', value: resources.pink, class: 'pink' }
    ];
    
    resourceTypes.forEach(res => {
        if (res.value > 0) {
            const div = document.createElement('div');
            div.className = 'resource-item';
            div.innerHTML = `
                <span class="crystal ${res.class}">
                    <span class="crystal-count">${res.value}</span>
                </span>
                <span>${res.name}</span>
            `;
            container.appendChild(div);
        }
    });
    
    document.getElementById('playerPoints').textContent = currentPlayer.points;
}

function handleCardClick(type, index, element) {
    if (gameState.currentPlayer !== playerId) {
        return; // Not your turn
    }
    
    if (type === 'action') {
        sendAction('acquireCard', index);
    } else if (type === 'point') {
        sendAction('claimPointCard', index);
    }
}

function sendAction(actionType, cardIndex = null) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    if (gameState.currentPlayer !== playerId) {
        alert('Not your turn!');
        return;
    }
    
    const message = {
        type: 'action',
        actionType: actionType,
        cardIndex: cardIndex !== null ? cardIndex : 0
    };
    
    ws.send(JSON.stringify(message));
}

function formatResources(resources) {
    if (!resources) return 'None';
    
    const parts = [];
    if (resources.yellow > 0) parts.push(`${resources.yellow} Yellow`);
    if (resources.green > 0) parts.push(`${resources.green} Green`);
    if (resources.blue > 0) parts.push(`${resources.blue} Blue`);
    if (resources.pink > 0) parts.push(`${resources.pink} Pink`);
    
    return parts.length > 0 ? parts.join(', ') : 'None';
}

function formatResourcesHTML(resources) {
    if (!resources) return '';
    
    let html = '';
    const colors = [
        { name: 'yellow', value: resources.yellow || 0 },
        { name: 'green', value: resources.green || 0 },
        { name: 'blue', value: resources.blue || 0 },
        { name: 'pink', value: resources.pink || 0 }
    ];
    
    colors.forEach(color => {
        if (color.value > 0) {
            html += `<span class="crystal ${color.name}">
                <span class="crystal-count">${color.value}</span>
            </span>`;
        }
    });
    
    return html || '';
}

function hasResources(playerResources, required) {
    return playerResources.yellow >= (required.yellow || 0) &&
           playerResources.green >= (required.green || 0) &&
           playerResources.blue >= (required.blue || 0) &&
           playerResources.pink >= (required.pink || 0);
}

function showGameOver() {
    const modal = document.getElementById('gameOverModal');
    const results = document.getElementById('finalResults');
    results.innerHTML = '';
    
    // Sort players by points
    const sortedPlayers = [...gameState.players].sort((a, b) => b.points - a.points);
    
    sortedPlayers.forEach((player, index) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        if (player.id === gameState.winner.id) {
            div.classList.add('winner');
        }
        div.innerHTML = `
            <strong>${index + 1}. ${player.name}</strong><br>
            Points: ${player.points} | Point Cards: ${player.pointCards.length}
        `;
        results.appendChild(div);
    });
    
    modal.classList.remove('hidden');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('lobbyStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

