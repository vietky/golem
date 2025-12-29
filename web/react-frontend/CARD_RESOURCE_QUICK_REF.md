# Card Resource System - Quick Reference

## 🚀 Quick Start

### Using the CardRenderer Component (Recommended)

```jsx
import CardRenderer from '../components/CardRenderer'

// Basic usage
<CardRenderer cardName="golem_0022" className="w-32 h-48" />

// With click handler
<CardRenderer 
  cardName="golem_0022" 
  className="w-32 h-48 cursor-pointer hover:scale-105"
  onClick={() => handleCardClick(card)}
/>

// Force individual images (useful for debugging)
<CardRenderer cardName="golem_0022" className="w-32 h-48" useSprite={false} />
```

### Using Tokens

```jsx
import { TokenRenderer } from '../components/CardRenderer'

<TokenRenderer tokenName="yellow_stone" className="w-8 h-8" />
<TokenRenderer tokenName="gold_coin" className="w-8 h-8" />
```

## 🎯 API Quick Reference

### `getCardRenderConfig(cardName, options)`
Returns: `{ mode: 'sprite'|'image', style: object|null, imagePath: string|null }`

```javascript
import { getCardRenderConfig } from '../utils/cardNames'

const config = getCardRenderConfig('golem_0022')
// config.mode = 'sprite' or 'image'
// config.style = CSS sprite object or null
// config.imagePath = image path or null
```

### `getCardSpriteStyle(cardName, options)`
Returns: CSS sprite object or `null`

```javascript
import { getCardSpriteStyle } from '../utils/cardNames'

const style = getCardSpriteStyle('golem_0022', { useSprite: true })
// Returns sprite style or null
```

### `hasSprite(cardName)`
Returns: `boolean`

```javascript
import { hasSprite } from '../utils/cardNames'

if (hasSprite('golem_0022')) {
  // Card has sprite mapping
}
```

## 🔧 Configuration

### Global Setting
In `/utils/cardNames.js`:
```javascript
const USE_SPRITE_IMAGES = true  // Default: use sprites
```

### Per-Component Override
```jsx
// Force sprite mode
<CardRenderer cardName="card" useSprite={true} />

// Force individual images
<CardRenderer cardName="card" useSprite={false} />

// Use default (from global config)
<CardRenderer cardName="card" />
```

## 📝 Common Patterns

### Pattern 1: Render Card with Fallback
```jsx
<CardRenderer 
  cardName={card.name} 
  className="w-32 h-48"
  onError={(e) => console.warn('Card image failed:', card.name)}
/>
```

### Pattern 2: Conditional Rendering
```jsx
const config = getCardRenderConfig(card.name)

{config.mode === 'sprite' ? (
  <div className="card" style={config.style} />
) : (
  <img src={config.imagePath} className="card" />
)}
```

### Pattern 3: Map Over Cards
```jsx
{cards.map(card => (
  <CardRenderer 
    key={card.id}
    cardName={card.name}
    className="w-32 h-48"
    onClick={() => handleClick(card)}
  />
))}
```

### Pattern 4: Debug Mode
```jsx
const [debugMode, setDebugMode] = useState(false)

<CardRenderer 
  cardName={card.name}
  useSprite={!debugMode}  // Individual images in debug mode
/>
```

## 🎨 Styling

### Responsive Card
```jsx
<CardRenderer 
  cardName="golem_0022"
  className="w-full max-w-[144px] aspect-[2/3]"
/>
```

### Card with Hover Effect
```jsx
<CardRenderer 
  cardName="golem_0022"
  className="w-32 h-48 transition-transform hover:scale-105 hover:shadow-xl"
  onClick={handleClick}
/>
```

### Card Grid Layout
```jsx
<div className="grid grid-cols-3 md:grid-cols-5 gap-4">
  {cards.map(card => (
    <CardRenderer 
      key={card.id}
      cardName={card.name}
      className="w-full aspect-[2/3] rounded-lg shadow-lg"
    />
  ))}
</div>
```

## 🐛 Debugging

### Check if Sprite is Being Used
```javascript
const config = getCardRenderConfig('golem_0022')
console.log('Render mode:', config.mode)  // 'sprite' or 'image'
console.log('Has sprite mapping:', hasSprite('golem_0022'))
```

### Force Individual Images for Testing
```jsx
// Temporarily test with individual images
<CardRenderer cardName={card.name} useSprite={false} />
```

### Verify Image Paths
```javascript
import { getCardImagePath } from '../utils/cardNames'

console.log(getCardImagePath('golem_0022'))
// Output: /images/golem_0022.JPG
```

## ⚡ Performance Tips

### ✅ DO
- Use sprite mode in production (`USE_SPRITE_IMAGES = true`)
- Use CardRenderer component for consistency
- Provide appropriate className for sizing

### ❌ DON'T
- Don't manually construct image paths
- Don't use individual images in production unless needed
- Don't forget error handlers for critical images

## 📊 Mode Comparison

| Feature | Sprite Mode | Individual Mode |
|---------|-------------|-----------------|
| HTTP Requests | 3 images | 100+ images |
| Load Time | Fast | Slower |
| Debug | Harder | Easier |
| Recommended For | Production | Development |
| Browser Cache | Better | Good |

## 🔍 Examples from Codebase

### CompactCard.jsx Pattern
```jsx
const spriteStyle = getCardSpriteStyle(card.name)

<div style={{
  ...(spriteStyle || {
    backgroundImage: `url(${getCardImagePath(card.name)})`,
    backgroundSize: 'cover',
  })
}} />
```

### Simplified with CardRenderer
```jsx
<CardRenderer cardName={card.name} className="..." />
```

## 📚 See Also

- Full documentation: `CARD_RESOURCE_SYSTEM.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Test suite: `cardNames.test.js`
- Live example: `CardRenderingExample.jsx`
