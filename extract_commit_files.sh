#!/bin/bash

# Extract all files from commit 4ea9d11
COMMIT_HASH="4ea9d11"
OUTPUT_DIR="./commit_4ea9d11_files"

echo "📦 Extracting files from commit $COMMIT_HASH..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get list of files in commit
FILES=$(git show $COMMIT_HASH --name-only --pretty=format:"" | grep -v "^$")

# Extract each file
for file in $FILES; do
    echo "Extracting: $file"
    # Create directory structure if needed
    mkdir -p "$OUTPUT_DIR/$(dirname "$file")"
    # Extract file content from commit
    git show "$COMMIT_HASH:$file" > "$OUTPUT_DIR/$file" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ Failed to extract $file"
    fi
done

echo ""
echo "✅ All files extracted to: $OUTPUT_DIR"
echo ""
echo "Files extracted:"
ls -lh "$OUTPUT_DIR" -R | head -30

