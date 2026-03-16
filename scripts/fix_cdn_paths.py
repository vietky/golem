#!/usr/bin/env python3
"""Replace /assets/images/ and /assets/sounds/ with CDN URLs in component files."""
import os

os.chdir('/Users/avietidol/codes/golem/web/react-frontend/src')

CDN_IMAGES = 'https://statics.vietky.io.vn/images'
CDN_SOUNDS = 'https://statics.vietky.io.vn/sounds'

files = [
    'components/CardRenderer.jsx',
    'components/CardRenderingExample.jsx',
    'components/DepositModal.jsx',
    'components/DiscardModal.jsx',
    'components/FantasyMarketArea.jsx',
    'components/GameOverModal.jsx',
    'components/OpponentArea.jsx',
    'components/ResourcePanel.jsx',
    'components/SimpleMarketArea.jsx',
    'components/SinglePlayerLobby.jsx',
    'components/UpgradeModal.jsx',
    'components/desktop/FantasyGameLayout.jsx',
    'components/desktop/WebGameLayout.jsx',
    'components/mobile/CompactGameBoard.jsx',
    'utils/cardNames.test.js',
]

for f in files:
    with open(f, 'r') as fp:
        content = fp.read()
    original = content
    content = content.replace('/assets/images/', CDN_IMAGES + '/')
    content = content.replace('/assets/sounds/', CDN_SOUNDS + '/')
    if content != original:
        with open(f, 'w') as fp:
            fp.write(content)
        print('Updated: ' + f)
    else:
        print('No changes: ' + f)
