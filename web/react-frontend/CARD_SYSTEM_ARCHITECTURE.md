# Card Resource System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CARD RESOURCE SYSTEM                            │
│                     (cardNames.js)                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │
                    ┌───────────┴───────────┐
                    │                       │
         ┌──────────▼──────────┐ ┌─────────▼─────────┐
         │  SPRITE MODE        │ │ INDIVIDUAL MODE   │
         │  (Default)          │ │ (Optional)        │
         └──────────┬──────────┘ └─────────┬─────────┘
                    │                       │
                    │                       │
     ┌──────────────┼───────────────────────┼──────────────────┐
     │              │                       │                  │
     │    ┌─────────▼────────┐    ┌────────▼────────┐        │
     │    │ full_card.jpg    │    │ golem_0022.JPG  │        │
     │    │ (1000x1280)      │    │ mint_0002.JPG   │        │
     │    │ 8x6 grid         │    │ trade_*.JPG     │        │
     │    └──────────────────┘    │ upgrade_*.JPG   │        │
     │                             │ (100+ files)    │        │
     │    ┌──────────────────┐    └─────────────────┘        │
     │    │ full_golems.jpg  │                               │
     │    │ (1200x1280)      │                               │
     │    │ 8x5 grid         │                               │
     │    └──────────────────┘                               │
     │                                                        │
     │    ┌──────────────────┐                               │
     │    │ full_token.jpg   │                               │
     │    │ (800x800)        │                               │
     │    │ 8x8 grid         │                               │
     │    └──────────────────┘                               │
     └───────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    │                        │
         ┌──────────▼──────────┐  ┌─────────▼──────────┐
         │  API FUNCTIONS      │  │  COMPONENTS        │
         │                     │  │                    │
         │ • getCardRenderConfig│  │ • CardRenderer    │
         │ • getTokenRenderConfig│ │ • TokenRenderer   │
         │ • getCardSpriteStyle │  │                   │
         │ • getTokenSpriteStyle│  │                   │
         │ • getCardImagePath   │  │                   │
         │ • hasSprite          │  │                   │
         └──────────┬──────────┘  └─────────┬──────────┘
                    │                        │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   YOUR COMPONENTS       │
                    │                         │
                    │ • WebGameLayout.jsx     │
                    │ • FantasyGameLayout.jsx │
                    │ • CompactCard.jsx       │
                    │ • HistorySection.jsx    │
                    └─────────────────────────┘
```

## Flow Diagram: Rendering a Card

```
User Component
     │
     │ <CardRenderer cardName="golem_0022" useSprite={true} />
     │
     ▼
CardRenderer Component
     │
     │ calls getCardRenderConfig('golem_0022', { useSprite: true })
     │
     ▼
getCardRenderConfig()
     │
     ├─► Check useSprite option
     │   │
     │   ├─► TRUE: Call getCardSpriteStyle()
     │   │            │
     │   │            ├─► Check if card has sprite mapping
     │   │            │   │
     │   │            │   ├─► YES: Calculate CSS position
     │   │            │   │        Return: { backgroundImage, backgroundSize, backgroundPosition }
     │   │            │   │
     │   │            │   └─► NO: Return null
     │   │            │
     │   │            └─► Return { mode: 'sprite', style: {...}, imagePath: null }
     │   │
     │   └─► FALSE: Call getCardImagePath()
     │                │
     │                └─► Return { mode: 'image', style: null, imagePath: '/assets/images/golem_0022.JPG' }
     │
     ▼
Render Output
     │
     ├─► IF mode === 'sprite':
     │   <div style={config.style} />
     │
     └─► IF mode === 'image':
         <img src={config.imagePath} />
