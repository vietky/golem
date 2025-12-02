/**
 * ============================================================================
 * TIÊN HIỆP / TRUNG CỔ HIỆN ĐẠI CARD NAMES MAPPING
 * ============================================================================
 * 
 * Maps technical card names to Tiên Hiệp (Immortal/Martial Arts Fantasy) 
 * and Medieval/Modern themed Vietnamese names
 */
const vietnameseCardNames = {
    // ============================================
    // GOLEM CARDS (Point Cards) - Thạch Linh, Huyền Thạch
    // ============================================
    'golem_0022': 'Thạch Linh Sơ Cấp',
    'golem_0023': 'Huyền Thạch Lam',
    'golem_0032': 'Linh Thạch Hoàng Kim',
    'golem_0040': 'Thạch Linh Mộc Hành',
    'golem_0050': 'Huyền Thạch Thủy Tinh',
    'golem_0202': 'Thạch Linh Hải Lam',
    'golem_0203': 'Linh Thạch Ngọc Bích',
    'golem_0220': 'Huyền Thạch Mộc Linh',
    'golem_0222': 'Tam Sắc Thạch Linh',
    'golem_0230': 'Thạch Linh Băng Lam',
    'golem_0302': 'Huyền Thạch Thâm Lam',
    'golem_0320': 'Linh Thạch Hải Dương',
    'golem_0400': 'Thạch Linh Thủy Hành',
    'golem_0500': 'Huyền Thạch Huyền Lam',
    'golem_1012': 'Thạch Linh Hỏa Hành',
    'golem_1111': 'Tứ Tượng Thạch Linh',
    'golem_1113': 'Ngũ Hành Thạch Linh',
    'golem_1120': 'Tam Nguyên Thạch Linh',
    'golem_1131': 'Lục Hợp Thạch Linh',
    'golem_1201': 'Thạch Linh Hỏa Kim',
    'golem_1311': 'Thạch Linh Hỏa Mộc',
    'golem_2002': 'Thạch Linh Hỏa Mộc',
    'golem_2003': 'Huyền Thạch Hỏa Thủy',
    'golem_2020': 'Thạch Linh Hỏa Hải',
    'golem_2022': 'Linh Thạch Hỏa Mộc',
    'golem_2030': 'Thạch Linh Hỏa Lam',
    'golem_2200': 'Huyền Thạch Song Hỏa',
    'golem_2202': 'Thạch Linh Hỏa Kim',
    'golem_2220': 'Linh Thạch Song Mộc',
    'golem_2300': 'Thạch Linh Hỏa Thủy',
    'golem_3002': 'Huyền Thạch Hỏa Tối',
    'golem_3020': 'Thạch Linh Tam Hỏa',
    'golem_3111': 'Tứ Hỏa Thạch Linh',
    'golem_3200': 'Thạch Linh Hỏa Thủy',
    'golem_4000': 'Cực Hỏa Thạch Linh',
    
    // ============================================
    // MINT CARDS (Produce Cards) - Luyện Kim, Tạo Hóa
    // ============================================
    'mint_0002': 'Luyện Kim Thuật - Hoàng Kim',
    'mint_0003': 'Luyện Kim Thuật - Hoàng Kim Cấp 2',
    'mint_0004': 'Luyện Kim Thuật - Hoàng Kim Cấp 3',
    'mint_0011': 'Tạo Hóa Thuật - Mộc Kim',
    'mint_0012': 'Tạo Hóa Thuật - Mộc Kim Cấp 2',
    'mint_0020': 'Sinh Tạo Thuật - Mộc Hành',
    'mint_0100': 'Luyện Thủy Thuật - Thủy Tinh',
    'mint_0101': 'Tạo Hóa Thuật - Thủy Kim',
    'mint_1000': 'Luyện Hỏa Thuật - Hỏa Linh',
    
    // ============================================
    // UPGRADE CARDS - Tinh Luyện, Thăng Cấp
    // ============================================
    'upgrade_2': 'Tinh Luyện Thuật - Nhị Cấp',
    'upgrade_3': 'Tinh Luyện Thuật - Tam Cấp',
    
    // ============================================
    // TRADE CARDS - Dịch Vật, Giao Dịch, Hối Đoái
    // ============================================
    'trade_0002_0020': 'Dịch Vật Pháp - Kim Mộc',
    'trade_0002_0100': 'Dịch Vật Pháp - Kim Thủy',
    'trade_0003_0030': 'Giao Dịch Thuật - Kim Thủy',
    'trade_0003_0110': 'Hối Đoái Pháp - Kim Thủy Mộc',
    'trade_0003_1000': 'Dịch Vật Pháp - Kim Hỏa',
    'trade_0004_0200': 'Giao Dịch Thuật - Kim Mộc',
    'trade_0004_1100': 'Hối Đoái Pháp - Kim Hỏa Mộc',
    'trade_0005_0300': 'Dịch Vật Pháp - Kim Thủy',
    'trade_0005_2000': 'Giao Dịch Thuật - Kim Hỏa',
    'trade_0010_0003': 'Dịch Vật Pháp - Mộc Kim',
    'trade_0011_1000': 'Hối Đoái Pháp - Mộc Hỏa',
    'trade_0020_0103': 'Giao Dịch Thuật - Mộc Thủy',
    'trade_0020_0200': 'Dịch Vật Pháp - Song Mộc',
    'trade_0020_1002': 'Hối Đoái Pháp - Mộc Hỏa',
    'trade_0030_0202': 'Giao Dịch Thuật - Thủy Mộc',
    'trade_0030_0300': 'Dịch Vật Pháp - Tam Thủy',
    'trade_0030_1101': 'Hối Đoái Pháp - Thủy Hỏa Mộc',
    'trade_0030_2000': 'Giao Dịch Thuật - Thủy Hỏa',
    'trade_0100_0014': 'Dịch Vật Pháp - Thủy Kim',
    'trade_0100_0020': 'Hối Đoái Pháp - Thủy Mộc',
    'trade_0100_0021': 'Giao Dịch Thuật - Thủy Mộc',
    'trade_0200_0032': 'Dịch Vật Pháp - Song Thủy',
    'trade_0200_1012': 'Hối Đoái Pháp - Thủy Hỏa Mộc',
    'trade_0200_1020': 'Giao Dịch Thuật - Thủy Hỏa',
    'trade_0200_2000': 'Dịch Vật Pháp - Thủy Hỏa',
    'trade_0300_3000': 'Cực Thủy Hỏa Dịch Vật',
    'trade_1000_0022': 'Dịch Vật Pháp - Hỏa Mộc',
    'trade_1000_0030': 'Giao Dịch Thuật - Hỏa Thủy',
    'trade_1000_0103': 'Hối Đoái Pháp - Hỏa Thủy',
    'trade_1000_0111': 'Ngũ Hành Dịch Vật Pháp',
    'trade_1000_0200': 'Giao Dịch Thuật - Hỏa Mộc',
    'trade_1002_2000': 'Cực Hỏa Dịch Vật Pháp',
    'trade_2000_0230': 'Dịch Vật Pháp - Song Hỏa Thủy',
    'trade_2000_0311': 'Hối Đoái Pháp - Song Hỏa Thủy',
    
    // ============================================
    // COIN CARDS - Linh Thạch, Huyền Tệ
    // ============================================
    'coin_1': 'Linh Thạch Bạc',
    'coin_3': 'Huyền Tệ Đồng',
    
    // ============================================
    // STONE CARDS - Huyền Thạch, Linh Thạch
    // ============================================
    'stone_blue': 'Huyền Thạch Lam',
    'stone_pink': 'Linh Thạch Hồng',
    'stone_green': 'Huyền Thạch Mộc',
    'stone_yellow': 'Linh Thạch Hoàng',
    
    // ============================================
    // BACKGROUND CARDS - Pháp Trận, Linh Trận
    // ============================================
    'golem_bg': 'Thạch Linh Pháp Trận',
    'merchant_bg': 'Thương Gia Linh Trận',
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
    // All images are stored as: [cardName].JPG
    const imageName = actualCardName + '.JPG';
    // Use relative path (server serves from web/static root)
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
    
    return `<img src="${imagePath}" alt="${cardName}" class="${className}" loading="lazy" decoding="async" onerror="console.warn('Image not found:', '${imagePath}'); this.style.display='none'">`;
}

/**
 * Legacy function for backward compatibilitys
 * Now returns image instead of SVG
 * 
 * @param {string} cardName - Card name
 * @returns {string} - HTML string for the image element
 */
function getCharacterIllustration(cardName) {
    return getCardImage(cardName, 'character-image');
}

