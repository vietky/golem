import React from 'react'
import { getCardRenderConfig, getTokenRenderConfig } from '../utils/cardNames'

/**
 * Unified Card Renderer Component
 * Renders cards using either sprite or individual images based on configuration
 * 
 * @example
 * // Render using default mode (sprite if available)
 * <CardRenderer cardName="golem_0022" className="w-32 h-48" />
 * 
 * @example
 * // Force individual image mode
 * <CardRenderer cardName="golem_0022" className="w-32 h-48" useSprite={false} />
 * 
 * @example
 * // Force sprite mode (will fallback to image if sprite not available)
 * <CardRenderer cardName="golem_0022" className="w-32 h-48" useSprite={true} />
 */
const CardRenderer = ({ 
  cardName, 
  className = '', 
  style = {},
  useSprite = undefined, // undefined = use default from config, true/false = force mode
  onError = null,
  alt = '',
  onClick = null
}) => {
  const config = getCardRenderConfig(cardName, { useSprite })
  
  if (config.mode === 'sprite') {
    // Render using CSS sprite
    return (
      <div 
        className={className}
        style={{ ...config.style, ...style }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        aria-label={alt || cardName}
      />
    )
  }
  
  // Render using individual image
  return (
    <img
      src={config.imagePath}
      alt={alt || cardName}
      className={className}
      style={style}
      onClick={onClick}
      onError={(e) => {
        if (onError) {
          onError(e)
        } else {
          e.target.src = 'https://statics.vietky.io.vn/images/golem_bg.JPG'
        }
      }}
    />
  )
}

/**
 * Unified Token Renderer Component
 * Renders tokens (stones, coins) using either sprite or individual images
 * 
 * @example
 * <TokenRenderer tokenName="yellow_stone" className="w-8 h-8" />
 */
export const TokenRenderer = ({ 
  tokenName, 
  className = '', 
  style = {},
  useSprite = undefined,
  onError = null,
  alt = '',
  onClick = null
}) => {
  const config = getTokenRenderConfig(tokenName, { useSprite })
  
  if (config.mode === 'sprite') {
    // Render using CSS sprite
    return (
      <div 
        className={className}
        style={{ ...config.style, ...style }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        aria-label={alt || tokenName}
      />
    )
  }
  
  // Render using individual image
  return (
    <img
      src={config.imagePath}
      alt={alt || tokenName}
      className={className}
      style={style}
      onClick={onClick}
      onError={(e) => {
        if (onError) {
          onError(e)
        } else {
          e.target.style.display = 'none'
        }
      }}
    />
  )
}

export default CardRenderer
