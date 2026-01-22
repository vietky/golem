# 🎴 Card Resource System Update - Complete

## Overview

The card resource system in `cardNames.js` has been updated to support **flexible rendering modes**: either using CSS sprites for optimal performance or individual image files for easier debugging.

## ✨ What's New

### 1. Flexible Rendering Modes

You can now choose between:
- **Sprite Mode** (default): Uses 3 sprite sheets, faster loading, better performance
- **Individual Image Mode**: Uses separate image files, easier debugging

### 2. New API Functions

#### `getCardRenderConfig(cardName, options)` ⭐ RECOMMENDED
```javascript
const config = getCardRenderConfig('golem_0022', { useSprite: true })
// Returns: { mode: 'sprite'|'image', style: object|null, imagePath: string|null }
```

#### `getTokenRenderConfig(tokenName, options)`
```javascript
const config = getTokenRenderConfig('yellow_stone', { useSprite: false })
// Returns: { mode: 'sprite'|'image', style: object|null, imagePath: string|null }
```

### 3. New React Components

#### `<CardRenderer />` - Unified Card Component
```jsx
import CardRenderer from './components/CardRenderer'

<CardRenderer 
  cardName="golem_0022" 
  className="w-32 h-48"
  useSprite={true}  // optional
  onClick={handler}
/>
```

#### `<TokenRenderer />` - Unified Token Component
```jsx
import { TokenRenderer } from './components/CardRenderer'

<TokenRenderer tokenName="yellow_stone" className="w-8 h-8" />
```

### 4. Enhanced Existing Functions

All sprite functions now accept an `options` parameter:
```javascript
getCardSpriteStyle(cardName, { useSprite: true })
getTokenSpriteStyle(tokenName, { useSprite: false })
```

## 🚀 Quick Start

### Option 1: Use CardRenderer Component (Easiest)
```jsx
import CardRenderer from './components/CardRenderer'

<CardRenderer cardName={card.name} className="w-32 h-48" />
```

### Option 2: Use getCardRenderConfig
```jsx
import { getCardRenderConfig } from './utils/cardNames'

const config = getCardRenderConfig(card.name)

{config.mode === 'sprite' ? (
  <div style={config.style} className="w-32 h-48" />
) : (
  <img src={config.imagePath} className="w-32 h-48" />
)}
```

### Option 3: Existing Code (Still Works!)
```jsx
import { getCardSpriteStyle, getCardImagePath } from './utils/cardNames'

const spriteStyle = getCardSpriteStyle(card.name)
// No changes needed - backward compatible!
```

## 📁 Files Created/Modified

### Modified Files
- ✅ `src/utils/cardNames.js` - Enhanced with new functions and options

### New Files  
- ✅ `src/components/CardRenderer.jsx` - Unified card/token renderer
- ✅ `src/components/CardRenderingExample.jsx` - Live demo component
- ✅ `src/utils/cardNames.test.js` - Comprehensive test suite
- ✅ `CARD_RESOURCE_SYSTEM.md` - Full documentation
- ✅ `CARD_RESOURCE_QUICK_REF.md` - Quick reference guide
- ✅ `IMPLEMENTATION_SUMMARY.md` - Implementation details
- ✅ `verify-card-system.js` - Verification script

## ⚙️ Configuration

### Global Configuration (Production)
Edit `src/utils/cardNames.js`:
```javascript
const USE_SPRITE_IMAGES = true   // Sprite mode (recommended)
const USE_SPRITE_IMAGES = false  // Individual images
```

### Per-Component Override (Development)
```jsx
// Force sprite mode
<CardRenderer cardName="golem_0022" useSprite={true} />

// Force individual images
<CardRenderer cardName="golem_0022" useSprite={false} />

// Use global default
<CardRenderer cardName="golem_0022" />
```

## 🧪 Testing

### Run Test Suite
```bash
npm test cardNames.test.js
```

### Run Verification
```bash
node verify-card-system.js
```

### View Live Demo
```jsx
import CardRenderingExample from './components/CardRenderingExample'
// Add to your app to see interactive demo
```

## 📊 Performance Impact

| Mode | HTTP Requests | Load Time | Best For |
|------|---------------|-----------|----------|
| Sprite (Default) | 3 images | Fast ⚡ | Production |
| Individual Images | 100+ images | Slower | Development/Debug |

## 🔄 Migration Guide

### No Changes Required!
All existing code continues to work. The new functions are **additions**, not breaking changes.

### Optional: Upgrade to CardRenderer
**Before:**
```jsx
const spriteStyle = getCardSpriteStyle(card.name)
{spriteStyle ? (
  <div style={spriteStyle} className="w-32 h-48" />
) : (
  <img src={getCardImagePath(card.name)} className="w-32 h-48" />
)}
```

**After:**
```jsx
<CardRenderer cardName={card.name} className="w-32 h-48" />
```

## 📚 Documentation

- **Full Guide**: [CARD_RESOURCE_SYSTEM.md](./CARD_RESOURCE_SYSTEM.md)
- **Quick Reference**: [CARD_RESOURCE_QUICK_REF.md](./CARD_RESOURCE_QUICK_REF.md)
- **Implementation**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## ✅ Verification Checklist

- [x] No syntax errors
- [x] Backward compatibility maintained
- [x] Sprite mode works correctly
- [x] Individual image mode works correctly
- [x] Test suite created and passing
- [x] Documentation complete
- [x] Example component created
- [x] Verification script runs successfully

## 🎯 Recommended Next Steps

1. ✅ **Review** the changes in [cardNames.js](src/utils/cardNames.js)
2. ✅ **Test** using the verification script: `node verify-card-system.js`
3. ✅ **Try** the example component: `CardRenderingExample.jsx`
4. 🔄 **Optional**: Update existing components to use `CardRenderer`
5. 🚀 **Deploy** with sprite mode for best performance

## 💡 Key Benefits

✨ **Flexibility**: Switch between sprite and individual images easily  
🎯 **Performance**: Sprite mode reduces HTTP requests by 97%  
🔧 **Debug-Friendly**: Individual image mode for easier debugging  
📦 **Components**: Reusable CardRenderer and TokenRenderer  
📚 **Well-Documented**: Complete docs, examples, and tests  
🔄 **Backward Compatible**: No breaking changes to existing code  

## 🐛 Troubleshooting

### Q: Which mode should I use?
**A:** Use sprite mode (default) for production. Use individual images for debugging.

### Q: How do I debug card rendering issues?
**A:** Set `useSprite={false}` temporarily to see individual images.

### Q: Can I mix both modes?
**A:** Yes! Override per-component with the `useSprite` prop.

### Q: What if an image is missing?
**A:** The system automatically falls back to `/assets/images/golem_bg.JPG`.

## 📝 Summary

The card resource system now provides:
- **Global configuration** via `USE_SPRITE_IMAGES` constant
- **Per-component override** via `useSprite` prop
- **Unified API** with `getCardRenderConfig()`
- **Helper components** for easy usage (`CardRenderer`, `TokenRenderer`)
- **Full backward compatibility** - existing code works unchanged
- **Comprehensive documentation** and test suite

**Recommended:** Use sprite mode in production for best performance! 🚀

---

**Need Help?** Check the documentation files or the example component!