```

## Configuration Flow

```
┌─────────────────────────────────────────┐
│  Global Configuration                   │
│  const USE_SPRITE_IMAGES = true        │
└─────────────────┬───────────────────────┘
                  │
                  │ Default setting
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Component Level Override               │
│  <CardRenderer useSprite={false} />    │
└─────────────────┬───────────────────────┘
                  │
                  │ Priority: Component > Global
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Runtime Decision                       │
│  options.useSprite ?? USE_SPRITE_IMAGES │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Render Mode Selected                   │
│  • Sprite: Use CSS background           │
│  • Image: Use <img> tag                 │
└─────────────────────────────────────────┘
```

## Data Structures

### Sprite Config
```javascript
{
  merchant: {
    src: '/assets/images/full_card.jpg',
    cols: 8,
    rows: 6
  },
  golem: {
    src: '/assets/images/full_golems.jpg',
    cols: 8,
    rows: 5
  },
  token: {
    src: '/assets/images/full_token.jpg',
    cols: 8,
    rows: 8
  }
}
```

### Sprite Mapping
```javascript
{
  "golem_0022": [2, 5],  // row 2, col 5 (1-indexed)
  "mint_0002": [1, 1],   // row 1, col 1
  "trade_0002_0020": [1, 3]
}
```

### Render Config Output
```javascript
// Sprite mode
{
  mode: 'sprite',
  style: {
    backgroundImage: 'url(/assets/images/full_golems.jpg)',
    backgroundSize: '800% 500%',
    backgroundPosition: '57.14% 20%',
    backgroundRepeat: 'no-repeat'
  },
  imagePath: null
}

// Image mode
{
  mode: 'image',
  style: null,
  imagePath: '/assets/images/golem_0022.JPG'
}
```

## Performance Comparison

### Sprite Mode
```
Browser Request:
├─ GET /assets/images/full_card.jpg      (1MB)
├─ GET /assets/images/full_golems.jpg    (1MB)
└─ GET /assets/images/full_token.jpg     (500KB)

Total: 3 requests, ~2.5MB
Time: ~500ms
```

### Individual Image Mode
```
Browser Requests:
├─ GET /assets/images/golem_0022.JPG     (25KB)
├─ GET /assets/images/golem_0023.JPG     (25KB)
├─ GET /assets/images/mint_0002.JPG      (25KB)
├─ ... (100+ more requests)
└─ GET /assets/images/trade_2000_0311.JPG (25KB)

Total: 100+ requests, ~2.5MB
Time: ~2000ms (with HTTP/1.1)
```

## Migration Path

```
┌─────────────────────────────┐
│  Existing Code              │
│  (Still works!)             │
│                             │
│  const style =              │
│    getCardSpriteStyle(name) │
│                             │
│  {style ? <div/> : <img/>} │
└──────────┬──────────────────┘
           │
           │ Optional migration
           │
           ▼
┌─────────────────────────────┐
│  New Unified API            │
│  (Recommended)              │
│                             │
│  const config =             │
│    getCardRenderConfig(name)│
│                             │
│  Render based on config.mode│
└──────────┬──────────────────┘
           │
           │ Or use component
           │
           ▼
┌─────────────────────────────┐
│  Component Approach         │
│  (Simplest)                 │
│                             │
│  <CardRenderer              │
│    cardName={name}          │
│    className="w-32 h-48"    │
│  />                         │
└─────────────────────────────┘
```

## File Organization

```
web/react-frontend/
├── src/
│   ├── utils/
│   │   ├── cardNames.js          ← Core system (UPDATED)
│   │   └── cardNames.test.js     ← Test suite (NEW)
│   │
│   └── components/
│       ├── CardRenderer.jsx      ← Unified renderer (NEW)
│       ├── CardRenderingExample.jsx  ← Demo (NEW)
│       ├── CompactCard.jsx       ← Uses system
│       ├── FantasyGameLayout.jsx ← Uses system
│       └── HistorySection.jsx    ← Uses system
│
├── CARD_RESOURCE_SYSTEM.md       ← Full docs (NEW)
├── CARD_RESOURCE_QUICK_REF.md    ← Quick ref (NEW)
├── IMPLEMENTATION_SUMMARY.md     ← Details (NEW)
├── CARD_SYSTEM_UPDATE.md         ← Overview (NEW)
└── verify-card-system.js         ← Verify (NEW)
```
