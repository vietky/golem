#!/bin/bash

# Sound System Debugging Guide
# This script helps debug sound issues in the game

echo "🔍 Sound System Debug Helper"
echo "=============================="
echo ""

# Check if symlinks are correct
echo "1. Checking sound file symlinks..."
if [ -L "/Users/avietidol/codes/golem/web/react-frontend/public/sounds" ]; then
  echo "   ✅ Sounds symlink exists"
  ls -lah /Users/avietidol/codes/golem/web/react-frontend/public/sounds | head -10
else
  echo "   ❌ Sounds symlink missing!"
  echo "   Run: ./create-symlinks.sh"
  exit 1
fi
echo ""

# Check sound files
echo "2. Checking sound files..."
SOUND_DIR="/Users/avietidol/codes/golem/web/static/sounds"
REQUIRED_SOUNDS=(
  "play_card.mp3"
  "acquire_merchant.mp3"
  "claim_point_card.mp3"
  "rest.mp3"
  "game_over.mp3"
  "my_turn.mp3"
  "nearly_end.mp3"
)

ALL_GOOD=true
for sound in "${REQUIRED_SOUNDS[@]}"; do
  if [ -f "$SOUND_DIR/$sound" ]; then
    SIZE=$(ls -lh "$SOUND_DIR/$sound" | awk '{print $5}')
    echo "   ✅ $sound ($SIZE)"
  else
    echo "   ❌ Missing: $sound"
    ALL_GOOD=false
  fi
done
echo ""

# Check if Vite dev server is running
echo "3. Checking Vite dev server..."
if lsof -i :3000 | grep -q LISTEN; then
  echo "   ✅ Vite dev server is running on port 3000"
else
  echo "   ⚠️  Vite dev server is NOT running"
  echo "   Start it with: cd web/react-frontend && npm run dev"
fi
echo ""

# Check backend server
echo "4. Checking backend server..."
if lsof -i :8080 | grep -q LISTEN; then
  echo "   ✅ Backend server is running on port 8080"
else
  echo "   ⚠️  Backend server is NOT running"
  echo "   Start it with: go run cmd/server/main.go"
fi
echo ""

# Test sound file accessibility
echo "5. Testing sound file accessibility..."
echo "   Opening test page in 3 seconds..."
echo "   Watch browser console for sound loading status"
sleep 3

if command -v open >/dev/null 2>&1; then
  open "http://localhost:3000/test-sounds-actions.html"
else
  echo "   Manual action required: Open http://localhost:3000/test-sounds-actions.html in your browser"
fi
echo ""

# Debugging tips
echo "=============================="
echo "🐛 Debugging Tips:"
echo ""
echo "1. Check browser console for:"
echo "   - Sound loading errors"
echo "   - useGameSounds hook logs (🃏 🛒 🏆 😴)"
echo "   - soundManager play logs (🔊 ✅ ❌)"
echo ""
echo "2. Verify localStorage mute state:"
echo "   localStorage.getItem('gameSoundsMuted')"
echo ""
echo "3. Manual sound test in browser console:"
echo "   import('/src/utils/sounds.js').then(m => m.default.play('playCard'))"
echo ""
echo "4. Check React DevTools:"
echo "   - useGameStore state"
echo "   - previousGameState updates"
echo "   - myPlayer state changes"
echo ""
echo "5. Enable detailed logging:"
echo "   localStorage.setItem('logLevel', 'debug')"
echo ""
echo "=============================="
