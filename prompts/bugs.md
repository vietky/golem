# bugs

## requirements
- fix all bugs listed, write tests where applicable
- run, test, verify the game works as expected according to game rules

## 2025-06-12 03:00:00
- replace all fmt.Print* calls in the #codebase with proper logging using the zap logger with its dedicated package for DI
- hover on cards doesn't show card details as tooltip.
- the game menu still displays maxium 4 players allowed.
- initial crystal doesn't work

## 2025-06-12 02:00:00
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

## 2025-06-12 01:48:00
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