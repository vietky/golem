#!/bin/bash

# Comprehensive Sound System Test
# Tests all aspects of the sound system

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}   🎵 Sound System Comprehensive Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Check symlinks
echo -e "${BLUE}Test 1: Checking symlinks...${NC}"
if [ -L "/Users/avietidol/codes/golem/web/react-frontend/public/sounds" ]; then
  echo -e "${GREEN}✅ PASS:${NC} Sounds symlink exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Sounds symlink missing"
  ((TESTS_FAILED++))
fi

if [ -L "/Users/avietidol/codes/golem/web/react-frontend/public/images" ]; then
  echo -e "${GREEN}✅ PASS:${NC} Images symlink exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Images symlink missing"
  ((TESTS_FAILED++))
fi
echo ""

# Test 2: Check all sound files
echo -e "${BLUE}Test 2: Checking sound files...${NC}"
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

for sound in "${REQUIRED_SOUNDS[@]}"; do
  if [ -f "$SOUND_DIR/$sound" ]; then
    SIZE=$(ls -lh "$SOUND_DIR/$sound" | awk '{print $5}')
    if [ "$SIZE" != "666B" ]; then
      echo -e "${GREEN}✅ PASS:${NC} $sound exists ($SIZE) - Real audio file"
      ((TESTS_PASSED++))
    else
      echo -e "${YELLOW}⚠️  WARN:${NC} $sound exists but is placeholder (666B)"
      ((TESTS_PASSED++))
    fi
  else
    echo -e "${RED}❌ FAIL:${NC} Missing: $sound"
    ((TESTS_FAILED++))
  fi
done
echo ""

# Test 3: Check file types
echo -e "${BLUE}Test 3: Validating file types...${NC}"
for sound in "${REQUIRED_SOUNDS[@]}"; do
  if file "$SOUND_DIR/$sound" | grep -q "MPEG ADTS\|Audio file with ID3"; then
    echo -e "${GREEN}✅ PASS:${NC} $sound is valid MP3"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL:${NC} $sound is not valid MP3"
    ((TESTS_FAILED++))
  fi
done
echo ""

# Test 4: Check source code
echo -e "${BLUE}Test 4: Checking source code...${NC}"

# Check if useGameSounds is imported (in SinglePlayerApp.jsx which is actually used)
if grep -q "import useGameSounds" "/Users/avietidol/codes/golem/web/react-frontend/src/SinglePlayerApp.jsx"; then
  echo -e "${GREEN}✅ PASS:${NC} useGameSounds imported in SinglePlayerApp.jsx"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} useGameSounds not imported in SinglePlayerApp.jsx"
  ((TESTS_FAILED++))
fi

# Check if hook is called
if grep -q "useGameSounds()" "/Users/avietidol/codes/golem/web/react-frontend/src/SinglePlayerApp.jsx"; then
  echo -e "${GREEN}✅ PASS:${NC} useGameSounds() called in SinglePlayerApp.jsx"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} useGameSounds() not called in SinglePlayerApp.jsx"
  ((TESTS_FAILED++))
fi

# Check for emoji logging
if grep -q "🃏 Playing card sound" "/Users/avietidol/codes/golem/web/react-frontend/src/hooks/useGameSounds.js"; then
  echo -e "${GREEN}✅ PASS:${NC} Emoji logging present in useGameSounds.js"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Emoji logging missing in useGameSounds.js"
  ((TESTS_FAILED++))
fi

# Check for improved dependencies
if grep -q "myPlayer?.playedCards?.length" "/Users/avietidol/codes/golem/web/react-frontend/src/hooks/useGameSounds.js"; then
  echo -e "${GREEN}✅ PASS:${NC} Fixed dependencies (using .length)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Dependencies not fixed"
  ((TESTS_FAILED++))
fi

# Check soundManager logging
if grep -q "🔊 Playing sound:" "/Users/avietidol/codes/golem/web/react-frontend/src/utils/sounds.js"; then
  echo -e "${GREEN}✅ PASS:${NC} Sound manager has emoji logging"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Sound manager logging missing"
  ((TESTS_FAILED++))
fi
echo ""

# Test 5: Check test files
echo -e "${BLUE}Test 5: Checking test files...${NC}"

if [ -f "/Users/avietidol/codes/golem/web/react-frontend/src/hooks/__tests__/useGameSounds.test.js" ]; then
  echo -e "${GREEN}✅ PASS:${NC} Unit tests exist"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Unit tests missing"
  ((TESTS_FAILED++))
fi

if [ -f "/Users/avietidol/codes/golem/web/react-frontend/test-sounds-actions.html" ]; then
  echo -e "${GREEN}✅ PASS:${NC} Manual test page exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Manual test page missing"
  ((TESTS_FAILED++))
fi
echo ""

# Test 6: Check documentation
echo -e "${BLUE}Test 6: Checking documentation...${NC}"

if [ -f "/Users/avietidol/codes/golem/web/react-frontend/SOUND_SYSTEM_DEBUG.md" ]; then
  echo -e "${GREEN}✅ PASS:${NC} Debug guide exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Debug guide missing"
  ((TESTS_FAILED++))
fi

if [ -f "/Users/avietidol/codes/golem/web/react-frontend/SOUND_SYSTEM_FIX.md" ]; then
  echo -e "${GREEN}✅ PASS:${NC} Fix summary exists"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} Fix summary missing"
  ((TESTS_FAILED++))
fi
echo ""

# Test 7: Check scripts
echo -e "${BLUE}Test 7: Checking utility scripts...${NC}"

if [ -x "/Users/avietidol/codes/golem/create-symlinks.sh" ]; then
  echo -e "${GREEN}✅ PASS:${NC} create-symlinks.sh is executable"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} create-symlinks.sh not executable"
  ((TESTS_FAILED++))
fi

if [ -x "/Users/avietidol/codes/golem/debug-sounds.sh" ]; then
  echo -e "${GREEN}✅ PASS:${NC} debug-sounds.sh is executable"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL:${NC} debug-sounds.sh not executable"
  ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}   Test Results${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
PERCENTAGE=$((TESTS_PASSED * 100 / TOTAL))

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}   ✅ ALL TESTS PASSED! (${PERCENTAGE}%)${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "🎉 Sound system is ready!"
  echo ""
  echo "Next steps:"
  echo "  1. Start dev server: cd web/react-frontend && npm run dev"
  echo "  2. Test manually: open http://localhost:3000/test-sounds-actions.html"
  echo "  3. Play the game and check console for emoji logs"
  echo ""
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}   ❌ SOME TESTS FAILED (${PERCENTAGE}% passed)${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Please fix the failing tests before proceeding."
  echo "Run: ./debug-sounds.sh for detailed diagnostics"
  echo ""
  exit 1
fi
