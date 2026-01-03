const WebSocket = require('ws');
const http = require('http');

const sessionID = 'single_' + Date.now();

console.log('Creating session:', sessionID);

const postData = JSON.stringify({ numAI: 3, sessionID, turnTimeout: 5 });

const req = http.request({
  hostname: 'localhost',
  port: 8080,
  path: '/api/single',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✓ Session created\n');
    
    const wsUrl = `ws://localhost:8080/ws?session=${sessionID}&name=TestPlayer&avatar=1&client_id=test-${Date.now()}`;
    const ws = new WebSocket(wsUrl);
    let msgCount = 0;
    
    ws.on('open', () => { console.log('✓ Connected\n'); });
    
    ws.on('message', (data) => {
      msgCount++;
      const msg = JSON.parse(data.toString());
      console.log(`[${msgCount}] ${msg.type}`);
      
      if (msg.type === 'game_state' && msg.players) {
        console.log(`  Players (${msg.players.length}):`);
        msg.players.forEach((p, i) => {
          console.log(`    ${i+1}. ${p.name} - isAI: ${p.isAI}`);
        });
      }
      
      if (msgCount > 10) {
        ws.close();
        process.exit(0);
      }
    });
    
    ws.on('error', (err) => { console.error('Error:', err.message); process.exit(1); });
    ws.on('close', () => { console.log('\nClosed'); process.exit(0); });
    
    setTimeout(() => { ws.close(); process.exit(0); }, 10000);
  });
});

req.on('error', (err) => { console.error('Error:', err.message); process.exit(1); });
req.write(postData);
req.end();
