
I want to move the games architecture to a full server-based system.
Players connect via App.jsx as their interface into the game. This is ‘local’ to them (plus all ‘front end’ components can also be local if needed, the various modals etc.)
GameStateManager.js is then a single instance, used by both players. The same can be true of any other required logic engines, as well as the various managers, such as actionManager and phaseManager.
I also want the AI to be routed through this same process. This keeps the development simple and allows me to test the multiplayer architecture in a single player manner. 
Details:
App.jsx – This must control all gameplay flows for the player, but must never calculate anything or update anything. It must always be contextual to the player as well. So for ‘Player 1’, they see their drones / cards / lanes at the bottom of the screen, and the same is true for player 2. App.jsx must be able to perform ‘local’ in memory game state changes, but these must be updated by another processor. 
state/GameStateManager.js – this must be the source of truth for the game board state – including but not limited to which ship sections are placed where, what drones are in what lanes, what cards are in players decks, what cards are in their hands, how much hull is left on drones etc. It must accurately represent the game state at all times. 
state/ActionProcessor.js is responsible for performing round based Actions. These include, but are not limited to, playing cards, deploying drones, moving drones, activating drones, activating ship abilities. The purpose of this process is to make sure that only one action can be played at a time, once the action is complete confirm the update that needs to be performed, and update GameStateManager.js with the outcome of the action. 
state/PhaseManager.js is to be responsible for performing non-round based changes. These include, but are not limited to, selecting initial drones, selecting a deck, allocating shields (both pre game and at the start of the round) and the draw phase at the start of the round. These phases are all simultaneous, and must only be progressed past when both players have completed their actions. It will be used during the action phase to control when the action phase has ended, but actions within the action phase must go via ActionProcessor.js
logic/gameLogic.js is responsible for calculating the outcome of performing any action. This outcome will be passed to ActionProcessor.js, which in turn will update GameStateManager.js.
logic/aiLogic.js is responsible for calculating which actions the AI will perform. Once it has chosen an action it will then be passed to ActionProcessor.js, which will then confer with gameLogic.js to see the outcome and then ActionProcessor.js will in turn update GameStateManager.js.
AIPhaseProcessor.js will be responsible for progressing the AI through game phases, which are part of state/PhaseManager.js. This is the equivalent of aiLogic.js during the action phase. 
Example Game Flow, vs AI. 
Player starts the game. 
DRONE SELECTION PHASE
PhaseManager.js understands that all players are in the Drone Selection phase, and awaits confirmation that both players have selected their drones. 
App.jsx presents the player with drones, and they chose their drones. This is stored locally in App.jsx. 
The player presses ‘Continue’. PhaseManager.js retrieves and validates the selection, and then stores it in GameStateManager.js.
At the same time, AIPhaseProcessor.js confirms the Ais selection of drones and informs PhaseManager.js. PhaseManager.js now knows the Ais selection, and marks that they have completed the phase. GameStateManager.js can be updated. 

PhaseManager.js must only update the data it has at any given time. So if it knows the Ais drones, it must only update the AI drones portion of GameStateManager.js. It must never update sections that haven’t changed (for example, the AI has selected, but the player hasn’t. It must only update what it knows about the AI, and vice versa). 

Now, both players have acknowledged that they have progressed through the Drone phase. PhaseManager.js knows that both players have passed, so the next phase can be confirmed – deck selection. 
DECK SELECTION PHASE
App.jsx presents the player with the deck selection screen, and they chose and/or configure their deck. This is stored locally in App.jsx. 
The player presses ‘Confirm’ on their chosen deck. PhaseManager.js retrieves and validates the selection, and then stores it in GameStateManager.js.
At the same time, AIPhaseProcessor.js confirms the Ais deck selection and informs PhaseManager.js. PhaseManager.js now knows the Ais selection, and marks that they have completed the phase. GameStateManager.js can be updated. 

After this we will review and discuss the next phase, which will be checking how the actual game is to be structured using this model. 

Please review, and think about whether this approach is sensible, and what needs to be done to achieve it. 

