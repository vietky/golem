#!/bin/bash

# Example: How to run the server with Telegram notifications enabled

# 1. Set up your Telegram bot token and chat ID
export TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
export TELEGRAM_CHAT_ID="-1001234567890"

# 2. Run the server
# When a room is created and the first player joins, 
# a notification will be sent to your Telegram chat

go run cmd/server/main.go

# To disable notifications, simply unset or don't set the environment variables:
# unset TELEGRAM_BOT_TOKEN
# unset TELEGRAM_CHAT_ID
# go run cmd/server/main.go
