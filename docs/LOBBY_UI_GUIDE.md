# Enhanced Lobby - Visual UI Guide

## UI Components Overview

### 1. Main Lobby Screen

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│          Century: Golem Edition                      │
│                                                       │
├─────────────────────────────────────────────────────┤
│  Your Name: [____________]    Avatar: [🧙][⚔️][🏹][🛡️] │
├─────────────────────────────────────────────────────┤
│  [Browse Games (5)]  │  [Create Game]               │
├─────────────────────────────────────────────────────┤
│  🔍 Search: [__________]  Filter: [All Games ▼]    │
│  Auto-refreshes every 10 seconds        [🔄 Refresh]│
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐  │
│  │ 🎮 My Awesome Game              [Waiting]    │  │
│  │ Host: Player1    Players: 2/4    👁️ 1       │  │
│  │ Created: 5m ago                              │  │
│  │ Players: Player1, AI (Basic)                 │  │
│  │ [📋 Copy ID]  [👁️ Spectate]  [▶️ Join]      │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ 🎮 Quick Match                  [Playing]    │  │
│  │ Host: FastPlayer Players: 2/2    👁️ 0       │  │
│  │ Created: Just now                🔒 Full     │  │
│  │ Players: FastPlayer, SlowPlayer              │  │
│  │ [📋 Copy ID]  [👁️ Spectate]  [🔒 Full]      │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Join by Game ID: [__________] [Join]              │
└─────────────────────────────────────────────────────┘
```

### 2. Create Game Form

```
┌─────────────────────────────────────────────────────┐
│  [Browse Games (5)]  │  [Create Game] ←──Active     │
├─────────────────────────────────────────────────────┤
│  Game Name: [My Awesome Game_________]              │
│                                                      │
│  Total Players: [2 Players ▼]  Turn Timer: [60s ▼] │
│                                                      │
│  ┌─────────── Configure Players ─────────────────┐  │
│  │ Player 1: You (Player Name) ✅                │  │
│  │ Player 2: [Human Player ▼]                    │  │
│  │ Player 3: [AI (Basic) ▼]                      │  │
│  │ Player 4: [AI (Rest Only) ▼]                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  [🎮 Create Game & Join]                            │
│                                                      │
│  ┌────────── Game Created! ─────────────┐          │
│  │ ✅ Game Created Successfully!         │          │
│  │ Game ID: My_Awesome_Game              │          │
│  │ [My_Awesome_Game___] [Copy]          │          │
│  │ Joining game...                       │          │
│  └───────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### 3. Game Card Details

```
┌─────────────────────────────────────────────────┐
│ 🎮 Epic Battle Royale              [Playing]   │
│ Host: BattleMaster    Players: 4/5    👁️ 3    │
├─────────────────────────────────────────────────┤
│ Players: 4/5 🔓  │  Spectators: 👁️ 3          │
├─────────────────────────────────────────────────┤
│ Created: 2h ago                                 │
├─────────────────────────────────────────────────┤
│ Players: BattleMaster, Warrior99, AI (Basic)   │
├─────────────────────────────────────────────────┤
│ [📋 Copy ID]  [👁️ Spectate]  [▶️ Join]        │
└─────────────────────────────────────────────────┘
```

### 4. Empty Game with Deletion Timer

```
┌─────────────────────────────────────────────────┐
│ 🎮 Abandoned Game                  [Waiting]   │
│ Host: GhostPlayer    Players: 0/3    👁️ 0    │
├─────────────────────────────────────────────────┤
│ ⏱️ Deleting in 4:45                            │
├─────────────────────────────────────────────────┤
│ Created: 15s ago                                │
├─────────────────────────────────────────────────┤
│ [📋 Copy ID]  [👁️ Spectate]  [▶️ Join]        │
└─────────────────────────────────────────────────┘
```

### 5. Waiting Room (After Joining)

```
┌─────────────────────────────────────────────────┐
│              Waiting Room                        │
├─────────────────────────────────────────────────┤
│ Game ID: [My_Game_________] [✓ Copied]         │
│                                                  │
│ Host: Player1           Players: 2/4            │
├─────────────────────────────────────────────────┤
│ Players (2/4)                                   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ [👤] Player1           ✓ Connected  🟢  │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ [👤] AI (Basic)        ✓ Connected  🟢  │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ [?]  Waiting for player 3...   ⏳       │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ [?]  Waiting for player 4...   ⏳       │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ⏳ Waiting for 2 more players...               │
│                                                  │
│ [📋 Share Game ID]  [Leave]                    │
│                                                  │
│ 💡 Share the Game ID with friends              │
└─────────────────────────────────────────────────┘
```

## Mobile Layout (Portrait)

```
┌──────────────────────┐
│  Century Edition     │
├──────────────────────┤
│ Name: [__________]   │
│ Avatar: [🧙][⚔️][🏹][🛡️] │
├──────────────────────┤
│[Browse(5)]│[Create] │
├──────────────────────┤
│ Search: [_______]    │
│ Filter: [All ▼]     │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ My Game [Wait]   │ │
│ │ Host: P1  2/4 👁️1│ │
│ │ 5m ago           │ │
│ │ [Copy][👁️][Join]│ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ Quick  [Playing] │ │
│ │ Host: P2  2/2 🔒 │ │
│ │ Now              │ │
│ │ [Copy][👁️][Full]│ │
│ └──────────────────┘ │
└──────────────────────┘
```

## Key UI Elements

### Status Badges
- `[Waiting]` - Yellow background - Game waiting for players
- `[Playing]` - Green background - Game in progress
- `[Finished]` - Gray background - Game completed (hidden by default)

### Icons
- `🎮` - Game indicator
- `👁️` - Spectator count
- `⏱️` - Deletion timer (for empty games)
- `🔒` - Game full indicator
- `✓` - Connected/success indicator
- `📋` - Copy to clipboard
- `▶️` - Join game
- `🔄` - Refresh list
- `🔍` - Search

### Color Scheme
- **Primary Actions**: Blue gradient (Join, Create)
- **Secondary Actions**: Purple gradient (Spectate)
- **Success**: Green (Connected, Created)
- **Warning**: Yellow (Waiting)
- **Danger**: Red (Deletion timer, Leave)
- **Info**: White/Transparent backgrounds

## Interaction Flow

### Creating a Game
1. Enter name & select avatar
2. Click "Create Game" tab
3. Fill in game details
4. Configure AI/human players
5. Click "Create Game & Join"
6. See success message
7. Automatically join game
8. Enter waiting room

### Joining a Game
1. View game list in "Browse Games"
2. Use search/filter to find game
3. Click "Join" or "Spectate"
4. Enter game/waiting room

### Search & Filter
1. Type in search box - instant filter
2. Select status filter - instant update
3. Results update in real-time
4. Auto-refresh every 10 seconds

## Responsive Breakpoints

- **Mobile**: < 768px
  - Compact layout
  - Touch-optimized buttons
  - Stacked components
  
- **Tablet**: 768px - 1024px
  - Medium spacing
  - Two-column forms
  - Larger touch targets

- **Desktop**: > 1024px
  - Full-width layout
  - Rich visuals
  - Multi-column grids
  - Enhanced animations

## Accessibility Features

- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ High contrast text
- ✅ Touch-friendly (44px min)
- ✅ Screen reader compatible
- ✅ Focus indicators
- ✅ Semantic HTML

---

**Design Philosophy**: Clean, modern, game-themed interface with intuitive interactions and clear visual hierarchy.
