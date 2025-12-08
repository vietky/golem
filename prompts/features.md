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