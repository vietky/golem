# bugs

## requirements
- fix all bugs listed, write tests where applicable
- run, test, verify the game works as expected according to game rules

## 2025-12-07 18:00:00
- match summary page doesn't show up after the game ends. Please implement the match summary page to display the final scores and statistics of the game.
    - show each player's collected point cards, crystals, coins, and total points
- I still cannot deposit when I have no yellow crystals on Frontend side. please fix the deposit logic accordingly.
- Holding or hovering over cards should show card details as tooltip. Please implement the tooltip functionality to display card details when players hover over or hold on any card in the game.
- Copper and silver points are in wrong position in Point Card. It should be at the index 0 and 1 respectively. Please fix the positioning of copper and silver points in the Point Card section.
- Please show deposited crystal types below the merchant card to indicate which crystals have been deposited for that merchant card so that others could see and collect accordingly.

## 2025-12-07 00:00:00
- please fix calculate point cards logic as copper  and silver coins seem to be included incorrectly
- deposit logic: as long as the player has enough resources to deposit, the deposit action should be allowed (no matter what kind of resources the player has). Please fix the deposit logic accordingly.
- end game summary: should show the number of each point cards collected by each player along with total points from point cards, number of coppers/silvers and the crystals on their hand. Please implement the end game summary accordingly.
- max crystal in caravan should be 10. Please enforce this rule in the frontend and backend. in that case, we need to revamp the UI so that it's convenient for players to pick crystals from caravan and play/discard/deposit crystals from their hand.

## 2025-12-06 19:00:00
- when error ("Not enough resources for this trade") occurs, the UI freezes and players cannot take any further actions. Please ensure that the UI remains responsive and allows players to continue playing after such errors.
- also please check the trade logic in TradeModal as when I click on the card that has enough resources, it still shows the error. Please ensure that the trade logic correctly validates resources and allows trades when sufficient resources are available.
- I couldn't see the card details when hovering over the cards (desktop) or long touch in mobile. Please implement a tooltip that displays card details when players hover over any card in the game.
- the copper and silver coins are not positioned correctly in Point Card Section. Copper is put on the first index card and silver on the second index card. Please review FE and backend code to ensure correct positioning and point calculation as Copper has 3 points and Silver has 1 point.
- Timer section should be small and positioned at the middle top of the screen, not taking too much space. Please adjust the timer UI to be more compact and centered at the top of the screen.
- Picking merchant cards with index > 0 doesn't display deposit action modal. Please ensure that when players pick merchant cards with index greater than 0, the deposit action modal is displayed correctly.


## 2025-12-06 19:00:00
- the UI doesn't load player resources properly when the game starts. Players are unable to see their initial resources, which affects gameplay. Please ensure that the frontend correctly fetches and displays player resources from the backend at the start of the game.
- clicking on the card in any sections doesn't trigger any actions. Please ensure the following buttons work as expected:
    - clicking on any cards for 2 seconds shows card details as tooltip
    - clicking on player card takes action play
    - clicking on point card takes action claim
    - clicking on rest button takes action rest
    - clicking on merchant card takes action acquire


## 2025-12-06 11:00:00
- init state of the game is not correct:
    - player order is not random
    - number of players is not correct
    - number of merchant cards is not correct
    - initial coins for each player is not correct
    Please check the backend code to ensure the game is initialized correctly and the frontend reflects the correct state.
- hovering on any cards should show card details as tooltip.


## 2025-12-06 03:00:00
- replace all fmt.Print* calls in the #codebase with proper logging using the zap logger with its dedicated package for DI
- hover on cards doesn't show card details as tooltip.
- the game menu still displays maxium 4 players allowed.
- initial crystal doesn't work

## 2025-12-06 02:00:00
- replace all fmt.Print* calls with proper logging using the zap logger with its dedicated package for DI
- these buttons are not working:
    - clicking on player card takes action play
    - clicking on point card takes action claim
    - clicking on rest button takes action rest
    - clicking on merchant card takes action acquire
    - after clicking, they should send the action to the server
    - please read the server code to see how actions are sent and implement the same in the frontend
    - add/update UI accordingly based on each action sent to server and response received
- please hide the card id. Instead, when player hovers over the card along with card details as tooltip, displayed card info in the following formats:
    - Card Id
    - Card Type
    - Crytal Cost (for point cards)
    - Point Value (for point cards)
    - Crystal Produced (for merchant cards)
    - Input Cost -> Output Gain (for trade cards)
    - Upgrade Level (2 or 3)
- the copper and silver coins are not positioned correctly. Copper is put on the first index card and silver on the second index card. Please review FE and backend code to ensure correct positioning and point calculation as Copper has 3 points and Silver has 1 point.

## 2025-12-06 01:48:00
- initially, there are maximum 5 players allowed, but the game should support up to 4 players. Please fix the player limit to allow up to 5 players.
- initially, there are 6 merchant cards, but only 5 are shown on the UI. The 6th merchant is not visible or accessible to the player.
- initially, 1st player has 3 yellow coins, 2nd and 3rd player have 3 yellow coins each, 4th and 5th player have 3 yellow coins and 1 green coin each.
- server should randomly set the order of players at the start of the game, but currently it always sets the same order. Make sure that the UI reflects the correct player order as determined by the server.
- the copper and silver coins are not positioned correctly on the UI, making it difficult for players to identify and use them effectively.
- I couldn't take any actions from the ui (play/acquire/claim/rest). Please check backend and frontend integration.
- The UI for upgrade actions is not functioning correctly and it's not centered. Players are unable to perform upgrade actions as intended.
- the timer doesn't work
- the rest button doesn't show on player section when it's that player's turn
- player section couldn't scroll horizontally when there are many players
- mobile layout is broken in all sections
- all sections should be aligned centered