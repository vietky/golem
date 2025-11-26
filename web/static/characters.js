/**
 * ============================================================================
 * CARD IMAGE MAPPING SYSTEM - Naming Convention Rules
 * ============================================================================
 * 
 * This file implements the image mapping system for Century: Golem Edition
 * cards following the standardized naming convention.
 * 
 * NAMING CONVENTION RULES:
 * 
 * 1. MERCHANT/ACTION CARDS:
 *    Format: action_[pink][blue][green][yellow]_[pink][blue][green][yellow]
 *    Have 3 action types: mint, upgrade, trade
 *    
 *    Examples:
 *    - mint_0002: Get 2 Yellow Crystals
 *    - mint_0011: Get 1 Green, 1 Yellow Crystal
 *    - upgrade_2: Upgrade 2 Crystals
 *    - upgrade_3: Upgrade 3 Crystals
 *    - trade_0002_0100: Trade 2 Yellow for 1 Blue Crystal
 * 
 * 2. GOLEM CARDS (Point Cards):
 *    Format: golem_[pink][blue][green][yellow]
 *    Points Formula: pink*4 + blue*3 + green*2 + yellow*1
 *    
 *    Examples:
 *    - golem_4000: Trade 4 Pink = 16 Points (4*4)
 *    - golem_2300: Trade 2 Pink, 3 Blue = 17 Points (2*4 + 3*3 = 17)
 * 
 * 3. SPECIAL CARDS:
 *    - coin_1: Silver coin = 1 point
 *    - coin_3: Bronze coin = 3 points
 *    - stone_blue: Image of stone blue
 *    - stone_pink: Image of stone pink
 *    - stone_green: Image of stone green
 *    - stone_yellow: Image of stone yellow
 *    - golem_bg: Background of golem card
 *    - merchant_bg: Background of merchant card
 * 
 * ============================================================================
 */
// Image mapping for edge cases (cards that might exist but images are missing)
// Note: Backend now only generates cards for which images exist, so this is mainly a safety net
const imageMapping = {
    // Empty for now - all cards should have images
    // Add mappings here only if needed for legacy cards or edge cases
};

/**
 * Get image path for a card based on its name following the naming convention
 * 
 * Supports:
 * - Merchant cards: mint_*, upgrade_*, trade_*, action_*
 * - Golem cards: golem_*
 * - Special cards: coin_*, stone_*, *_bg
 * 
 * @param {string} cardName - Card name following the naming convention
 * @returns {string|null} - Image path or null if invalid
 */
function getCardImagePath(cardName) {
    if (!cardName) return null;
    
    // Check if there's a mapping for this card (for missing images)
    let actualCardName = cardName;
    if (imageMapping[cardName]) {
        actualCardName = imageMapping[cardName];
    }
    
    // Normalize card name to match image file names
    // All images are stored as: [cardName].PNG
    const imageName = actualCardName + '.PNG';
    const imagePath = `images/${imageName}`;
    
    return imagePath;
}

/**
 * Get card image HTML element
 * 
 * Creates an <img> tag for the card image based on the card name.
 * Handles all card types: merchant cards, golem cards, coins, stones, backgrounds.
 * 
 * @param {string} cardName - Card name following naming convention
 * @param {string} className - CSS class for the image (default: 'card-image')
 * @returns {string} - HTML string for the image element
 */
function getCardImage(cardName, className = 'card-image') {
    if (!cardName) {
        console.warn('getCardImage called with empty cardName');
        return '';
    }
    
    const imagePath = getCardImagePath(cardName);
    if (!imagePath) {
        console.warn('getCardImagePath returned null for:', cardName);
        return '';
    }
    
    return `<img src="${imagePath}" alt="${cardName}" class="${className}" onerror="console.warn('Image not found:', '${imagePath}'); this.style.display='none'">`;
}

/**
 * Legacy function for backward compatibility
 * Now returns image instead of SVG
 * 
 * @param {string} cardName - Card name
 * @returns {string} - HTML string for the image element
 */
function getCharacterIllustration(cardName) {
    return getCardImage(cardName, 'character-image');
}

