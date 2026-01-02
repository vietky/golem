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
- firebase authentication for user login/signup.
    - update user profile with avatar and display name.
    - use postgresql to store user profile data.
    - remove mongodb codes and replace with postgresql.
    - relational schema for users, user_games, games with initial migration scripts.

- revamp the lobby UI to show list of available games with join button, clicking on it will take user to the waiting room of that game.
    - show game host, number of players, game status (waiting/playing), game mode (2-5 players), created at timestamp.
    - implement create new game form with options for game mode (2-5 players), game name, max time per turn.
    - implement search and filter functionality for the game list.
    - allow users to choose AI or human opponents when creating a new game.
    - auto refresh the game list every 10 seconds to show the latest available games.
    - ensure responsive design for both desktop and mobile devices.
    - test the lobby UI to ensure smooth user experience and functionality.
    - when a user is disconnected, make a rest action for them after 5 seconds of inactivity.

    - when the host start the game, shuffle the players randomly.
    - people joining the room could choose to be a spectator.
    - show list of spectators in the waiting room.
    - allow spectators to chat but not make any game actions.
    - if the host leaves the room, assign a new host from the remaining players (if any).

- cleanup the room:
    - if all players leave the room.
    - if the game lasts more than 1 hour.
    - if the host leaves the room and there are no other players (only spectators), close the room.
    - notify all players/spectators in the room before cleanup with a countdown timer


- in react-frontend, please setup sounds for the following events:
    - playing a card - play_card.mp3
    - acquiring a merchant - acquire_merchant.mp3
    - claiming a point card - claim_point_card.mp3
    - resting - rest.mp3
    - end of game - game_over.mp3
    - my turn - my_turn.mp3
    - notify when someone reachs 4 golems - nearly_end.mp3
    - allow users to mute/unmute sounds from settings.
    - ensure sounds are not overlapping and play smoothly.
    - script to create symlink to static/assets folders.
- fix round numbers
- implement game routing so that users can join a game directly via the link.
    - ensure only valid game ids can be accessed.
    - send to telegram chat when a new game is created with game id and host name.
    - add a telegram room config (could be override) to .env.local file.