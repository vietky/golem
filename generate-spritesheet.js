const spritesmith = require('spritesmith');
const fs = require('fs');
const path = require('path');

// Get all PNG files from images directory
const imagesDir = path.join(__dirname, 'web/static/images');
const files = fs.readdirSync(imagesDir)
  .filter(file => file.endsWith('.PNG'))
  .map(file => path.join(imagesDir, file));

console.log(`Found ${files.length} images to process...`);

// Generate sprite
spritesmith.run({ src: files, padding: 2 }, (err, result) => {
  if (err) {
    console.error('Error generating sprite:', err);
    return;
  }

  // Write the sprite image
  const spritePath = path.join(__dirname, 'web/static/spritesheet.jpg');
  fs.writeFileSync(spritePath, result.image);
  console.log(`Sprite image written to: ${spritePath}`);
  console.log(`Sprite dimensions: ${result.properties.width}x${result.properties.height}`);

  // Process coordinates - convert to simpler format
  const spriteData = {
    image: 'spritesheet.jpg',
    width: result.properties.width,
    height: result.properties.height,
    sprites: {}
  };

  // Convert coordinates to simpler format
  Object.keys(result.coordinates).forEach(imagePath => {
    const filename = path.basename(imagePath, '.PNG');
    const coords = result.coordinates[imagePath];
    spriteData.sprites[filename] = {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height
    };
  });

  // Write JSON file
  const jsonPath = path.join(__dirname, 'web/static/sprites.json');
  fs.writeFileSync(jsonPath, JSON.stringify(spriteData, null, 2));
  console.log(`Sprite data written to: ${jsonPath}`);
  console.log(`Total sprites: ${Object.keys(spriteData.sprites).length}`);
});

