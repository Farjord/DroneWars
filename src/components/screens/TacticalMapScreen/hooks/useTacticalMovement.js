// ========================================
// USE TACTICAL MOVEMENT HOOK
// ========================================
// Manages the async hex-by-hex movement loop through waypoints,
// including encounter pausing, salvage, and blueprint guardian encounters.
// Extracted from TacticalMapScreen.jsx (Step 5).

import { useCallback } from 'react';
import tacticalMapStateManager from '../../../../managers/TacticalMapStateManager.js';
import DetectionManager from '../../../../logic/detection/DetectionManager.js';
import EncounterController from '../../../../logic/encounters/EncounterController.js';
import SalvageController from '../../../../logic/salvage/SalvageController.js';
import SoundManager from '../../../../managers/SoundManager.js';
import transitionManager from '../../../../managers/TransitionManager.js';
import gameStateManager from '../../../../managers/GameStateManager.js';
import { mapTiers } from '../../../../data/mapData.js';
import { debugLog } from '../../../../utils/debugLogger.js';

// --- Movement Constants ---
export const SCAN_DELAY = 500;   // Time to show scan animation
export const MOVE_DELAY = 400;   // Time after moving to next hex
export const TOTAL_MOVEMENT_DELAY = SCAN_DELAY + MOVE_DELAY;
const WAYPOINT_PAUSE_DELAY = 500;

/**
 * Hook that provides the async movement loop and movement controls.
 *
 * The core challenge: handleCommenceJourney is a long-running async function
 * that must pause for encounters (resolved externally via encounterResolveRef)
 * and support pause/resume via isPausedRef.
 */
