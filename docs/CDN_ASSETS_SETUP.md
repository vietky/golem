# CDN Assets Configuration

## Overview
All frontend assets (images and sounds) have been migrated to use a CDN. The application automatically detects and routes requests to either the local assets directory or the CDN endpoint based on the configuration.

## CDN Endpoints
- **Images**: `https://statics.vietky.io.vn/images/`
- **Sounds**: `https://statics.vietky.io.vn/sounds/`

## Configuration

### Environment Variables
The CDN configuration is controlled via the `VITE_NGINX_HOST` environment variable in your `.env` file:

```bash
# For production (CDN)
VITE_NGINX_HOST=https://statics.vietky.io.vn

# For local development
VITE_NGINX_HOST=http://localhost:3001
```

### How It Works
1. `vite.config.js` reads the `VITE_NGINX_HOST` environment variable
2. If it matches `https://statics.vietky.io.vn`, CDN URLs are used
3. Otherwise, local asset paths (`/assets/images`, `/assets/sounds`) are used
4. These URLs are exposed as `import.meta.env.VITE_CDN_IMAGES_URL` and `import.meta.env.VITE_CDN_SOUNDS_URL`

### Vite Config Logic
```javascript
const isCdn = nginxHost == 'https://statics.vietky.io.vn'
const images = isCdn ? 'images' : 'assets/images';
const sounds = isCdn ? 'sounds':'assets/sounds'

const cdnImagesUrl = isCdn ? `${nginxHost}/images` : `/${images}`;
const cdnSoundsUrl = isCdn ? `${nginxHost}/sounds` : `/${sounds}`;
```

## Usage in Components

All image and sound assets in React components should use the `cdnAssets` utility:

```javascript
import { cdnImages, cdnSounds, getCdnImageUrl, getCdnSoundUrl } from '../utils/cdnAssets'

// Using predefined constants
const yellowStone = cdnImages.stone_yellow // => '/assets/images/stone_yellow.JPG' or 'https://statics.vietky.io.vn/images/stone_yellow.JPG'
const avatar = cdnImages.getAvatarUrl(1)    // => '/assets/images/avatar/1.webp' or 'https://statics.vietky.io.vn/images/avatar/1.webp'

// Using utility functions
const customImage = getCdnImageUrl('custom/image.png')
const customSound = getCdnSoundUrl('effects/click.mp3')
```

## Updated Components

The following components have been updated to use CDN assets:

- `Card.jsx` - Crystal/stone images
- `Lobby.jsx` - Background image and avatar images
- `TradeModal.jsx` - Stone/crystal images
- `SimpleCard.jsx` - Crystal images

## Adding New Assets

When adding new assets:

1. Create a constant in `cdnAssets.js`:
```javascript
export const cdnImages = {
  // Existing constants...
  myNewImage: getCdnImageUrl('myNewImage.png'),
}
```

2. Use it in your component:
```javascript
import { cdnImages } from '../utils/cdnAssets'

// In your component
<img src={cdnImages.myNewImage} alt="description" />
```

## Development vs Production

### Development (Local)
- `VITE_NGINX_HOST=http://localhost:3001` (or omitted, uses default)
- Assets served from `/assets/images/` and `/assets/sounds/`
- Requires static assets in `web/react-frontend/public/assets/`

### Production (CDN)
- `VITE_NGINX_HOST=https://statics.vietky.io.vn`
- Assets served from CDN endpoints
- No static assets needed in the application

## Troubleshooting

### Assets Not Loading
1. Check the `VITE_NGINX_HOST` environment variable
2. Run `npm run dev` again to rebuild with new env vars
3. Clear browser cache (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)

### CDN vs Local Override
If you need to test with local assets in a production build:
```bash
VITE_NGINX_HOST=http://localhost:3001 npm run build
```

### Checking Active CDN URL
Open browser DevTools → Console → Enter:
```javascript
console.log(import.meta.env.VITE_CDN_IMAGES_URL)
console.log(import.meta.env.VITE_CDN_SOUNDS_URL)
```

## Future Migrations

When migrating to a different CDN, only update:
1. The `VITE_NGINX_HOST` environment variable
2. The CDN endpoints structure in `vite.config.js` (if different from current pattern)

All components will automatically use the new CDN endpoint without code changes.
