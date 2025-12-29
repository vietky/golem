# Card Resource System Documentation

## Overview

The card resource system supports two rendering modes:
1. **Sprite Mode** (default): Uses CSS sprites for better performance (fewer HTTP requests)
2. **Individual Image Mode**: Uses individual image files for each card

## Configuration

### Global Configuration

In `/utils/cardNames.js`, set the `USE_SPRITE_IMAGES` constant:

```javascript
// Default: true (use sprites for better performance)
const USE_SPRITE_IMAGES = true  // Set to false to use individual images
```

### Per-Component Configuration

You can override the global setting per component using the `useSprite` option:

```javascript
// Force sprite mode
getCardRenderConfig('golem_0022', { useSprite: true })

// Force individual image mode
getCardRenderConfig('golem_0022', { useSprite: false })

// Use default from global config
getCardRenderConfig('golem_0022')
```

## API Reference

### Core Functions

#### `getCardImagePath(cardName)`
Returns the path to an individual card image.

```javascript
getCardImagePath('golem_0022')
// Returns: '/images/golem_0022.JPG'
```

#### `getCardSpriteStyle(cardName, options)`
Returns CSS sprite styling for a card.

```javascript
getCardSpriteStyle('golem_0022', { useSprite: true })
// Returns: { backgroundImage: '...', backgroundSize: '...', ... }

getCardSpriteStyle('golem_0022', { useSprite: false })
// Returns: null
```

#### `getCardRenderConfig(cardName, options)`
**Recommended**: Returns a complete rendering configuration.

```javascript
const config = getCardRenderConfig('golem_0022', { useSprite: true })
// Returns: { mode: 'sprite'|'image', style: object, imagePath: string }
```

#### `getTokenRenderConfig(tokenName, options)`
Returns rendering configuration for tokens (stones, coins).

```javascript
const config = getTokenRenderConfig('yellow_stone', { useSprite: true })
// Returns: { mode: 'sprite'|'image', style: object, imagePath: string }
```

#### `hasSprite(cardName)`
Checks if a card has a sprite mapping available.

```javascript
hasSprite('golem_0022')  // true
hasSprite('unknown_card')  // false
```

### Helper Components

#### `CardRenderer` Component

A unified component for rendering cards in either mode:

```jsx
import CardRenderer from '../components/CardRenderer'

// Use default mode (from global config)
<CardRenderer 
  cardName="golem_0022" 
  className="w-32 h-48" 
/>

// Force individual image mode
<CardRenderer 
  cardName="golem_0022" 
  className="w-32 h-48"
  useSprite={false}
/>

// Force sprite mode
<CardRenderer 
  cardName="golem_0022" 
  className="w-32 h-48"
  useSprite={true}
/>

// With click handler
<CardRenderer 
  cardName="golem_0022" 
  className="w-32 h-48 cursor-pointer"
  onClick={() => console.log('Card clicked')}
/>
```

#### `TokenRenderer` Component

For rendering tokens (stones, coins):

```jsx
import { TokenRenderer } from '../components/CardRenderer'

<TokenRenderer 
  tokenName="yellow_stone" 
  className="w-8 h-8"
/>
```

## Usage Examples

### Example 1: Manual Rendering (Current Approach)

```jsx
// In your component
const spriteStyle = getCardSpriteStyle(card.name)

{spriteStyle ? (
  <div className="w-32 h-48" style={spriteStyle} />
) : (
  <img 
    src={getCardImagePath(card.name)} 
    className="w-32 h-48"
    onError={(e) => { e.target.src = '/images/golem_bg.JPG' }}
  />
)}
```

### Example 2: Using Unified Config (Recommended)

```jsx
// In your component
const config = getCardRenderConfig(card.name)

{config.mode === 'sprite' ? (
  <div className="w-32 h-48" style={config.style} />
) : (
  <img 
    src={config.imagePath} 
    className="w-32 h-48"
    onError={(e) => { e.target.src = '/images/golem_bg.JPG' }}
  />
)}
```

### Example 3: Using CardRenderer Component (Simplest)

