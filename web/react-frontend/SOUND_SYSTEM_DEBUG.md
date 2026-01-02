# Sound System Debugging & Testing Guide

## Quick Diagnosis

Run the diagnostic script:
```bash
./debug-sounds.sh
```

This will:
1. Check symlinks
2. Verify sound files exist
3. Check if servers are running
4. Open test page

## Common Issues & Solutions

### Issue 1: No sounds playing at all

**Symptoms:**
- No sounds when performing any action
- Console shows no sound-related logs

**Solutions:**
1. Check if sounds are muted:
   ```javascript
   // In browser console
   localStorage.getItem('gameSoundsMuted')  // Should be 'false' or null
   ```
   
2. Unmute if needed:
   ```javascript
   localStorage.setItem('gameSoundsMuted', 'false')
   ```

3. Check symlinks:
   ```bash
   ls -la web/react-frontend/public/sounds
   # Should show symlink to web/static/sounds
   ```

4. Recreate symlinks if needed:
   ```bash
   ./create-symlinks.sh
   ```

### Issue 2: Sounds not playing for specific actions

**Symptoms:**
- Some sounds work, others don't
- Console shows logs but no sound

**Diagnosis:**
1. Check browser console for logs with emojis:
   - `🃏 Playing card sound` - Play card action detected
   - `🛒 Playing acquire merchant sound` - Acquire card detected
   - `🏆 Playing claim point card sound` - Claim golem detected
   - `😴 Playing rest sound` - Rest action detected

2. Check soundManager logs:
   - `🔊 Playing sound: <name>` - Attempting to play
   - `✅ Sound started: <name>` - Successfully started
   - `❌ Error playing sound` - Failed to play
   - `🔇 Sound muted` - Muted
   - `⏸️ Already playing` - Overlap prevention

**Solutions:**
1. If detection logs don't appear:
   - Check if `previousGameState` is being updated
   - Check React DevTools for state changes
   - Verify `myPlayer` object has correct data

2. If detection logs appear but sound doesn't play:
   - Check soundManager logs for errors
   - Verify sound files are accessible
   - Check browser audio permissions

### Issue 3: previousGameState not updating

**Symptoms:**
- No action detection logs
- useGameSounds hook not triggering

**Diagnosis:**
```javascript
// In browser console, check Zustand store
window.__ZUSTAND_DEV_TOOLS__ // If dev tools enabled
```

**Solution:**
Check `gameStore.js` - ensure `previousGameState` is set when state updates:
```javascript
set({
  gameState: message,
  previousGameState: previousState,  // ← This must be present
  myPlayer,
  opponents,
  currentPlayer,
});
```

### Issue 4: Sound plays multiple times

**Symptoms:**
- Same sound plays repeatedly
- Overlap of same sound

**Cause:**
useEffect dependencies causing multiple triggers

**Solution:**
Dependencies use `.length` instead of array reference:
```javascript
// Good ✅
[myPlayer?.playedCards?.length, ...]

// Bad ❌ (causes multiple triggers)
[myPlayer?.playedCards, ...]
```

## Testing

### Manual Testing

1. **Test Individual Sounds:**
   ```bash
   open http://localhost:3000/test-sounds-actions.html
   ```
   Click each button to test individual sounds.

2. **Test in Game:**
   - Start a single-player game
   - Watch console for logs
   - Perform each action:
     - Play a card → Should hear play_card.mp3
     - Acquire a merchant card → Should hear acquire_merchant.mp3
     - Claim a golem → Should hear claim_point_card.mp3
     - Rest → Should hear rest.mp3
     - Opponent's turn ends → Should hear my_turn.mp3
     - Someone gets 4 golems → Should hear nearly_end.mp3
     - Game ends → Should hear game_over.mp3

### Automated Testing

Run the unit tests:
```bash
cd web/react-frontend
npm test src/hooks/__tests__/useGameSounds.test.js
```

Tests cover:
- My turn sound
- Nearly end sound (4 golems)
- Game over sound
- Play card detection
- Acquire merchant detection
- Claim golem detection
- Rest detection
- Mute functionality
- Spectator mode (no sounds)

## Architecture

### Sound Flow

```
User Action
    ↓
Game State Updates (via WebSocket)
    ↓
gameStore updates state
    ↓
Sets previousGameState = old state
Sets gameState = new state
    ↓
useGameSounds hook detects changes
    ↓
Compares myPlayer with previousGameState.players
    ↓
Triggers soundManager.play()
    ↓
Browser plays audio
```

### Key Components

