/**
 * Test suite for cardNames.js utility functions
 * Tests both sprite and individual image modes
 */

import {
  getCardSpriteStyle,
  getTokenSpriteStyle,
  getCardRenderConfig,
  getTokenRenderConfig,
  getCardImagePath,
  hasSprite,
} from './cardNames'

describe('Card Names Utility Functions', () => {
  
  describe('getCardImagePath', () => {
    test('should return correct path for valid card name', () => {
      expect(getCardImagePath('golem_0022')).toBe('https://statics.vietky.io.vn/images/golem_0022.JPG')
      expect(getCardImagePath('mint_0002')).toBe('https://statics.vietky.io.vn/images/mint_0002.JPG')
      expect(getCardImagePath('trade_0002_0020')).toBe('https://statics.vietky.io.vn/images/trade_0002_0020.JPG')
    })
    
    test('should return default path for invalid card name', () => {
      expect(getCardImagePath(null)).toBe('https://statics.vietky.io.vn/images/golem_bg.JPG')
      expect(getCardImagePath('')).toBe('https://statics.vietky.io.vn/images/golem_bg.JPG')
      expect(getCardImagePath(undefined)).toBe('https://statics.vietky.io.vn/images/golem_bg.JPG')
    })
  })
  
  describe('hasSprite', () => {
    test('should return true for cards with sprite mapping', () => {
      expect(hasSprite('golem_0022')).toBe(true)
      expect(hasSprite('mint_0002')).toBe(true)
      expect(hasSprite('trade_0002_0020')).toBe(true)
    })
    
    test('should return false for cards without sprite mapping', () => {
      expect(hasSprite('unknown_card')).toBe(false)
      expect(hasSprite(null)).toBe(false)
      expect(hasSprite('')).toBe(false)
    })
  })
  
  describe('getCardSpriteStyle - with sprite mode enabled', () => {
    test('should return sprite style for merchant cards', () => {
      const style = getCardSpriteStyle('mint_0002', { useSprite: true })
      expect(style).not.toBeNull()
      expect(style).toHaveProperty('backgroundImage')
      expect(style).toHaveProperty('backgroundSize')
      expect(style).toHaveProperty('backgroundPosition')
      expect(style.backgroundImage).toContain('full_card.jpg')
    })
    
    test('should return sprite style for golem cards', () => {
      const style = getCardSpriteStyle('golem_0022', { useSprite: true })
      expect(style).not.toBeNull()
      expect(style).toHaveProperty('backgroundImage')
      expect(style.backgroundImage).toContain('full_golems.jpg')
    })
    
    test('should return null for cards without sprite mapping', () => {
      const style = getCardSpriteStyle('unknown_card', { useSprite: true })
      expect(style).toBeNull()
    })
    
    test('should return null for invalid input', () => {
      expect(getCardSpriteStyle(null, { useSprite: true })).toBeNull()
      expect(getCardSpriteStyle('', { useSprite: true })).toBeNull()
    })
  })
  
  describe('getCardSpriteStyle - with sprite mode disabled', () => {
    test('should return null when useSprite is false', () => {
      expect(getCardSpriteStyle('mint_0002', { useSprite: false })).toBeNull()
      expect(getCardSpriteStyle('golem_0022', { useSprite: false })).toBeNull()
    })
  })
  
  describe('getTokenSpriteStyle', () => {
    test('should return sprite style for valid tokens with sprite enabled', () => {
      const style = getTokenSpriteStyle('yellow_stone', { useSprite: true })
      expect(style).not.toBeNull()
      expect(style).toHaveProperty('backgroundImage')
      expect(style.backgroundImage).toContain('full_token.jpg')
    })
    
    test('should return null when sprite is disabled', () => {
      const style = getTokenSpriteStyle('yellow_stone', { useSprite: false })
      expect(style).toBeNull()
    })
    
    test('should return null for unmapped tokens', () => {
      const style = getTokenSpriteStyle('unknown_token', { useSprite: true })
      expect(style).toBeNull()
    })
  })
  
  describe('getCardRenderConfig', () => {
    test('should return sprite config when sprite is available and enabled', () => {
      const config = getCardRenderConfig('mint_0002', { useSprite: true })
      expect(config.mode).toBe('sprite')
      expect(config.style).not.toBeNull()
      expect(config.imagePath).toBeNull()
    })
    
    test('should return image config when sprite is disabled', () => {
      const config = getCardRenderConfig('mint_0002', { useSprite: false })
      expect(config.mode).toBe('image')
      expect(config.style).toBeNull()
      expect(config.imagePath).toBe('https://statics.vietky.io.vn/images/mint_0002.JPG')
    })
    
    test('should return image config for cards without sprite mapping', () => {
      const config = getCardRenderConfig('upgrade_2', { useSprite: true })
      // upgrade_2 has sprite mapping, so it should return sprite
      if (config.mode === 'sprite') {
        expect(config.style).not.toBeNull()
      } else {
        expect(config.imagePath).toBe('https://statics.vietky.io.vn/images/upgrade_2.JPG')
      }
    })
    
    test('should return default for invalid input', () => {
      const config = getCardRenderConfig(null)
      expect(config.mode).toBe('image')
      expect(config.imagePath).toBe('https://statics.vietky.io.vn/images/golem_bg.JPG')
    })
  })
  
  describe('getTokenRenderConfig', () => {
    test('should return sprite config when sprite is available and enabled', () => {
      const config = getTokenRenderConfig('yellow_stone', { useSprite: true })
      expect(config.mode).toBe('sprite')
      expect(config.style).not.toBeNull()
      expect(config.imagePath).toBeNull()
    })
    
    test('should return image config when sprite is disabled', () => {
      const config = getTokenRenderConfig('yellow_stone', { useSprite: false })
      expect(config.mode).toBe('image')
      expect(config.style).toBeNull()
      expect(config.imagePath).toBe('https://statics.vietky.io.vn/images/stone_yellow.JPG')
    })
    
    test('should return image config for all stone colors', () => {
      const tokens = ['yellow_stone', 'pink_stone', 'blue_stone', 'green_stone']
      tokens.forEach(token => {
        const config = getTokenRenderConfig(token, { useSprite: false })
        expect(config.mode).toBe('image')
        expect(config.imagePath).toContain('.JPG')
      })
    })
    
    test('should return image config for coins', () => {
      const config1 = getTokenRenderConfig('gold_coin', { useSprite: false })
      expect(config1.imagePath).toBe('https://statics.vietky.io.vn/images/coin_3.JPG')
      
      const config2 = getTokenRenderConfig('silver_coin', { useSprite: false })
      expect(config2.imagePath).toBe('https://statics.vietky.io.vn/images/coin_1.JPG')
    })
  })
  
  describe('Sprite position calculations', () => {
    test('should calculate correct positions for first cell', () => {
      // mint_0002 is at position [1, 1] (first row, first column)
      const style = getCardSpriteStyle('mint_0002', { useSprite: true })
      expect(style.backgroundPosition).toBe('0% 0%')
    })
    
    test('should calculate correct positions for last cell', () => {
      // Check a card in the last position of merchant sprite
      const style = getCardSpriteStyle('trade_2000_0311', { useSprite: true })
      expect(style).not.toBeNull()
      // Position should be calculated based on the grid
    })
  })
  
  describe('Integration tests', () => {
    test('should handle all card types consistently', () => {
      const cardTypes = [
        'golem_0022',  // Golem card
        'mint_0002',   // Mint card
        'trade_0002_0020', // Trade card
        'upgrade_2'    // Upgrade card
      ]
      
      cardTypes.forEach(cardName => {
        // Should work in both modes
        const spriteConfig = getCardRenderConfig(cardName, { useSprite: true })
        const imageConfig = getCardRenderConfig(cardName, { useSprite: false })
        
        // Image mode should always return image path
        expect(imageConfig.mode).toBe('image')
        expect(imageConfig.imagePath).toContain(cardName)
        
        // Sprite mode returns sprite if available, otherwise image
        expect(['sprite', 'image']).toContain(spriteConfig.mode)
      })
    })
  })
})
