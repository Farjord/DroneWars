// ========================================
// APP ROUTER
// ========================================
// Routes between different application screens based on app state
// Eliminates monolithic App.jsx by separating menu from game concerns

import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState.js';
import gameStateManager from './state/GameStateManager.js';
import gameFlowManager from './state/GameFlowManager.js';
import aiPhaseProcessor from './state/AIPhaseProcessor.js';
import MenuScreen from './screens/MenuScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import DroneSelectionScreen from './components/screens/DroneSelectionScreen.jsx';
import DeckSelectionScreen from './components/screens/DeckSelectionScreen.jsx';
import ShipPlacementScreen from './components/screens/ShipPlacementScreen.jsx';
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

  // Initialization guard to prevent multiple GameFlowManager initializations
  const gameFlowInitialized = useRef(false);

  useEffect(() => {
    // Brief loading to ensure GameStateManager is fully initialized
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Note: SimultaneousActionManager functionality moved to ActionProcessor
  // Note: AIPhaseProcessor is initialized in LobbyScreen when player starts single-player game

  // Initialize GameFlowManager with all managers (ONLY for host/local, NOT for guest)
  useEffect(() => {
    // Guest mode skips all manager initialization - guest is a thin client
    if (gameState.gameMode === 'guest') {
      console.log('🔄 Guest mode detected - skipping manager initialization');
      return;
    }

    if (!gameFlowInitialized.current) {
      gameFlowManager.initialize(
        gameStateManager,
        gameStateManager.actionProcessor, // Use ActionProcessor instance from GameStateManager
        () => gameState.gameMode !== 'local',
        aiPhaseProcessor // Add AIPhaseProcessor
      );

      // Set up reverse reference for automatic phase validation
      gameStateManager.setGameFlowManager(gameFlowManager);

      gameFlowInitialized.current = true;
      console.log('🔄 GameFlowManager initialized in AppRouter (host/local mode)');
    } else {
      console.log('🔄 GameFlowManager already initialized, skipping...');
    }
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
        <div>Loading EREMOS...</div>
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

        case 'placement':
          return <ShipPlacementScreen />;

        case 'gameInitializing':
          return <App />; // Mount early for event subscriptions

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