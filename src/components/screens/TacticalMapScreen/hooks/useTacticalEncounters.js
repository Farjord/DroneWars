// ========================================
// USE TACTICAL ENCOUNTERS HOOK
// ========================================
// Manages all encounter-related handlers: POI encounters, blueprint encounters,
// salvage operations, quick deploy routing, and combat loading transitions.
// Extracted from TacticalMapScreen.jsx (Step 6).

import { useCallback } from 'react';
import tacticalMapStateManager from '../../../../managers/TacticalMapStateManager.js';
import gameStateManager from '../../../../managers/GameStateManager.js';
import transitionManager from '../../../../managers/TransitionManager.js';
import SinglePlayerCombatInitializer from '../../../../logic/singlePlayer/SinglePlayerCombatInitializer.js';
import DetectionManager from '../../../../logic/detection/DetectionManager.js';
import EncounterController from '../../../../logic/encounters/EncounterController.js';
import SalvageController from '../../../../logic/salvage/SalvageController.js';
import rewardManager from '../../../../managers/RewardManager.js';
import aiPersonalities from '../../../../data/aiData.js';
import { generateSalvageItemFromValue } from '../../../../data/salvageItemData.js';
import { mapTiers } from '../../../../data/mapData.js';
import { debugLog } from '../../../../utils/debugLogger.js';
import SeededRandom from '../../../../utils/seededRandom.js';

/**
 * Hook that provides all encounter-related handlers for TacticalMapScreen.
 *
 * Handles: POI encounters (proceed/close), blueprint guardian encounters
 * (accept/decline/quick-deploy), salvage operations (slot/leave/combat/quit),
 * quick deploy routing, and combat loading screen completion.
 *
 * The encounterResolveRef pattern: Several handlers call encounterResolveRef.current()
 * to resolve the promise that the movement loop is awaiting, allowing it to exit cleanly.
 */
