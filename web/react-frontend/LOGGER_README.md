# Logger Implementation

## Overview

The React frontend now uses a centralized logger system instead of direct `console.log`, `console.error`, and `console.warn` calls. This provides better control over logging levels and makes it easier to manage log output in different environments.

## Logger Levels

The logger supports 5 levels (in order of priority):

1. **DEBUG** - Detailed debugging information (lowest priority)
2. **INFO** - General informational messages
3. **WARN** - Warning messages
4. **ERROR** - Error messages (highest priority)
5. **NONE** - Disable all logging

## Configuration

### Environment Variables

Set the `VITE_LOG_LEVEL` environment variable to control logging:

```bash
# Development (verbose)
VITE_LOG_LEVEL=DEBUG

# Production (normal)
VITE_LOG_LEVEL=INFO

# Errors only
VITE_LOG_LEVEL=ERROR

# Disable all logs
VITE_LOG_LEVEL=NONE
```

### Configuration Files

- **`.env.local`** - Development environment (default: DEBUG)
- **`.env.production`** - Production environment (default: INFO)
- **`vite.config.js`** - Fallback defaults if env var not set

## Usage

### Basic Logging

```javascript
import { createLogger } from '../utils/logger'

const logger = createLogger('MyComponent')

// Debug messages (only shown when LOG_LEVEL=DEBUG)
logger.debug('Detailed info:', someVariable)

// Info messages (shown when LOG_LEVEL=DEBUG or INFO)
logger.info('User action completed')

// Warnings (shown when LOG_LEVEL <= WARN)
logger.warn('Deprecated feature used')

// Errors (always shown unless NONE)
logger.error('Something went wrong:', error)
```

### With Context

The `createLogger(context)` function creates a logger with a specific context prefix:

```javascript
const logger = createLogger('GameStore')
logger.info('WebSocket connected')
// Output: [GameStore] WebSocket connected
```

### Global Logger

You can also use the singleton logger without context:

```javascript
import logger from '../utils/logger'

logger.info('Global message')
// Output: Global message
```

## Migration Notes

### Removed Components

1. **`addToLog()` function** - Removed from gameStore.js
2. **`actionLog` state** - Removed from gameStore.js (redundant with actionHistory)

### Replaced Calls

All `console.log`, `console.error`, and `console.warn` calls have been replaced with appropriate logger methods:

- `console.log('[Component]', ...)` → `logger.debug(...)`
- `console.log('action')` → `logger.info(...)`
- `console.warn(...)` → `logger.warn(...)`
- `console.error(...)` → `logger.error(...)`

## Files Updated

### New Files
- `src/utils/logger.js` - Logger implementation

### Modified Files
- `vite.config.js` - Added VITE_LOG_LEVEL configuration
- `.env.local` - Added VITE_LOG_LEVEL=DEBUG
- `.env.production` - Added VITE_LOG_LEVEL=INFO
- `src/store/gameStore.js` - Removed addToLog, replaced console calls
- `src/App.jsx` - Replaced console calls
- `src/components/Lobby.jsx` - Replaced console calls
- `src/components/Toast.jsx` - Replaced console calls
- `src/components/ResourcePanel.jsx` - Replaced console calls
- `src/components/SinglePlayerLobby.jsx` - Replaced console calls
- `src/components/ThemeToggleButton.jsx` - Replaced console calls
- `src/hooks/useOrientation.js` - Replaced console calls
- `src/utils/toast.js` - Replaced console calls

## Testing

### Build with Different Log Levels

```bash
# Debug mode (all logs)
VITE_LOG_LEVEL=DEBUG npm run build

# Info mode (info, warn, error)
VITE_LOG_LEVEL=INFO npm run build

# Error mode (errors only)
VITE_LOG_LEVEL=ERROR npm run build

# Silent mode (no logs)
VITE_LOG_LEVEL=NONE npm run build
```

### Verify Logger Configuration

Run the verification script:

```bash
bash /tmp/test_logger.sh
```

## Benefits

1. **Centralized Control** - Change log level without touching code
2. **Environment-Aware** - Different levels for dev/prod
3. **Performance** - Logs can be completely disabled in production
4. **Better Organization** - Context prefixes help identify log sources
5. **Type Safety** - Consistent API across codebase
6. **Clean Console** - No more debug logs cluttering production

## Examples

### GameStore
```javascript
const logger = createLogger('GameStore');

// Connection events
logger.info('WebSocket connected')
logger.error('WebSocket error:', error)

// Debug state changes
logger.debug('Received market cards:', message.market.actionCards.length)

// User actions
logger.info('Playing card from hand')
logger.info('Acquiring card from market')
```

### Components
```javascript
const logger = createLogger('Lobby');

// Layout debugging
logger.debug('Layout:', { isMobile, isTablet, isPortrait })

// Error handling
logger.error('Error fetching rooms:', error)

// User events
logger.info('Creating new game')
```

## Future Enhancements

Possible improvements:
- Add timestamp to each log
- Add log persistence (localStorage)
- Add remote logging (send errors to server)
- Add log filtering by context
- Add structured logging (JSON format)
