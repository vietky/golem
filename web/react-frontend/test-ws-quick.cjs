const WebSocket = require('ws');
const http = require('http');

// First create a single player session
const sessionID = 'single_' + Date.now();

console.log('Creating session:', sessionID);

const postData = JSON.stringify({
  numAI: 3,
  sessionID: sessionID
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
    console.log('Session created:', data);
    
    // Now test WebSocket connection
    const wsUrl = 'ws://localhost:8080/ws?session=' + sessionID + '&name=TestPlayer&avatar=1';
    console.log('\nTesting WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    let connected = false;
    
    ws.on('open', () => { 
      console.log('✅ WebSocket connected successfully');
      connected = true;
      setTimeout(() => { ws.close(); }, 500);
    });
    
    ws.on('message', (data) => {
      console.log('📥 Received:', data.toString());
    });
    
    ws.on('error', (err) => { 
      console.error('❌ WebSocket error:', err.message); 
    });
    
    ws.on('close', (code) => { 
      console.log('🔌 WebSocket closed with code:', code);
      process.exit(connected ? 0 : 1);
    });
    
    setTimeout(() => {
      if (!connected) {
        console.log('❌ Connection timeout');
        ws.terminate();
        process.exit(1);
      }
    }, 5000);
  });
});

req.on('error', (err) => {
  console.error('❌ Failed to create session:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
