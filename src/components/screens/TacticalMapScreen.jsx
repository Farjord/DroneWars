// ========================================
// TACTICAL MAP SCREEN
// ========================================
// Main screen for in-run hex map navigation (Exploring the Eremos mode)
// Orchestrates hex grid rendering, player movement, encounters, and extraction

import React, { useState, useEffect, useRef, useCallback } from 'react';
import HexGridRenderer from '../ui/HexGridRenderer.jsx';
import TacticalMapHUD from '../ui/TacticalMapHUD.jsx';
import HexInfoPanel from '../ui/HexInfoPanel.jsx';
import TacticalTicker from '../ui/TacticalTicker.jsx';
import POIEncounterModal from '../modals/POIEncounterModal.jsx';
import BlueprintEncounterModal from '../modals/BlueprintEncounterModal.jsx';
import DroneBlueprintRewardModal from '../modals/DroneBlueprintRewardModal.jsx';
import SalvageModal from '../modals/SalvageModal.jsx';
import EscapeConfirmModal from '../modals/EscapeConfirmModal.jsx';
import QuickDeploySelectionModal from '../modals/QuickDeploySelectionModal.jsx';
import LoadingEncounterScreen from '../ui/LoadingEncounterScreen.jsx';
import ExtractionLoadingScreen from '../ui/ExtractionLoadingScreen.jsx';
import EscapeLoadingScreen from '../ui/EscapeLoadingScreen.jsx';
import RunInventoryModal from '../modals/RunInventoryModal.jsx';
import LootRevealModal from '../modals/LootRevealModal.jsx';
import AbandonRunModal from '../modals/AbandonRunModal.jsx';
import ExtractionLootSelectionModal from '../modals/ExtractionLootSelectionModal.jsx';
import ExtractionConfirmModal from '../modals/ExtractionConfirmModal.jsx';
import DetectionManager from '../../logic/detection/DetectionManager.js';
import EncounterController from '../../logic/encounters/EncounterController.js';
import ExtractionController from '../../logic/singlePlayer/ExtractionController.js';
import aiPersonalities from '../../data/aiData.js';
import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import { mapTiers } from '../../data/mapData.js';
import { buildShipSections } from '../../logic/singlePlayer/shipSectionBuilder.js';
import SoundManager from '../../managers/SoundManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService.js';
import MissionService from '../../logic/missions/MissionService.js';
import MissionPanel from '../ui/MissionPanel.jsx';
import MissionTrackerModal from '../modals/MissionTrackerModal.jsx';
import { TacticalMapTutorialModal } from '../modals/tutorials';
import { HelpCircle } from 'lucide-react';
import TacticalItemsPanel from '../ui/TacticalItemsPanel.jsx';
import TacticalItemConfirmationModal from '../modals/TacticalItemConfirmationModal.jsx';
import { getTacticalItemById } from '../../data/tacticalItemData.js';
import { useTacticalSubscriptions } from '../../hooks/useTacticalSubscriptions.js';
import { useTacticalPostCombat } from '../../hooks/useTacticalPostCombat.js';
import { useTacticalWaypoints } from '../../hooks/useTacticalWaypoints.js';
import { useTacticalMovement } from '../../hooks/useTacticalMovement.js';
import { useTacticalEncounters } from '../../hooks/useTacticalEncounters.js';
import './TacticalMapScreen.css';

/**
 * TacticalMapScreen - Main screen for tactical map navigation
 *
 * Features:
 * - Hex grid rendering with player position
 * - Click-to-move with path preview
 * - Movement confirmation modal
 * - Detection tracking
 * - Extraction at gates
 * - PoI encounters (Phase 6)
 *
 * Flow:
 * 1. Player clicks hex → Path preview shown
 * 2. Waypoint modal opens → Show cost
 * 3. Player confirms → Execute movement
 * 4. Arrival triggers → PoI encounter or extraction
 */
