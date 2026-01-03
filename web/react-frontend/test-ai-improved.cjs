const WebSocket = require('ws');

console.log('[TEST] Starting AI Single Player Test...\n');

// Create session first
console.log('[TEST] Creating single player session...');

const http = require('http');

const postData = JSON.stringify({
  numAI: 3,  // 3 AI opponents + 1 human = 4 players total
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
  console.log('[API] Session creation response:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('[API] Response:', data);
    
    // Parse the session ID from response
    let sessionId;
    try {
      const response = JSON.parse(data);
      sessionId = response.sessionID || response.sessionId || response.session_id;
      if (!sessionId) {
        console.error('[ERROR] No session ID in response');
        console.error('[ERROR] Response keys:', Object.keys(response));
        process.exit(1);
      }
      console.log('[API] Got session ID:', sessionId);
    } catch (err) {
      console.error('[ERROR] Failed to parse response:', err.message);
      process.exit(1);
    }
    
    // Now connect via WebSocket
    setTimeout(() => {
      const clientId = `test-${Date.now()}`;
      const wsUrl = `ws://localhost:8080/ws?session=${sessionId}&name=TestPlayer&avatar=1&client_id=${clientId}`;
      console.log('\n[WS] Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      let messageCount = 0;
      
      ws.on('open', () => {
        console.log('[WS] Connected successfully!\n');
      });
      
      ws.on('message', (data) => {
        messageCount++;
        try {
          const msg = JSON.parse(data);
          console.log(`\n[MSG ${messageCount}] Type: ${msg.type}`);
          console.log('[MSG] Raw message:', JSON.stringify(msg, null, 2));
          
          if (msg.type === 'state') {
            console.log('\n=== GAME STATE ANALYSIS ===');
            console.log('Status:', msg.status);
            console.log('Total players:', msg.players ? msg.players.length : 0);
            
            if (msg.players && msg.players.length > 0) {
              msg.players.forEach((p, idx) => {
                console.log(`\nPlayer ${idx + 1}:`);
                console.log('  - ID:', p.id);
                console.log('  - Name:', p.name);
                console.log('  - isAI:', p.isAI);
                console.log('  - hasRested:', p.hasRested);
                console.log('  - points:', p.points);
              });
              
              const aiPlayers = msg.players.filter(p => p.isAI);
              console.log('\n=== AI DETECTION ===');
              console.log('AI players found:', aiPlayers.length);
              console.log('Expected:', 3);
              console.log('Total players:', msg.players.length);
              console.log('Match conditions:', {
                aiPlayersIs3: aiPlayers.length === 3,
                totalPlayersIs4: msg.players.length === 4
              });
              
              if (aiPlayers.length === 3 && msg.players.length === 4) {
                console.log('\n✅ SUCCESS: AI players detected correctly!');
                console.log('✅ Game auto-started with status:', msg.status);
                ws.close();
                process.exit(0);
              } else if (msg.status === 'playing' && aiPlayers.length !== 3) {
                console.log('\n❌ FAILURE: Game started but wrong number of AI players');
                console.log('❌ Expected 3 AI players, got:', aiPlayers.length);
                ws.close();
                process.exit(1);
              }
            }
          }
          
          if (msg.type === 'player_assigned') {
            console.log('\n[ASSIGNMENT] You are Player', msg.playerID);
          }
          
        } catch (err) {
          console.error('[ERROR] Failed to parse message:', err.message);
          console.log('[ERROR] Raw data:', data.toString());
        }
      });
      
      ws.on('error', (err) => {
        console.error('[WS ERROR]', err.message);
        process.exit(1);
      });
      
      ws.on('close', () => {
        console.log('\n[WS] Connection closed');
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('\n⏱️ Timeout - closing test');
        ws.close();
        process.exit(1);
      }, 10000);
      
    }, 1000); // Wait for session creation
  });
});

req.on('error', (err) => {
  console.error('[HTTP ERROR] Full error:', err);
  console.error('[HTTP ERROR] Message:', err.message);
  console.error('[HTTP ERROR] Code:', err.code);
  process.exit(1);
});

req.write(postData);
req.end();
