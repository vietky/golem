# game play ui

## Overview
- Please simplify the current game play UI to make it more user-friendly and visually appealing.
- Display only essential information during gameplay, such as crytals, collected, score, turn and time remaining.
- Remove any unnecessary elements that may clutter the screen (large images, excessive text, etc.).
- Use a clean and modern design with a consistent color scheme and typography.
- Ensure that the UI is responsive and works well on different screen sizes and devices.
- Display other playerrs' scores and ranks in a minimalistic sidebar or overlay that is transparent and does not obstruct the main gameplay area.
- Include intuitive icons and tooltips for any interactive elements to enhance user experience.
- Provide a toggle option to switch between a simplified view and a more detailed view for advanced users

## Requirements
- Use a grid layout to organize information clearly.
- Implement a progress bar for time remaining.
- Use icons to represent crystals and other key elements.
- Ensure that the UI elements are easily accessible and do not interfere with gameplay.
- Test the UI on various devices to ensure compatibility and responsiveness.
- Avoid animations that may distract players during gameplay and web performance.

## Display

### Cards
- display the card image as background and card id at the bottom right corner (detail info can be viewed on hover).
- upgrade card is shown as an up icon at the middle of the card with its level shown below the icon.
- crystal count is inside a small circle at the top left corner of the card.
- make sure that the count is clearly visible against the card background and inside crystal icon.

### Board Layout
- the board should be more compact, centered, consistent spacing and optimized to show more cards on the screen.
- it splits into 3 sections:
    - players info
        - show players in horizontal list at the top of the screen with their number of cards and crystal count.
        - current player is highlighted with a rest button around their info.
    - game board:
        - current turn and playing player
        - time remaining with progress bar
        - current merchant/action cards
        - point cards
    - player cards:
        - player hand should always be shown at the bottom of the screen on grid layout (max 5 cards per row), display crystal count on each card with card image as background and its id at the bottom right corner.
    - action logs and room id are in collapsible icon on the bottom right of the screen.
- make sure that layout is responsive and adapts well to different screen sizes and orientations. UX is prioritized for both desktop and mobile devices.