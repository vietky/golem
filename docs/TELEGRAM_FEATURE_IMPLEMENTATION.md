# Telegram Notifications Feature - Implementation Summary

## Overview
Added Telegram bot integration that sends notifications when new game rooms are created.

## What Was Implemented

### 1. Configuration (`internal/config/config.go`)
- Added `TELEGRAM_BOT_TOKEN` environment variable
- Added `TELEGRAM_CHAT_ID` environment variable
- These are optional - server works fine without them

### 2. Telegram Notifier Package (`internal/telegram/`)
New package with:
- `notifier.go` - Main implementation
  - `NewNotifier()` - Creates notifier instance
  - `SendRoomCreatedNotification()` - Sends formatted message to Telegram
  - `IsEnabled()` - Checks if configuration is set
- `notifier_test.go` - Unit tests

### 3. Server Integration (`internal/server/`)
Modified files:
- `server.go` - Added `TelegramNotifier` field to `GameServer` struct
- `handlers.go` - Added notification trigger in `HandleCreateSession` (both V1 and V2)

### 4. Notification Trigger
Notifications are sent when a **room is created** via the `/api/create` endpoint:
- Added optional `creatorName` field to the create request
- If no creator name is provided, defaults to "Anonymous"
- Notification is sent immediately after successful room creation

### 5. Documentation
- `docs/TELEGRAM_NOTIFICATIONS.md` - Complete setup guide with step-by-step instructions
- `scripts/run-with-telegram.sh` - Example script for running server with notifications
- Updated `README.md` with feature mention

## Notification Format

When a room is created, sends:
```
🎮 New Game Room Created!

🏷️ Room ID: session_1234567890
👤 Created by: PlayerName
👥 Max Players: 4
⏰ Time: 2026-01-02 15:04:05
```

## Features
- ✅ Optional configuration - server works without it
- ✅ Formatted HTML messages with emojis
- ✅ Includes room ID, player name, max players, and timestamp
- ✅ Runs asynchronously (doesn't block game connections)
- ✅ Error handling and logging
- ✅ Works with both session V1 and V2
- ✅ Unit tests included

## How to Use

1. Create a Telegram bot via @BotFather
2. Get your chat/group ID
3. Set environment variables:
   ```bash
   export TELEGRAM_BOT_TOKEN="your_token"
   export TELEGRAM_CHAT_ID="your_chat_id"
   ```
4. Run the server - notifications will be sent automatically!

## Testing
```bash
# Run tests
go test ./internal/telegram/... -v

# Build server
go build ./cmd/server/main.go

# Run with notifications enabled
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_CHAT_ID="your_chat_id"
go run cmd/server/main.go
```

## Files Changed
- `internal/config/config.go` - Added configuration fields
- `internal/server/server.go` - Added TelegramNotifier integration
- `internal/server/handlers.go` - Added notification triggers
- `internal/telegram/notifier.go` - New file (main implementation)
- `internal/telegram/notifier_test.go` - New file (tests)
- `docs/TELEGRAM_NOTIFICATIONS.md` - New file (documentation)
- `scripts/run-with-telegram.sh` - New file (example script)
- `README.md` - Added feature mention

## Notes
- Notification is sent asynchronously in a goroutine to avoid blocking player connections
- If Telegram API fails, only a warning is logged - doesn't affect gameplay
- Message uses HTML formatting (supported by Telegram)
- 10-second timeout for HTTP requests to Telegram API