export function useTacticalMovement({
  waypoints,
  setWaypoints,
  isMoving,
  setIsMoving,
  isPaused,
  setIsPaused,
  setCurrentWaypointIndex,
  setCurrentHexIndex,
  setIsScanningHex,
  setCurrentEncounter,
  setShowPOIModal,
  setShowSalvageModal,
  setActiveSalvage,
  setShowBlueprintEncounterModal,
  setPendingBlueprintEncounter,
  currentRunState,
  sharedRefs,
}) {
  const {
    shouldStopMovement,
    encounterResolveRef,
    isPausedRef,
    pathProgressRef,
    totalWaypointsRef,
    escapedWithWaypoints,
    skipWaypointRemovalRef,
    pendingCombatLoadingRef,
  } = sharedRefs;

  // --- waitWithPauseSupport ---
  // Returns true if should continue, false if should stop
  const waitWithPauseSupport = useCallback(async (ms) => {
    const startTime = Date.now();
    const endTime = startTime + ms;

    while (Date.now() < endTime) {
      // Check if we should stop - includes runAbandoning flag for race condition prevention
      if (shouldStopMovement.current || gameStateManager.get('runAbandoning')) {
        return false;
      }

      // If paused, wait until unpaused
      while (isPausedRef.current) {
        if (shouldStopMovement.current || gameStateManager.get('runAbandoning')) return false;
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Small sleep to prevent busy-waiting
      await new Promise(resolve => setTimeout(resolve, Math.min(50, endTime - Date.now())));
    }

    return !shouldStopMovement.current && !gameStateManager.get('runAbandoning');
  }, []);

  // --- moveToSingleHex ---
  // Uses zone-based detection cost
  // IMPORTANT: Updates detection AND position in single atomic setState to avoid race condition
  // Also tracks hexesMoved and hexesExplored for run summary
  const moveToSingleHex = useCallback((hex, tierConfig, mapRadius) => {
    const runState = tacticalMapStateManager.getState();
    if (!runState) return 0;
    SoundManager.getInstance().play('ship_move');

    // Calculate zone-based detection cost for this hex
    const hexCost = DetectionManager.getHexDetectionCost(hex, tierConfig, mapRadius);
    const newDetection = Math.min(100, runState.detection + hexCost);

    // Track exploration - add hex to explored list if not already there
    const hexesExplored = runState.hexesExplored || [];
    const alreadyExplored = hexesExplored.some(h => h.q === hex.q && h.r === hex.r);
    const updatedHexesExplored = alreadyExplored
      ? hexesExplored
      : [...hexesExplored, { q: hex.q, r: hex.r }];

    // Update detection, position, and tracking stats in single setState
    const newHexesMoved = (runState.hexesMoved || 0) + 1;

    // Update TacticalMapStateManager
    tacticalMapStateManager.setState({
      detection: newDetection,
      playerPosition: { q: hex.q, r: hex.r },
      hexesMoved: newHexesMoved,
      hexesExplored: updatedHexesExplored
    });

    // Increase Signal Lock (encounter detection chance) after each move
    EncounterController.increaseEncounterDetection(tierConfig, newHexesMoved);

    debugLog('MOVEMENT', `Moved to hex (${hex.q}, ${hex.r}) - Zone: ${hex.zone} - Detection: ${runState.detection.toFixed(1)}% -> ${newDetection.toFixed(1)}% (+${hexCost.toFixed(1)}%)`);

    // Check for MIA trigger
    if (newDetection >= 100) {
      DetectionManager.triggerMIA();
      // Signal to stop movement loop BEFORE encounter check to prevent race condition
      // where both MIA screen and encounter modal appear simultaneously
      shouldStopMovement.current = true;
    }

    return hexCost;
  }, []);

  // --- handleCommenceJourney ---
  // Start moving through waypoints hex-by-hex
  // Uses zone-based detection costs and checks for random encounters
  const handleCommenceJourney = useCallback(async () => {
    if (waypoints.length === 0) return;

    debugLog('MOVEMENT', 'Commencing journey with', waypoints.length, 'waypoints');
    totalWaypointsRef.current = waypoints.length;
    setIsMoving(true);
    setIsPaused(false);
    isPausedRef.current = false;
    shouldStopMovement.current = false;
    setCurrentWaypointIndex(0);
    setCurrentHexIndex(0);
    pathProgressRef.current = { waypointIndex: 0, hexIndex: 0 };
    setIsScanningHex(true);

    const runState = tacticalMapStateManager.getState();
    if (!runState?.mapData) return;
    const tierConfig = mapTiers[runState.mapData.tier - 1];
    const mapRadius = runState.mapData.radius;

    // Process each waypoint
    for (let wpIndex = 0; wpIndex < waypoints.length; wpIndex++) {
      if (shouldStopMovement.current) break;

      setCurrentWaypointIndex(wpIndex);
      setCurrentHexIndex(0);
      const waypoint = waypoints[wpIndex];
      const path = waypoint.pathFromPrev;

      if (!path || path.length < 2) continue;

      debugLog('MOVEMENT', `Moving to waypoint ${wpIndex + 1}: ${path.length - 1} hexes`);

      // Move through each hex in the path (skip first hex - that's current position)
      for (let hexIndex = 1; hexIndex < path.length; hexIndex++) {
        if (shouldStopMovement.current) break;

        // NOTE: Don't set currentHexIndex here - it's set to 0 after each trim (line ~842)
        // The path is trimmed after each move, so currentHexIndex should always be 0
        const targetHex = path[hexIndex];

        // Phase 1: Scan delay (warning overlay stays active throughout journey)
        const shouldContinueScan = await waitWithPauseSupport(SCAN_DELAY);
        if (!shouldContinueScan) break;

        // Phase 2: Move to hex (zone-based detection cost)
        moveToSingleHex(targetHex, tierConfig, mapRadius);

        // Update path progress ref synchronously (for combat storage accuracy)
        pathProgressRef.current = { waypointIndex: wpIndex, hexIndex };

        // Trim pathFromPrev to remove the just-traversed hex (path shrinks as player moves)
        // Always slice(1) because after each trim, current position is at index 0
        setWaypoints(prev => {
          debugLog('PATH_HIGHLIGHTING', 'Trimming path (player moved):', { prevCount: prev?.length });
          const updated = [...prev];
          if (updated[wpIndex] && updated[wpIndex].pathFromPrev.length > 1) {
            updated[wpIndex] = {
              ...updated[wpIndex],
              pathFromPrev: updated[wpIndex].pathFromPrev.slice(1)
            };
          }
          tacticalMapStateManager.setState({ waypoints: updated });
          return updated;
        });

        // Reset currentHexIndex to 0 after trimming so heading calculation uses correct index
        setCurrentHexIndex(0);

        // Check if MIA was triggered during move - stop BEFORE encounter check
        if (shouldStopMovement.current) break;

        // Phase 3: Check for random encounter on this hex
        const encounterResult = EncounterController.checkMovementEncounter(targetHex, tierConfig);

        if (encounterResult) {
          debugLog('ENCOUNTER', 'Random encounter triggered on hex!');
          setCurrentEncounter(encounterResult);
          setShowPOIModal(true);

          // Wait for encounter to be resolved (promise resolved externally by encounter handlers)
          await new Promise(resolve => {
            encounterResolveRef.current = resolve;
          });

          if (shouldStopMovement.current) break;
        }

        // Complete movement animation
        const shouldContinueMove = await waitWithPauseSupport(MOVE_DELAY);
        if (!shouldContinueMove) break;
      }

      if (shouldStopMovement.current) break;

      // Arrived at waypoint - handle arrival
      const arrivedHex = waypoint.hex;
      debugLog('MOVEMENT', `Arrived at waypoint ${wpIndex + 1}: ${arrivedHex.type}`);

      if (arrivedHex.type === 'poi') {
        // Check if POI has already been looted
        const lootedPOIs = tacticalMapStateManager.getState()?.lootedPOIs || [];
        const alreadyLooted = lootedPOIs.some(p => p.q === arrivedHex.q && p.r === arrivedHex.r);

        if (alreadyLooted) {
          debugLog('ENCOUNTER', `PoI at (${arrivedHex.q}, ${arrivedHex.r}) already looted, skipping encounter`);
        } else {
          // Check for guardian encounter (blueprint PoIs) BEFORE salvage
          const encounterResult = await EncounterController.handlePOIArrival(arrivedHex, tierConfig);

          // If this is a blueprint PoI requiring confirmation, show modal
          if (encounterResult && encounterResult.requiresConfirmation && encounterResult.outcome === 'encounterPending') {
            debugLog('ENCOUNTER', 'Blueprint PoI detected - showing confirmation modal');

            setPendingBlueprintEncounter(encounterResult);
            setShowBlueprintEncounterModal(true);
            setIsPaused(true);

            // Wait for user decision via promise
            await new Promise((resolve) => {
              encounterResolveRef.current = resolve;
            });

            // After modal closes, check if we should continue
            if (shouldStopMovement.current) {
              debugLog('PATH_HIGHLIGHTING', 'Guardian encounter stopped movement, clearing waypoint');
              setWaypoints(prev => {
                const result = prev.length <= 1 ? [] : prev.slice(1);
                tacticalMapStateManager.setState({ waypoints: result });
                return result;
              });
              break;
            }
          } else {
            // Regular PoI (no guardian) - proceed with salvage
            debugLog('SALVAGE', 'PoI arrived - initializing salvage');

            const zone = arrivedHex.zone || 'mid';
            const tier = runState.mapData?.tier || 1;
            const detection = DetectionManager.getCurrentDetection();
            const threatLevel = DetectionManager.getThreshold();

            const salvageState = SalvageController.initializeSalvage(
              arrivedHex,
              tierConfig,
              zone,
              tier,
              threatLevel
            );

            // Store remaining waypoints in manager for journey resumption after salvage
            const remainingWps = waypoints.slice(wpIndex + 1);
            debugLog('PATH_HIGHLIGHTING', 'Storing remaining waypoints in manager for resume:', {
              currentWpIndex: wpIndex,
              totalWaypoints: waypoints.length,
              remainingCount: remainingWps.length,
              remainingDestinations: remainingWps.map(w => w.hex)
            });
            tacticalMapStateManager.setState({ waypoints: remainingWps });
            // Signal to skip waypoint removal since loot handler will restore waypoints
            skipWaypointRemovalRef.current = remainingWps.length > 0;

            debugLog('SALVAGE', 'Salvage initialized', {
              totalSlots: salvageState.totalSlots,
              zone: salvageState.zone,
              baseEncounterChance: salvageState.currentEncounterChance
            });

            // Pause movement and show salvage modal
            setIsScanningHex(false);
            setActiveSalvage({ ...salvageState, detection });
            setShowSalvageModal(true);

            // Wait for salvage to be resolved (player leaves or combat triggers)
            await new Promise(resolve => {
              encounterResolveRef.current = resolve;
            });

            // Check if movement was cancelled while waiting
            if (shouldStopMovement.current) {
              debugLog('PATH_HIGHLIGHTING', 'Salvage combat stopped movement, clearing waypoint');
              setWaypoints(prev => {
                const result = prev.length <= 1 ? [] : prev.slice(1);
                tacticalMapStateManager.setState({ waypoints: result });
                return result;
              });
              break;
            }
          }
        }
      } else if (arrivedHex.type === 'gate') {
        debugLog('EXTRACTION', 'Arrived at gate - extraction available');
      }

      // Brief pause at waypoint before continuing to next
      if (wpIndex < waypoints.length - 1) {
        const shouldContinue = await waitWithPauseSupport(WAYPOINT_PAUSE_DELAY);
        if (!shouldContinue) break;
      }

      // Remove completed waypoint from array after arrival
      // Skip removal if loot handler will restore waypoints (prevents race condition)
      if (skipWaypointRemovalRef.current) {
        debugLog('PATH_HIGHLIGHTING', 'Skipping waypoint removal - loot handler will restore waypoints');
        break;
      } else {
        debugLog('PATH_HIGHLIGHTING', 'POI visit complete, removing first waypoint');
        setWaypoints(prev => {
          const result = prev.length <= 1 ? [] : prev.slice(1);
          debugLog('PATH_HIGHLIGHTING', 'Waypoints after removal:', {
            count: result.length,
            destinations: result.map(w => w.hex)
          });
          tacticalMapStateManager.setState({ waypoints: result });
          return result;
        });
      }
    }

    // Journey complete - clear waypoints and reset state
    // Skip clearing if: (1) transitioning to combat, (2) escaped from encounter, (3) loading screen active, or (4) loot resume in progress
    debugLog('MOVEMENT', 'Journey complete');
    if (!transitionManager.hasSnapshot() && !escapedWithWaypoints.current && !pendingCombatLoadingRef.current && !skipWaypointRemovalRef.current) {
      debugLog('PATH_HIGHLIGHTING', 'Journey complete - clearing all waypoints');
      setWaypoints([]);
      tacticalMapStateManager.setState({ waypoints: [] });
    } else if (skipWaypointRemovalRef.current) {
      debugLog('PATH_HIGHLIGHTING', 'Skipping journey complete clear - loot resume in progress');
    } else {
      debugLog('MOVEMENT', 'Skipping waypoint clear - pending combat, loading screen, or escape');
    }
    skipWaypointRemovalRef.current = false;
    escapedWithWaypoints.current = false;
    setIsMoving(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsScanningHex(false);
    setCurrentWaypointIndex(null);
    setCurrentHexIndex(0);
  }, [waypoints, waitWithPauseSupport, moveToSingleHex]);

  // --- handleTogglePause ---
  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => {
      const newValue = !prev;
      isPausedRef.current = newValue;
      debugLog('MOVEMENT', `Movement ${newValue ? 'paused' : 'resumed'}`);
      return newValue;
    });
  }, []);

  // --- handleStopMovement ---
  const handleStopMovement = useCallback(() => {
    debugLog('MOVEMENT', 'Movement cancelled');
    shouldStopMovement.current = true;
    isPausedRef.current = false;
    setIsScanningHex(false);
  }, []);

  return {
    handleCommenceJourney,
    handleTogglePause,
    handleStopMovement,
  };
}
