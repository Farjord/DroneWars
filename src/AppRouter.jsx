// ========================================
// APP ROUTER
// ========================================
// Routes between different application screens based on app state
// Eliminates monolithic App.jsx by separating menu from game concerns

import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState.js';
import gameStateManager from './state/GameStateManager.js';
import simultaneousActionManager from './state/SimultaneousActionManager.js';
import gameFlowManager from './state/GameFlowManager.js';
import aiPhaseProcessor from './state/AIPhaseProcessor.js';
import fullDroneCollection from './data/droneData.js';
import aiPersonalities from './data/aiData.js';
import MenuScreen from './screens/MenuScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import DroneSelectionScreen from './components/screens/DroneSelectionScreen.jsx';
import DeckSelectionScreen from './components/screens/DeckSelectionScreen.jsx';
import ShipPlacementScreen from './components/screens/ShipPlacementScreen.jsx';
import DeckBuilder from './DeckBuilder.jsx';
import App from './App.jsx';

/**
 * AppRouter - Routes between different screens based on application state
 * - menu: Game mode selection screen
 * - lobby: AI selection and multiplayer setup
 * - inGame: Active gameplay (App.jsx)
 */
function AppRouter() {
  const { gameState } = useGameState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Brief loading to ensure GameStateManager is fully initialized
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Initialize SimultaneousActionManager for pre-game phases
  useEffect(() => {
    simultaneousActionManager.initialize(
      gameStateManager,
      aiPhaseProcessor,
      () => gameState.gameMode !== 'local'
    );

    // Inject SimultaneousActionManager into ActionProcessor for shield allocation routing
    gameStateManager.actionProcessor.setSimultaneousActionManager(simultaneousActionManager);

    console.log('🔧 SimultaneousActionManager initialized in AppRouter');
  }, [gameState.gameMode]);

  // Initialize AIPhaseProcessor with game data
  useEffect(() => {
    aiPhaseProcessor.initialize(
      aiPersonalities,
      fullDroneCollection,
      gameState.selectedAIPersonality || aiPersonalities[0]
    );
    console.log('🤖 AIPhaseProcessor initialized in AppRouter');
  }, [gameState.selectedAIPersonality]);

  // Initialize GameFlowManager with all managers
  useEffect(() => {
    gameFlowManager.initialize(
      gameStateManager,
      simultaneousActionManager,
      gameStateManager.actionProcessor, // Use ActionProcessor instance from GameStateManager
      () => gameState.gameMode !== 'local',
      aiPhaseProcessor // Add AIPhaseProcessor for SequentialPhaseManager
    );

    // Set up reverse reference for automatic phase validation
    gameStateManager.setGameFlowManager(gameFlowManager);

    console.log('🔄 GameFlowManager initialized in AppRouter');
  }, [gameState.gameMode]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div>Loading Drone Wars...</div>
      </div>
    );
  }

  // Route based on application state and game phase
  switch (gameState.appState) {
    case 'menu':
      return <MenuScreen />;

    case 'lobby':
      return <LobbyScreen />;

    case 'inGame':
      // Route based on game phase when in game
      switch (gameState.turnPhase) {
        case 'droneSelection':
          return <DroneSelectionScreen />;

        case 'deckSelection':
          return <DeckSelectionScreen />;

        case 'deckBuilding':
          return <DeckBuilder />;

        case 'placement':
          return <ShipPlacementScreen />;

        // All other phases (action, deployment, etc.) use the main game board
        default:
          return <App />;
      }

    default:
      console.warn('Unknown app state:', gameState.appState, 'defaulting to menu');
      return <MenuScreen />;
  }
}

export default AppRouter;