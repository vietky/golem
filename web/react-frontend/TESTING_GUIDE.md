# Quick Testing Guide - New Features

## 🧪 Testing the New Features

### 1. Test Sprite Configuration

**Test A: Default (Sprite Mode)**
```bash
cd web/react-frontend
npm run dev
# Check browser network tab - should see only 3 sprite images loading
```

**Test B: Individual Image Mode**
```bash
cd web/react-frontend
VITE_USE_SPRITE_IMAGES=false npm run dev
# Check browser network tab - should see individual card images (100+)
```

**Test C: Build for Production**
```bash
npm run build
# Uses .env.production settings (sprites enabled)
```

---

### 2. Test Round Number Display

1. Start a game with 2+ players
2. Look for blue badge in **top-left corner**: `🎯 Round 1`
3. When any player makes a move, round number should increment
4. Badge should NOT show during waiting mode

**Expected:**
- Round starts at 0 (hidden)
- Increments to 1, 2, 3... as players take turns
- Badge appears in top-left, doesn't overlap with other UI

---

### 3. Test Spectator Chat

**Setup:**
1. Open game in 2 browsers/tabs
2. Join as spectator in one tab (use spectate URL or button)

**Test:**
1. As spectator, type message in chat: `"Hello from spectator"`
2. Send message (💬 button)
3. Verify message appears in activity feed
4. Verify players can see the spectator's message
5. Try to make a game action (should show "You are spectating" toast)

**Expected:**
- ✅ Spectator CAN send chat messages
- ✅ Everyone can see spectator messages
- ❌ Spectator CANNOT make game moves
- Badge shows "👁️ Spectating"

---

### 4. Test Chat Notifications & Unread Count

**Setup:**
1. Start a game
2. Collapse the activity feed (close the panel)

**Test A: Receive New Message**
1. Have another player send a chat message
2. Look at collapsed chat icon (purple button)
3. Should see badge with number: `(1)` with bounce animation

**Test B: Multiple Messages**
1. While panel is still collapsed
2. Have player send 3 messages
3. Badge should show: `(3)`

**Test C: Open Panel**
1. Click chat icon to expand
2. Badge should disappear
3. All messages should be visible

**Test D: New Messages After Opening**
1. Keep panel open
2. Receive new messages
3. No badge (panel is open)
4. Close panel
5. Receive new message
6. Badge reappears with count

**Expected:**
- Badge shows unread count when panel is collapsed
- Badge bounces to attract attention
- Badge resets when panel is opened
- Count increments as new messages arrive

---

### 5. Test Chat Message Visibility

**Setup:**
1. Start game with 2+ players
2. Open activity feed

**Test:**
1. Player 1 sends: `"Hello"`
2. Player 2 sends: `"Hi there"`
3. Spectator sends: `"Watching!"`

**Verify in Activity Feed:**
```
💬 Player1        12:34 PM
   Hello

💬 Player2        12:35 PM
   Hi there

💬 Spectator      12:36 PM
   Watching!
```

**Expected:**
- All chat messages appear chronologically
- Player names are shown
- Messages are readable (not cut off)
- Timestamps are correct
- Green chat bubble styling

---

## 🎨 Visual Verification

### Round Number Badge
```
┌─────────────────┐
│ 🎯 Round 3      │  ← Top-left, blue, doesn't overlap
└─────────────────┘
```

### Spectator Badge
```
        ┌──────────────────┐
        │ 👁️ Spectating   │  ← Top-center, purple, pulsing
        └──────────────────┘
```

### Unread Chat Badge
```
    ┌─────┐
    │ 💬  │ (5)  ← Purple button with green badge showing "5"
    └─────┘      ← Badge bounces
```

---

## ✅ Success Criteria

### Sprite Configuration
- [x] Environment variable controls sprite usage
- [x] Default is sprite mode (true)
- [x] Can switch to individual images via env var
- [x] Production build uses sprites

### Round Number
- [x] Round number displays in top-left
- [x] Increments when players take turns
- [x] Hidden during waiting mode
- [x] Styled with blue badge

### Spectator Chat
- [x] Spectators can send messages
- [x] Spectators can receive messages
- [x] Spectators cannot make game moves
- [x] Chat works for both players and spectators

### Chat Notifications
- [x] Unread count shows when collapsed
- [x] Count displays correct number
- [x] Badge animates (bounces)
- [x] Badge resets when opened
- [x] Works for new messages only

### Chat Visibility
- [x] Messages appear immediately
- [x] All player messages visible
- [x] All spectator messages visible
- [x] Proper formatting and styling
- [x] Timestamps display correctly

---

## 🐛 Common Issues & Solutions

### Issue: Sprite images not loading
**Solution:** 
1. Check `.env.local` has `VITE_USE_SPRITE_IMAGES=true`
2. Restart dev server after changing env var
3. Clear browser cache

### Issue: Round number not incrementing
**Solution:**
1. Make sure game is in playing mode (not waiting)
2. Check that opponent actually played a card
3. Look in browser console for any errors

### Issue: Spectator can't chat
**Solution:**
1. Verify WebSocket connection (check network tab)
2. Check browser console for errors
3. Ensure spectator joined successfully

### Issue: Chat messages not appearing
**Solution:**
1. Open CollapsibleInfo panel
2. Check browser console for callback errors
3. Verify WebSocket is receiving messages (network tab)
4. Try refreshing the page

### Issue: Unread count not showing
**Solution:**
1. Make sure panel is collapsed when message arrives
2. Check that messages are being added to chatMessages array
3. Look for console errors

---

## 📊 Performance Testing

### Sprite Mode (Production Recommended)
```
Network Tab:
- 3 requests: full_card.jpg, full_golems.jpg, full_token.jpg
- Total: ~2.5MB
- Load time: ~500ms
```

### Individual Image Mode (Debug Only)
```
Network Tab:
- 100+ requests: golem_0022.JPG, mint_0002.JPG, etc.
- Total: ~2.5MB
- Load time: ~2000ms (slower due to many requests)
```

---

## 🎯 Quick Commands

```bash
# Start dev server (default sprite mode)
npm run dev

# Start dev server with individual images
VITE_USE_SPRITE_IMAGES=false npm run dev

# Build for production (uses .env.production)
npm run build

# Preview production build
npm run preview
```

---

**Happy Testing! 🚀**

If you find any issues, check:
1. Browser console for errors
2. Network tab for failed requests
3. Feature update summary for expected behavior