1. **soundManager** (`src/utils/sounds.js`)
   - Singleton managing all sounds
   - Handles mute state
   - Prevents overlapping sounds
   - Loads sound files

2. **useGameSounds** (`src/hooks/useGameSounds.js`)
   - React hook for game sound effects
   - Monitors game state changes
   - Compares with previousGameState
   - Triggers appropriate sounds

3. **Sound Files** (`web/static/sounds/`)
   - Symlinked to `public/sounds/`
   - Loaded by soundManager
   - Served by Vite dev server

### State Dependencies

The hook monitors these state changes:

```javascript
{
  gameState,           // Current game state
  previousGameState,   // Previous state for comparison
  myPlayer,            // Current player data
  currentPlayer,       // Whose turn it is
  playerId,            // My player ID
  isSpectator         // Spectator mode flag
}
```

## Implementation Details

### useEffect Dependencies

Each sound uses specific dependencies to prevent false triggers:

```javascript
// Play Card
[myPlayer?.playedCards?.length, isSpectator, playerId, previousGameState]

// Acquire Merchant
[myPlayer?.hand?.length, isSpectator, playerId, previousGameState]

// Claim Golem
[myPlayer?.pointCards?.length, isSpectator, playerId, previousGameState]

// Rest
[myPlayer?.playedCards?.length, myPlayer?.hand?.length, isSpectator, playerId, previousGameState]

// My Turn
[currentPlayer, playerId, isSpectator]

// Nearly End
[gameState]

// Game Over
[gameState?.gameOver]
```

### Sound Loading

Sounds are preloaded on app initialization:

```javascript
preloadSounds() {
  Object.entries(this.soundFiles).forEach(([key, path]) => {
    const audio = new Audio(path);
    audio.preload = 'auto';  // Preload immediately
    this.sounds[key] = audio;
  });
}
```

### Overlap Prevention

By default, sounds don't overlap:

```javascript
if (!allowOverlap && this.currentlyPlaying.has(soundName)) {
  return;  // Don't play if already playing
}
```

Special sounds allow overlap:
```javascript
soundManager.play('nearlyEnd', true);  // Can overlap
soundManager.play('gameOver', true);   // Can overlap
```

## Browser Console Commands

### Check mute state
```javascript
localStorage.getItem('gameSoundsMuted')
```

### Toggle mute
```javascript
localStorage.setItem('gameSoundsMuted', 'true')  // Mute
localStorage.setItem('gameSoundsMuted', 'false') // Unmute
```

### Manually play sound
```javascript
import('/src/utils/sounds.js').then(m => {
  m.default.play('playCard')
})
```

### Check if sounds are loaded
```javascript
import('/src/utils/sounds.js').then(m => {
  console.log(m.default.sounds)
})
```

### Monitor sound events
```javascript
const audio = new Audio('/sounds/play_card.mp3');
audio.addEventListener('canplaythrough', () => console.log('Loaded'));
audio.addEventListener('error', (e) => console.error('Error:', e));
audio.load();
```

## Troubleshooting Checklist

- [ ] Symlinks created (`ls -la public/sounds`)
- [ ] Sound files exist (`ls static/sounds`)
- [ ] Vite dev server running (`lsof -i :3000`)
- [ ] Backend server running (`lsof -i :8080`)
- [ ] Sounds not muted (`localStorage.getItem('gameSoundsMuted')`)
- [ ] Browser allows audio playback
- [ ] Console shows no errors
- [ ] previousGameState updates properly
- [ ] myPlayer state changes when actions occur
- [ ] useGameSounds hook is called in App.jsx
- [ ] Sound files accessible at `/sounds/*.mp3`
- [ ] No CORS errors in console
- [ ] No 404 errors for sound files

## Next Steps

If sounds still don't work after all checks:

1. Check browser audio permissions
2. Try different browser
3. Check browser console for any errors
4. Verify React is rendering correctly
5. Check if other audio works on the site
6. Test with headphones
7. Check system audio settings
8. Try clearing browser cache

## Files Reference

- `src/utils/sounds.js` - Sound manager singleton
- `src/hooks/useGameSounds.js` - Sound detection hook
- `src/App.jsx` - Hook initialization
- `web/static/sounds/` - Sound files (source)
- `web/react-frontend/public/sounds/` - Symlink to static/sounds
- `test-sounds-actions.html` - Manual test page
- `src/hooks/__tests__/useGameSounds.test.js` - Unit tests
- `debug-sounds.sh` - Diagnostic script
- `create-symlinks.sh` - Symlink creation script
