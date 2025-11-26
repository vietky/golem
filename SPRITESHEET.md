# Sprite Sheet System

This project uses a sprite sheet to optimize image loading. Instead of loading 89+ individual images, the game loads:
- **1 sprite sheet image** (`spritesheet.jpg`)
- **1 JSON file** (`sprites.json`) with sprite coordinates

This reduces HTTP requests from 89+ to just 2 per player!

## Generating the Sprite Sheet

To regenerate the sprite sheet after adding/removing images:

```bash
npm run generate-sprites
```

Or directly:
```bash
node generate-spritesheet.js
```

This will:
1. Read all PNG files from `web/static/images/`
2. Combine them into `web/static/spritesheet.jpg`
3. Generate `web/static/sprites.json` with coordinates

## How It Works

1. **Sprite Sheet**: All card images are combined into one large image
2. **JSON Coordinates**: Each card's position and size in the sprite sheet
3. **CSS Background**: Cards use `background-image` with `background-position` to show the correct sprite

## Performance Benefits

- **Before**: 89+ HTTP requests (one per image)
- **After**: 2 HTTP requests (sprite sheet + JSON)
- **Result**: Much faster page load, especially for multiple players

## File Sizes

- Current sprite sheet: ~177MB (can be optimized by compressing source images)
- JSON file: ~9KB

## Optimization Tips

To reduce sprite sheet size:
1. Compress source PNG images before generating sprite sheet
2. Use image optimization tools (e.g., `pngquant`, `optipng`)
3. Consider WebP format for better compression

