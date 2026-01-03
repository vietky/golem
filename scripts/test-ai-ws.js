const WebSocket = require('ws');

const sessionId = process.argv[2] || 'single_1767448043572100000';
const wsUrl = `ws://localhost:8080/ws?session=${sessionId}&name=TestPlayer&avatar=1&client_id=test-client-${Date.now()}`;

console.log('Connecting to:', wsUrl);
console.log('');

const ws = new WebSocket(wsUrl);
let messageCount = 0;
let hasAIPlayers = false;
let aiActionsObserved = 0;
let testPassed = false;

ws.on('open', () => {
  console.log('✓ WebSocket connected\n');
});

ws.on('message', (data) => {
  messageCount++;
  const msg = JSON.parse(data.toString());
  
  console.log(`[Message ${messageCount}] Type: ${msg.type}`);
  
  if (msg.type === 'game_state') {
    if (msg.players) {
      console.log('\nPlayers:');
      msg.players.forEach((player, idx) => {
        const isAI = player.isAI || false;
        const isCurrent = idx === msg.currentTurn;
        const marker = isCurrent ? ' <-- CURRENT TURN' : '';
        console.log(`  ${idx + 1}. ${player.name} (AI: ${isAI})${marker}`);
        if (isAI) hasAIPlayers = true;
        if (isAI && isCurrent) {
          aiActionsObserved++;
          console.log('     → AI is taking action!');
        }
      });
      
      console.log(`\nRound: ${msg.round}, Turn: ${msg.currentTurn + 1}`);
      console.log(`AI players detected: ${hasAIPlayers ? 'YES' : 'NO'}`);
      console.log(`AI actions observed: ${aiActionsObserved}`);
    }
  } else if (msg.type === 'player_joined') {
    console.log(`  Player joined: ${msg.playerName}`);
  } else if (msg.type === 'playerAssigned') {
    console.log(`  You are Player ${msg.playerID}`);
  } else if (msg.type === 'error') {
    console.log(`  ERROR: ${msg.error}`);
  }
  
  console.log('');
  
  // Test success criteria: detected AI players and observed at least 2 AI actions
  if (hasAIPlayers && aiActionsObserved >= 2) {
    console.log('═══════════════════════════════════════════════');
    console.log('✓ SUCCESS: AI players detected and taking actions!');
    console.log('═══════════════════════════════════════════════\n');
    testPassed = true;
    ws.close();
    process.exit(0);
  }
  
  // Safety limit
  if (messageCount > 50) {
    console.log('Reached message limit');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('WebSocket closed\n');
  if (testPassed) {
    process.exit(0);
  } else if (!hasAIPlayers) {
    console.log('✗ FAIL: No AI players detected!');
    process.exit(1);
  } else if (aiActionsObserved === 0) {
    console.log('✗ FAIL: AI players detected but no actions observed!');
    process.exit(1);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  if (testPassed) {
    process.exit(0);
  } else {
    console.log('\n✗ TIMEOUT: Test did not complete in 30 seconds');
    console.log(`  AI players found: ${hasAIPlayers}`);
    console.log(`  AI actions observed: ${aiActionsObserved}`);
    ws.close();
    process.exit(1);
  }
}, 30000);
