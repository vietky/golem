#!/usr/bin/env python3
"""
Extract normal_dock from full_golems.jpg sprite
Sprite: 1200x1280, 8 cols x 5 rows
normal_dock position: [5, 7] (1-indexed) = row 5, col 7
"""

from PIL import Image
import os

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SPRITE_PATH = os.path.join(PROJECT_ROOT, "web/react-frontend/public/assets/images/full_golems.jpg")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "web/react-frontend/public/assets/images/normal_dock.JPG")

# Sprite config
COLS = 8
ROWS = 5

# normal_dock position (1-indexed)
ROW = 5
COL = 7

def extract_dock():
    # Open sprite
    sprite = Image.open(SPRITE_PATH)
    width, height = sprite.size
    print(f"Sprite size: {width}x{height}")
    
    # Calculate cell size
    cell_width = width // COLS
    cell_height = height // ROWS
    print(f"Cell size: {cell_width}x{cell_height}")
    
    # Calculate position (convert to 0-indexed)
    x = (COL - 1) * cell_width
    y = (ROW - 1) * cell_height
    print(f"Extracting from position: ({x}, {y})")
    
    # Crop
    box = (x, y, x + cell_width, y + cell_height)
    dock_img = sprite.crop(box)
    
    # Save
    dock_img.save(OUTPUT_PATH, quality=95)
    print(f"Saved to: {OUTPUT_PATH}")
    print(f"Output size: {dock_img.size}")

if __name__ == "__main__":
    extract_dock()

