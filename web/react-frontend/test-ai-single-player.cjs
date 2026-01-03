const WebSocket = require('ws');
const http = require('http');

// First create a single player session
const sessionID = 'single_' + Date.now();

console.log('='.repeat(60));
console.log('Testing Single Player AI Functionality');
console.log('='.repeat(60));
console.log('\n1. Creating session:', sessionID);

const postData = JSON.stringify({
  numAI: 3,
  sessionID: sessionID,
  turnTimeout: 2  // Short timeout for faster testing
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/single',
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
    console.log('   ✓ Session created:', data);
    
    // Now test WebSocket connection
    const wsUrl = 'ws://localhost:8080/ws?session=' + sessionID + '&name=TestPlayer&avatar=1&client_id=test-' + Date.now();
    console.log('\n2. Connecting to WebSocket...');
    
    const ws = new WebSocket(wsUrl);
    let connected = false;
    let hasAIPlayers = false;
    let aiActionsObserved = 0;
    let messageCount = 0;
    
    ws.on('open', () => { 
      console.log('   ✓ WebSocket connected');
      connected = true;
    });
    
    ws.on('message', (data) => {
      messageCount++;
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'game_state') {
        console.log(`\n3. Game state received (message ${messageCount})`);
        
        if (msg.players && messageCount === 1) {
          console.log('   Players in game:');
          msg.players.forEach((player, idx) => {
            const isAI = player.isAI || false;
            const isCurrent = idx === msg.currentTurn;
            const marker = isCurrent ? ' <- CURRENT' : '';
            console.log(`     ${idx + 1}. ${player.name} (AI: ${isAI})${marker}`);
            if (isAI) hasAIPlayers = true;
          });
        }
        
        // Check if AI is taking a turn
        if (msg.currentTurn !== undefined) {
          const currentPlayer = msg.players[msg.currentTurn];
          if (currentPlayer && currentPlayer.isAI) {
            aiActionsObserved++;
            console.log(`   → AI Player ${msg.currentTurn + 1} is taking action (observed: ${aiActionsObserved})`);
          }
        }
        
        // Test success criteria
        if (hasAIPlayers && aiActionsObserved >= 2) {
          console.log('\n' + '='.repeat(60));
          console.log('✓ SUCCESS: AI players are working correctly!');
          console.log('  - AI players detected: YES');
          console.log(`  - AI actions observed: ${aiActionsObserved}`);
          console.log('='.repeat(60) + '\n');
          ws.close();
          process.exit(0);
        }
      } else if (msg.type === 'playerAssigned') {
        console.log(`   You are Player ${msg.playerID}`);
      }
      
      // Safety limit
      if (messageCount > 30) {
        console.log('\n   Reached message limit');
        ws.close();
      }
    });
    
    ws.on('error', (err) => { 
      console.error('❌ WebSocket error:', err.message); 
    });
    
    ws.on('close', (code) => { 
      console.log('\n4. WebSocket closed');
      
      if (!hasAIPlayers) {
        console.log('\n' + '='.repeat(60));
        console.log('✗ FAIL: No AI players detected');
        console.log('='.repeat(60) + '\n');
        process.exit(1);
      } else if (aiActionsObserved === 0) {
        console.log('\n' + '='.repeat(60));
        console.log('✗ FAIL: AI players detected but no actions observed');
        console.log('='.repeat(60) + '\n');
        process.exit(1);
      }
    });
    
    setTimeout(() => {
      if (!connected) {
        console.log('❌ Connection timeout');
        ws.terminate();
        process.exit(1);
      }
    }, 20000);
  });
});

req.on('error', (err) => {
  console.error('❌ Failed to create session:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
