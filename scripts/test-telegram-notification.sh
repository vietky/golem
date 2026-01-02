#!/bin/bash

# Test script for Telegram notifications when creating a room

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing Telegram notification on room creation...${NC}\n"

# Create a room with creator name
echo -e "${GREEN}Creating room with creator name 'TestPlayer'...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 4, "creatorName": "TestPlayer"}')

echo "Response: $RESPONSE"
SESSION_ID=$(echo $RESPONSE | grep -o '"sessionID":"[^"]*' | cut -d'"' -f4)
echo -e "\n${GREEN}Room created with ID: $SESSION_ID${NC}"

echo -e "\n${BLUE}Check your Telegram chat for the notification!${NC}"

# Create another room without creator name (should use "Anonymous")
echo -e "\n${GREEN}Creating room without creator name (will use 'Anonymous')...${NC}"
RESPONSE2=$(curl -s -X POST http://localhost:8080/api/create \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 2}')

echo "Response: $RESPONSE2"
SESSION_ID2=$(echo $RESPONSE2 | grep -o '"sessionID":"[^"]*' | cut -d'"' -f4)
echo -e "\n${GREEN}Room created with ID: $SESSION_ID2${NC}"

echo -e "\n${BLUE}Check your Telegram chat for the second notification!${NC}"
