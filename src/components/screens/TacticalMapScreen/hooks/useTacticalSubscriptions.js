/**
 * useTacticalSubscriptions — state subscriptions, music overrides, threat animations,
 * tutorial checks, lifecycle logging, blockade extraction, and quick deploy validation
 * for TacticalMapScreen.
 *
 * Extracted from TacticalMapScreen.jsx (Step 2 of refactoring plan).
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import MusicManager from '../../../../managers/MusicManager.js';
import MissionService from '../../../../logic/missions/MissionService.js';
import ExtractionController from '../../../../logic/singlePlayer/ExtractionController.js';
import gameStateManager from '../../../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../../../managers/TacticalMapStateManager.js';
import { debugLog } from '../../../../utils/debugLogger.js';
import { getAllShips } from '../../../../data/shipData.js';
import { shipComponentCollection } from '../../../../data/shipSectionData.js';
import { calculateSectionBaseStats } from '../../../../logic/statsCalculator.js';
import { getValidDeploymentsForDeck } from '../../../../logic/quickDeploy/QuickDeployValidator.js';

// Delay before clearing threat alert animation (ms)
const THREAT_ALERT_CLEAR_DELAY = 3000;

// Detection thresholds for threat-based music overrides
const DETECTION_THRESHOLD_MEDIUM = 50;
const DETECTION_THRESHOLD_HIGH = 80;

// --- Helper ---

export const isBlueprintRewardType = (rewardType) => {
  return rewardType?.startsWith('DRONE_BLUEPRINT_');
};

// --- Hook ---

export const useTacticalSubscriptions = ({
  showExtractionScreen,
  showEscapeLoadingScreen,
  tacticalMapRunState,
  currentEncounter,
  isMoving,
  showLoadingEncounter,
  setGameState,
  setTacticalMapRunState,
  setShowTutorial,
  setThreatAlert,
  setExtractionScreenData,
  setShowExtractionScreen,
  setIsMoving,
  setShowLoadingEncounter,
  setLoadingEncounterData,
  setCurrentEncounter,
  sharedRefs,
  singlePlayerShipSlots,
  quickDeployments,
  currentRunState,
}) => {
  // Refs owned by this hook (not shared externally)
  const prevThresholdRef = useRef(null);
  const pendingBlockadeExtractionRef = useRef(false);
  const isInitialMount = useRef(true);

  // --- Music override for extraction success screen ---
  useEffect(() => {
    if (showExtractionScreen) {
      MusicManager.getInstance().setOverride('victory');
    }
    return () => {
      if (showExtractionScreen) MusicManager.getInstance().clearOverride();
    };
  }, [showExtractionScreen]);

  // --- Music override for escape loading screen ---
  useEffect(() => {
    if (showEscapeLoadingScreen) {
      MusicManager.getInstance().setOverride('victory');
    }
    return () => {
      if (showEscapeLoadingScreen) MusicManager.getInstance().clearOverride();
    };
  }, [showEscapeLoadingScreen]);

  // --- Threat-based music override ---
  const applyThreatMusic = useCallback((detection) => {
    if (detection == null) return;
    const musicManager = MusicManager.getInstance();
    const threshold = detection < DETECTION_THRESHOLD_MEDIUM ? 'low' : detection < DETECTION_THRESHOLD_HIGH ? 'medium' : 'high';

    if (threshold === 'low') {
      musicManager.clearOverride();
    } else if (threshold === 'medium') {
      musicManager.setOverride('tactical_medium');
    } else {
      musicManager.setOverride('tactical_high');
    }
  }, []);

  // Apply threat music when detection changes during gameplay
  useEffect(() => {
    applyThreatMusic(tacticalMapRunState?.detection);
  }, [tacticalMapRunState?.detection, applyThreatMusic]);

  // Apply on mount (handles return from combat where detection is unchanged)
  // Reads directly from state manager to avoid stale closure / dependency issues
  useEffect(() => {
    applyThreatMusic(tacticalMapStateManager.getState()?.detection);
    return () => MusicManager.getInstance().clearOverride();
  }, [applyThreatMusic]);

  // --- Threat level change animation ---
  useEffect(() => {
    const detection = tacticalMapRunState?.detection;
    if (detection == null) return;

    const threshold = detection < DETECTION_THRESHOLD_MEDIUM ? 'low' : detection < DETECTION_THRESHOLD_HIGH ? 'medium' : 'high';
    const prev = prevThresholdRef.current;
    prevThresholdRef.current = threshold;

    // Only animate on increases (not on mount or decreases)
    if (prev == null) return;
    const levels = { low: 0, medium: 1, high: 2 };
    if (levels[threshold] > levels[prev]) {
      setThreatAlert(threshold);
      const timer = setTimeout(() => setThreatAlert(null), THREAT_ALERT_CLEAR_DELAY);
      return () => clearTimeout(timer);
    }
  }, [tacticalMapRunState?.detection, setThreatAlert]);

  // --- Subscribe to game state updates (GameStateManager + TacticalMapStateManager) ---
  useEffect(() => {
    const unsubscribeGame = gameStateManager.subscribe(() => {
      setGameState(gameStateManager.getState());
    });
    const unsubscribeTactical = tacticalMapStateManager.subscribe((event) => {
      debugLog('RUN_STATE', 'TacticalMapStateManager subscription UPDATE:', {
        eventType: event?.type,
        hasMapData: !!event?.state?.mapData,
        backgroundIndex: event?.state?.mapData?.backgroundIndex
      });
      setTacticalMapRunState(tacticalMapStateManager.getState());
    });
    return () => {
      unsubscribeGame();
      unsubscribeTactical();
    };
  }, [setGameState, setTacticalMapRunState]);

  // --- Component lifecycle logging ---
  useEffect(() => {
    const runState = tacticalMapStateManager.getState();
    debugLog('COMBAT_FLOW', 'TacticalMapScreen mounted', {
      appState: gameStateManager.getState().appState,
      hasRunState: !!runState,
      playerPosition: runState?.playerPosition,
      hasPendingPath: !!runState?.pendingPath,
      hasPendingPOICombat: !!runState?.pendingPOICombat,
      hasPendingBlockadeExtraction: !!runState?.pendingBlockadeExtraction
    });

    return () => {
      debugLog('COMBAT_FLOW', 'TacticalMapScreen unmounting');
    };
  }, []);

  // --- Tutorial check on first visit ---
  useEffect(() => {
    if (!MissionService.isTutorialDismissed('tacticalMap')) {
      setShowTutorial('tacticalMap');
    }
    MissionService.recordProgress('SCREEN_VISIT', { screen: 'tacticalMap' });
  }, [setShowTutorial]);

  // --- Blockade extraction: check on mount ---
  useEffect(() => {
    const runState = tacticalMapStateManager.getState();
    if (runState?.pendingBlockadeExtraction) {
      debugLog('EXTRACTION', 'Pending blockade extraction detected - will auto-extract');
      pendingBlockadeExtractionRef.current = true;

      tacticalMapStateManager.setState({
        pendingBlockadeExtraction: undefined
      });
    }
  }, []);

  // --- Blockade extraction: trigger after flag detected ---
  useEffect(() => {
    if (pendingBlockadeExtractionRef.current) {
      pendingBlockadeExtractionRef.current = false;
      const timer = setTimeout(() => {
        debugLog('EXTRACTION', 'Triggering auto-extraction after blockade victory');
        const runState = tacticalMapStateManager.getState();
        if (runState) {
          const result = ExtractionController.completeExtraction(runState);

          setExtractionScreenData({
            creditsEarned: runState.creditsEarned || 0,
            cardsCollected: runState.collectedLoot?.filter(l => l.type === 'card').length || 0,
            aiCoresEarned: runState.aiCoresEarned || 0
          });

          sharedRefs.pendingExtractionRef.current = result;
          setShowExtractionScreen(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [setExtractionScreenData, setShowExtractionScreen, sharedRefs]);

  // --- Valid quick deployments ---
  const validQuickDeployments = useMemo(() => {
    debugLog('QUICK_DEPLOY', '=== Validation Start ===');
    debugLog('QUICK_DEPLOY', 'quickDeployments count:', quickDeployments?.length);
    debugLog('QUICK_DEPLOY', 'shipSlotId:', currentRunState?.shipSlotId);

    if (!quickDeployments || !singlePlayerShipSlots || currentRunState?.shipSlotId == null) {
      debugLog('QUICK_DEPLOY', 'Early return - missing data', {
        hasQuickDeployments: !!quickDeployments,
        hasShipSlots: !!singlePlayerShipSlots,
        shipSlotId: currentRunState?.shipSlotId
      });
      return [];
    }

    const currentSlot = singlePlayerShipSlots.find(s => s.id === currentRunState.shipSlotId);
    debugLog('QUICK_DEPLOY', 'currentSlot found:', { found: !!currentSlot, status: currentSlot?.status });

    if (!currentSlot || currentSlot.status !== 'active') {
      debugLog('QUICK_DEPLOY', 'Early return - slot not found or not active');
      return [];
    }

    debugLog('QUICK_DEPLOY', 'slot drones:', currentSlot?.droneSlots?.filter(s => s.assignedDrone).map(s => s.assignedDrone));

    const shipCard = getAllShips().find(s => s.id === currentSlot.shipId);
    debugLog('QUICK_DEPLOY', 'shipCard found:', { found: !!shipCard, shipId: currentSlot.shipId });

    if (!shipCard) {
      debugLog('QUICK_DEPLOY', 'Early return - ship card not found');
      return [];
    }

    // Convert shipComponents { sectionId: lane } to ordered array [left, middle, right]
    const shipComponentsObj = currentSlot.shipComponents || {};
    const laneOrder = { 'l': 0, 'm': 1, 'r': 2 };
    const placedSections = Object.entries(shipComponentsObj)
      .sort((a, b) => laneOrder[a[1]] - laneOrder[b[1]])
      .map(([sectionId]) => sectionId);

    debugLog('QUICK_DEPLOY', 'placedSections:', placedSections);

    // Build proper ship sections with hull/thresholds
    const shipSections = {};
    for (const sectionId of placedSections) {
      const sectionTemplate = shipComponentCollection.find(c => c.id === sectionId);
      if (sectionTemplate) {
        const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
        shipSections[sectionId] = {
          ...JSON.parse(JSON.stringify(sectionTemplate)),
          hull: baseStats.hull,
          maxHull: baseStats.maxHull,
          thresholds: baseStats.thresholds
        };
      }
    }

    debugLog('QUICK_DEPLOY', 'shipSections built:', Object.keys(shipSections));
    debugLog('QUICK_DEPLOY', '=== Calling validator ===');

    const mockPlayerState = { shipSections };
    const result = getValidDeploymentsForDeck(quickDeployments, currentSlot, mockPlayerState, placedSections);

    debugLog('QUICK_DEPLOY', 'Valid deployments returned:', result.length);
    return result;
  }, [quickDeployments, singlePlayerShipSlots, currentRunState?.shipSlotId]);

  // --- Safety redirect: redirect to hangar if no active run ---
  // Skip on initial mount to avoid race condition with state propagation
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!currentRunState || !currentRunState.mapData) {
      debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> hangar (safety redirect) ===', {
        trigger: 'safety_check',
        source: 'TacticalMapScreen.useEffect[safety]',
        detail: 'No active run detected - auto-redirecting to hangar',
        hadEncounter: !!currentEncounter,
        isMoving,
        hadLoadingEncounter: showLoadingEncounter,
        runAbandoning: gameStateManager.get('runAbandoning')
      });

      debugLog('SP_COMBAT', 'Safety check triggered - no active run', {
        hadEncounter: !!currentEncounter,
        isMoving: isMoving,
        hadLoadingEncounter: showLoadingEncounter,
        runAbandoning: gameStateManager.get('runAbandoning')
      });

      // Cancel any pending operations BEFORE triggering navigation
      sharedRefs.shouldStopMovement.current = true;
      setIsMoving(false);
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);

      debugLog('MODE_TRANSITION', '[WARN] No active run detected, returning to hangar');
      gameStateManager.setState({ appState: 'hangar' });
    }
  }, [currentRunState, currentEncounter, isMoving, showLoadingEncounter,
      setIsMoving, setShowLoadingEncounter, setLoadingEncounterData, setCurrentEncounter, sharedRefs]);

  return { validQuickDeployments };
};
