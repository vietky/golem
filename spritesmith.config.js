module.exports = {
  src: [
    'web/static/images/*.PNG'
  ],
  target: {
    image: 'web/static/spritesheet.jpg',
    json: 'web/static/sprites.json'
  },
  algorithm: 'top-down',
  padding: 2
};

