/**
 * ============================================================================
 * FUNNY VIETNAMESE CARD NAMES MAPPING
 * ============================================================================
 * 
 * Maps technical card names to funny Vietnamese names
 */
const vietnameseCardNames = {
    // ============================================
    // GOLEM CARDS (Point Cards) - Quỷ Đá, etc.
    // ============================================
    'golem_0022': 'Quỷ Đá Nhỏ',
    'golem_0023': 'Quỷ Đá Xanh',
    'golem_0032': 'Quỷ Đá Vàng',
    'golem_0040': 'Quỷ Đá Xanh Lá',
    'golem_0050': 'Quỷ Đá Xanh Dương',
    'golem_0202': 'Quỷ Đá Xanh Biển',
    'golem_0203': 'Quỷ Đá Xanh Ngọc',
    'golem_0220': 'Quỷ Đá Xanh Lục',
    'golem_0222': 'Quỷ Đá Tam Sắc',
    'golem_0230': 'Quỷ Đá Xanh Lam',
    'golem_0302': 'Quỷ Đá Xanh Thẳm',
    'golem_0320': 'Quỷ Đá Xanh Biển',
    'golem_0400': 'Quỷ Đá Xanh Dương',
    'golem_0500': 'Quỷ Đá Xanh Đậm',
    'golem_1012': 'Quỷ Đá Hồng',
    'golem_1111': 'Quỷ Đá Tứ Sắc',
    'golem_1113': 'Quỷ Đá Ngũ Sắc',
    'golem_1120': 'Quỷ Đá Tam Nguyên',
    'golem_1131': 'Quỷ Đá Lục Sắc',
    'golem_1201': 'Quỷ Đá Hồng Vàng',
    'golem_1311': 'Quỷ Đá Hồng Xanh',
    'golem_2002': 'Quỷ Đá Hồng Lục',
    'golem_2003': 'Quỷ Đá Hồng Xanh',
    'golem_2020': 'Quỷ Đá Hồng Biển',
    'golem_2022': 'Quỷ Đá Hồng Lục',
    'golem_2030': 'Quỷ Đá Hồng Lam',
    'golem_2200': 'Quỷ Đá Hồng Xanh',
    'golem_2202': 'Quỷ Đá Hồng Vàng',
    'golem_2220': 'Quỷ Đá Hồng Lục',
    'golem_2300': 'Quỷ Đá Hồng Xanh',
    'golem_3002': 'Quỷ Đá Hồng Đậm',
    'golem_3020': 'Quỷ Đá Hồng Xanh',
    'golem_3111': 'Quỷ Đá Hồng Tứ Sắc',
    'golem_3200': 'Quỷ Đá Hồng Xanh',
    'golem_4000': 'Quỷ Đá Hồng Tối',
    
    // ============================================
    // ACTION CARDS (Full format) - if any exist
    // ============================================
    // Add action_* cards here if needed
    
    // ============================================
    // MINT CARDS (Produce Cards) - Trùm Bò, etc.
    // ============================================
    'mint_0002': 'Trùm Bò Vàng',
    'mint_0003': 'Trùm Bò Vàng Lớn',
    'mint_0004': 'Trùm Bò Vàng Khổng Lồ',
    'mint_0011': 'Trùm Bò Xanh Vàng',
    'mint_0012': 'Trùm Bò Xanh Vàng Lớn',
    'mint_0020': 'Trùm Bò Xanh',
    'mint_0100': 'Trùm Bò Xanh Biển',
    'mint_0101': 'Trùm Bò Xanh Vàng',
    'mint_1000': 'Trùm Bò Hồng',
    
    // ============================================
    // UPGRADE CARDS - Nhà Tù, etc.
    // ============================================
    'upgrade_2': 'Nhà Tù Cấp 2',
    'upgrade_3': 'Nhà Tù Cấp 3',
    
    // ============================================
    // TRADE CARDS - Chợ Trời, etc.
    // ============================================
    'trade_0002_0020': 'Chợ Trời Vàng Xanh',
    'trade_0002_0100': 'Chợ Trời Vàng Xanh',
    'trade_0003_0030': 'Chợ Trời Vàng Lớn',
    'trade_0003_0110': 'Chợ Trời Vàng Xanh',
    'trade_0003_1000': 'Chợ Trời Vàng Hồng',
    'trade_0004_0200': 'Chợ Trời Vàng Xanh',
    'trade_0004_1100': 'Chợ Trời Vàng Xanh',
    'trade_0005_0300': 'Chợ Trời Vàng Xanh',
    'trade_0005_2000': 'Chợ Trời Vàng Hồng',
    'trade_0010_0003': 'Chợ Trời Xanh Vàng',
    'trade_0011_1000': 'Chợ Trời Xanh Hồng',
    'trade_0020_0103': 'Chợ Trời Xanh Xanh',
    'trade_0020_0200': 'Chợ Trời Xanh Xanh',
    'trade_0020_1002': 'Chợ Trời Xanh Hồng',
    'trade_0030_0202': 'Chợ Trời Xanh Lớn',
    'trade_0030_0300': 'Chợ Trời Xanh Xanh',
    'trade_0030_1101': 'Chợ Trời Xanh Đa Sắc',
    'trade_0030_2000': 'Chợ Trời Xanh Hồng',
    'trade_0100_0014': 'Chợ Trời Xanh Vàng',
    'trade_0100_0020': 'Chợ Trời Xanh Xanh',
    'trade_0100_0021': 'Chợ Trời Xanh Xanh',
    'trade_0200_0032': 'Chợ Trời Xanh Xanh',
    'trade_0200_1012': 'Chợ Trời Xanh Hồng',
    'trade_0200_1020': 'Chợ Trời Xanh Hồng',
    'trade_0200_2000': 'Chợ Trời Xanh Hồng',
    'trade_0300_3000': 'Chợ Trời Xanh Hồng',
    'trade_1000_0022': 'Chợ Trời Hồng Xanh',
    'trade_1000_0030': 'Chợ Trời Hồng Xanh',
    'trade_1000_0103': 'Chợ Trời Hồng Xanh',
    'trade_1000_0111': 'Chợ Trời Hồng Đa Sắc',
    'trade_1000_0200': 'Chợ Trời Hồng Xanh',
    'trade_1002_2000': 'Chợ Trời Hồng Hồng',
    'trade_2000_0230': 'Chợ Trời Hồng Xanh',
    'trade_2000_0311': 'Chợ Trời Hồng Xanh',
    
    // ============================================
    // COIN CARDS - Tiền Xu, etc.
    // ============================================
    'coin_1': 'Tiền Xu Bạc',
    'coin_3': 'Tiền Xu Đồng',
    
    // ============================================
    // STONE CARDS - Đá, etc.
    // ============================================
    'stone_blue': 'Đá Xanh',
    'stone_pink': 'Đá Hồng',
    'stone_green': 'Đá Xanh Lá',
    'stone_yellow': 'Đá Vàng',
    
    // ============================================
    // BACKGROUND CARDS - Nền, etc.
    // ============================================
    'golem_bg': 'Nền Quỷ Đá',
    'merchant_bg': 'Nền Thương Gia',
};

/**
 * Get Vietnamese name for a card
 * @param {string} cardName - Technical card name
 * @returns {string} - Vietnamese name or original name if not found
 */
function getVietnameseCardName(cardName) {
    return vietnameseCardNames[cardName] || cardName;
}

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

