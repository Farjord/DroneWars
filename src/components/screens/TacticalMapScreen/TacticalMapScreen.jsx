// ========================================
// TACTICAL MAP SCREEN
// ========================================
// Main screen for in-run hex map navigation (Exploring the Eremos mode)
// Orchestrates hex grid rendering, player movement, encounters, and extraction

import React, { useState, useRef } from 'react';
import HexGridRenderer from '../../ui/HexGridRenderer.jsx';
import TacticalMapHUD from '../../ui/TacticalMapHUD.jsx';
import HexInfoPanel from '../../ui/HexInfoPanel.jsx';
import TacticalTicker from '../../ui/TacticalTicker.jsx';
import TacticalMapModals from '../../ui/TacticalMapModals.jsx';
import gameStateManager from '../../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../../managers/TacticalMapStateManager.js';
import { mapTiers } from '../../../data/mapData.js';
import { buildShipSections } from '../../../logic/singlePlayer/shipSectionBuilder.js';
import { debugLog } from '../../../utils/debugLogger.js';
import TacticalMapHeader from '../../ui/TacticalMapHeader.jsx';
import TacticalItemsPanel from '../../ui/TacticalItemsPanel.jsx';
import { useTacticalSubscriptions } from './hooks/useTacticalSubscriptions.js';
import { useTacticalPostCombat } from './hooks/useTacticalPostCombat.js';
import { useTacticalWaypoints } from './hooks/useTacticalWaypoints.js';
import { useTacticalMovement } from './hooks/useTacticalMovement.js';
import { useTacticalEncounters } from './hooks/useTacticalEncounters.js';
import { useTacticalExtraction } from './hooks/useTacticalExtraction.js';
import { useTacticalEscape } from './hooks/useTacticalEscape.js';
import { useTacticalLoot } from './hooks/useTacticalLoot.js';
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
      waypointCount: state?.waypoints?.length || 0
    });
    return state;
  });

  // Waypoint journey planning state - initialize from manager (survives combat transitions)
  const [waypoints, setWaypoints] = useState(() => {
    return tacticalMapStateManager.getState()?.waypoints || [];
  });
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

  // --- Post-combat mount effect (POI loot, salvage) ---
  useTacticalPostCombat({
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

  // --- Extraction and abandon handlers ---
  const {
    handleExtract,
    handleExtractionCancel,
    handleExtractionConfirmed,
    handleExtractionWithItem,
    handleBlockadeCombat,
    handleBlockadeQuickDeploy,
    handleExtractionScreenComplete,
    handleAbandon,
    handleConfirmAbandon,
  } = useTacticalExtraction({
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
  });

  // --- Escape, evade, and tactical item handlers ---
  const {
    handleEscapeRequest,
    handleEvadeItem,
    handleUseThreatReduce,
    handleRequestThreatReduce,
    handleTacticalItemCancel,
    handleTacticalItemConfirm,
    handleEscapeCancel,
    handleEscapeConfirm,
    handleEscapeLoadingComplete,
  } = useTacticalEscape({
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
  });

  // --- Loot collection handlers ---
  const {
    handleLootSelectionConfirm,
    handlePOILootCollected,
    handleBlueprintRewardAccepted,
  } = useTacticalLoot({
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
  });

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

      {/* Header Bar */}
      <TacticalMapHeader
        shipSections={shipSections}
        currentRunState={currentRunState}
        onShowTutorial={setShowTutorial}
        onShowMissionTracker={() => setShowMissionTracker(true)}
      />

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

      {/* All modals and loading screens */}
      <TacticalMapModals
        showBlueprintEncounterModal={showBlueprintEncounterModal}
        pendingBlueprintEncounter={pendingBlueprintEncounter}
        handleBlueprintEncounterAccept={handleBlueprintEncounterAccept}
        handleBlueprintEncounterDecline={handleBlueprintEncounterDecline}
        handleBlueprintQuickDeploy={handleBlueprintQuickDeploy}
        validQuickDeployments={validQuickDeployments}
        showPOIModal={showPOIModal}
        currentEncounter={currentEncounter}
        handleEncounterProceed={handleEncounterProceed}
        setShowPOIModal={setShowPOIModal}
        setShowQuickDeploySelection={setShowQuickDeploySelection}
        handleEscapeRequest={handleEscapeRequest}
        handleEvadeItem={handleEvadeItem}
        handleEncounterClose={handleEncounterClose}
        showQuickDeploySelection={showQuickDeploySelection}
        blueprintQuickDeployPending={blueprintQuickDeployPending}
        setBlueprintQuickDeployPending={setBlueprintQuickDeployPending}
        handleBlueprintEncounterAcceptWithQuickDeploy={handleBlueprintEncounterAcceptWithQuickDeploy}
        handleEncounterProceedWithQuickDeploy={handleEncounterProceedWithQuickDeploy}
        extractionQuickDeployPending={extractionQuickDeployPending}
        setExtractionQuickDeployPending={setExtractionQuickDeployPending}
        setShowExtractionConfirm={setShowExtractionConfirm}
        salvageQuickDeployPending={salvageQuickDeployPending}
        setSalvageQuickDeployPending={setSalvageQuickDeployPending}
        setShowSalvageModal={setShowSalvageModal}
        setShowBlueprintEncounterModal={setShowBlueprintEncounterModal}
        showSalvageModal={showSalvageModal}
        activeSalvage={activeSalvage}
        tierConfig={tierConfig}
        handleSalvageSlot={handleSalvageSlot}
        handleSalvageLeave={handleSalvageLeave}
        handleSalvageCombat={handleSalvageCombat}
        handleSalvageQuit={handleSalvageQuit}
        showExtractionConfirm={showExtractionConfirm}
        handleExtractionCancel={handleExtractionCancel}
        handleExtractionConfirmed={handleExtractionConfirmed}
        handleExtractionWithItem={handleExtractionWithItem}
        handleBlockadeCombat={handleBlockadeCombat}
        handleBlockadeQuickDeploy={handleBlockadeQuickDeploy}
        tacticalItemConfirmation={tacticalItemConfirmation}
        handleTacticalItemCancel={handleTacticalItemCancel}
        handleTacticalItemConfirm={handleTacticalItemConfirm}
        showLoadingEncounter={showLoadingEncounter}
        loadingEncounterData={loadingEncounterData}
        handleLoadingEncounterComplete={handleLoadingEncounterComplete}
        showExtractionScreen={showExtractionScreen}
        extractionScreenData={extractionScreenData}
        handleExtractionScreenComplete={handleExtractionScreenComplete}
        showEscapeLoadingScreen={showEscapeLoadingScreen}
        escapeLoadingData={escapeLoadingData}
        handleEscapeLoadingComplete={handleEscapeLoadingComplete}
        showInventory={showInventory}
        handleCloseInventory={handleCloseInventory}
        currentRunState={currentRunState}
        showBlueprintRewardModal={showBlueprintRewardModal}
        pendingBlueprintReward={pendingBlueprintReward}
        handleBlueprintRewardAccepted={handleBlueprintRewardAccepted}
        poiLootToReveal={poiLootToReveal}
        handlePOILootCollected={handlePOILootCollected}
        showAbandonModal={showAbandonModal}
        setShowAbandonModal={setShowAbandonModal}
        handleConfirmAbandon={handleConfirmAbandon}
        showEscapeConfirm={showEscapeConfirm}
        handleEscapeConfirm={handleEscapeConfirm}
        handleEscapeCancel={handleEscapeCancel}
        shipSections={shipSections}
        escapeContext={escapeContext}
        showLootSelectionModal={showLootSelectionModal}
        pendingLootSelection={pendingLootSelection}
        handleLootSelectionConfirm={handleLootSelectionConfirm}
        showMissionTracker={showMissionTracker}
        setShowMissionTracker={setShowMissionTracker}
        showTutorial={showTutorial}
        setShowTutorial={setShowTutorial}
      />

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