```jsx
import CardRenderer from '../components/CardRenderer'

// Just use the component - it handles everything
<CardRenderer cardName={card.name} className="w-32 h-48" />
```

## Sprite System Details

### Sprite Files

The system uses three sprite sheets:

1. **Merchant Cards** (`/images/full_card.jpg`)
   - Size: 1000x1280px
   - Grid: 8 columns × 6 rows
   - Contains: mint cards, trade cards, upgrade cards

2. **Golem Cards** (`/images/full_golems.jpg`)
   - Size: 1200x1280px
   - Grid: 8 columns × 5 rows
   - Contains: all golem/point cards

3. **Tokens** (`/images/full_token.jpg`)
   - Size: 800x800px
   - Grid: 8 columns × 8 rows
   - Contains: stones, coins, arrows

### Adding New Cards to Sprite

To add a new card to the sprite system:

1. Add the card to the appropriate sprite sheet image
2. Add mapping to `MERCHANT_SPRITE_MAP` or `GOLEM_SPRITE_MAP`:

```javascript
const MERCHANT_SPRITE_MAP = {
  // ... existing mappings
  "new_card_name": [row, col],  // 1-indexed position
}
```

### Individual Image Files

All cards also have individual image files in `/images/`:
- Format: `{cardName}.JPG`
- Example: `golem_0022.JPG`, `mint_0002.JPG`, `trade_0002_0020.JPG`

## Performance Comparison

### Sprite Mode (Recommended)
- ✅ Fewer HTTP requests (3 sprite images vs 100+ individual images)
- ✅ Faster page load time
- ✅ Better for production
- ⚠️ Slightly larger initial download
- ⚠️ Requires CSS calculations

### Individual Image Mode
- ✅ Easier debugging
- ✅ Only loads images that are needed
- ✅ Better for development
- ⚠️ More HTTP requests
- ⚠️ Slower page load with many cards

## Migration Guide

### Updating Existing Components

**Before:**
```jsx
const spriteStyle = getCardSpriteStyle(card.name)
if (spriteStyle) {
  return <div style={spriteStyle} />
}
return <img src={getCardImagePath(card.name)} />
```

**After (Option 1 - Unified Config):**
```jsx
const config = getCardRenderConfig(card.name)
if (config.mode === 'sprite') {
  return <div style={config.style} />
}
return <img src={config.imagePath} />
```

**After (Option 2 - Component):**
```jsx
return <CardRenderer cardName={card.name} className="..." />
```

## Testing

Run the test suite to verify all functions work correctly:

```bash
npm test cardNames.test.js
```

The test suite covers:
- Sprite mode enabled/disabled
- Individual image fallbacks
- Token rendering
- Edge cases (null, undefined, invalid cards)
- Position calculations

## Troubleshooting

### Cards Not Displaying

1. Check if card has sprite mapping: `hasSprite(cardName)`
2. Verify sprite images are accessible: `/images/full_card.jpg`, `/images/full_golems.jpg`
3. Check individual image exists: `/images/{cardName}.JPG`
4. Check browser console for 404 errors

### Sprite Positioning Issues

1. Verify sprite mapping coordinates are correct (1-indexed)
2. Check sprite configuration (rows, cols) matches actual image
3. Use browser dev tools to inspect `backgroundPosition` values

### Force Individual Image Mode for Debugging

```javascript
// Temporarily disable sprites globally
const USE_SPRITE_IMAGES = false

// Or per-component
<CardRenderer cardName={card.name} useSprite={false} />
```

## Best Practices

1. **Use sprites in production** for better performance
2. **Use CardRenderer component** for consistency
3. **Always provide fallback images** (onError handler)
4. **Test both modes** during development
5. **Keep sprite mappings up to date** when adding new cards
6. **Use getCardRenderConfig** for manual rendering (more flexible than individual functions)

## Future Enhancements

- Environment variable support (VITE_USE_SPRITE_IMAGES)
- Dynamic sprite loading
- WebP format support
- Lazy loading for individual images
- Automatic sprite generation tool
