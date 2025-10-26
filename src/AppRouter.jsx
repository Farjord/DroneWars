// ========================================
// APP ROUTER
// ========================================
// Routes between different application screens based on app state
// Eliminates monolithic App.jsx by separating menu from game concerns

import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState.js';
import gameStateManager from './state/GameStateManager.js';
import GameFlowManager from './state/GameFlowManager.js';
import PhaseAnimationQueue from './state/PhaseAnimationQueue.js';
import aiPhaseProcessor from './state/AIPhaseProcessor.js';
import ActionProcessor from './state/ActionProcessor.js';
import MenuScreen from './screens/MenuScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import DroneSelectionScreen from './components/screens/DroneSelectionScreen.jsx';
import DeckSelectionScreen from './components/screens/DeckSelectionScreen.jsx';
import ShipPlacementScreen from './components/screens/ShipPlacementScreen.jsx';
import ModalShowcaseScreen from './screens/ModalShowcaseScreen.jsx';
import TestingSetupScreen from './screens/TestingSetupScreen.jsx';
import StandaloneDeckBuilder from './screens/StandaloneDeckBuilder.jsx';
import App from './App.jsx';
import MorphingBackground from './components/ui/AngularBandsBackground.jsx';
import DEV_CONFIG from './config/devConfig.js';
import { debugLog } from './utils/debugLogger.js';

/**
 * AppRouter - Routes between different screens based on application state
 * - menu: Game mode selection screen
 * - lobby: AI selection and multiplayer setup
 * - inGame: Active gameplay (App.jsx)
 */
function AppRouter() {
  const { gameState } = useGameState();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize PhaseAnimationQueue (shared across all managers)
  const phaseAnimationQueueRef = useRef(null);
  if (!phaseAnimationQueueRef.current) {
    phaseAnimationQueueRef.current = new PhaseAnimationQueue(gameStateManager);
  }

  // Initialize GameFlowManager singleton with PhaseAnimationQueue
  const gameFlowManagerRef = useRef(null);
  if (!gameFlowManagerRef.current) {
    gameFlowManagerRef.current = new GameFlowManager(phaseAnimationQueueRef.current);
  }

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

  // Initialize GameFlowManager with all managers (for host/local/guest)
  // Guest needs GameFlowManager for optimistic automatic phase processing
  useEffect(() => {
    if (!gameFlowInitialized.current) {
      // Inject PhaseAnimationQueue into ActionProcessor
      if (gameStateManager.actionProcessor && phaseAnimationQueueRef.current) {
        gameStateManager.actionProcessor.phaseAnimationQueue = phaseAnimationQueueRef.current;
      }

      gameFlowManagerRef.current.initialize(
        gameStateManager,
        gameStateManager.actionProcessor, // Use ActionProcessor instance from GameStateManager
        () => gameState.gameMode !== 'local',
        aiPhaseProcessor // Add AIPhaseProcessor
      );

      // Set up reverse reference for automatic phase validation
      gameStateManager.setGameFlowManager(gameFlowManagerRef.current);

      gameFlowInitialized.current = true;
      const modeLabel = gameState.gameMode === 'guest' ? 'guest mode (optimistic)' : 'host/local mode';
      debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager initialized in AppRouter (${modeLabel})`);
    } else {
      debugLog('PHASE_TRANSITIONS', '🔄 GameFlowManager already initialized, skipping...');
    }
  }, [gameState.gameMode]);

  // Keyboard shortcut: Ctrl+M to toggle Modal Showcase (dev mode only)
  useEffect(() => {
    if (!DEV_CONFIG.features.modalShowcase) return;

    const handleKeyPress = (e) => {
      // Ctrl+M toggles modal showcase
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        const currentAppState = gameState.appState;
        const newAppState = currentAppState === 'modalShowcase' ? 'menu' : 'modalShowcase';
        gameStateManager.setState({ appState: newAppState });
        debugLog('PHASE_TRANSITIONS', `🎨 Modal Showcase toggled: ${currentAppState} -> ${newAppState}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.appState]);

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

  // Determine if we should show the morphing background
  // Hide it only when showing the main game (App.jsx) which uses SpaceBackground
  // Show it for menu, lobby, and all pre-game selection screens
  const shouldShowMorphingBackground = !(
    gameState.appState === 'inGame' &&
    !['droneSelection', 'placement'].includes(gameState.turnPhase)
  );

  // Route based on application state and game phase
  let currentScreen;
  switch (gameState.appState) {
    case 'menu':
      currentScreen = <MenuScreen />;
      break;

    case 'lobby':
      currentScreen = <LobbyScreen />;
      break;

    case 'deckBuilder':
      currentScreen = <StandaloneDeckBuilder />;
      break;

    case 'modalShowcase':
      // Dev-only modal showcase screen
      if (DEV_CONFIG.features.modalShowcase) {
        currentScreen = <ModalShowcaseScreen />;
      } else {
        // Fallback to menu if dev mode is disabled
        currentScreen = <MenuScreen />;
      }
      break;

    case 'testingSetup':
      // Dev-only testing mode setup screen
      if (DEV_CONFIG.features.testingMode) {
        currentScreen = <TestingSetupScreen />;
      } else {
        // Fallback to menu if dev mode is disabled
        currentScreen = <MenuScreen />;
      }
      break;

    case 'inGame':
      // Route based on game phase when in game
      switch (gameState.turnPhase) {
        case 'droneSelection':
          currentScreen = <DroneSelectionScreen />;
          break;

        case 'deckSelection':
          currentScreen = <DeckSelectionScreen />;
          break;

        case 'placement':
          currentScreen = <ShipPlacementScreen />;
          break;

        case 'gameInitializing':
          currentScreen = <App phaseAnimationQueue={phaseAnimationQueueRef.current} />; // Mount early for event subscriptions
          break;

        // All other phases (action, deployment, etc.) use the main game board
        default:
          currentScreen = <App phaseAnimationQueue={phaseAnimationQueueRef.current} />;
      }
      break;

    default:
      console.warn('Unknown app state:', gameState.appState, 'defaulting to menu');
      currentScreen = <MenuScreen />;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(2, 6, 23, 1)',
      overflow: 'auto'
    }}>
      {shouldShowMorphingBackground && <MorphingBackground />}
      {currentScreen}
    </div>
  );
}

export default AppRouter;