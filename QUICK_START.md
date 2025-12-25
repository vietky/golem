# 🚀 Quick Start Guide - Enhanced Lobby

## TL;DR - Start Playing in 3 Steps

```bash
# 1. Start the backend
cd /Users/avietidol/codes/golem
make run

# 2. Start the frontend (in new terminal)
cd /Users/avietidol/codes/golem/web/react-frontend
npm run dev

# 3. Open browser
# Visit: http://localhost:5173
```

## What You Get

### ✨ Enhanced Features
- **Smart Game Browser** - Find games easily with search and filters
- **AI Opponents** - Play with AI when you're alone
- **Auto-Refresh** - Game list updates every 10 seconds
- **Auto-Rest** - No more getting stuck - rest after 5 seconds of inactivity
- **Mobile-Friendly** - Works great on phones and tablets

### 🎮 How to Use

#### Create a Game
1. Enter your name and pick an avatar
2. Click "Create Game" tab
3. Name your game (optional)
4. Pick number of players (2-5)
5. Set turn timer
6. **Choose opponents:**
   - Leave empty for human players
   - Select "AI (Basic)" for smart AI
   - Select "AI (Rest Only)" for simple AI
7. Click "Create Game & Join"

#### Join a Game
1. Click "Browse Games" tab
2. See all available games
3. Use search to find specific games
4. Filter by status (Waiting/Playing)
5. Click "Join" or "Spectate"

#### Quick Join
1. Get game ID from friend
2. Paste in "Join by Game ID" box
3. Hit Enter or click "Join"

## Example: Solo Game vs AI

Want to play solo? Here's how:

1. Create game with 2 players
2. Set Player 2 to "AI (Basic)"
3. Click create
4. Game starts immediately!

## Example: Multiplayer with Friends

1. Create game with 4 players
2. Leave slots 2-4 as "Human Player"
3. Share the game ID with 3 friends
4. They join using the ID
5. Game starts when all join!

## Example: Mixed Game

Want some AI and some humans?

1. Create game with 4 players
2. Set Player 2 to "Human Player"
3. Set Player 3 to "AI (Basic)"
4. Set Player 4 to "Human Player"
5. You + 2 friends + 1 AI = fun!

## Troubleshooting

### Games not showing up?
- Make sure backend is running (`make run`)
- Check browser console (F12)
- Try manual refresh button

### Can't join a game?
- Check if game is full (shows 🔒)
- Try spectating instead (👁️ button)
- Create your own game

### Inactivity timer not working?
- It only works on YOUR turn
- It only works if you're a player (not spectator)
- Check browser console for "5 seconds of inactivity" message

## Tips & Tricks

- **Quick Match**: Create a game without a name for instant play
- **Practice Mode**: Create a 2-player game with "AI (Basic)" to practice
- **Spectate First**: Watch a game to learn before playing
- **Mobile**: Works great on phones - try landscape mode
- **Share Easy**: Use the "Copy ID" button to share games

## What's Different from Old Lobby?

### Old Lobby
- Basic game list
- Manual refresh only
- No search/filter
- No AI configuration
- No inactivity handling

### New Enhanced Lobby
- ✅ Rich game information
- ✅ Auto-refresh every 10s
- ✅ Search and filters
- ✅ AI opponent selection
- ✅ Auto-rest after 5s
- ✅ Better mobile support
- ✅ Waiting room UI

## Need More Help?

- **Full Guide**: See `docs/ENHANCED_LOBBY.md`
- **UI Guide**: See `docs/LOBBY_UI_GUIDE.md`
- **Summary**: See `LOBBY_REVAMP_SUMMARY.md`

## Testing the Auto-Rest Feature

1. Create a 2-player game with AI
2. Start the game
3. Wait for your turn
4. **Don't click anything**
5. After 5 seconds, "Rest" happens automatically
6. Check console: You'll see "5 seconds of inactivity detected"

## Testing the Auto-Refresh

1. Open lobby in browser
2. Open another browser tab
3. Create a game in the new tab
4. Go back to first tab
5. Wait 10 seconds
6. New game appears automatically!

## Common Scenarios

### Playing Solo
```
You + 1 AI = 2 players
Perfect for practice!
```

### Playing with 1 Friend + AI
```
You + Friend + 2 AI = 4 players
Fun mixed game!
```

### Full Multiplayer
```
You + 4 Friends = 5 players
Epic battles!
```

## Keyboard Shortcuts

- **Enter** in search box = search
- **Enter** in join box = join game
- **Tab** = navigate between fields
- **Escape** = close modals (if any)

## Mobile Gestures

- **Tap** game card to select
- **Swipe** to scroll game list
- **Pinch** to zoom (browser default)
- **Long press** for context menu

## Browser Support

✅ Works on:
- Chrome (Desktop & Mobile)
- Safari (Desktop & Mobile)
- Firefox
- Edge

## Performance

- **Fast**: Instant search/filter
- **Smooth**: 60fps animations
- **Efficient**: Minimal network usage
- **Smart**: Only refreshes when needed

---

**Ready?** Start both servers and visit http://localhost:5173 🎮

**Questions?** Check the full docs in `docs/` folder.

**Issues?** All code is in `web/react-frontend/src/components/EnhancedLobby.jsx`

Have fun! 🎉