export function useTacticalEncounters({
  currentEncounter,
  setCurrentEncounter,
  setShowPOIModal,
  showSalvageModal,
  setShowSalvageModal,
  activeSalvage,
  setActiveSalvage,
  salvageQuickDeployPending,
  setSalvageQuickDeployPending,
  extractionQuickDeployPending,
  setExtractionQuickDeployPending,
  showBlueprintEncounterModal,
  setShowBlueprintEncounterModal,
  pendingBlueprintEncounter,
  setPendingBlueprintEncounter,
  setBlueprintQuickDeployPending,
  setPendingBlueprintReward,
  setShowBlueprintRewardModal,
  setShowQuickDeploySelection,
  setShowLoadingEncounter,
  loadingEncounterData,
  setLoadingEncounterData,
  setPoiLootToReveal,
  setPendingLootEncounter,
  setPendingResumeWaypoints,
  setIsMoving,
  setIsPaused,
  setIsScanningHex,
  setShowExtractionConfirm,
  waypoints,
  setWaypoints,
  currentRunState,
  sharedRefs,
}) {
  // Destructure refs for cleaner access
  const {
    encounterResolveRef,
    shouldStopMovement,
    pendingCombatLoadingRef,
    pathProgressRef,
    skipWaypointRemovalRef,
  } = sharedRefs;

  // ========================================
  // POI ENCOUNTER HANDLERS
  // ========================================

  /**
   * Handle POI encounter - called when player proceeds from modal
   */
  const handleEncounterProceed = useCallback(() => {
    if (!currentEncounter) return;

    debugLog('ENCOUNTER', 'Encounter proceed clicked, outcome:', currentEncounter.outcome);

    // Check if this encounter triggers combat
    if (currentEncounter.outcome === 'combat') {
      debugLog('COMBAT_FLOW', 'Combat encounter - showing loading screen');

      // Find AI personality info for the loading screen
      const aiId = currentEncounter.aiId;
      if (!aiId) {
        debugLog('COMBAT_FLOW', '[ERROR] CRITICAL: No aiId in currentEncounter for POI combat', currentEncounter);
        return;
      }
      const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

      // Set up loading encounter data
      setLoadingEncounterData({
        aiName: aiPersonality?.name || 'Unknown Hostile',
        difficulty: aiPersonality?.difficulty || 'Medium',
        threatLevel: currentEncounter.threatLevel || 'medium',
        isAmbush: currentEncounter.isAmbush || false
      });

      // Close POI modal and show loading screen
      setShowPOIModal(false);
      pendingCombatLoadingRef.current = true; // Prevent waypoint clearing during loading
      setShowLoadingEncounter(true);

      // Stop movement
      shouldStopMovement.current = true;
      setIsScanningHex(false);
      setIsMoving(false);

      // Resolve the encounter promise so movement loop can exit cleanly
      // Without this, the promise at line ~582 hangs indefinitely
      if (encounterResolveRef.current) {
        encounterResolveRef.current();
        encounterResolveRef.current = null;
      }

      return;
    }

    // For loot outcome - generate loot and show reveal modal
    if (currentEncounter.outcome === 'loot') {
      debugLog('LOOT', 'Loot encounter - generating loot');

      // Get pack type from POI reward
      const packType = currentEncounter.reward?.rewardType;

      // Empty hex encounters have null rewardType - no POI loot to generate
      if (!packType) {
        debugLog('LOOT', 'No pack type (empty hex loot outcome) - skipping loot generation');
        setCurrentEncounter(null);
        return;
      }

      const tier = currentRunState?.mapData?.tier || 1;

      // Get zone for reward weighting (core zones give better rewards)
      const zone = currentEncounter.poi?.zone || 'mid';
      const tierConfig = currentRunState?.mapData ? mapTiers[currentRunState.mapData.tier - 1] : null;

      // Handle special reward types that don't use pack system
      let loot;
      if (packType === 'TOKEN_REWARD') {
        // Token reward - guaranteed 1 security token + salvage item (50-100 credits)
        const rng = SeededRandom.fromGameState(gameStateManager.getState());
        const creditValue = 50 + Math.floor(rng.random() * 51);
        const salvageItem = generateSalvageItemFromValue(creditValue, rng);
        loot = {
          cards: [],
          salvageItem,
          token: {
            type: 'token',
            tokenType: 'security',
            amount: 1,
            source: 'contraband_cache'
          }
        };
        debugLog('LOOT', 'Generated token reward', loot);
      } else {
        // Generate loot using RewardManager with zone-based weighting
        loot = rewardManager.generatePOIRewards({
          poiData: { rewardType: packType },
          outcome: 'loot',
          tier: tier,
          zone: zone,
          tierConfig: tierConfig
        });
        debugLog('LOOT', 'Generated loot', { zone, loot });
      }

      // Store encounter for later completion (need to add detection after loot collected)
      setPendingLootEncounter(currentEncounter);

      // Show loot reveal modal
      setPoiLootToReveal(loot);

      // Close POI modal but don't complete encounter yet
      setShowPOIModal(false);
      setCurrentEncounter(null);

      return;
    }

    // Fallback: Complete the encounter (adds detection, awards credits)
    EncounterController.completeEncounter(currentEncounter);

    // Clear encounter state
    setCurrentEncounter(null);
    setShowPOIModal(false);

    // Resume movement by resolving the waiting promise
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
      encounterResolveRef.current = null;
    }
  }, [currentEncounter, currentRunState, waypoints]);

  /**
   * Handle closing POI modal without proceeding
   */
  const handleEncounterClose = useCallback(() => {
    // For now, closing is same as proceeding
    // Later could add "flee" option with different consequences
    handleEncounterProceed();
  }, [handleEncounterProceed]);

  // ========================================
  // BLUEPRINT ENCOUNTER HANDLERS
  // ========================================

  /**
   * Handle blueprint encounter accept - initiate combat with guardian AI
   */
  const handleBlueprintEncounterAccept = useCallback(async () => {
    if (!pendingBlueprintEncounter) return;

    debugLog('ENCOUNTER', 'Blueprint encounter accepted - initiating combat');
    setShowBlueprintEncounterModal(false);

    const encounter = pendingBlueprintEncounter;

    // Store encounter data for combat initialization
    setCurrentEncounter({
      poi: encounter.poi,
      outcome: 'combat',
      aiId: encounter.aiId,           // Required by handleLoadingEncounterComplete
      reward: encounter.reward,        // Needed for pendingPOICombat
      fromBlueprintPoI: true           // Flag for special handling
    });

    // Store encounter info for victory processing
    tacticalMapStateManager.setState({
      pendingPOICombat: {
        packType: encounter.reward.rewardType,
        fromBlueprintPoI: true  // Flag for conditional threat increase
      },
      currentPOI: encounter.poi  // Store for threat calculation
    });

    // Transition to combat with loading screen
    setLoadingEncounterData({
      aiName: encounter.aiData.name,
      aiShipClass: encounter.aiData.shipClass,
      aiDifficulty: encounter.aiData.difficulty,
      escapeDamage: encounter.aiData.escapeDamage,
      transitionMessage: `Engaging ${encounter.poi.poiData.name}...`
    });
    pendingCombatLoadingRef.current = true; // Prevent waypoint clearing during loading
    setShowLoadingEncounter(true);

    // Stop movement before resolving promise (prevents journey from continuing)
    shouldStopMovement.current = true;
    setIsMoving(false);

    // Combat will be initiated by handleLoadingEncounterComplete
    // Resume movement logic after modal dismissal
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
    }
  }, [pendingBlueprintEncounter]);

  /**
   * Handle blueprint encounter decline - player stays on hex
   * No damage, no animations, instant return to tactical map
   * PoI remains available for re-engagement
   */
  const handleBlueprintEncounterDecline = useCallback(() => {
    debugLog('ENCOUNTER', 'Blueprint encounter declined - staying on hex');

    setShowBlueprintEncounterModal(false);
    setPendingBlueprintEncounter(null);
    setIsPaused(false);

    // Player stays on hex, can move away or try again later
    // PoI remains available (not marked as looted/visited - handled by Phase 8)
    // NO damage taken, NO loading screens, instant return

    // Resume movement logic
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
    }
  }, []);

  /**
   * Handle blueprint encounter quick deploy
   * Opens quick deploy selection modal
   */
  const handleBlueprintQuickDeploy = useCallback(() => {
    debugLog('QUICK_DEPLOY', 'Blueprint encounter - opening quick deploy selection');
    setShowBlueprintEncounterModal(false);
    setShowQuickDeploySelection(true);
    setBlueprintQuickDeployPending(true);  // Flag to track blueprint quick deploy
  }, []);

  /**
   * Handle blueprint encounter accept WITH quick deployment
   */
  const handleBlueprintEncounterAcceptWithQuickDeploy = useCallback((deployment) => {
    if (!pendingBlueprintEncounter) return;

    debugLog('QUICK_DEPLOY', 'Blueprint encounter accepted with quick deploy:', deployment.name);

    const encounter = pendingBlueprintEncounter;

    // Store encounter data for combat initialization
    setCurrentEncounter({
      poi: encounter.poi,
      outcome: 'combat',
      aiId: encounter.aiId,
      reward: encounter.reward,
      fromBlueprintPoI: true
      // Note: Blueprint PoI is NOT a blockade - do not set isBlockade flag
    });

    // Store encounter info for victory processing
    tacticalMapStateManager.setState({
      pendingPOICombat: {
        packType: encounter.reward.rewardType,
        fromBlueprintPoI: true
      },
      currentPOI: encounter.poi
    });

    // Transition to combat with loading screen + quick deploy
    setLoadingEncounterData({
      aiName: encounter.aiData.name,
      aiShipClass: encounter.aiData.shipClass,
      aiDifficulty: encounter.aiData.difficulty,
      escapeDamage: encounter.aiData.escapeDamage,
      transitionMessage: `Engaging ${encounter.poi.poiData.name}...`,
      quickDeployId: deployment.id  // Include quick deploy ID
    });
    pendingCombatLoadingRef.current = true; // Prevent waypoint clearing during loading
    setShowLoadingEncounter(true);

    // Stop movement before resolving promise (prevents journey from continuing)
    shouldStopMovement.current = true;
    setIsMoving(false);

    // Resume movement logic
    if (encounterResolveRef.current) {
      encounterResolveRef.current();
    }
  }, [pendingBlueprintEncounter]);

  // ========================================
  // SALVAGE HANDLERS
  // ========================================

  /**
   * Handle salvage slot attempt - reveal next slot, check for encounter
   */
  const handleSalvageSlot = useCallback(() => {
    if (!activeSalvage) return;

    debugLog('SALVAGE', 'Salvage slot attempt');

    const runState = tacticalMapStateManager.getState();
    const tierConfig = runState?.mapData ? mapTiers[runState.mapData.tier - 1] : null;

    // Attempt salvage - this reveals the slot and checks for encounter
    const result = SalvageController.attemptSalvage(activeSalvage, tierConfig);

    // Use the updated salvage state directly from the result
    setActiveSalvage(result.salvageState);

    debugLog('SALVAGE', 'Salvage result', {
      slotContent: result.slotContent,
      encounterTriggered: result.encounterTriggered,
      newEncounterChance: result.salvageState.currentEncounterChance.toFixed(1)
    });
  }, [activeSalvage]);

  /**
   * Handle leaving salvage - show LootRevealModal for revealed items
   */
  const handleSalvageLeave = useCallback(() => {
    if (!activeSalvage) return;

    debugLog('SALVAGE', 'Salvage leave - preparing loot reveal');

    // Collect revealed loot
    const loot = SalvageController.collectRevealedLoot(activeSalvage);
    const hasRevealedSlots = SalvageController.hasRevealedAnySlots(activeSalvage);

    // Close salvage modal first
    setActiveSalvage(null);
    setShowSalvageModal(false);

    // If player revealed any slots, show LootRevealModal
    // Check for cards OR salvageItems OR tokens
    if (hasRevealedSlots && loot && (loot.cards?.length > 0 || loot.salvageItems?.length > 0 || loot.tokens?.length > 0)) {
      // Convert to LootRevealModal format
      // Keep salvageItems as array - each should be shown individually
      const lootForModal = {
        cards: loot.cards || [],  // Already has cardId, cardName from RewardManager
        // Pass salvageItems array directly - each item should be shown separately
        salvageItems: loot.salvageItems || [],
        // Pass tokens array for display and collection
        tokens: loot.tokens || []
      };

      debugLog('LOOT', 'Showing loot reveal modal', lootForModal);

      // Set pending encounter info for handlePOILootCollected
      setPendingLootEncounter({ poi: activeSalvage.poi });
      // Show loot reveal modal
      setPoiLootToReveal(lootForModal);

      // Note: encounterResolveRef will be resolved by handlePOILootCollected
    } else {
      // No loot revealed - just resume journey
      debugLog('SALVAGE', 'No loot revealed, resuming journey');

      if (encounterResolveRef.current) {
        encounterResolveRef.current();
        encounterResolveRef.current = null;
      }
    }
  }, [activeSalvage]);

  /**
   * Handle salvage combat engagement - player chooses to fight
   */
  const handleSalvageCombat = useCallback(() => {
    if (!activeSalvage) return;

    debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> inGame (user action) ===', {
      trigger: 'user_action',
      source: 'TacticalMapScreen.handleSalvageCombat',
      detail: 'User clicked Engage on salvage encounter'
    });

    debugLog('SALVAGE', 'Salvage encounter - engaging combat');

    // First collect current revealed loot
    const loot = SalvageController.collectRevealedLoot(activeSalvage);

    // Store salvage loot for combination with combat rewards in CombatOutcomeProcessor
    // This allows both salvage loot and combat rewards to appear in one LootRevealModal
    const runState = tacticalMapStateManager.getState();

    // Store salvage loot and FULL salvage state for post-combat restoration
    // Convert salvageItems array to single salvageItem for CombatOutcomeProcessor
    const totalCreditValue = (loot.salvageItems || []).reduce((sum, item) => sum + (item.creditValue || 0), 0);
    const firstSalvageItem = loot.salvageItems?.[0];

    // Check for cards OR salvageItems OR tokens
    const hasLoot = loot && (loot.cards?.length > 0 || loot.salvageItems?.length > 0 || loot.tokens?.length > 0);

    if (runState) {
      tacticalMapStateManager.setState({
        // Store revealed loot for later collection on salvage screen
        pendingSalvageLoot: hasLoot ? {
          cards: loot.cards || [],
          salvageItem: loot.salvageItems?.length > 0 ? {
            itemId: loot.salvageItems.length > 1 ? 'combined_salvage' : firstSalvageItem?.itemId,
            name: loot.salvageItems.length > 1 ? `${loot.salvageItems.length} Salvage Items` : firstSalvageItem?.name,
            creditValue: totalCreditValue,
            image: firstSalvageItem?.image,
            description: loot.salvageItems.length > 1
              ? `Combined value of ${loot.salvageItems.length} salvage items`
              : firstSalvageItem?.description
          } : null,
          // Include tokens from salvage
          tokens: loot.tokens || []
        } : null,
        // Store FULL salvage state for restoring modal after combat
        pendingSalvageState: activeSalvage
      });
    }

    // NOTE: Do NOT mark POI as looted before combat.
    // If player wins, they can continue looting (POI enters High Alert state).
    // If player escapes, POI will be marked as looted then.

    // Get tier config for AI selection
    const tier = runState?.mapData?.tier || 1;
    const tierConfig = mapTiers[tier - 1];
    const detection = DetectionManager.getCurrentDetection();

    // Get AI from threat level (pass POI for location-based seeding)
    const aiId = EncounterController.getAIForThreat(tierConfig, detection, activeSalvage?.poi);
    const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

    // Close salvage modal
    setActiveSalvage(null);
    setShowSalvageModal(false);

    // Check if all slots were revealed (for determining High Alert vs Looted after combat)
    const salvageFullyLooted = SalvageController.isFullyLooted(activeSalvage);

    // Create encounter for loading screen
    setCurrentEncounter({
      poi: activeSalvage.poi,
      outcome: 'combat',
      aiId,
      reward: {
        credits: 50,
        rewardType: activeSalvage.poi?.poiData?.rewardType || null,
        poiName: activeSalvage.poi?.poiData?.name || 'Unknown Location'
      },
      detection,
      threatLevel: DetectionManager.getThreshold(),
      fromSalvage: true,
      salvageFullyLooted
    });

    // Set up loading encounter data
    setLoadingEncounterData({
      aiName: aiPersonality?.name || 'Unknown Hostile',
      difficulty: aiPersonality?.difficulty || 'Medium',
      threatLevel: DetectionManager.getThreshold(),
      isAmbush: false
    });

    // Show loading screen
    pendingCombatLoadingRef.current = true; // Prevent waypoint clearing during loading
    setShowLoadingEncounter(true);

    // Stop movement
    shouldStopMovement.current = true;
    setIsMoving(false);
  }, [activeSalvage, waypoints]);

  /**
   * Handle salvage abort (MIA) - player abandons run when encounter triggered
   */
  const handleSalvageQuit = useCallback(() => {
    if (!activeSalvage) return;

    debugLog('SALVAGE', 'Salvage abort - triggering MIA');

    // Close salvage modal
    setActiveSalvage(null);
    setShowSalvageModal(false);

    // Trigger MIA flow
    DetectionManager.triggerMIA();
  }, [activeSalvage]);

  // ========================================
  // QUICK DEPLOY ROUTING
  // ========================================

  /**
   * Handle POI encounter with quick deploy - similar to handleEncounterProceed but with quick deploy
   */
  const handleEncounterProceedWithQuickDeploy = useCallback((deployment) => {
    debugLog('QUICK_DEPLOY', 'Quick deploy selected:', deployment.name);

    // Check if this is an extraction blockade quick deploy
    if (extractionQuickDeployPending) {
      debugLog('QUICK_DEPLOY', 'Extraction blockade with quick deploy');
      setExtractionQuickDeployPending(false);

      const runState = tacticalMapStateManager.getState();

      if (!runState) {
        debugLog('QUICK_DEPLOY', '[WARN] No run state for blockade quick deploy');
        return;
      }

      // Get AI for blockade combat
      const tier = runState.mapData?.tier || 1;
      const tierCfg = mapTiers[tier - 1];
      const detection = DetectionManager.getCurrentDetection();
      const aiId = EncounterController.getAIForThreat(tierCfg, detection, null);

      // Find AI personality info for the loading screen
      const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

      // Create encounter for combat
      setCurrentEncounter({
        outcome: 'combat',
        aiId,
        isBlockade: true
      });

      // Close quick deploy selection
      setShowQuickDeploySelection(false);



      // Set up loading encounter data with quick deploy info
      setLoadingEncounterData({
        aiName: aiPersonality?.name || 'Blockade Fleet',
        difficulty: aiPersonality?.difficulty || 'Hard',
        threatLevel: 'high',
        isAmbush: false,
        isBlockade: true,
        quickDeployId: deployment.id
      });

      // Show loading screen
      setShowLoadingEncounter(true);
      return;
    }

    // Check if this is a salvage encounter quick deploy
    if (salvageQuickDeployPending && activeSalvage) {
      debugLog('QUICK_DEPLOY', 'Salvage combat with quick deploy');
      setSalvageQuickDeployPending(false);

      // Collect current revealed loot (same as handleSalvageCombat)
      const loot = SalvageController.collectRevealedLoot(activeSalvage);

      // Store salvage loot for combination with combat rewards
      const runState = tacticalMapStateManager.getState();

      if (runState && loot && (loot.cards?.length > 0 || loot.salvageItems?.length > 0 || loot.tokens?.length > 0)) {
        const totalCreditValue = (loot.salvageItems || []).reduce((sum, item) => sum + (item.creditValue || 0), 0);
        const firstSalvageItem = loot.salvageItems?.[0];

        tacticalMapStateManager.setState({
          pendingSalvageLoot: {
            cards: loot.cards || [],
            salvageItem: loot.salvageItems?.length > 0 ? {
              itemId: loot.salvageItems.length > 1 ? 'combined_salvage' : firstSalvageItem?.itemId,
              name: loot.salvageItems.length > 1 ? `${loot.salvageItems.length} Salvage Items` : firstSalvageItem?.name,
              creditValue: totalCreditValue,
              image: firstSalvageItem?.image,
              description: loot.salvageItems.length > 1
                ? `Combined value of ${loot.salvageItems.length} salvage items`
                : firstSalvageItem?.description
            } : null,
            // Include tokens from salvage
            tokens: loot.tokens || []
          }
        });
      }

      // NOTE: Do NOT mark POI as looted before combat.
      // If player wins, they can continue looting (POI enters High Alert state).
      // If player escapes, POI will be marked as looted then.

      // Get tier config for AI selection
      const tier = runState?.mapData?.tier || 1;
      const salvageTierConfig = mapTiers[tier - 1];
      const detection = DetectionManager.getCurrentDetection();

      // Get AI from threat level
      const aiId = EncounterController.getAIForThreat(salvageTierConfig, detection, activeSalvage?.poi);
      const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

      // Create encounter for combat
      setCurrentEncounter({
        poi: activeSalvage.poi,
        outcome: 'combat',
        aiId,
        reward: {
          credits: 50,
          rewardType: activeSalvage.poi?.poiData?.rewardType || null,
          poiName: activeSalvage.poi?.poiData?.name || 'Unknown Location'
        },
        detection,
        threatLevel: DetectionManager.getThreshold(),
        fromSalvage: true
      });

      // Close salvage modal
      setActiveSalvage(null);
      setShowSalvageModal(false);



      // Set up loading encounter data with quick deploy info
      setLoadingEncounterData({
        aiName: aiPersonality?.name || 'Unknown Hostile',
        difficulty: aiPersonality?.difficulty || 'Medium',
        threatLevel: DetectionManager.getThreshold(),
        isAmbush: false,
        quickDeployId: deployment.id
      });

      // Show loading screen
      pendingCombatLoadingRef.current = true; // Prevent waypoint clearing during loading
      setShowLoadingEncounter(true);

      // Stop movement
      shouldStopMovement.current = true;
      setIsMoving(false);
      return;
    }

    // Regular POI encounter quick deploy
    if (!currentEncounter) return;

    // Only combat encounters use quick deploy
    if (currentEncounter.outcome === 'combat') {
      debugLog('QUICK_DEPLOY', 'Combat encounter with quick deploy - showing loading screen');

      // Find AI personality info for the loading screen
      const aiId = currentEncounter.aiId;
      if (!aiId) {
        debugLog('QUICK_DEPLOY', '[ERROR] CRITICAL: No aiId in currentEncounter for quick deploy combat', currentEncounter);
        return;
      }
      const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

      // Set up loading encounter data with quick deploy info
      setLoadingEncounterData({
        aiName: aiPersonality?.name || 'Unknown Hostile',
        difficulty: aiPersonality?.difficulty || 'Medium',
        threatLevel: currentEncounter.threatLevel || 'medium',
        isAmbush: currentEncounter.isAmbush || false,
        quickDeployId: deployment.id  // Pass the quick deploy ID
      });



      // Show loading screen
      pendingCombatLoadingRef.current = true; // Prevent waypoint clearing during loading
      setShowLoadingEncounter(true);

      // Stop movement
      shouldStopMovement.current = true;
      setIsScanningHex(false);
      setIsMoving(false);
    }
  }, [extractionQuickDeployPending, currentEncounter, salvageQuickDeployPending, activeSalvage, waypoints]);

  // ========================================
  // COMBAT LOADING COMPLETION
  // ========================================

  /**
   * Handle loading encounter complete - actually start combat
   */
  const handleLoadingEncounterComplete = useCallback(async () => {
    debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> inGame (initiating) ===', {
      trigger: 'async_event',
      source: 'TacticalMapScreen.handleLoadingEncounterComplete',
      detail: 'Loading screen completed, starting combat init',
      encounterType: loadingEncounterData?.isBlockade ? 'blockade' : 'poi',
      aiId: loadingEncounterData?.aiId
    });

    // CRITICAL: Check abort flag FIRST - catches race condition early
    if (gameStateManager.get('runAbandoning')) {
      debugLog('SP_COMBAT', 'ABORT: runAbandoning flag detected - cancelling combat init');
      debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> inGame (ABORTED) ===', {
        trigger: 'safety_check',
        source: 'TacticalMapScreen.handleLoadingEncounterComplete',
        detail: 'runAbandoning flag detected'
      });
      pendingCombatLoadingRef.current = false;
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);
      return;
    }

    let runState = tacticalMapStateManager.getState();

    // CRITICAL: Validate run state exists before proceeding
    if (!runState || !runState.mapData) {
      debugLog('SP_COMBAT', 'ABORT: Run state cleared before combat could initialize', {
        hasRunState: !!runState,
        hasMapData: !!runState?.mapData
      });
      debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> inGame (ABORTED) ===', {
        trigger: 'safety_check',
        source: 'TacticalMapScreen.handleLoadingEncounterComplete',
        detail: 'Run state is null or invalid'
      });
      pendingCombatLoadingRef.current = false;
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);
      return;
    }

    debugLog('RUN_STATE', 'Loading complete - initializing combat');

    // Get AI from the encounter - CRITICAL: must have valid aiId
    const aiId = currentEncounter?.aiId;
    if (!aiId) {
      debugLog('COMBAT_FLOW', '[ERROR] CRITICAL: No aiId in currentEncounter for combat initialization', currentEncounter);
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);
      return;
    }

    // Determine entry reason for TransitionManager
    let entryReason = 'poi_encounter';
    if (currentEncounter?.isBlockade) {
      entryReason = 'blockade';
    } else if (currentEncounter?.fromSalvage) {
      entryReason = 'salvage_encounter';
    } else if (currentEncounter?.fromBlueprintPoI) {
      entryReason = 'blueprint_poi';
    } else if (loadingEncounterData?.quickDeployId) {
      entryReason = 'quick_deploy_poi';
    }

    // Prepare for combat using TransitionManager (single entry point)
    // This captures: tactical map state, waypoints, salvage state (if mid-salvage)
    // NOTE: Use pathProgressRef for sync access since React state can be stale in closures
    // Paths are trimmed in real-time during movement, so waypoints[0] always starts at current position
    try {
      transitionManager.prepareForCombat({
        entryReason,
        sourceLocation: 'TacticalMapScreen:handleLoadingEncounterComplete',
        aiId,
        poi: currentEncounter?.poi,
        waypointContext: waypoints.length > 0 ? {
          waypoints,
          // After path trimming, current waypoint is always at index 0
          // and current position is always at start of pathFromPrev (hexIndex 0)
          currentWaypointIndex: 0,
          currentHexIndex: 0,
          isAtPOI: currentEncounter?.fromSalvage || false,
          // Include ref values for debugging/logging purposes
          originalProgress: pathProgressRef.current
        } : null,
        salvageState: currentEncounter?.fromSalvage ? activeSalvage : null,
        isBlockade: currentEncounter?.isBlockade || false,
        isBlueprintPoI: currentEncounter?.fromBlueprintPoI || false,
        quickDeployId: loadingEncounterData?.quickDeployId || null
      });

      // Clear pending combat loading ref - prepareForCombat has captured the waypoints
      pendingCombatLoadingRef.current = false;
    } catch (error) {
      debugLog('COMBAT_FLOW', '[ERROR] TransitionManager.prepareForCombat failed:', error);

      // Reset TransitionManager to prevent stuck state
      // Note: prepareForCombat now auto-resets on failure, but this is a safety net
      transitionManager.forceReset();

      pendingCombatLoadingRef.current = false;
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);
      return;
    }

    // Store pending PoI combat info for post-combat loot (ONLY for POI encounters)
    // This allows the player to loot the PoI after winning combat
    if (currentEncounter?.poi) {
      debugLog('RUN_STATE', 'Storing pendingPOICombat for post-combat loot:', {
        poi: { q: currentEncounter.poi.q, r: currentEncounter.poi.r },
        packType: currentEncounter.reward?.rewardType || null
      });

      tacticalMapStateManager.setState({
        pendingPOICombat: {
          q: currentEncounter.poi.q,
          r: currentEncounter.poi.r,
          packType: currentEncounter.reward?.rewardType || null,
          poiName: currentEncounter.poi.poiData?.name || 'Unknown Location',
          fromSalvage: currentEncounter.fromSalvage || false,
          salvageFullyLooted: currentEncounter.salvageFullyLooted || false
        }
      });
    }

    // Get quick deploy ID from loading data
    const quickDeployId = loadingEncounterData?.quickDeployId || null;

    // Re-fetch runState after TransitionManager update
    const updatedRunState = tacticalMapStateManager.getState();

    // Log combat initiation
    debugLog('COMBAT_FLOW', 'Initiating combat', {
      type: currentEncounter?.fromBlueprintPoI ? 'Blueprint PoI' :
            currentEncounter?.fromSalvage ? 'Salvage Encounter' :
            currentEncounter?.isBlockade ? 'Blockade' : 'Random/PoI',
      aiId: currentEncounter?.aiId,
      position: updatedRunState?.playerPosition,
      hasQuickDeploy: !!quickDeployId
    });

    // Log pre-combat state snapshot
    debugLog('COMBAT_FLOW', 'Pre-combat state snapshot', {
      position: { q: updatedRunState?.playerPosition?.q, r: updatedRunState?.playerPosition?.r },
      detection: updatedRunState?.detection,
      hull: updatedRunState?.currentHull,
      hasPendingPath: !!updatedRunState?.pendingPath,
      pendingPathHexCount: updatedRunState?.pendingPath?.length || 0
    });

    // Initialize combat with optional quick deploy
    // Pass isBlockade flag so post-combat can auto-extract on blockade victory
    const success = await SinglePlayerCombatInitializer.initiateCombat(
      aiId,
      updatedRunState,
      quickDeployId,
      currentEncounter?.isBlockade || false
    );

    if (!success) {
      debugLog('COMBAT_FLOW', '[ERROR] Failed to initialize combat');

      // Reset TransitionManager since prepareForCombat succeeded but combat init failed
      transitionManager.forceReset();

      // Fall back to map
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);
    }

    // GameStateManager will handle the transition to inGame state
    // The appState change will unmount this component
  }, [currentEncounter, loadingEncounterData, waypoints, activeSalvage]);

  return {
    handleEncounterProceed,
    handleEncounterClose,
    handleBlueprintEncounterAccept,
    handleBlueprintEncounterDecline,
    handleBlueprintQuickDeploy,
    handleBlueprintEncounterAcceptWithQuickDeploy,
    handleSalvageSlot,
    handleSalvageLeave,
    handleSalvageCombat,
    handleSalvageQuit,
    handleEncounterProceedWithQuickDeploy,
    handleLoadingEncounterComplete,
  };
}
