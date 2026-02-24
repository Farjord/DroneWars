// ========================================
// USE TACTICAL EXTRACTION HOOK
// ========================================
// Manages all extraction and abandon handlers: extraction initiation,
// confirmation, blockade combat, quick deploy, and abandon run flow.
// Extracted from TacticalMapScreen.jsx (Step 7).

import { useCallback } from 'react';
import tacticalMapStateManager from '../../../../managers/TacticalMapStateManager.js';
import DetectionManager from '../../../../logic/detection/DetectionManager.js';
import EncounterController from '../../../../logic/encounters/EncounterController.js';
import ExtractionController from '../../../../logic/singlePlayer/ExtractionController.js';
import aiPersonalities from '../../../../data/aiData.js';
import { mapTiers } from '../../../../data/mapData.js';
import { debugLog } from '../../../../utils/debugLogger.js';

/**
 * Hook that provides all extraction and abandon handlers for TacticalMapScreen.
 *
 * Handles: extraction initiation (with blockade-cleared bypass), extraction confirmation,
 * extraction with Clearance Override item, blockade combat engagement, blockade quick deploy,
 * extraction loading screen completion, abandon run initiation and confirmation.
 */
export function useTacticalExtraction({
  setShowExtractionConfirm,
  setExtractionQuickDeployPending,
  setShowQuickDeploySelection,
  setExtractionScreenData,
  setShowExtractionScreen,
  setShowLoadingEncounter,
  setLoadingEncounterData,
  setShowAbandonModal,
  setShowLootSelectionModal,
  setPendingLootSelection,
  setIsMoving,
  setIsScanningHex,
  setCurrentEncounter,
  currentRunState,
  sharedRefs,
  validQuickDeployments,
}) {
  const { shouldStopMovement, pendingExtractionRef, pendingCombatLoadingRef, pathProgressRef } = sharedRefs;

  /**
   * Store extraction result and show the extraction loading screen.
   * Shared by handleExtract (blockade-cleared), handleExtractionConfirmed, and handleExtractionWithItem.
   */
  const showExtractionResult = useCallback((runState, result) => {
    setExtractionScreenData({
      creditsEarned: runState.creditsEarned || 0,
      cardsCollected: runState.collectedLoot?.filter(l => l.type === 'card').length || 0,
      aiCoresEarned: runState.aiCoresEarned || 0
    });
    pendingExtractionRef.current = result;
    setShowExtractionScreen(true);
  }, [setExtractionScreenData, pendingExtractionRef, setShowExtractionScreen]);

  /**
   * Handle extraction button click - show confirmation modal or extract directly if blockade already cleared
   */
  const handleExtract = useCallback(() => {
    debugLog('EXTRACTION', 'Extraction button clicked');

    // Stop any ongoing movement
    shouldStopMovement.current = true;
    setIsMoving(false);
    setIsScanningHex(false);

    // Check if blockade was already cleared (player won blockade combat)
    // This prevents double blockade encounters if auto-extraction failed to trigger
    const runState = tacticalMapStateManager.getState();

    if (runState?.blockadeCleared) {
      debugLog('EXTRACTION', 'Blockade already cleared - skipping modal, extracting directly');

      const result = ExtractionController.completeExtraction(runState);
      showExtractionResult(runState, result);
      return;
    }

    // Normal flow - show confirmation modal (modal handles blockade check internally)
    debugLog('EXTRACTION', 'Showing extraction confirmation modal');
    setShowExtractionConfirm(true);
  }, [shouldStopMovement, setIsMoving, setIsScanningHex, showExtractionResult, setShowExtractionConfirm]);

  /**
   * Handle extraction cancel - close confirmation modal
   */
  const handleExtractionCancel = useCallback(() => {
    debugLog('EXTRACTION', 'Extraction cancelled');
    setShowExtractionConfirm(false);
  }, [setShowExtractionConfirm]);

  /**
   * Handle safe extraction confirmed - complete the run
   * Called when modal completes scan and no blockade triggered
   */
  const handleExtractionConfirmed = useCallback(() => {
    debugLog('EXTRACTION', 'Safe extraction confirmed - completing run');
    setShowExtractionConfirm(false);

    const runState = tacticalMapStateManager.getState();

    if (!runState) {
      debugLog('EXTRACTION', '[WARN] No run state for extraction');
      return;
    }

    const result = ExtractionController.completeExtraction(runState);
    showExtractionResult(runState, result);
  }, [setShowExtractionConfirm, showExtractionResult]);

  /**
   * Handle extraction with Clearance Override item
   * Bypasses blockade check entirely
   */
  const handleExtractionWithItem = useCallback(() => {
    debugLog('EXTRACTION', 'Extraction with Clearance Override');

    const runState = tacticalMapStateManager.getState();

    if (!runState) {
      debugLog('EXTRACTION', '[WARN] No run state for extraction with item');
      return;
    }

    // Use the item and extract
    const result = ExtractionController.initiateExtractionWithItem(runState, true);

    if (result.action === 'extract' && result.itemUsed) {
      debugLog('EXTRACTION', 'Clearance Override successful - extracting');
      setShowExtractionConfirm(false);

      // Complete extraction (no blockade check needed)
      const extractionResult = ExtractionController.completeExtraction(runState);
      showExtractionResult(runState, extractionResult);
    } else {
      // Item use failed - shouldn't happen if button is only shown when available
      debugLog('EXTRACTION', '[WARN] Clearance Override failed');
    }
  }, [setShowExtractionConfirm, showExtractionResult]);

  /**
   * Handle blockade combat - engage with standard deploy
   * Called when modal detects blockade and player clicks Engage/Standard Deploy
   */
  const handleBlockadeCombat = useCallback(() => {
    debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> inGame (user action) ===', {
      trigger: 'user_action',
      source: 'TacticalMapScreen.handleBlockadeCombat',
      detail: 'User clicked Engage on blockade at extraction gate'
    });

    debugLog('EXTRACTION', 'Blockade detected - engaging combat');
    setShowExtractionConfirm(false);

    const runState = tacticalMapStateManager.getState();

    if (!runState) {
      debugLog('EXTRACTION', '[WARN] No run state for blockade combat');
      return;
    }

    // Get AI for blockade combat
    const tier = runState.mapData?.tier ?? 1;
    const tierCfg = mapTiers[tier - 1];
    const detection = DetectionManager.getCurrentDetection();
    const aiId = EncounterController.getAIForThreat(tierCfg, detection, null);

    // Find AI personality info for the loading screen
    const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

    // Set up loading encounter data
    setLoadingEncounterData({
      aiName: aiPersonality?.name || 'Blockade Fleet',
      difficulty: aiPersonality?.difficulty || 'Hard',
      threatLevel: 'high',
      isAmbush: false,
      isBlockade: true
    });

    // Store encounter for combat handling
    setCurrentEncounter({
      outcome: 'combat',
      aiId,
      isBlockade: true
    });

    // Show loading screen (will transition to combat)
    setShowLoadingEncounter(true);
  }, [setShowExtractionConfirm, setLoadingEncounterData, setCurrentEncounter, setShowLoadingEncounter]);

  /**
   * Handle blockade with quick deploy - show quick deploy selection
   * Called when modal detects blockade and player clicks Quick Deploy
   */
  const handleBlockadeQuickDeploy = useCallback(() => {
    debugLog('QUICK_DEPLOY', 'Blockade detected - opening quick deploy selection');
    setShowExtractionConfirm(false);
    setShowQuickDeploySelection(true);
    setExtractionQuickDeployPending(true);
  }, [setShowExtractionConfirm, setShowQuickDeploySelection, setExtractionQuickDeployPending]);

  /**
   * Handle extraction loading screen complete - proceed to loot selection or hangar
   */
  const handleExtractionScreenComplete = useCallback(() => {
    setShowExtractionScreen(false);
    setExtractionScreenData(null);

    const result = pendingExtractionRef.current;
    pendingExtractionRef.current = null;

    if (result?.action === 'selectLoot') {
      debugLog('LOOT', 'Loot selection required:', result.limit, 'max from', result.collectedLoot.length);
      setPendingLootSelection({
        collectedLoot: result.collectedLoot,
        limit: result.limit
      });
      setShowLootSelectionModal(true);
    } else {
      // Normal extraction complete - go directly to hangar (RunSummaryModal shows there)
      debugLog('EXTRACTION', 'Extraction complete - returning to hangar');
      // Use ExtractionController to avoid direct gameStateManager.setState() call (architecture pattern)
      ExtractionController.completeExtractionTransition();
    }
  }, [setShowExtractionScreen, setExtractionScreenData, pendingExtractionRef, setPendingLootSelection, setShowLootSelectionModal]);

  /**
   * Handle abandon run button click - show confirmation modal
   */
  const handleAbandon = useCallback(() => {
    debugLog('MODE_TRANSITION', 'Abandon run requested');
    setShowAbandonModal(true);
  }, [setShowAbandonModal]);

  /**
   * Handle abandon confirmation - trigger failed run flow
   * Uses ExtractionController.abandonRun() which sets showFailedRunScreen in GameStateManager
   * App.jsx renders the global FailedRunLoadingScreen based on that state
   */
  const handleConfirmAbandon = useCallback(() => {
    debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> failedRunScreen ===', {
      trigger: 'user_action',
      source: 'TacticalMapScreen.handleConfirmAbandon',
      detail: 'User confirmed abandon in modal'
    });

    debugLog('MODE_TRANSITION', 'Abandon confirmed - triggering failed run');

    // Stop any ongoing movement
    shouldStopMovement.current = true;
    setIsMoving(false);
    setIsScanningHex(false);

    // Close modal
    setShowAbandonModal(false);

    // Let ExtractionController handle the failed run flow
    // This sets showFailedRunScreen in GameStateManager which App.jsx renders
    ExtractionController.abandonRun();
  }, [shouldStopMovement, setIsMoving, setIsScanningHex, setShowAbandonModal]);

  return {
    handleExtract,
    handleExtractionCancel,
    handleExtractionConfirmed,
    handleExtractionWithItem,
    handleBlockadeCombat,
    handleBlockadeQuickDeploy,
    handleExtractionScreenComplete,
    handleAbandon,
    handleConfirmAbandon,
  };
}
