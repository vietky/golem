// Character SVG illustrations for point cards
const CharacterIllustrations = {
    // Small Golem - Rock creature
    'Small Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="rockGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8B7355;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#6B5B47;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4A3E32;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="60" rx="25" ry="30" fill="url(#rockGrad1)" />
            <!-- Head -->
            <circle cx="50" cy="30" r="18" fill="url(#rockGrad1)" />
            <!-- Eyes -->
            <circle cx="45" cy="28" r="3" fill="#FFD700" />
            <circle cx="55" cy="28" r="3" fill="#FFD700" />
            <!-- Arms -->
            <ellipse cx="30" cy="55" rx="8" ry="15" fill="url(#rockGrad1)" />
            <ellipse cx="70" cy="55" rx="8" ry="15" fill="url(#rockGrad1)" />
            <!-- Legs -->
            <ellipse cx="42" cy="85" rx="8" ry="12" fill="url(#rockGrad1)" />
            <ellipse cx="58" cy="85" rx="8" ry="12" fill="url(#rockGrad1)" />
            <!-- Cracks/Details -->
            <path d="M 45 35 Q 50 40 55 35" stroke="#4A3E32" stroke-width="1" fill="none" />
            <path d="M 40 50 Q 50 55 60 50" stroke="#4A3E32" stroke-width="1" fill="none" />
        </svg>
    `,
    
    // Medium Golem - Larger rock creature
    'Medium Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="rockGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#9B8B75;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#7B6B57;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#5A4E42;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="55" rx="28" ry="35" fill="url(#rockGrad2)" />
            <!-- Head -->
            <circle cx="50" cy="25" r="20" fill="url(#rockGrad2)" />
            <!-- Eyes -->
            <circle cx="44" cy="23" r="4" fill="#FFD700" />
            <circle cx="56" cy="23" r="4" fill="#FFD700" />
            <!-- Glowing eyes -->
            <circle cx="44" cy="23" r="2" fill="#FFF" opacity="0.8" />
            <circle cx="56" cy="23" r="2" fill="#FFF" opacity="0.8" />
            <!-- Arms -->
            <ellipse cx="25" cy="50" rx="10" ry="18" fill="url(#rockGrad2)" />
            <ellipse cx="75" cy="50" rx="10" ry="18" fill="url(#rockGrad2)" />
            <!-- Legs -->
            <ellipse cx="40" cy="88" rx="10" ry="14" fill="url(#rockGrad2)" />
            <ellipse cx="60" cy="88" rx="10" ry="14" fill="url(#rockGrad2)" />
            <!-- Crystals on body -->
            <polygon points="50,45 52,50 50,55 48,50" fill="#FFD700" opacity="0.6" />
            <polygon points="35,60 37,65 35,70 33,65" fill="#20C997" opacity="0.6" />
        </svg>
    `,
    
    // Large Golem - Massive creature
    'Large Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="rockGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#AB9B85;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#8B7B67;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#6A5E52;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="50" rx="32" ry="40" fill="url(#rockGrad3)" />
            <!-- Head -->
            <circle cx="50" cy="20" r="22" fill="url(#rockGrad3)" />
            <!-- Eyes -->
            <circle cx="43" cy="18" r="5" fill="#FFD700" />
            <circle cx="57" cy="18" r="5" fill="#FFD700" />
            <circle cx="43" cy="18" r="2.5" fill="#FFF" opacity="0.9" />
            <circle cx="57" cy="18" r="2.5" fill="#FFF" opacity="0.9" />
            <!-- Arms -->
            <ellipse cx="20" cy="45" rx="12" ry="22" fill="url(#rockGrad3)" />
            <ellipse cx="80" cy="45" rx="12" ry="22" fill="url(#rockGrad3)" />
            <!-- Legs -->
            <ellipse cx="38" cy="92" rx="12" ry="16" fill="url(#rockGrad3)" />
            <ellipse cx="62" cy="92" rx="12" ry="16" fill="url(#rockGrad3)" />
            <!-- Multiple crystals -->
            <polygon points="50,40 53,46 50,52 47,46" fill="#FFD700" opacity="0.7" />
            <polygon points="30,55 33,61 30,67 27,61" fill="#20C997" opacity="0.7" />
            <polygon points="70,55 73,61 70,67 67,61" fill="#17A2B8" opacity="0.7" />
        </svg>
    `,
    
    // Grand Golem - Epic creature
    'Grand Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="rockGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#BBAB95;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#9B8B77;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#7A6E62;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="glow">
                    <stop offset="0%" style="stop-color:#FFD700;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="48" rx="35" ry="42" fill="url(#rockGrad4)" />
            <!-- Head -->
            <circle cx="50" cy="18" r="24" fill="url(#rockGrad4)" />
            <!-- Crown/Crystals on head -->
            <polygon points="50,5 55,12 50,15 45,12" fill="#FFD700" />
            <polygon points="42,8 45,12 42,14 39,12" fill="#FFD700" />
            <polygon points="58,8 61,12 58,14 55,12" fill="#FFD700" />
            <!-- Eyes -->
            <circle cx="42" cy="16" r="6" fill="#FFD700" />
            <circle cx="58" cy="16" r="6" fill="#FFD700" />
            <circle cx="42" cy="16" r="3" fill="#FFF" />
            <circle cx="58" cy="16" r="3" fill="#FFF" />
            <!-- Glow effect -->
            <ellipse cx="50" cy="16" rx="20" ry="8" fill="url(#glow)" opacity="0.5" />
            <!-- Arms -->
            <ellipse cx="18" cy="42" rx="14" ry="25" fill="url(#rockGrad4)" />
            <ellipse cx="82" cy="42" rx="14" ry="25" fill="url(#rockGrad3)" />
            <!-- Legs -->
            <ellipse cx="36" cy="95" rx="14" ry="18" fill="url(#rockGrad4)" />
            <ellipse cx="64" cy="95" rx="14" ry="18" fill="url(#rockGrad4)" />
            <!-- Many crystals -->
            <polygon points="50,35 54,42 50,49 46,42" fill="#FFD700" opacity="0.8" />
            <polygon points="28,50 31,56 28,62 25,56" fill="#20C997" opacity="0.8" />
            <polygon points="72,50 75,56 72,62 69,56" fill="#17A2B8" opacity="0.8" />
            <polygon points="40,65 42,70 40,75 38,70" fill="#E91E63" opacity="0.8" />
            <polygon points="60,65 62,70 60,75 58,70" fill="#FFD700" opacity="0.8" />
        </svg>
    `,
    
    // Crystal Collector - Humanoid with crystals
    'Crystal Collector': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="collectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#B8941E;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body/Robe -->
            <ellipse cx="50" cy="60" rx="20" ry="30" fill="#8B7355" />
            <!-- Head -->
            <circle cx="50" cy="25" r="12" fill="#DEB887" />
            <!-- Hat with crystal -->
            <path d="M 40 20 Q 50 10 60 20 L 55 25 L 45 25 Z" fill="#4A3E32" />
            <circle cx="50" cy="15" r="4" fill="#FFD700" />
            <!-- Arms holding crystals -->
            <ellipse cx="30" cy="55" rx="6" ry="20" fill="#DEB887" />
            <ellipse cx="70" cy="55" rx="6" ry="20" fill="#DEB887" />
            <!-- Crystals in hands -->
            <polygon points="25,50 28,55 25,60 22,55" fill="#FFD700" />
            <polygon points="75,50 78,55 75,60 72,55" fill="#20C997" />
            <!-- Bag with crystals -->
            <ellipse cx="50" cy="75" rx="15" ry="12" fill="#6B5B47" />
            <polygon points="45,70 48,75 45,80 42,75" fill="#17A2B8" opacity="0.7" />
            <polygon points="55,70 58,75 55,80 52,75" fill="#E91E63" opacity="0.7" />
        </svg>
    `,
    
    // Green Master - Green golem
    'Green Master': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#28A745;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1E7E34;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="58" rx="26" ry="32" fill="url(#greenGrad)" />
            <!-- Head -->
            <circle cx="50" cy="26" r="19" fill="url(#greenGrad)" />
            <!-- Eyes -->
            <circle cx="44" cy="24" r="4" fill="#90EE90" />
            <circle cx="56" cy="24" r="4" fill="#90EE90" />
            <!-- Arms -->
            <ellipse cx="26" cy="53" rx="9" ry="19" fill="url(#greenGrad)" />
            <ellipse cx="74" cy="53" rx="9" ry="19" fill="url(#greenGrad)" />
            <!-- Legs -->
            <ellipse cx="40" cy="88" rx="9" ry="13" fill="url(#greenGrad)" />
            <ellipse cx="60" cy="88" rx="9" ry="13" fill="url(#greenGrad)" />
            <!-- Green crystals -->
            <polygon points="50,45 53,51 50,57 47,51" fill="#90EE90" opacity="0.8" />
            <polygon points="32,60 35,66 32,72 29,66" fill="#90EE90" opacity="0.8" />
        </svg>
    `,
    
    // Blue Master - Blue golem
    'Blue Master': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#17A2B8;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0C5460;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="56" rx="27" ry="33" fill="url(#blueGrad)" />
            <!-- Head -->
            <circle cx="50" cy="24" r="20" fill="url(#blueGrad)" />
            <!-- Eyes -->
            <circle cx="43" cy="22" r="5" fill="#87CEEB" />
            <circle cx="57" cy="22" r="5" fill="#87CEEB" />
            <circle cx="43" cy="22" r="2.5" fill="#FFF" />
            <circle cx="57" cy="22" r="2.5" fill="#FFF" />
            <!-- Arms -->
            <ellipse cx="24" cy="51" rx="10" ry="20" fill="url(#blueGrad)" />
            <ellipse cx="76" cy="51" rx="10" ry="20" fill="url(#blueGrad)" />
            <!-- Legs -->
            <ellipse cx="39" cy="87" rx="10" ry="14" fill="url(#blueGrad)" />
            <ellipse cx="61" cy="87" rx="10" ry="14" fill="url(#blueGrad)" />
            <!-- Blue crystals -->
            <polygon points="50,43 54,50 50,57 46,50" fill="#87CEEB" opacity="0.8" />
            <polygon points="28,58 31,64 28,70 25,64" fill="#87CEEB" opacity="0.8" />
            <polygon points="72,58 75,64 72,70 69,64" fill="#87CEEB" opacity="0.8" />
        </svg>
    `,
    
    // Pink Master - Pink/Magenta golem
    'Pink Master': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#E91E63;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#C2185B;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Body -->
            <ellipse cx="50" cy="55" rx="28" ry="34" fill="url(#pinkGrad)" />
            <!-- Head -->
            <circle cx="50" cy="23" r="21" fill="url(#pinkGrad)" />
            <!-- Eyes -->
            <circle cx="42" cy="21" r="5" fill="#FFB6C1" />
            <circle cx="58" cy="21" r="5" fill="#FFB6C1" />
            <circle cx="42" cy="21" r="2.5" fill="#FFF" />
            <circle cx="58" cy="21" r="2.5" fill="#FFF" />
            <!-- Arms -->
            <ellipse cx="23" cy="50" rx="11" ry="21" fill="url(#pinkGrad)" />
            <ellipse cx="77" cy="50" rx="11" ry="21" fill="url(#pinkGrad)" />
            <!-- Legs -->
            <ellipse cx="38" cy="86" rx="11" ry="15" fill="url(#pinkGrad)" />
            <ellipse cx="62" cy="86" rx="11" ry="15" fill="url(#pinkGrad)" />
            <!-- Pink crystals -->
            <polygon points="50,42 54,49 50,56 46,49" fill="#FFB6C1" opacity="0.8" />
            <polygon points="27,57 30,63 27,69 24,63" fill="#FFB6C1" opacity="0.8" />
            <polygon points="73,57 76,63 73,69 70,63" fill="#FFB6C1" opacity="0.8" />
        </svg>
    `,
    
    // Balanced Golem - Multi-colored
    'Balanced Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <!-- Body -->
            <ellipse cx="50" cy="58" rx="25" ry="30" fill="#8B7355" />
            <!-- Head -->
            <circle cx="50" cy="28" r="18" fill="#8B7355" />
            <!-- Eyes -->
            <circle cx="45" cy="26" r="3" fill="#FFD700" />
            <circle cx="55" cy="26" r="3" fill="#FFD700" />
            <!-- Arms with different colors -->
            <ellipse cx="28" cy="55" rx="8" ry="16" fill="#28A745" />
            <ellipse cx="72" cy="55" rx="8" ry="16" fill="#17A2B8" />
            <!-- Legs -->
            <ellipse cx="40" cy="86" rx="8" ry="12" fill="#E91E63" />
            <ellipse cx="60" cy="86" rx="8" ry="12" fill="#FFC107" />
            <!-- Mixed crystals -->
            <polygon points="50,45 52,50 50,55 48,50" fill="#FFD700" />
            <polygon points="35,60 37,65 35,70 33,65" fill="#20C997" />
            <polygon points="65,60 67,65 65,70 63,65" fill="#17A2B8" />
        </svg>
    `,
    
    // Perfect Golem - Ultimate creature
    'Perfect Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="perfectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#FF8C00;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="perfectGlow">
                    <stop offset="0%" style="stop-color:#FFD700;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Glow aura -->
            <ellipse cx="50" cy="50" rx="40" ry="45" fill="url(#perfectGlow)" opacity="0.4" />
            <!-- Body -->
            <ellipse cx="50" cy="50" rx="30" ry="38" fill="url(#perfectGrad)" />
            <!-- Head -->
            <circle cx="50" cy="20" r="22" fill="url(#perfectGrad)" />
            <!-- Crown -->
            <polygon points="50,5 58,15 50,18 42,15" fill="#FFD700" />
            <polygon points="40,10 45,15 40,17 35,15" fill="#FFD700" />
            <polygon points="60,10 65,15 60,17 55,15" fill="#FFD700" />
            <!-- Eyes -->
            <circle cx="42" cy="18" r="6" fill="#FFF" />
            <circle cx="58" cy="18" r="6" fill="#FFF" />
            <circle cx="42" cy="18" r="3" fill="#000" />
            <circle cx="58" cy="18" r="3" fill="#000" />
            <!-- Arms -->
            <ellipse cx="22" cy="47" rx="12" ry="23" fill="url(#perfectGrad)" />
            <ellipse cx="78" cy="47" rx="12" ry="23" fill="url(#perfectGrad)" />
            <!-- Legs -->
            <ellipse cx="36" cy="90" rx="12" ry="16" fill="url(#perfectGrad)" />
            <ellipse cx="64" cy="90" rx="12" ry="16" fill="url(#perfectGrad)" />
            <!-- All crystal colors -->
            <polygon points="50,38 55,45 50,52 45,45" fill="#FFD700" />
            <polygon points="28,53 32,59 28,65 24,59" fill="#28A745" />
            <polygon points="72,53 76,59 72,65 68,59" fill="#17A2B8" />
            <polygon points="40,68 43,73 40,78 37,73" fill="#E91E63" />
            <polygon points="60,68 63,73 60,78 57,73" fill="#FFC107" />
        </svg>
    `,
    
    // Simple Golem - Basic rock
    'Simple Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="simpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#A0A0A0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#707070;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Simple body -->
            <ellipse cx="50" cy="60" rx="22" ry="28" fill="url(#simpleGrad)" />
            <!-- Head -->
            <circle cx="50" cy="32" r="16" fill="url(#simpleGrad)" />
            <!-- Simple eyes -->
            <circle cx="46" cy="30" r="2" fill="#333" />
            <circle cx="54" cy="30" r="2" fill="#333" />
            <!-- Simple arms -->
            <ellipse cx="32" cy="58" rx="6" ry="14" fill="url(#simpleGrad)" />
            <ellipse cx="68" cy="58" rx="6" ry="14" fill="url(#simpleGrad)" />
            <!-- Simple legs -->
            <ellipse cx="42" cy="85" rx="6" ry="10" fill="url(#simpleGrad)" />
            <ellipse cx="58" cy="85" rx="6" ry="10" fill="url(#simpleGrad)" />
        </svg>
    `,
    
    // Elite Golem - Dark powerful creature
    'Elite Golem': `
        <svg viewBox="0 0 100 100" class="character-svg">
            <defs>
                <linearGradient id="eliteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2C3E50;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#1A252F;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0F1419;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="eliteGlow">
                    <stop offset="0%" style="stop-color:#E91E63;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#E91E63;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Dark aura -->
            <ellipse cx="50" cy="50" rx="38" ry="42" fill="url(#eliteGlow)" opacity="0.3" />
            <!-- Body -->
            <ellipse cx="50" cy="52" rx="32" ry="38" fill="url(#eliteGrad)" />
            <!-- Head -->
            <circle cx="50" cy="22" r="23" fill="url(#eliteGrad)" />
            <!-- Glowing eyes -->
            <circle cx="41" cy="20" r="6" fill="#E91E63" />
            <circle cx="59" cy="20" r="6" fill="#E91E63" />
            <circle cx="41" cy="20" r="3" fill="#FFF" />
            <circle cx="59" cy="20" r="3" fill="#FFF" />
            <!-- Spikes on head -->
            <polygon points="50,5 53,12 50,10 47,12" fill="#1A252F" />
            <polygon points="38,8 40,12 38,10 36,12" fill="#1A252F" />
            <polygon points="62,8 64,12 62,10 60,12" fill="#1A252F" />
            <!-- Arms -->
            <ellipse cx="20" cy="48" rx="13" ry="24" fill="url(#eliteGrad)" />
            <ellipse cx="80" cy="48" rx="13" ry="24" fill="url(#eliteGrad)" />
            <!-- Legs -->
            <ellipse cx="36" cy="92" rx="13" ry="17" fill="url(#eliteGrad)" />
            <ellipse cx="64" cy="92" rx="13" ry="17" fill="url(#eliteGrad)" />
            <!-- Dark crystals -->
            <polygon points="50,40 55,48 50,56 45,48" fill="#E91E63" opacity="0.9" />
            <polygon points="26,55 30,62 26,69 22,62" fill="#E91E63" opacity="0.9" />
            <polygon points="74,55 78,62 74,69 70,62" fill="#E91E63" opacity="0.9" />
        </svg>
    `
};

// Get character illustration for a card name
function getCharacterIllustration(cardName) {
    return CharacterIllustrations[cardName] || CharacterIllustrations['Simple Golem'];
}

