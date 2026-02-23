// ========================================
// USE TACTICAL LOOT HOOK
// ========================================
// Manages all loot collection handlers: extraction loot selection,
// POI loot collection (cards, salvage items, blueprints, tokens),
// and blueprint reward acceptance with POI marking and journey resumption.
// Extracted from TacticalMapScreen.jsx (Step 9).

import { useCallback } from 'react';
import tacticalMapStateManager from '../../../../managers/TacticalMapStateManager.js';
import gameStateManager from '../../../../managers/GameStateManager.js';
import ExtractionController from '../../../../logic/singlePlayer/ExtractionController.js';
import DetectionManager from '../../../../logic/detection/DetectionManager.js';
import MissionService from '../../../../logic/missions/MissionService.js';
import { debugLog } from '../../../../utils/debugLogger.js';

/**
 * Hook that provides all loot collection handlers for TacticalMapScreen.
 *
 * Handles: extraction loot selection confirmation, POI loot collection
 * (cards, salvage items, blueprints, tokens with persistent profile updates),
 * and blueprint reward acceptance with POI looted marking and journey resumption.
 *
 * The encounterResolveRef pattern: handlers call encounterResolveRef.current()
 * to resume the movement loop after loot collection completes.
 */
export function useTacticalLoot({
  pendingLootSelection,
  setPendingLootSelection,
  setShowLootSelectionModal,
  pendingLootEncounter,
  setPendingLootEncounter,
  poiLootToReveal,
  setPoiLootToReveal,
  pendingBlueprintReward,
  setPendingBlueprintReward,
  setShowBlueprintRewardModal,
  pendingResumeWaypoints,
  setPendingResumeWaypoints,
  setWaypoints,
  setIsPaused,
  currentRunState,
  sharedRefs,
}) {
  const { encounterResolveRef, skipWaypointRemovalRef } = sharedRefs;

  /**
   * Handle loot selection confirmation - complete extraction with selected items
   */
  const handleLootSelectionConfirm = useCallback((selectedLoot) => {
    debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> hangar (extraction) ===', {
      trigger: 'user_action',
      source: 'TacticalMapScreen.handleLootSelectionConfirm',
      detail: 'User confirmed loot selection for extraction',
      lootCount: selectedLoot.length
    });

    debugLog('LOOT', 'Loot selection confirmed:', selectedLoot.length, 'items');

    setShowLootSelectionModal(false);
    setPendingLootSelection(null);

    // Get current run state and complete extraction with selected loot
    const runState = tacticalMapStateManager.getState();

    if (runState) {
      ExtractionController.completeExtraction(runState, selectedLoot);
      // Go directly to hangar (RunSummaryModal shows there)
      gameStateManager.setState({ appState: 'hangar' });
    }
  }, [setShowLootSelectionModal, setPendingLootSelection]);

  /**
   * Handle POI loot collection - called when player reveals all cards and clicks Continue
   */
  const handlePOILootCollected = useCallback((loot) => {
    debugLog('LOOT', 'POI loot collected', loot);

    const runState = tacticalMapStateManager.getState();

    if (!runState) {
      debugLog('LOOT', '[WARN] No run state for loot collection');
      return;
    }

    // Add loot cards to collectedLoot
    const newCardLoot = (loot.cards || []).map(card => ({
      ...card,  // Already has cardId, cardName from RewardManager
      type: 'card',  // Override card.type with 'card' for collectedLoot
      source: 'poi_loot'
    }));

    // Add salvage items (each item is a separate entry in collectedLoot)
    if (loot.salvageItems && loot.salvageItems.length > 0) {
      loot.salvageItems.forEach(salvageItem => {
        newCardLoot.push({
          type: 'salvageItem',
          itemId: salvageItem.itemId,
          name: salvageItem.name,
          creditValue: salvageItem.creditValue,
          image: salvageItem.image,
          description: salvageItem.description,
          source: 'poi_loot'
        });
      });
    }

    // Add blueprint to loot record (blueprint PoI rewards)
    if (loot.blueprint) {
      debugLog('LOOT', 'Adding blueprint to collectedLoot:', loot.blueprint.blueprintId);
      newCardLoot.push({
        type: 'blueprint',
        blueprintId: loot.blueprint.blueprintId,
        blueprintType: loot.blueprint.blueprintType || 'drone',
        rarity: loot.blueprint.rarity,
        droneData: loot.blueprint.droneData,
        source: loot.blueprint.source || 'poi_loot'
      });
    }

    // Add token to loot record (for display in run summary)
    // Handle both single token (direct encounter) and tokens array (salvage)
    if (loot.token) {
      newCardLoot.push({
        type: 'token',
        tokenType: loot.token.tokenType,
        amount: loot.token.amount,
        source: 'poi_loot'
      });
    }
    // Handle tokens array from salvage
    if (loot.tokens && loot.tokens.length > 0) {
      loot.tokens.forEach(token => {
        newCardLoot.push({
          type: 'token',
          tokenType: token.tokenType,
          amount: token.amount,
          source: 'poi_loot'
        });
      });
    }

    const updatedLoot = [...(runState?.collectedLoot || []), ...newCardLoot];
    const salvageTotalCredits = (loot.salvageItems || []).reduce((sum, item) => sum + (item.creditValue || 0), 0);
    const newCredits = (runState?.creditsEarned || 0) + salvageTotalCredits;

    // Handle token collection - save to singlePlayerProfile (persistent across runs)
    // Handle single token (direct encounter)
    if (loot.token) {
      const saveData = gameStateManager.getState();
      const currentTokens = saveData.singlePlayerProfile?.securityTokens || 0;
      gameStateManager.setState({
        singlePlayerProfile: {
          ...saveData.singlePlayerProfile,
          securityTokens: currentTokens + loot.token.amount
        }
      });
      debugLog('LOOT', `Security token collected! Total: ${currentTokens + loot.token.amount}`);
    }
    // Handle tokens array (salvage)
    if (loot.tokens && loot.tokens.length > 0) {
      const saveData = gameStateManager.getState();
      const currentTokens = saveData.singlePlayerProfile?.securityTokens || 0;
      const totalNewTokens = loot.tokens.reduce((sum, t) => sum + (t.amount || 0), 0);
      gameStateManager.setState({
        singlePlayerProfile: {
          ...saveData.singlePlayerProfile,
          securityTokens: currentTokens + totalNewTokens
        }
      });
      debugLog('LOOT', `Security tokens collected from salvage! Total: ${currentTokens + totalNewTokens}`);
    }

    // Mark POI as looted (prevents re-looting)
    const lootedPOIs = runState.lootedPOIs || [];
    const poiCoords = pendingLootEncounter?.poi
      ? { q: pendingLootEncounter.poi.q, r: pendingLootEncounter.poi.r }
      : null;
    const updatedLootedPOIs = poiCoords
      ? [...lootedPOIs, poiCoords]
      : lootedPOIs;

    // Update run state
    tacticalMapStateManager.setState({
      collectedLoot: updatedLoot,
      creditsEarned: newCredits,
      lootedPOIs: updatedLootedPOIs
    });

    // Add detection for looting (from pending encounter)
    if (pendingLootEncounter) {
      const threatIncrease = pendingLootEncounter.poi?.poiData?.threatIncrease || 10;
      DetectionManager.addDetection(threatIncrease, `Looting ${pendingLootEncounter.poi?.poiData?.name || 'PoI'}`);
      debugLog('ENCOUNTER', `POI marked as looted: (${poiCoords?.q}, ${poiCoords?.r})`);

      // Record mission progress for POI visit
      MissionService.recordProgress('POI_LOOTED', {});
    }

    // Clear loot state
    setPoiLootToReveal(null);
    setPendingLootEncounter(null);

    // Resume movement by resolving the waiting promise (normal flow)
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
      encounterResolveRef.current = null;
    }

    // Resume journey with remaining waypoints (post-combat flow)
    // This happens when player won combat at a PoI and just collected PoI loot
    if (pendingResumeWaypoints?.length > 0) {
      debugLog('PATH_HIGHLIGHTING', 'Resuming journey after loot:', {
        count: pendingResumeWaypoints?.length,
        destinations: pendingResumeWaypoints?.map(w => w.hex)
      });
      setWaypoints(pendingResumeWaypoints);
      setPendingResumeWaypoints(null);
      // Movement will start via the executeMovement useEffect that watches waypoints
    }

    debugLog('LOOT', 'POI loot finalized, resuming movement');
  }, [pendingLootEncounter, pendingResumeWaypoints, encounterResolveRef, setPoiLootToReveal, setPendingLootEncounter, setWaypoints, setPendingResumeWaypoints]);

  /**
   * Handle blueprint reward modal acceptance
   * Called when player clicks Accept on DroneBlueprintRewardModal
   */
  const handleBlueprintRewardAccepted = useCallback((blueprint) => {
    debugLog('ENCOUNTER', 'Blueprint reward accepted:', blueprint.blueprintId);

    // Close blueprint modal
    setShowBlueprintRewardModal(false);
    setPendingBlueprintReward(null);

    const runState = tacticalMapStateManager.getState();

    // Add blueprint to collectedLoot
    const blueprintLootItem = {
      type: 'blueprint',
      blueprintId: blueprint.blueprintId,
      blueprintType: blueprint.blueprintType || 'drone',
      rarity: blueprint.rarity,
      droneData: blueprint.droneData,
      source: blueprint.source || 'poi_loot'
    };

    const updatedLoot = [...(runState?.collectedLoot || []), blueprintLootItem];

    // Update run state with blueprint
    tacticalMapStateManager.setState({
      collectedLoot: updatedLoot
    });

    debugLog('ENCOUNTER', 'Blueprint added to collectedLoot. Total items:', updatedLoot.length);

    // Mark POI as looted (if from encounter)
    if (pendingLootEncounter?.poi) {
      const { q, r } = pendingLootEncounter.poi;

      // Update hex data to mark as looted
      const updatedMapData = { ...runState.mapData };
      const hexToUpdate = updatedMapData.hexes.find(h => h.q === q && h.r === r);

      if (hexToUpdate && hexToUpdate.poi) {
        hexToUpdate.poi.looted = true;
        debugLog('ENCOUNTER', `Marked blueprint PoI at (${q}, ${r}) as looted`);

        tacticalMapStateManager.setState({
          mapData: updatedMapData
        });
      }

      // Add detection for looting
      const threatIncrease = pendingLootEncounter.poi.poiData?.threatIncrease || 10;
      DetectionManager.addDetection(threatIncrease, `Looting ${pendingLootEncounter.poi.poiData?.name || 'Blueprint PoI'}`);

      // Record mission progress for POI visit
      MissionService.recordProgress('POI_LOOTED', {});

      setPendingLootEncounter(null);
    }

    // Resume journey if waypoints remain (handled by existing logic)
    if (pendingResumeWaypoints?.length > 0) {
      debugLog('PATH_HIGHLIGHTING', 'Resuming journey after blueprint:', { count: pendingResumeWaypoints?.length });
      setWaypoints(pendingResumeWaypoints);
      setPendingResumeWaypoints(null);
      // Movement will start via the executeMovement useEffect that watches waypoints
    }

    // Resume movement by resolving the waiting promise
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
      encounterResolveRef.current = null;
    }

    setIsPaused(false);
    debugLog('ENCOUNTER', 'Blueprint reward finalized, resuming movement');
  }, [pendingLootEncounter, pendingResumeWaypoints, encounterResolveRef, setShowBlueprintRewardModal, setPendingBlueprintReward, setPendingLootEncounter, setWaypoints, setPendingResumeWaypoints, setIsPaused]);

  return {
    handleLootSelectionConfirm,
    handlePOILootCollected,
    handleBlueprintRewardAccepted,
  };
}
