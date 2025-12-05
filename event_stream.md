# Event Stream

## Overview
I want to stream player actions to mongodb. By using those event streams, I can replay user actions to debug issues or analyze user behavior.
I'd like to know exactly what game state the user was in when they performed an action, so I can reproduce bugs or understand their decisions better.

## Requirements
- Use mongodb as event store
- We have initial game state stored in mongodb
- Event stream should be stored as a sequence of events that can be replayed to reconstruct the game state
- At the moment, we should store game state for each action taken by the player in event stream for debugging purpose
- Reference type #Action for event structure
- The latest game state should be stored in a separate collection for quick access
- Implement a simple html to simulate player actions and view game state after each action using reactjs and tailwindcss
  - input is the game id
  - display the list of actions taken by the player
  - display the game state after each action
  - allow user to add new actions and see the updated game state in real-time
- Implement an integration test to simulate the game play and verify the event stream and game state are stored correctly in mongodb

## Coding Conventions
Every class should have its own interface and follow SOLID principles
Every handler passes its own request and response object:
  - define every handler/global function in a format func_name(<func_name_obj_request) <func_name_obj_response>
- never hard coded values in any files (ansible/nginx/...)
- use environment variables from .env or set default values whenever possible
- use idempotent operations in ansible/playbooks whenever possible
- create Make commands that allows users to specify .env file to run
- use Docker-compose for quick local development & deployment
- use a logging framework and wrap it around for format modification if needed

## Must have before delivering code
- Please follow Coding Conventions mentioned above.
- Run, test and verify it yourself