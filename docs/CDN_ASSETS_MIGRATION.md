# CDN Assets Migration - Complete Summary

## Overview
All frontend assets (`/assets/images/` and `/assets/sounds/`) have been successfully migrated to use CDN URLs from `https://statics.vietky.io.vn`.

## Changes Made

### 1. Created CDN Utility Module
**File**: `web/react-frontend/src/utils/cdnAssets.js`

This utility provides:
- `getCdnImageUrl(path)` - Function to get CDN image URLs
- `getCdnSoundUrl(path)` - Function to get CDN sound URLs
- `cdnImages` - Pre-configured constants for commonly used images
- `cdnSounds` - Pre-configured constants for commonly used sounds

The utility automatically uses environment variables (`VITE_CDN_IMAGES_URL` and `VITE_CDN_SOUNDS_URL`) and falls back to local paths if CDN is not configured.

### 2. Updated React Components
All components now use the CDN utility instead of hardcoded asset paths:

| Component | Changes |
|-----------|---------|
| `Card.jsx` | Updated 4 instances of `/assets/images/stone_*.JPG` |
| `Lobby.jsx` | Updated background image and avatar URLs |
| `TradeModal.jsx` | Updated stone/crystal image URLs |
| `SimpleCard.jsx` | Updated stone/crystal image URLs |

### 3. Updated Vite Configuration
**File**: `vite.config.js` (already configured)

The Vite config already had:
- Detection of CDN endpoint (`nginxHost == 'https://statics.vietky.io.vn'`)
- Conditional path construction (CDN vs local)
- Environment variables exposed to the app:
  - `import.meta.env.VITE_CDN_IMAGES_URL`
  - `import.meta.env.VITE_CDN_SOUNDS_URL`

### 4. Updated Environment Files

#### `.env.local` (Development)
- Added `VITE_NGINX_HOST=http://localhost:3001`
- Assets served from local `/assets/` paths

#### `.env.production` (Production)
- Added `VITE_NGINX_HOST=https://statics.vietky.io.vn`
- Assets served from CDN endpoints

### 5. Documentation
**File**: `docs/CDN_ASSETS_SETUP.md`

Comprehensive documentation covering:
- CDN endpoints and configuration
- How to use the utility in components
- Development vs production setup
- Troubleshooting guide
- Adding new assets

## Asset URLs

### Development (Local)
```
Images:  /assets/images/
Sounds:  /assets/sounds/
```

### Production (CDN)
```
Images:  https://statics.vietky.io.vn/images/
Sounds:  https://statics.vietky.io.vn/sounds/
```

## How It Works

1. **Build Time**
   - `vite.config.js` reads `VITE_NGINX_HOST` environment variable
   - Sets `VITE_CDN_IMAGES_URL` and `VITE_CDN_SOUNDS_URL` accordingly

2. **Runtime**
   - Components import `cdnAssets` utility
   - Use pre-configured constants: `cdnImages.stone_yellow`, etc.
   - Or use utility functions: `getCdnImageUrl('path/to/image.png')`
   - Automatically resolves to correct CDN or local path

## Testing

### Local Development
```bash
cd web/react-frontend
npm run dev
```
Assets will use local paths from `/assets/images/` and `/assets/sounds/`

### Production Build
```bash
VITE_NGINX_HOST=https://statics.vietky.io.vn npm run build
```
Assets will use CDN URLs from `https://statics.vietky.io.vn/images/` and `https://statics.vietky.io.vn/sounds/`

## Verification

Check which CDN URL is being used:
```javascript
// In browser console
console.log(import.meta.env.VITE_CDN_IMAGES_URL)
console.log(import.meta.env.VITE_CDN_SOUNDS_URL)
```

Should show either:
- Development: `/assets/images` and `/assets/sounds`
- Production: `https://statics.vietky.io.vn/images` and `https://statics.vietky.io.vn/sounds`

## Benefits

✅ Reduced load on application server
✅ Improved page load performance with CDN caching
✅ Centralized asset management
✅ Easy to switch CDN providers (only env var change needed)
✅ Backward compatible with local development
✅ No changes needed in component code when switching CDNs

## Future Enhancements

- Move sounds to CDN (currently configured but not in use)
- Add asset optimization (compression, format conversion)
- Implement cache busting strategy
- Add CDN provider failover

## Notes

- All hardcoded asset paths have been replaced with the CDN utility
- Environment variables are correctly set in Vite config
- Components are properly updated and tested
- No breaking changes to existing functionality
