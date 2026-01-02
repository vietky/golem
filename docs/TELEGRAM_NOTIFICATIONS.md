# Telegram Notifications

This feature sends notifications to a Telegram chat when new game rooms are created.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. BotFather will give you a **Bot Token** - save this for later

### 2. Get Your Chat ID

You can send notifications to:
- A private chat with the bot
- A group chat
- A channel

#### For Private Chat:
1. Search for your bot in Telegram and start a chat
2. Send any message to the bot
3. Visit this URL in your browser (replace `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
4. Look for `"chat":{"id":123456789}` in the response - that's your Chat ID

#### For Group Chat:
1. Add your bot to the group
2. Send a message in the group
3. Visit the same URL as above
4. Look for the chat ID in the response (will be negative for groups)

### 3. Configure Environment Variables

Add the following to your `.env` file or environment:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890
```

- `TELEGRAM_BOT_TOKEN`: The token you got from BotFather
- `TELEGRAM_CHAT_ID`: Your chat/group ID (can be positive or negative)

### 4. Restart the Server

The server will automatically detect the configuration and enable Telegram notifications:

```bash
go run cmd/server/main.go
```

You should see in the logs:
```
Telegram notifier enabled
```

## Notification Format

When a new room is created, a message will be sent:

```
🎮 New Game Room Created!

🏷️ Room ID: session_1234567890
👤 Created by: PlayerName
👥 Max Players: 4
⏰ Time: 2026-01-02 15:04:05
```

The creator name can be specified in the room creation request. If not provided, it will default to "Anonymous".

## Disabling Notifications

To disable notifications, simply remove or comment out the environment variables:

```bash
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
```

The server will continue to work normally without sending notifications.

## Troubleshooting

### Bot not sending messages
1. Make sure the bot token is correct
2. Verify you've started a chat with the bot or added it to the group
3. Check the chat ID is correct (use `/getUpdates` to verify)
4. For groups, make sure the bot has permission to send messages

### Check logs
The server logs will show if notifications are enabled:
```bash
# Look for this in startup logs
{"level":"info","msg":"Telegram notifier enabled","chatID":"..."}

# Or if disabled:
{"level":"info","msg":"Telegram notifier disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)"}
```

### Testing
You can test the notification by:
1. Creating a new game room via the API with an optional `creatorName`:
   ```bash
   curl -X POST http://localhost:8080/api/create \
     -H "Content-Type: application/json" \
     -d '{"numPlayers": 4, "creatorName": "YourName"}'
   ```
2. Check your Telegram chat/group for the notification

## Security Note

Keep your bot token secret! Don't commit it to version control. Always use environment variables or a secure configuration management system.
