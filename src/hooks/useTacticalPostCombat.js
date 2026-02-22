// ========================================
// useTacticalPostCombat Hook
// ========================================
// Mount-only effect that processes pending state after returning from combat.
// Handles: waypoint restoration, POI loot generation, salvage modal restoration.

import { useEffect } from 'react';
import tacticalMapStateManager from '../managers/TacticalMapStateManager.js';
import waypointManager from '../managers/WaypointManager.js';
import rewardManager from '../managers/RewardManager.js';
import HighAlertManager from '../logic/salvage/HighAlertManager.js';
import SalvageController from '../logic/salvage/SalvageController.js';
import { mapTiers } from '../data/mapData.js';
import { debugLog } from '../utils/debugLogger.js';
import { isBlueprintRewardType } from './useTacticalSubscriptions.js';

/**
 * Runs once on mount to restore tactical map state after returning from combat.
 * Processes pending waypoints, POI combat loot, and salvage restoration.
 */
export function useTacticalPostCombat({
  setWaypoints,
  setActiveSalvage,
  setShowSalvageModal,
  setPendingBlueprintReward,
  setShowBlueprintRewardModal,
  setPendingLootEncounter,
  setPoiLootToReveal,
}) {
  useEffect(() => {
    let runState = tacticalMapStateManager.getState();

    // Diagnostic logging for state persistence debugging
    debugLog('RUN_STATE', 'TacticalMapScreen MOUNT - checking pending state:', {
      hasRunState: !!runState,
      hasMapData: !!runState?.mapData,
      backgroundIndex: runState?.mapData?.backgroundIndex,
      pendingWaypoints: runState?.pendingPath?.length || 0,
      pendingPOICombat: !!runState?.pendingPOICombat
    });

    // Restore path using WaypointManager (if path was stored before combat)
    const waypointsToRestore = waypointManager.restorePathAfterCombat();

    // ALWAYS restore waypoints after combat - player sees their route (no auto-movement)
    if (waypointsToRestore?.length > 0) {
      debugLog('PATH_HIGHLIGHTING', 'Restoring waypoints after combat:', { count: waypointsToRestore?.length });
      setWaypoints(waypointsToRestore);
      waypointManager.clearStoredPath();
    }

    // Re-fetch runState after potential path clearing
    runState = tacticalMapStateManager.getState();

    // Process pending POI combat (ONLY for POI encounters - loot processing)
    if (runState?.pendingPOICombat) {
      const { packType, q, r, poiName, fromSalvage, salvageFullyLooted } = runState.pendingPOICombat;

      // Debug: waypoint-specific logging for mount effect
      debugLog('COMBAT_FLOW', 'Mount effect - processing pendingPOICombat', {
        packType,
        poiName,
        waypointsToRestoreCount: waypointsToRestore?.length || 0,
        fromSalvage
      });

      // Debug logging for consecutive combat issues
      debugLog('MODE_TRANSITION', '=== Post-Combat POI Processing ===', {
        packType,
        fromSalvage,
        salvageFullyLooted,
        poi: { q, r, poiName }
      });
      debugLog('ENCOUNTER', 'Pending PoI combat detected after combat', runState.pendingPOICombat);

      // Clear pendingPOICombat from run state
      tacticalMapStateManager.setState({
        pendingPOICombat: null
      });

      // Empty hex encounters have null packType - no POI loot to collect
      // Player only gets enemy salvage from combat
      if (!packType) {
        debugLog('MODE_TRANSITION', 'Empty hex encounter - no POI loot to collect');
        return;
      }

      // If from salvage, restore the salvage modal to show revealed loot
      if (fromSalvage) {
        const tacticalRunState = tacticalMapStateManager.getState();
        const pendingSalvageState = tacticalRunState?.pendingSalvageState;

        if (pendingSalvageState) {
          debugLog('SALVAGE', 'Salvage combat victory - restoring salvage modal');

          // Calculate high alert bonus (combat at POI increases encounter chance)
          const highAlertBonus = HighAlertManager.getAlertBonus(tacticalRunState, { q, r }) * 100;

          // Reset salvage state for continued operation (clears encounterTriggered, adds bonus)
          const restoredState = SalvageController.resetAfterCombat(pendingSalvageState, highAlertBonus);

          // Add a flag to indicate this is a post-combat return
          restoredState.returnedFromCombat = true;

          // Restore salvage modal
          setActiveSalvage(restoredState);
          setShowSalvageModal(true);

          // Clear pending states (but keep pendingSalvageState until salvage complete)
          // Only clear pendingSalvageState if all slots are revealed
          const salvageComplete = SalvageController.isFullyLooted(restoredState);

          tacticalMapStateManager.setState({
            pendingPOICombat: null,
            pendingSalvageState: salvageComplete ? null : restoredState
          });

          debugLog('RUN_STATE', 'Salvage state after combat:', {
            slotsRevealed: restoredState.slots.filter(s => s.revealed).length,
            totalSlots: restoredState.totalSlots,
            salvageComplete,
            statePreserved: !salvageComplete
          });

          return;
        }

        // Fallback: If no pending salvage state (shouldn't happen), use old behavior
        debugLog('SALVAGE', '[WARN] No pendingSalvageState found, using fallback behavior');

        if (salvageFullyLooted) {
          const lootedPOIs = tacticalRunState?.lootedPOIs || [];
          tacticalMapStateManager.setState({
            lootedPOIs: [...lootedPOIs, { q, r }]
          });
          debugLog('ENCOUNTER', 'POI marked as looted (fallback)');
          return;
        } else {
          const updatedRunState = HighAlertManager.addHighAlert(tacticalRunState, { q, r });
          tacticalMapStateManager.setState({
            highAlertPOIs: updatedRunState.highAlertPOIs
          });
          debugLog('ENCOUNTER', 'POI in high alert (fallback)');
          return;
        }
      }

      // Regular PoI combat (no salvage) - generate PoI loot as reward
      const tier = runState.mapData?.tier || 1;
      const tierConfig = mapTiers[tier - 1];

      // Find the hex to get zone for loot generation
      const hex = runState.mapData?.hexes?.find(h => h.q === q && h.r === r);
      const zone = hex?.zone || 'mid';

      // Generate PoI loot
      let poiLoot;

      if (isBlueprintRewardType(packType)) {
        // Blueprint PoI blueprints already generated by CombatOutcomeProcessor
        // Do NOT regenerate to avoid duplicates
        debugLog('COMBAT_FLOW', 'Blueprint PoI - skipping duplicate generation (handled by CombatOutcomeProcessor)');

        poiLoot = {
          cards: [],
          credits: 0,
          blueprint: null
        };
      } else {
        // Regular pack reward - use RewardManager
        poiLoot = rewardManager.generatePOIRewards({
          poiData: { rewardType: packType },
          outcome: 'loot',
          tier: tier,
          zone: zone,
          tierConfig: tierConfig
        });
      }

      debugLog('LOOT', 'Generated PoI loot after regular combat', poiLoot);

      // Check if there's actually any loot to display
      const hasVisibleLoot = !!((poiLoot.cards?.length > 0) ||
                                poiLoot.blueprint ||
                                (poiLoot.salvageItems?.length > 0));

      // Skip loot modal only if truly empty (credits-only rewards)
      if (!hasVisibleLoot) {
        debugLog('COMBAT_FLOW', 'Mount effect - NO VISIBLE LOOT path (credits-only)');
        return;
      }

      // Check if this is blueprint-only loot (use dedicated modal)
      const isBlueprintOnly = poiLoot.blueprint &&
                              (!poiLoot.cards || poiLoot.cards.length === 0) &&
                              (!poiLoot.salvageItems || poiLoot.salvageItems.length === 0);

      if (isBlueprintOnly) {
        // Use dedicated blueprint reveal modal
        debugLog('COMBAT_FLOW', 'Mount effect - BLUEPRINT ONLY path');
        setPendingBlueprintReward(poiLoot.blueprint);
        setShowBlueprintRewardModal(true);
        setPendingLootEncounter({
          poi: { q, r, poiData: { name: poiName, threatIncrease: 10 } }
        });
      } else {
        // Use generic loot modal (for mixed loot or non-blueprint)
        setPendingLootEncounter({
          poi: { q, r, poiData: { name: poiName, threatIncrease: 10 } }
        });
        setPoiLootToReveal(poiLoot);
      }
    }

    // Log post-combat state restoration
    runState = tacticalMapStateManager.getState();
    if (waypointsToRestore || runState?.pendingPOICombat || runState?.pendingBlockadeExtraction) {
      debugLog('COMBAT_FLOW', 'Post-combat state restored', {
        position: { q: runState?.playerPosition?.q, r: runState?.playerPosition?.r },
        waypointsRestored: waypointsToRestore?.length || 0,
        waypointDestinations: waypointsToRestore?.map(wp => `(${wp?.hex?.q},${wp?.hex?.r})`).join(' -> '),
        detection: runState?.detection,
        hull: runState?.currentHull,
        pendingPOICombat: !!runState?.pendingPOICombat,
        pendingBlockadeExtraction: !!runState?.pendingBlockadeExtraction
      });
    }
  }, []); // Run once on mount
}
