#!/bin/bash

# Create symlinks from /web/static to /web/react-frontend/public
# This ensures assets (images, sounds) are available in both locations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_DIR="$SCRIPT_DIR/web/static"
PUBLIC_DIR="$SCRIPT_DIR/web/react-frontend/public"

echo "🔗 Creating symlinks from static to public..."
echo "   Source: $STATIC_DIR"
echo "   Target: $PUBLIC_DIR"
echo ""

# Ensure public directory exists
mkdir -p "$PUBLIC_DIR"

# Get all directories in static folder
for dir in "$STATIC_DIR"/*/ ; do
  if [ -d "$dir" ]; then
    dirname=$(basename "$dir")
    target="$PUBLIC_DIR/$dirname"
    
    # Remove existing symlink or directory
    if [ -L "$target" ]; then
      echo "   Removing existing symlink: $dirname"
      rm "$target"
    elif [ -d "$target" ] && [ ! -L "$target" ]; then
      echo "   Warning: $dirname exists as a real directory (not symlink)"
      echo "   Skipping to avoid data loss. Remove manually if needed."
      continue
    fi
    
    # Create symlink
    ln -sf "$dir" "$target"
    echo "   ✅ Linked: $dirname"
  fi
done

echo ""
echo "✅ Symlinks created successfully!"
echo ""
echo "Verification:"
ls -lah "$PUBLIC_DIR" | grep '^l' || echo "   No symlinks found"
echo ""
