#!/usr/bin/env node

/**
 * WebSocket Connection Test Script
 * 
 * Tests WebSocket connection to the backend without using a browser.
 * Usage: node test-ws-connection.js [options]
 * 
 * Options:
 *   --host <host>       WebSocket host (default: localhost:8080)
 *   --session <id>      Session ID (default: auto-generated)
 *   --name <name>       Player name (default: TestPlayer)
 *   --avatar <id>       Avatar ID (default: 1)
 *   --spectate          Join as spectator
 *   --v2                Use V2 endpoint
 */

const WebSocket = require('ws');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
};

const config = {
  host: getArg('--host') || 'localhost:8080',
  session: getArg('--session') || `test_${Date.now()}`,
  name: getArg('--name') || 'TestPlayer',
  avatar: getArg('--avatar') || '1',
  spectate: args.includes('--spectate'),
  v2: args.includes('--v2')
};

const endpoint = config.v2 ? '/ws/v2' : '/ws';
const params = new URLSearchParams({
  session: config.session,
  name: config.name,
  avatar: config.avatar
});

if (config.spectate) {
  params.set('spectate', 'true');
}

const wsUrl = `ws://${config.host}${endpoint}?${params.toString()}`;

console.log('\n🧪 WebSocket Connection Test\n');
console.log('Configuration:');
console.log(`  Host:     ${config.host}`);
console.log(`  Endpoint: ${endpoint}`);
console.log(`  Session:  ${config.session}`);
console.log(`  Name:     ${config.name}`);
console.log(`  Avatar:   ${config.avatar}`);
console.log(`  Spectate: ${config.spectate}`);
console.log(`  URL:      ${wsUrl}\n`);

console.log('🔌 Connecting...\n');

const ws = new WebSocket(wsUrl);
let connectionStartTime = Date.now();

ws.on('open', () => {
  const connectionTime = Date.now() - connectionStartTime;
  console.log(`✅ Connected successfully in ${connectionTime}ms\n`);
  console.log('Connection ready. Type "ping", "close", or your message:\n');
  
  // Set up CLI for sending messages
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });
  
  rl.prompt();
  
  rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'close') {
      console.log('Closing connection...');
      ws.close(1000, 'User requested close');
      rl.close();
      return;
    }
    
    if (input === 'ping') {
      ws.ping();
      console.log('📤 Sent ping');
    } else if (input) {
      try {
        // Try to parse as JSON, otherwise send as text
        const message = input.startsWith('{') ? input : JSON.stringify({ type: 'message', text: input });
        ws.send(message);
        console.log('📤 Sent:', message);
      } catch (err) {
        console.error('❌ Failed to send:', err.message);
      }
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000);
    }
  });
});

ws.on('message', (data) => {
  console.log('\n📥 Received:', data.toString());
  try {
    const parsed = JSON.parse(data.toString());
    console.log('   Parsed:', JSON.stringify(parsed, null, 2));
  } catch (err) {
    // Not JSON, already displayed as string
  }
  console.log('');
});

ws.on('ping', () => {
  console.log('📥 Received ping (auto-ponged)');
});

ws.on('pong', () => {
  console.log('📥 Received pong');
});

ws.on('close', (code, reason) => {
  const connectionTime = Date.now() - connectionStartTime;
  console.log(`\n🔌 Connection closed after ${connectionTime}ms`);
  console.log(`   Code:   ${code}`);
  console.log(`   Reason: ${reason || '(none)'}`);
  
  // Interpret close code
  const codeMessages = {
    1000: 'Normal closure',
    1001: 'Going away',
    1002: 'Protocol error',
    1003: 'Unsupported data',
    1005: 'No status received',
    1006: 'Abnormal closure',
    1007: 'Invalid frame payload data',
    1008: 'Policy violation',
    1009: 'Message too big',
    1010: 'Mandatory extension',
    1011: 'Internal server error',
    1015: 'TLS handshake'
  };
  
  console.log(`   Meaning: ${codeMessages[code] || 'Unknown'}\n`);
  process.exit(code === 1000 ? 0 : 1);
});

ws.on('error', (error) => {
  console.error('\n❌ WebSocket error:', error.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Is the backend server running?');
  console.error(`  2. Is the server listening on ${config.host}?`);
  console.error('  3. Check server logs for connection errors');
  console.error('  4. Verify the session exists (if not auto-created)');
  console.error('\nTry running:');
  console.error('  cd /Users/avietidol/codes/golem');
  console.error('  make run-dev  # Start the backend server\n');
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT, closing connection...');
  if (ws.readyState === WebSocket.OPEN) {
    ws.close(1000, 'SIGINT');
  }
  process.exit(0);
});
