const WebSocket = require('ws');

console.log('[TEST] AI Turn Execution Test\n');

// Create session
const http = require('http');
const postData = JSON.stringify({
  numAI: 3,
  turnTimeout: 60
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: `/api/single`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    const sessionId = response.sessionID;
    console.log('[API] Created session:', sessionId, '\n');
    
    // Connect via WebSocket
    setTimeout(() => {
      const wsUrl = `ws://localhost:8080/ws?session=${sessionId}&name=TestPlayer&avatar=1&client_id=test-${Date.now()}`;
      const ws = new WebSocket(wsUrl);
      let messageCount = 0;
      let turnHistory = [];
      let myPlayerID = null;
      
      ws.on('open', () => {
        console.log('[WS] Connected\n');
      });
      
      ws.on('message', (data) => {
        messageCount++;
        const msg = JSON.parse(data);
        
        if (msg.type === 'playerAssigned') {
          myPlayerID = msg.playerID;
          console.log('[ASSIGN] You are Player', myPlayerID, '\n');
        }
        
        if (msg.type === 'state' && msg.status === 'playing') {
          const currentPlayer = msg.currentPlayer;
          const currentPlayerData = msg.players.find(p => p.id === currentPlayer);
          
          console.log(`[TURN ${msg.currentTurn + 1}] Player ${currentPlayer} (${currentPlayerData.name}, isAI: ${currentPlayerData.isAI})`);
          
          turnHistory.push({
            turn: msg.currentTurn,
            player: currentPlayer,
            isAI: currentPlayerData.isAI,
            name: currentPlayerData.name
          });
          
          // If it's my turn and I haven't acted yet, send a Rest action
          if (currentPlayer === myPlayerID && turnHistory.length === 1) {
            console.log('[ACTION] Sending Rest action...\n');
            ws.send(JSON.stringify({
              type: 'action',
              action: {
                Type: 4 // Rest action
              }
            }));
          }
          
          // Check if we've seen at least 2 AI turns (after human's rest)
          const aiTurns = turnHistory.filter(t => t.isAI);
          if (aiTurns.length >= 2) {
            console.log('\n=== TURN HISTORY ===');
            turnHistory.forEach(t => {
              console.log(`Turn ${t.turn + 1}: Player ${t.player} (${t.name}) - AI: ${t.isAI}`);
            });
            
            console.log('\n✅ SUCCESS: AI players took', aiTurns.length, 'turns!');
            console.log('Test verified that AI can execute actions automatically.\n');
            ws.close();
            process.exit(0);
          }
        }
        
        // Timeout after 15 seconds
        if (messageCount === 1) {
          setTimeout(() => {
            console.log('\n⏱️  Timeout after 15 seconds');
            console.log('\n=== TURN HISTORY ===');
            turnHistory.forEach(t => {
              console.log(`Turn ${t.turn + 1}: Player ${t.player} (${t.name}) - AI: ${t.isAI}`);
            });
            
            const aiTurns = turnHistory.filter(t => t.isAI);
            if (aiTurns.length > 0) {
              console.log('\n⚠️  PARTIAL SUCCESS: Saw', aiTurns.length, 'AI turns before timeout');
            } else {
              console.log('\n❌ FAILURE: No AI turns observed');
            }
            ws.close();
            process.exit(1);
          }, 15000);
        }
      });
      
      ws.on('error', (err) => {
        console.error('[WS ERROR]', err.message);
        process.exit(1);
      });
      
    }, 500);
  });
});

req.on('error', (err) => {
  console.error('[HTTP ERROR]', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
