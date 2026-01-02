// WebSocket Connection Test - Run this in browser console
// Open browser to: http://localhost:3000
// Then paste this code in the console

console.log('=== WebSocket Connection Test ===');
console.log('');

// Step 1: Create a session
console.log('1. Creating session...');
fetch('/api/single', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerName: 'TestPlayer', avatar: '1', numAI: 1 })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Session created:', data);
  const sessionId = data.sessionID;
  
  // Step 2: Connect WebSocket
  console.log('');
  console.log('2. Connecting to WebSocket...');
  const wsUrl = `ws://localhost:3000/ws?session=${sessionId}&name=TestPlayer&avatar=1`;
  console.log('   URL:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WebSocket CONNECTED!');
    console.log('');
    console.log('=== TEST PASSED ===');
    console.log('WebSocket connection is working correctly!');
    console.log('');
    console.log('You can now:');
    console.log('1. Play the game normally');
    console.log('2. Test multiplayer by opening another tab');
    console.log('3. Close this connection with: ws.close()');
    console.log('');
    
    // Store ws in global scope for manual testing
    window.testWs = ws;
  };
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('📨 Received:', msg.type, msg);
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket ERROR:', error);
  };
  
  ws.onclose = (event) => {
    console.log('🔌 WebSocket closed:', event.code, event.reason);
  };
})
.catch(err => {
  console.error('❌ Error creating session:', err);
});
