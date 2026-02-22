// ========================================
// USE TACTICAL ESCAPE HOOK
// ========================================
// Manages all escape, evade, and tactical item handlers: escape requests,
// evade item usage, threat reduction, tactical item confirmation, and
// escape confirmation with damage application and waypoint restoration.
// Extracted from TacticalMapScreen.jsx (Step 8).

import { useCallback } from 'react';
import tacticalMapStateManager from '../managers/TacticalMapStateManager.js';
import gameStateManager from '../managers/GameStateManager.js';
import ExtractionController from '../logic/singlePlayer/ExtractionController.js';
import DetectionManager from '../logic/detection/DetectionManager.js';
import aiPersonalities from '../data/aiData.js';
import { getTacticalItemById } from '../data/tacticalItemData.js';
import SeededRandom from '../utils/seededRandom.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * Hook that provides all escape, evade, and tactical item handlers for TacticalMapScreen.
 *
 * Handles: escape request/cancel/confirm, evade item usage, threat reduce item usage,
 * tactical item confirmation modal, and escape loading screen completion with
 * POI fled marking and waypoint restoration.
 */
export function useTacticalEscape({
  currentEncounter,
  activeSalvage,
  waypoints,
  currentWaypointIndex,
  setWaypoints,
  setIsMoving,
  setIsScanningHex,
  setIsPaused,
  setShowEscapeConfirm,
  setEscapeContext,
  escapeContext,
  setTacticalItemConfirmation,
  setShowEscapeLoadingScreen,
  setEscapeLoadingData,
  setShowPOIModal,
  setShowSalvageModal,
  setCurrentEncounter,
  setActiveSalvage,
  setPendingResumeWaypoints,
  pendingResumeWaypoints,
  currentRunState,
  sharedRefs,
}) {
  const { encounterResolveRef, shouldStopMovement, escapedWithWaypoints, pathProgressRef } = sharedRefs;

  /**
   * Handle escape button click - show escape confirmation modal
   * @param {Object} context - { type: 'poi' | 'salvage', isPOI: boolean }
   */
  const handleEscapeRequest = useCallback((context) => {
    debugLog('COMBAT_FLOW', 'Escape requested', context);
    setEscapeContext(context);
    setShowEscapeConfirm(true);
  }, [setEscapeContext, setShowEscapeConfirm]);

  /**
   * Handle evade item usage - skip encounter without combat or damage
   * Uses the Emergency Jammer tactical item
   */
  const handleEvadeItem = useCallback(() => {
    debugLog('COMBAT_FLOW', 'Evade item used');

    // Use the tactical item
    const result = gameStateManager.useTacticalItem('ITEM_EVADE');
    if (!result.success) {
      debugLog('COMBAT_FLOW', '[WARN] Failed to use evade item:', result.error);
      return;
    }

    debugLog('COMBAT_FLOW', 'Evade successful, remaining:', result.remaining);

    // Mark POI as fled (no loot gained, encounter skipped via evade)
    if (currentEncounter?.poi) {
      const runState = tacticalMapStateManager.getState();
      const fledPOIs = runState?.fledPOIs || [];
      tacticalMapStateManager.setState({
        fledPOIs: [...fledPOIs, { q: currentEncounter.poi.q, r: currentEncounter.poi.r }]
      });
      debugLog('ENCOUNTER', 'POI marked as fled (evaded)', { q: currentEncounter.poi.q, r: currentEncounter.poi.r });
    }

    // Close encounter modal and clear state
    setShowPOIModal(false);
    setCurrentEncounter(null);

    // Resume movement if waypoints remain
    const runState = tacticalMapStateManager.getState();
    if (runState?.waypoints && runState.waypoints.length > 0) {
      debugLog('MOVEMENT', 'Resuming movement after evade');
      setIsMoving(true);
    }
  }, [currentEncounter, setShowPOIModal, setCurrentEncounter, setIsMoving]);

  /**
   * Handle threat reduction item usage
   * Reduces current detection by random amount within item's effectValueMin/Max range
   */
  const handleUseThreatReduce = useCallback(() => {
    debugLog('RUN_STATE', 'Signal Dampener used');

    // Get the item data for effect range
    const item = getTacticalItemById('ITEM_THREAT_REDUCE');
    const min = item?.effectValueMin ?? 5;
    const max = item?.effectValueMax ?? 15;

    // Use seeded random for determinism (offset by remaining item count for unique rolls)
    const remainingCount = gameStateManager.getTacticalItemCount('ITEM_THREAT_REDUCE');
    const baseRng = SeededRandom.fromGameState(gameStateManager.getState());
    const itemUseOffset = 8888 + (remainingCount * 100);
    const rng = new SeededRandom(baseRng.seed + itemUseOffset);
    const reductionAmount = rng.randomIntInclusive(min, max);

    // Use the tactical item (consume it)
    const result = gameStateManager.useTacticalItem('ITEM_THREAT_REDUCE');
    if (!result.success) {
      debugLog('RUN_STATE', '[WARN] Failed to use threat reduce item:', result.error);
      return;
    }

    // Reduce detection
    DetectionManager.addDetection(-reductionAmount, 'Signal Dampener used');

    debugLog('RUN_STATE', `Detection reduced by ${reductionAmount}% (range: ${min}-${max}), remaining items: ${result.remaining}`);
  }, []);

  /**
   * Handle request to use threat reduce item (shows confirmation modal)
   */
  const handleRequestThreatReduce = useCallback(() => {
    const item = getTacticalItemById('ITEM_THREAT_REDUCE');
    setTacticalItemConfirmation({
      item,
      currentDetection: currentRunState?.detection || 0
    });
  }, [currentRunState?.detection, setTacticalItemConfirmation]);

  /**
   * Handle tactical item confirmation cancel
   */
  const handleTacticalItemCancel = useCallback(() => {
    setTacticalItemConfirmation(null);
  }, [setTacticalItemConfirmation]);

  /**
   * Handle tactical item confirmation confirm
   */
  const handleTacticalItemConfirm = useCallback(() => {
    setTacticalItemConfirmation(null);
    // Delay execution to allow modal to close
    setTimeout(() => {
      handleUseThreatReduce();
    }, 400);
  }, [handleUseThreatReduce, setTacticalItemConfirmation]);

  /**
   * Handle escape cancel - close escape confirmation modal
   */
  const handleEscapeCancel = useCallback(() => {
    debugLog('COMBAT_FLOW', 'Escape cancelled');
    setShowEscapeConfirm(false);
    setEscapeContext(null);
  }, [setShowEscapeConfirm, setEscapeContext]);

  /**
   * Handle escape confirmation - apply damage and show loading screen or trigger MIA
   */
  const handleEscapeConfirm = useCallback(() => {
    debugLog('COMBAT_FLOW', 'Escape confirmed');

    const runState = tacticalMapStateManager.getState();

    if (!runState) {
      debugLog('COMBAT_FLOW', '[WARN] No run state for escape');
      return;
    }

    // Get the AI personality for this encounter (affects escape damage)
    const aiId = currentEncounter?.aiId;
    if (!aiId) {
      debugLog('COMBAT_FLOW', '[WARN] No aiId in currentEncounter for escape - using default damage', currentEncounter);
    }
    const aiPersonality = aiId
      ? aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0]
      : aiPersonalities[0];  // Default to first AI for damage calculation

    // Execute escape - applies variable damage based on AI type
    const { wouldDestroy, updatedSections, totalDamage, damageHits, initialSections } = ExtractionController.executeEscape(runState, aiPersonality);

    if (wouldDestroy) {
      // Ship destroyed - trigger MIA
      debugLog('COMBAT_FLOW', 'Escape destroyed ship - triggering MIA');
      setShowEscapeConfirm(false);
      setEscapeContext(null);
      setShowPOIModal(false);
      setShowSalvageModal(false);
      setActiveSalvage(null);
      setCurrentEncounter(null);
      ExtractionController.abandonRun();
      return;
    }

    // Ship survived - show escape loading screen
    debugLog('COMBAT_FLOW', 'Escape successful - showing loading screen');

    // Capture FULL remaining journey including current position
    let remainingWps = [];

    // Use pathProgressRef for synchronous access to current waypoint index
    // (React state can be stale in closures)
    const { waypointIndex = 0 } = pathProgressRef.current || {};

    // Guard against invalid index
    if (waypointIndex >= 0 && waypointIndex < waypoints.length) {
      const currentWp = waypoints[waypointIndex];
      if (currentWp && currentWp.pathFromPrev) {
        // Path is already trimmed to start from current position after each move
        // So we use the remaining path as-is (no slice needed)
        if (currentWp.pathFromPrev.length > 1) {
          remainingWps.push({
            ...currentWp,
            pathFromPrev: currentWp.pathFromPrev
          });
        }
      }
    }

    // Add all subsequent waypoints using ref's waypointIndex
    remainingWps = [...remainingWps, ...waypoints.slice(waypointIndex + 1)];

    debugLog('PATH_HIGHLIGHTING', 'Escape capturing remaining waypoints:', {
      refWaypointIndex: pathProgressRef.current?.waypointIndex,
      stateWaypointIndex: currentWaypointIndex,  // For comparison
      waypointsLength: waypoints.length,
      currentPathLength: waypoints[waypointIndex]?.pathFromPrev?.length,
      remainingWpsCount: remainingWps.length
    });

    setPendingResumeWaypoints(remainingWps.length > 0 ? remainingWps : null);
    escapedWithWaypoints.current = remainingWps.length > 0; // Flag to prevent journey loop from clearing
    debugLog('COMBAT_FLOW', 'Captured remaining journey for escape:', remainingWps.length, 'waypoints');

    // Close confirm modal and show loading screen
    setShowEscapeConfirm(false);

    // Set up escape loading data with damage hits for real-time display
    setEscapeLoadingData({
      totalDamage,
      shipSections: updatedSections,
      initialSections,
      damageHits,
      aiName: aiPersonality?.name || 'Unknown'
    });
    setShowEscapeLoadingScreen(true);
  }, [currentEncounter, waypoints, currentWaypointIndex, pathProgressRef, escapedWithWaypoints, setShowEscapeConfirm, setEscapeContext, setShowPOIModal, setShowSalvageModal, setActiveSalvage, setCurrentEncounter, setPendingResumeWaypoints, setEscapeLoadingData, setShowEscapeLoadingScreen]);

  /**
   * Handle escape loading screen completion - resume journey
   */
  const handleEscapeLoadingComplete = useCallback(() => {
    debugLog('COMBAT_FLOW', 'Escape animation complete - resuming journey');

    setShowEscapeLoadingScreen(false);
    setEscapeLoadingData(null);

    // If this was a POI encounter, mark POI as fled (no loot, escaped combat)
    if (escapeContext?.isPOI && currentEncounter?.poi) {
      const updatedRunState = tacticalMapStateManager.getState();
      const fledPOIs = updatedRunState?.fledPOIs || [];
      tacticalMapStateManager.setState({
        fledPOIs: [...fledPOIs, { q: currentEncounter.poi.q, r: currentEncounter.poi.r }]
      });
      debugLog('ENCOUNTER', 'POI marked as fled (escaped)', { q: currentEncounter.poi.q, r: currentEncounter.poi.r });
    }

    // If this was a salvage encounter, mark POI as fled (escaped during salvage)
    if (escapeContext?.type === 'salvage' && activeSalvage?.poi) {
      const updatedRunState = tacticalMapStateManager.getState();
      const fledPOIs = updatedRunState?.fledPOIs || [];
      tacticalMapStateManager.setState({
        fledPOIs: [...fledPOIs, { q: activeSalvage.poi.q, r: activeSalvage.poi.r }]
      });
      debugLog('ENCOUNTER', 'POI marked as fled (salvage escaped)', { q: activeSalvage.poi.q, r: activeSalvage.poi.r });
    }

    // Close all escape/encounter modals
    setEscapeContext(null);
    setShowPOIModal(false);
    setShowSalvageModal(false);
    setActiveSalvage(null);
    setCurrentEncounter(null);

    // Stop movement
    shouldStopMovement.current = true;
    setIsMoving(false);
    setIsScanningHex(false);

    // Resolve any pending encounter promise to continue flow
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
      encounterResolveRef.current = null;
    }

    // Restore remaining waypoints if any were captured during escape
    if (pendingResumeWaypoints?.length > 0) {
      debugLog('PATH_HIGHLIGHTING', 'Restoring waypoints after escape:', { count: pendingResumeWaypoints?.length });
      setWaypoints(pendingResumeWaypoints);
      setPendingResumeWaypoints(null);
    }
  }, [currentEncounter, activeSalvage, escapeContext, pendingResumeWaypoints, shouldStopMovement, encounterResolveRef, setShowEscapeLoadingScreen, setEscapeLoadingData, setEscapeContext, setShowPOIModal, setShowSalvageModal, setActiveSalvage, setCurrentEncounter, setIsMoving, setIsScanningHex, setWaypoints, setPendingResumeWaypoints]);

  return {
    handleEscapeRequest,
    handleEvadeItem,
    handleUseThreatReduce,
    handleRequestThreatReduce,
    handleTacticalItemCancel,
    handleTacticalItemConfirm,
    handleEscapeCancel,
    handleEscapeConfirm,
    handleEscapeLoadingComplete,
  };
}