function TacticalMapScreen() {
  const [gameState, setGameState] = useState(gameStateManager.getState());
  const [tacticalMapRunState, setTacticalMapRunState] = useState(() => {
    const state = tacticalMapStateManager.getState();
    debugLog('RUN_STATE', 'TacticalMapScreen INIT useState:', {
      hasState: !!state,
      hasMapData: !!state?.mapData,
      backgroundIndex: state?.mapData?.backgroundIndex,
      hasPendingWaypoints: !!state?.pendingPath,
      pendingWaypointsCount: state?.pendingPath?.length
    });
    return state;
  });

  // Waypoint journey planning state
  const [waypoints, setWaypoints] = useState([]);           // Array of waypoint objects
  const [inspectedHex, setInspectedHex] = useState(null);   // Hex being viewed (null = Waypoint List view)

  // Movement execution state
  const [isMoving, setIsMoving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [currentHexIndex, setCurrentHexIndex] = useState(0);  // Current hex within waypoint path

  // POI Encounter state
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [showPOIModal, setShowPOIModal] = useState(false);

  // Quick Deploy selection state
  const [showQuickDeploySelection, setShowQuickDeploySelection] = useState(false);
  const [selectedQuickDeploy, setSelectedQuickDeploy] = useState(null);

  // Loading Encounter screen state (for combat transitions)
  const [showLoadingEncounter, setShowLoadingEncounter] = useState(false);
  const [loadingEncounterData, setLoadingEncounterData] = useState(null);

  // Extraction loading screen state (for extraction transitions)
  const [showExtractionScreen, setShowExtractionScreen] = useState(false);
  const [extractionScreenData, setExtractionScreenData] = useState(null);
  const pendingExtractionRef = useRef(null); // Stores result for after animation

  // Escape loading screen state (for escape transitions)
  const [showEscapeLoadingScreen, setShowEscapeLoadingScreen] = useState(false);
  const [escapeLoadingData, setEscapeLoadingData] = useState(null);


  // Inventory modal state
  const [showInventory, setShowInventory] = useState(false);

  // POI loot reveal state
  const [poiLootToReveal, setPoiLootToReveal] = useState(null);
  const [pendingLootEncounter, setPendingLootEncounter] = useState(null);

  // Post-combat PoI loot state (for resuming journey after combat + loot)
  const [pendingResumeWaypoints, setPendingResumeWaypoints] = useState(null);

  // Extraction/Abandon modal state
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Escape confirmation modal state
  const [showEscapeConfirm, setShowEscapeConfirm] = useState(false);
  const [escapeContext, setEscapeContext] = useState(null); // { type: 'poi' | 'salvage', isPOI: boolean }

  // Loot selection modal state (for Slot 0 extraction limit)
  const [showLootSelectionModal, setShowLootSelectionModal] = useState(false);
  const [pendingLootSelection, setPendingLootSelection] = useState(null);

  // Salvage modal state (progressive PoI salvage)
  const [showSalvageModal, setShowSalvageModal] = useState(false);
  const [activeSalvage, setActiveSalvage] = useState(null);
  const [salvageQuickDeployPending, setSalvageQuickDeployPending] = useState(false);

  // Blueprint encounter modal state (Phase 5)
  const [showBlueprintEncounterModal, setShowBlueprintEncounterModal] = useState(false);
  const [pendingBlueprintEncounter, setPendingBlueprintEncounter] = useState(null);
  const [blueprintQuickDeployPending, setBlueprintQuickDeployPending] = useState(false);

  // Blueprint reward modal state (for reveal animation)
  const [showBlueprintRewardModal, setShowBlueprintRewardModal] = useState(false);
  const [pendingBlueprintReward, setPendingBlueprintReward] = useState(null);

  // Extraction confirmation modal state
  const [showExtractionConfirm, setShowExtractionConfirm] = useState(false);
  const [extractionQuickDeployPending, setExtractionQuickDeployPending] = useState(false);

  // Tactical item confirmation modal state
  const [tacticalItemConfirmation, setTacticalItemConfirmation] = useState(null);

  // Mission tracking state
  const [showMissionTracker, setShowMissionTracker] = useState(false);
  const [showTutorial, setShowTutorial] = useState(null);

  // Ref to track pause state in async movement loop
  const isPausedRef = useRef(false);
  const shouldStopMovement = useRef(false);
  const totalWaypointsRef = useRef(0);

  // Ref to track current path progress synchronously (for combat storage)
  // React state is async, so this ref ensures accurate position when combat triggers
  const pathProgressRef = useRef({ waypointIndex: 0, hexIndex: 0 });
  const escapedWithWaypoints = useRef(false); // Track if escape occurred with remaining waypoints
  const pendingCombatLoadingRef = useRef(false); // Track if loading screen is pending combat (prevents waypoint clearing)
  const skipWaypointRemovalRef = useRef(false); // Prevents removal when resuming from loot

  // Ref to resolve encounter promise (allows async waiting in movement loop)
  const encounterResolveRef = useRef(null);

  // Movement warning state (for "ENEMY THREAT SCAN ACTIVE" overlay)
  const [isScanningHex, setIsScanningHex] = useState(false);

  // Threat level change animation
  const [threatAlert, setThreatAlert] = useState(null);  // 'medium' | 'high' | null

  // Pathfinding mode state: 'lowEncounter' (lowest encounter chance) or 'lowThreat' (lowest detection)
  const [pathfindingMode, setPathfindingMode] = useState('lowEncounter');

  // Read run state from TacticalMapStateManager
  // This ensures backgroundIndex and other critical data persists across combat transitions
  const { singlePlayerShipSlots, singlePlayerShipComponentInstances, quickDeployments } = gameState;
  const currentRunState = tacticalMapRunState;

  // Shared refs passed to hooks (used by subscription effects, movement loop, and handlers)
  const sharedRefs = React.useMemo(() => ({
    shouldStopMovement,
    pendingExtractionRef,
    encounterResolveRef,
    isPausedRef,
    pathProgressRef,
    totalWaypointsRef,
    escapedWithWaypoints,
    skipWaypointRemovalRef,
    pendingCombatLoadingRef,
  }), []);

  // --- State subscriptions, music, threat, tutorial, blockade, quick deploy validation ---
  const { validQuickDeployments } = useTacticalSubscriptions({
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
  });

  // --- Post-combat mount effect (waypoint restoration, POI loot, salvage) ---
  useTacticalPostCombat({
    setWaypoints,
    setActiveSalvage,
    setShowSalvageModal,
    setPendingBlueprintReward,
    setShowBlueprintRewardModal,
    setPendingLootEncounter,
    setPoiLootToReveal,
  });

  // --- Movement loop (async hex-by-hex traversal with encounter pausing) ---
  const { handleCommenceJourney, handleTogglePause, handleStopMovement } = useTacticalMovement({
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
    setPendingResumeWaypoints,
    currentRunState,
    sharedRefs,
  });

  // --- Encounter handlers (POI, blueprint, salvage, quick deploy, combat loading) ---
  const {
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
  } = useTacticalEncounters({
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
    setSelectedQuickDeploy,
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
  });

  // --- Hooks must be above early returns ---

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

      // Prepare extraction screen data
      setExtractionScreenData({
        creditsEarned: runState.creditsEarned || 0,
        cardsCollected: runState.collectedLoot?.filter(l => l.type === 'card').length || 0,
        aiCoresEarned: runState.aiCoresEarned || 0
      });

      // Store the result for after animation
      pendingExtractionRef.current = result;

      // Show extraction loading screen
      setShowExtractionScreen(true);
      return;
    }

    // Normal flow - show confirmation modal (modal handles blockade check internally)
    debugLog('EXTRACTION', 'Showing extraction confirmation modal');
    setShowExtractionConfirm(true);
  }, []);

  /**
   * Handle extraction cancel - close confirmation modal
   */
  const handleExtractionCancel = useCallback(() => {
    debugLog('EXTRACTION', 'Extraction cancelled');
    setShowExtractionConfirm(false);
  }, []);

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

    // Prepare extraction screen data
    setExtractionScreenData({
      creditsEarned: runState.creditsEarned || 0,
      cardsCollected: runState.collectedLoot?.filter(l => l.type === 'card').length || 0,
      aiCoresEarned: runState.aiCoresEarned || 0
    });

    // Store the result for after animation
    pendingExtractionRef.current = result;

    // Show extraction loading screen
    setShowExtractionScreen(true);
  }, []);

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

      // Prepare extraction screen data
      setExtractionScreenData({
        creditsEarned: runState.creditsEarned || 0,
        cardsCollected: runState.collectedLoot?.filter(l => l.type === 'card').length || 0,
        aiCoresEarned: runState.aiCoresEarned || 0
      });

      // Store the result for after animation
      pendingExtractionRef.current = extractionResult;

      // Show extraction loading screen
      setShowExtractionScreen(true);
    } else {
      // Item use failed - shouldn't happen if button is only shown when available
      debugLog('EXTRACTION', '[WARN] Clearance Override failed');
    }
  }, []);

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
    const tier = runState.mapData?.tier || 1;
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
  }, []);

  /**
   * Handle blockade with quick deploy - show quick deploy selection
   * Called when modal detects blockade and player clicks Quick Deploy
   */
  const handleBlockadeQuickDeploy = useCallback(() => {
    debugLog('QUICK_DEPLOY', 'Blockade detected - opening quick deploy selection');
    setShowExtractionConfirm(false);
    setShowQuickDeploySelection(true);
    setExtractionQuickDeployPending(true);
  }, []);

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
  }, []);

  /**
   * Handle abandon run button click - show confirmation modal
   */
  const handleAbandon = useCallback(() => {
    debugLog('MODE_TRANSITION', 'Abandon run requested');
    setShowAbandonModal(true);
  }, []);

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
  }, []);

  // NOTE: handleFailedRunComplete has been removed - FailedRunLoadingScreen
  // is now handled globally by App.jsx using ExtractionController.completeFailedRunTransition()

  /**
   * Handle escape button click - show escape confirmation modal
   * @param {Object} context - { type: 'poi' | 'salvage', isPOI: boolean }
   */
  const handleEscapeRequest = useCallback((context) => {
    debugLog('COMBAT_FLOW', 'Escape requested', context);
    setEscapeContext(context);
    setShowEscapeConfirm(true);
  }, []);

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
  }, [currentEncounter]);

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
  }, [currentRunState?.detection]);

  /**
   * Handle tactical item confirmation cancel
   */
  const handleTacticalItemCancel = useCallback(() => {
    setTacticalItemConfirmation(null);
  }, []);

  /**
   * Handle tactical item confirmation confirm
   */
  const handleTacticalItemConfirm = useCallback(() => {
    setTacticalItemConfirmation(null);
    // Delay execution to allow modal to close
    setTimeout(() => {
      handleUseThreatReduce();
    }, 400);
  }, [handleUseThreatReduce]);

  /**
   * Handle escape cancel - close escape confirmation modal
   */
  const handleEscapeCancel = useCallback(() => {
    debugLog('COMBAT_FLOW', 'Escape cancelled');
    setShowEscapeConfirm(false);
    setEscapeContext(null);
  }, []);

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
  }, [currentEncounter, waypoints, currentWaypointIndex]); // Note: currentWaypointIndex kept for debug logging comparison

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
  }, [currentEncounter, activeSalvage, escapeContext, pendingResumeWaypoints]);

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
  }, []);

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
  }, [pendingLootEncounter, pendingResumeWaypoints]);

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
  }, [pendingLootEncounter, pendingResumeWaypoints]);

  // ========================================
  // WAYPOINT HOOK (must be before early returns — contains useMemo/useCallback)
  // ========================================
  const {
    addWaypoint,
    removeWaypoint,
    clearAllWaypoints,
    isWaypoint,
    handleHexClick,
    handleToggleWaypoint,
    handleWaypointClick,
    handleBackToJourney,
    handlePathModeChange,
    getPreviewPath,
    escapeRouteData,
    getLastJourneyPosition,
    getJourneyEndDetection,
    getJourneyEndEncounterRisk,
  } = useTacticalWaypoints({
    waypoints,
    setWaypoints,
    inspectedHex,
    setInspectedHex,
    pathfindingMode,
    setPathfindingMode,
    isMoving,
    playerPosition: currentRunState?.playerPosition,
    mapData: currentRunState?.mapData,
    tierConfig: currentRunState?.mapData ? mapTiers[currentRunState.mapData.tier - 1] : null,
    detection: currentRunState?.detection,
    currentRunState,
  });

  // ========================================
  // EARLY RETURNS (safe now - all hooks above)
  // ========================================

  // Don't render if no run state (will redirect above)
  if (!currentRunState || !currentRunState.mapData) {
    return (
      <div className="tactical-map-loading">
        <p>No active run. Returning to hangar...</p>
      </div>
    );
  }

  const { mapData, playerPosition, detection } = currentRunState;
  const shipSlot = singlePlayerShipSlots.find(s => s.id === currentRunState.shipSlotId);
  const tierConfig = mapTiers[mapData.tier - 1];

  // Safety check - ensure ship slot exists
  if (!shipSlot) {
    debugLog('RUN_STATE', '[ERROR] Ship slot not found:', currentRunState.shipSlotId);
    return (
      <div className="tactical-map-error">
        <p>Error: Ship slot not found. Returning to hangar...</p>
      </div>
    );
  }

  // Build ship sections with hull data for HUD display
  // Priority: currentRunState.shipSections (live damage) > shipComponentInstances > base data
  const shipSections = buildShipSections(
    shipSlot,
    currentRunState.shipSlotId,
    singlePlayerShipComponentInstances || [],
    currentRunState.shipSections
  );

  const previewPath = getPreviewPath();

  /**
   * Handle inventory view - show RunInventoryModal
   */
  const handleInventory = () => {
    debugLog('MODE_TRANSITION', 'Opening inventory modal');
    setShowInventory(true);
  };

  /**
   * Handle closing inventory modal
   */
  const handleCloseInventory = () => {
    setShowInventory(false);
  };

  // Calculate stats for header (moved from TacticalMapHUD)
  const { creditsEarned, collectedLoot, shipSections: runShipSections } = currentRunState;

  // Calculate extraction limit
  const isStarterDeck = currentRunState.shipSlotId === 0;
  const baseLimit = isStarterDeck
    ? (ECONOMY.STARTER_DECK_EXTRACTION_LIMIT || 3)
    : (ECONOMY.CUSTOM_DECK_EXTRACTION_LIMIT || 6);
  const reputationBonus = isStarterDeck ? 0 : ReputationService.getExtractionBonus();
  const damagedCount = runShipSections
    ? Object.values(runShipSections).filter(section => {
        const threshold = section.thresholds?.damaged ?? 5;
        return section.hull <= threshold;
      }).length
    : 0;
  const extractionLimit = Math.max(0, baseLimit + reputationBonus - damagedCount);
  const isOverLimit = collectedLoot.length > extractionLimit;

  // Calculate total hull
  const totalHull = shipSections.reduce((sum, s) => sum + s.hull, 0);
  const totalMaxHull = shipSections.reduce((sum, s) => sum + s.maxHull, 0);
  const totalHullPercentage = totalMaxHull > 0 ? (totalHull / totalMaxHull) * 100 : 0;

  // Hull color helpers
  const getSectionColorClass = (section) => {
    if (section.thresholds) {
      const { damaged, critical } = section.thresholds;
      if (section.hull <= critical) return 'stat-value-critical';
      if (section.hull <= damaged) return 'stat-value-warning';
      return 'stat-value-healthy';
    }
    const pct = section.maxHull > 0 ? (section.hull / section.maxHull) * 100 : 0;
    if (pct >= 70) return 'stat-value-healthy';
    if (pct >= 40) return 'stat-value-warning';
    return 'stat-value-critical';
  };

  const getHullColorClass = (percentage) => {
    if (percentage >= 70) return 'stat-value-healthy';
    if (percentage >= 40) return 'stat-value-warning';
    return 'stat-value-critical';
  };

  return (
    <div className="tactical-map-screen">
      {/* Threat Level Change Alert Overlay */}
      {threatAlert && (
        <div className={`threat-level-alert threat-level-alert--${threatAlert}`}>
          <div className="threat-level-alert-text">
            {threatAlert === 'high' ? '\u26A0 THREAT CRITICAL' : '\u26A0 THREAT ELEVATED'}
          </div>
        </div>
      )}

      {/* Header Bar - matching Hangar/Repair Bay style */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: '320px', // Stop before HexInfoPanel
        background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(-45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(20, 28, 42, 0.95) 0%, rgba(10, 14, 22, 0.95) 100%)',
        backgroundSize: '10px 10px, 10px 10px, 100% 100%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
        zIndex: 150
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{
            fontSize: '1.5rem',
            color: '#e5e7eb',
            letterSpacing: '0.1em',
            margin: 0
          }}>TACTICAL MAP</h1>
          <button
            onClick={() => setShowTutorial('tacticalMap')}
            title="Show help"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#06b6d4',
              opacity: 0.7,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* Right: Stats */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Per-Section Hull */}
          {shipSections.map(section => (
            <div key={section.id} className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
              <span className="dw-stat-box-label">{section.type}</span>
              <span className={`dw-stat-box-value ${getSectionColorClass(section)}`}>
                {section.hull}/{section.maxHull}
              </span>
            </div>
          ))}

          {/* Total Hull */}
          <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px', borderColor: 'rgba(6, 182, 212, 0.5)' }}>
            <span className="dw-stat-box-label">Total</span>
            <span className={`dw-stat-box-value ${getHullColorClass(totalHullPercentage)}`}>
              {totalHull}/{totalMaxHull}
            </span>
          </div>

          {/* Credits */}
          <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
            <span className="dw-stat-box-label">Credits</span>
            <span className="dw-stat-box-value" style={{ color: '#fbbf24' }}>{creditsEarned}</span>
          </div>

          {/* Loot */}
          <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
            <span className="dw-stat-box-label">Loot</span>
            <span className="dw-stat-box-value" style={{ color: '#60a5fa' }}>{collectedLoot.length}</span>
          </div>

          {/* Extract Limit */}
          <div className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }} title={isStarterDeck ? "Starter deck extraction limit" : `Custom deck extraction limit (Base: ${baseLimit}${reputationBonus > 0 ? `, Rep: +${reputationBonus}` : ''}${damagedCount > 0 ? `, Damage: -${damagedCount}` : ''})`}>
            <span className="dw-stat-box-label">Extract Limit</span>
            <span className={`dw-stat-box-value ${isOverLimit ? 'stat-value-warning' : 'stat-value-healthy'}`}>
              {Math.min(collectedLoot.length, extractionLimit)}/{extractionLimit}
            </span>
          </div>

          {/* Mission Tracker */}
          <MissionPanel
            activeCount={MissionService.getActiveCount()}
            claimableCount={MissionService.getClaimableCount()}
            onClick={() => { SoundManager.getInstance().play('ui_click'); setShowMissionTracker(true); }}
          />
        </div>
      </header>

      {/* Tactical Ticker - Intel feed below header */}
      <div style={{
        position: 'fixed',
        top: '60px',
        left: 0,
        right: '320px', // Stop before HexInfoPanel
        zIndex: 150
      }}>
        <TacticalTicker
          isMoving={isMoving}
          currentRunState={currentRunState}
        />
      </div>

      {/* Background hex grid */}
      <HexGridRenderer
        mapData={mapData}
        playerPosition={playerPosition}
        onHexClick={handleHexClick}
        waypoints={waypoints}
        currentWaypointIndex={isMoving ? currentWaypointIndex : null}
        previewPath={previewPath}
        isScanning={isScanningHex}
        insertionGate={currentRunState.insertionGate}
        lootedPOIs={currentRunState.lootedPOIs || []}
        fledPOIs={currentRunState.fledPOIs || []}
        highAlertPOIs={currentRunState.highAlertPOIs || []}
        shipId={shipSlot.shipId || 'SHIP_001'}
        currentHexIndex={currentHexIndex}
        backgroundIndex={mapData?.backgroundIndex}
      />

      {/* HUD Overlay - now only bottom buttons */}
      <TacticalMapHUD
        currentRunState={currentRunState}
        shipSections={shipSections}
        onExtractClick={handleExtract}
        onAbandonClick={handleAbandon}
        onInventoryClick={handleInventory}
      />

      {/* Tactical Items Panel - Bottom left corner */}
      <TacticalItemsPanel
        evadeCount={gameStateManager.getTacticalItemCount('ITEM_EVADE')}
        extractCount={gameStateManager.getTacticalItemCount('ITEM_EXTRACT')}
        threatReduceCount={gameStateManager.getTacticalItemCount('ITEM_THREAT_REDUCE')}
        currentDetection={currentRunState.detection || 0}
        onRequestThreatReduce={handleRequestThreatReduce}
      />

      {/* Hex Info Panel (right side) - Two views: Waypoint List or Hex Info */}
      <HexInfoPanel
        // Journey state
        waypoints={waypoints}
        currentDetection={currentRunState.detection}
        playerPosition={playerPosition}
        mapData={mapData}

        // View state
        inspectedHex={inspectedHex}

        // Waypoint List actions
        onWaypointClick={handleWaypointClick}
        onCommence={handleCommenceJourney}
        onClearAll={clearAllWaypoints}

        // Hex Info actions
        onBackToJourney={handleBackToJourney}
        onToggleWaypoint={handleToggleWaypoint}
        isWaypointFn={isWaypoint}

        // Movement state
        isMoving={isMoving}
        isPaused={isPaused}
        onCancel={handleStopMovement}
        currentWaypointIndex={currentWaypointIndex}
        currentHexIndex={currentHexIndex}
        totalWaypoints={isMoving ? totalWaypointsRef.current : waypoints.length}
        onTogglePause={handleTogglePause}

        // Tier config for encounter/threat calculations
        tierConfig={tierConfig}
        mapRadius={mapData.radius}

        // Looted POI tracking
        lootedPOIs={currentRunState.lootedPOIs || []}

        // Scanning state
        isScanningHex={isScanningHex}

        // Escape route calculation
        escapeRouteData={escapeRouteData}

        // Pathfinding mode toggle
        pathMode={pathfindingMode}
        onPathModeChange={handlePathModeChange}
        previewPath={previewPath}

        // Signal Lock (encounter detection)
        encounterDetectionChance={currentRunState.encounterDetectionChance || 0}
      />

      {/* Blueprint Encounter Modal (Phase 5) */}
      {showBlueprintEncounterModal && pendingBlueprintEncounter && (
        <BlueprintEncounterModal
          encounter={pendingBlueprintEncounter}
          show={showBlueprintEncounterModal}
          onAccept={handleBlueprintEncounterAccept}
          onDecline={handleBlueprintEncounterDecline}
          onQuickDeploy={handleBlueprintQuickDeploy}
          validQuickDeployments={validQuickDeployments}
        />
      )}

      {/* POI Encounter Modal */}
      {showPOIModal && currentEncounter && (
        <POIEncounterModal
          encounter={currentEncounter}
          onProceed={handleEncounterProceed}
          onQuickDeploy={() => {
            setShowPOIModal(false);
            setShowQuickDeploySelection(true);
          }}
          validQuickDeployments={validQuickDeployments}
          onEscape={() => handleEscapeRequest({ type: 'poi', isPOI: true })}
          onEvade={handleEvadeItem}
          evadeItemCount={gameStateManager.getTacticalItemCount('ITEM_EVADE')}
          onClose={handleEncounterClose}
        />
      )}

      {/* Quick Deploy Selection Modal */}
      {showQuickDeploySelection && (
        <QuickDeploySelectionModal
          validQuickDeployments={validQuickDeployments}
          onSelect={(deployment) => {
            setSelectedQuickDeploy(deployment);
            setShowQuickDeploySelection(false);

            // Check if this is from a blueprint encounter
            if (blueprintQuickDeployPending) {
              setBlueprintQuickDeployPending(false);
              // Blueprint quick deploy - same flow but set fromBlueprintPoI flag
              handleBlueprintEncounterAcceptWithQuickDeploy(deployment);
            } else {
              // Regular POI/blockade/extraction/salvage quick deploy
              handleEncounterProceedWithQuickDeploy(deployment);
            }
          }}
          onBack={() => {
            setShowQuickDeploySelection(false);
            // Return to appropriate modal based on context
            if (blueprintQuickDeployPending) {
              setBlueprintQuickDeployPending(false);
              setShowBlueprintEncounterModal(true);
            } else if (extractionQuickDeployPending) {
              setExtractionQuickDeployPending(false);
              setShowExtractionConfirm(true);
            } else if (salvageQuickDeployPending) {
              setSalvageQuickDeployPending(false);
              setShowSalvageModal(true);
            } else {
              setShowPOIModal(true);
            }
          }}
        />
      )}

      {/* Salvage Modal (progressive POI salvage) */}
      {showSalvageModal && activeSalvage && (
        <SalvageModal
          salvageState={activeSalvage}
          tierConfig={tierConfig}
          detection={activeSalvage.detection || DetectionManager.getCurrentDetection()}
          onSalvageSlot={handleSalvageSlot}
          onLeave={handleSalvageLeave}
          onEngageCombat={handleSalvageCombat}
          onQuickDeploy={() => {
            setShowSalvageModal(false);
            setShowQuickDeploySelection(true);
            setSalvageQuickDeployPending(true);
          }}
          onEscape={() => handleEscapeRequest({ type: 'salvage', isPOI: true })}
          validQuickDeployments={validQuickDeployments}
          onQuit={handleSalvageQuit}
        />
      )}

      {/* Extraction Confirmation Modal */}
      {showExtractionConfirm && (
        <ExtractionConfirmModal
          detection={DetectionManager.getCurrentDetection()}
          onCancel={handleExtractionCancel}
          onExtract={handleExtractionConfirmed}
          onExtractWithItem={handleExtractionWithItem}
          extractItemCount={gameStateManager.getTacticalItemCount('ITEM_EXTRACT')}
          onEngageCombat={handleBlockadeCombat}
          onQuickDeploy={handleBlockadeQuickDeploy}
          validQuickDeployments={validQuickDeployments}
        />
      )}

      {/* Tactical Item Confirmation Modal */}
      <TacticalItemConfirmationModal
        show={!!tacticalItemConfirmation}
        item={tacticalItemConfirmation?.item}
        currentDetection={tacticalItemConfirmation?.currentDetection || 0}
        onCancel={handleTacticalItemCancel}
        onConfirm={handleTacticalItemConfirm}
      />

      {/* Loading Encounter Screen (combat transition) */}
      {showLoadingEncounter && loadingEncounterData && (
        <LoadingEncounterScreen
          encounterData={loadingEncounterData}
          onComplete={handleLoadingEncounterComplete}
        />
      )}

      {/* Extraction Loading Screen (extraction transition) */}
      {showExtractionScreen && (
        <ExtractionLoadingScreen
          extractionData={extractionScreenData}
          onComplete={handleExtractionScreenComplete}
        />
      )}

      {/* Escape Loading Screen (escape transition) */}
      {showEscapeLoadingScreen && escapeLoadingData && (
        <EscapeLoadingScreen
          escapeData={escapeLoadingData}
          onComplete={handleEscapeLoadingComplete}
        />
      )}

      {/* Run Inventory Modal */}
      {showInventory && (
        <RunInventoryModal
          currentRunState={currentRunState}
          onClose={handleCloseInventory}
        />
      )}

      {/* Blueprint Reward Modal (dedicated reveal animation) */}
      {showBlueprintRewardModal && pendingBlueprintReward && (
        <DroneBlueprintRewardModal
          blueprint={pendingBlueprintReward}
          onAccept={handleBlueprintRewardAccepted}
          show={true}
        />
      )}

      {/* POI Loot Reveal Modal (for card packs and mixed loot) */}
      {poiLootToReveal && (
        <LootRevealModal
          loot={poiLootToReveal}
          onCollect={handlePOILootCollected}
          show={true}
        />
      )}

      {/* Abandon Run Confirmation Modal */}
      <AbandonRunModal
        show={showAbandonModal}
        onCancel={() => setShowAbandonModal(false)}
        onConfirm={handleConfirmAbandon}
        lootCount={currentRunState?.collectedLoot?.length || 0}
        creditsEarned={currentRunState?.creditsEarned || 0}
      />

      {/* Escape Confirmation Modal */}
      {(() => {
        // Get AI personality for escape damage calculation
        const escapeAiId = currentEncounter?.aiId;
        // Use first AI as default for damage preview if no aiId (escape modal display only)
        const escapeAiPersonality = escapeAiId
          ? aiPersonalities.find(ai => ai.name === escapeAiId) || aiPersonalities[0]
          : aiPersonalities[0];
        const escapeCheckResult = currentRunState
          ? ExtractionController.checkEscapeCouldDestroy(currentRunState, escapeAiPersonality)
          : { couldDestroy: false, escapeDamageRange: { min: 2, max: 2 } };

        return (
          <EscapeConfirmModal
            show={showEscapeConfirm}
            onConfirm={handleEscapeConfirm}
            onCancel={handleEscapeCancel}
            shipSections={shipSections}
            couldDestroyShip={escapeCheckResult.couldDestroy}
            isPOIEncounter={escapeContext?.isPOI || false}
            escapeDamageRange={escapeCheckResult.escapeDamageRange}
            encounterDetectionChance={currentRunState?.encounterDetectionChance || 0}
          />
        );
      })()}

      {/* Loot Selection Modal (for Slot 0 extraction limit) */}
      <ExtractionLootSelectionModal
        isOpen={showLootSelectionModal}
        collectedLoot={pendingLootSelection?.collectedLoot || []}
        limit={pendingLootSelection?.limit || 3}
        onConfirm={handleLootSelectionConfirm}
        onCancel={() => handleLootSelectionConfirm([])}
      />

      {/* Mission Tracker Modal */}
      {showMissionTracker && (
        <MissionTrackerModal
          onClose={() => setShowMissionTracker(false)}
        />
      )}

      {/* Tactical Map Tutorial Modal */}
      {showTutorial === 'tacticalMap' && (
        <TacticalMapTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('tacticalMap');
            setShowTutorial(null);
          }}
        />
      )}

      {/* Map info display */}
      <div className="tactical-map-info">
        <p>Tier: {mapData.tier} | PoIs: {mapData.poiCount}</p>
        <p>Position: ({playerPosition.q}, {playerPosition.r})</p>
        <p>Detection: {detection.toFixed(1)}%</p>
      </div>
    </div>
  );
}

export default TacticalMapScreen;
