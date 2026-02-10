// ========================================
// APP ROUTER
// ========================================
// Routes between different application screens based on app state
// Eliminates monolithic App.jsx by separating menu from game concerns

import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState.js';
import gameStateManager from './managers/GameStateManager.js';
import GameFlowManager from './managers/GameFlowManager.js';
import PhaseAnimationQueue from './managers/PhaseAnimationQueue.js';
import aiPhaseProcessor from './managers/AIPhaseProcessor.js';
import ActionProcessor from './managers/ActionProcessor.js';
import MenuScreen from './components/screens/MenuScreen.jsx';
import LobbyScreen from './components/screens/LobbyScreen.jsx';
import DroneSelectionScreen from './components/screens/DroneSelectionScreen.jsx';
import DeckSelectionScreen from './components/screens/DeckSelectionScreen.jsx';
import ShipPlacementScreen from './components/screens/ShipPlacementScreen.jsx';
import ModalShowcaseScreen from './components/screens/ModalShowcaseScreen.jsx';
import TestingSetupScreen from './components/screens/TestingSetupScreen.jsx';
import StandaloneDeckBuilder from './components/screens/StandaloneDeckBuilder.jsx';
import ExtractionDeckBuilder from './components/screens/ExtractionDeckBuilder.jsx';
import HangarScreen from './components/screens/HangarScreen.jsx';
import TacticalMapScreen from './components/screens/TacticalMapScreen.jsx';
import EremosEntryScreen from './components/screens/EremosEntryScreen.jsx';
import QuickDeployEditorScreen from './components/screens/QuickDeployEditorScreen.jsx';
import RepairBayScreen from './components/screens/RepairBayScreen.jsx';
import App from './App.jsx';
import CyanGlowBackground from './components/ui/CyanGlowBackground.jsx';
import SplashLoadingScreen from './components/ui/SplashLoadingScreen.jsx';
import assetPreloader from './services/AssetPreloader.js';
import SoundManager from './managers/SoundManager.js';
import DEV_CONFIG from './config/devConfig.js';
import { useSoundSetup } from './hooks/useSoundSetup.js';
import { useMusicSetup } from './hooks/useMusicSetup.js';
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
  const [loadProgress, setLoadProgress] = useState(null);

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

  // Initialize sound system (autoplay unlock + event bridge)
  useSoundSetup(gameStateManager, phaseAnimationQueueRef.current);

  // Initialize background music system (screen-based crossfading)
  useMusicSetup(gameState.appState);

  // Initialization guard to prevent multiple GameFlowManager initializations
  const gameFlowInitialized = useRef(false);

  // Asset + sound preloading effect
  useEffect(() => {
    let dismissed = false;  // Guard against React StrictMode double-execution

    const preloadAll = async () => {
      const MIN_DISPLAY_TIME = 2000; // 2 seconds minimum
      const soundManager = SoundManager.getInstance();

      debugLog('ASSET_PRELOAD', '🚀 Preload effect started (images + sounds)');

      // Track progress from both loaders as plain objects (not state — avoids closure issues)
      const imageProgress = { loaded: 0, total: 0, failed: 0 };
      const soundProgress = { loaded: 0, total: 0, failed: 0 };

      const updateCombinedProgress = () => {
        const totalLoaded = imageProgress.loaded + soundProgress.loaded;
        const totalAssets = imageProgress.total + soundProgress.total;
        const percentage = totalAssets > 0
          ? Math.round((totalLoaded / totalAssets) * 100)
          : 0;

        setLoadProgress({
          total: totalAssets,
          loaded: totalLoaded,
          failed: imageProgress.failed + soundProgress.failed,
          percentage,
          currentCategory: '',
        });
      };

      // Minimum display time promise
      const minDelayPromise = new Promise(resolve =>
        setTimeout(() => {
          debugLog('ASSET_PRELOAD', '⏱️ Minimum delay timer completed (2s)');
          resolve();
        }, MIN_DISPLAY_TIME)
      );

      // Image loading promise
      const imagePromise = assetPreloader.isComplete()
        ? Promise.resolve()
        : assetPreloader.loadAll((progress) => {
            imageProgress.loaded = progress.loaded;
            imageProgress.total = progress.total;
            imageProgress.failed = progress.failed;
            updateCombinedProgress();
          }).catch(error => {
            console.error('Asset preload error:', error);
          });

      // Sound loading promise
      const soundPromise = soundManager.isPreloaded
        ? Promise.resolve()
        : soundManager.preloadOnly((progress) => {
            soundProgress.loaded = progress.loaded;
            soundProgress.total = progress.total;
            soundProgress.failed = progress.failed;
            updateCombinedProgress();
          });

      // Stall watchdog — logs progress every 3s so we can see what's stuck
      const watchdog = setInterval(() => {
        const totalLoaded = imageProgress.loaded + soundProgress.loaded;
        const totalAssets = imageProgress.total + soundProgress.total;
        const pct = totalAssets > 0 ? Math.round((totalLoaded / totalAssets) * 100) : 0;
        debugLog('ASSET_PRELOAD', '⏳ Stall watchdog', {
          imageLoaded: imageProgress.loaded,
          imageTotal: imageProgress.total,
          imageFailed: imageProgress.failed,
          soundLoaded: soundProgress.loaded,
          soundTotal: soundProgress.total,
          soundFailed: soundProgress.failed,
          combinedPct: pct + '%',
        });
      }, 3000);

      debugLog('ASSET_PRELOAD', '⏳ Waiting for Promise.all [images + sounds + minDelay]...');
      await Promise.all([imagePromise, soundPromise, minDelayPromise]);
      clearInterval(watchdog);
      debugLog('ASSET_PRELOAD', '✅ All loading complete');

      // Guard against setting state after cleanup (StrictMode re-run)
      if (dismissed) {
        debugLog('ASSET_PRELOAD', '⚠️ Effect was cleaned up, aborting');
        return;
      }

      // Force progress to 100%
      const finalTotal = imageProgress.total + soundProgress.total;
      setLoadProgress({
        total: finalTotal,
        loaded: finalTotal,
        failed: imageProgress.failed + soundProgress.failed,
        percentage: 100,
        currentCategory: '',
      });
    };

    preloadAll();

    // Cleanup: prevent double-dismiss on StrictMode re-run
    return () => {
      debugLog('ASSET_PRELOAD', '🧹 Cleanup: marking dismissed');
      dismissed = true;
    };
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
    const handleContinue = async () => {
      const soundManager = SoundManager.getInstance();
      await soundManager.unlock();
      setIsLoading(false);
    };

    return (
      <SplashLoadingScreen
        progress={loadProgress}
        onContinue={handleContinue}
      />
    );
  }

  // Determine if we should show the cyan glow background
  // Hide it only when showing the main game (App.jsx) which uses SpaceBackground
  // Show it for menu, lobby, and all pre-game selection screens
  const shouldShowCyanGlowBackground = !(
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

    case 'eremosEntry':
      currentScreen = <EremosEntryScreen />;
      break;

    case 'hangar':
      currentScreen = <HangarScreen />;
      break;

    case 'extractionDeckBuilder':
      currentScreen = <ExtractionDeckBuilder />;
      break;

    case 'tacticalMap':
      currentScreen = <TacticalMapScreen />;
      break;

    case 'quickDeployEditor':
      currentScreen = <QuickDeployEditorScreen />;
      break;

    case 'repairBay':
      currentScreen = <RepairBayScreen />;
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
      {shouldShowCyanGlowBackground && <CyanGlowBackground />}
      <AppErrorBoundary>
        {currentScreen}
      </AppErrorBoundary>
    </div>
  );
}

// Error boundary to catch and diagnose production-only crashes
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 AppErrorBoundary caught error:', error.message);
    console.error('🚨 Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ef4444', backgroundColor: '#1a1a2e', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#f87171' }}>Production Crash Detected</h1>
          <p style={{ color: '#fca5a5' }}><strong>Error:</strong> {this.state.error?.message}</p>
          <p style={{ color: '#fca5a5' }}><strong>Stack:</strong></p>
          <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#d1d5db' }}>
            {this.state.error?.stack}
          </pre>
          {this.state.errorInfo && (
            <>
              <p style={{ color: '#fca5a5' }}><strong>Component Stack:</strong></p>
              <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#d1d5db' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppRouter;