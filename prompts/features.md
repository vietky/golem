# features

## 2025-12-08 21:00:00
- I'm deploying frontend to nginx server for better performance and scalability. The deployment process includes:
    - Setting up proper routing in nginx to handle client-side routing used by React.
    - Ensuring that all necessary headers and caching policies are in place for optimal performance.
    - Testing the deployment to ensure that the application is accessible and functions correctly through the nginx server.
    - I alread had nginx installed on the server and serving static assets on /static path. Please make sure that the build files are served correctly from the root path.
    - Please allow cors from the backend server to the frontend server as frontend needs to fetch data from backend on different domain (port).

- I'm enhancing the match summary feature to provide players with a comprehensive overview of their game performance at the end of each match. The enhancements include:
    - Displaying total points earned by each player.
    - Listing all point cards collected by each player.
    - Showing the number and types of crystals held by each player at the end of the game.
    - Including the amount of copper and silver coins each player has accumulated.
    - Presenting the final rankings of players based on their total points.
    - It seems like 

## 2025-12-25 11:30:00
let's revamp #collapsibleinfo to display chat messages and all user actions there:
- whenever a user make an action (like sending a message, make a move (rest/play/claim/acquire), join/leave game etc), log that action in the #collapsibleinfo panel with timestamp and user name.
- display chat messages in the same panel with timestamp and user name.
- make sure the panel is scrollable and shows the latest messages/actions at the bottom.
- implement a clear button to clear the log if it gets too long.
- ensure that the panel is visually distinct and easy to read, using different colors or styles for chat messages and game actions.
- test the feature to ensure that all actions and messages are logged correctly and displayed in real-time.
- remove existing chat box if this new implementation works well.


## backlogs
- I'm adding sound effects to enhance the gaming experience. The sound effects will be triggered by specific in-game actions:
    - Playing a card: A sound effect will play when a player plays any card from their hand.
    - Acquiring a merchant: A distinct sound will indicate when a player successfully acquires a merchant card.
    - Claiming a point card: A celebratory sound will play when a player claims a point card.
    - Resting: A calming sound will accompany the action of resting and retrieving played cards.
    - End of game: A special sound will mark the conclusion of the game and the announcement of the winner.
    - I'll ensure that the sound effects are not too intrusive and can be muted or adjusted in volume through game settings.
    - I'll test the sound effects to ensure they play correctly and enhance the overall gaming experience without causing distractions.
- if a user is disconnected, make a rest action for them after 5 seconds of inactivity.