// ========================================
// TACTICAL MAP SCREEN
// ========================================
// Main screen for in-run hex map navigation (Exploring the Eremos mode)
// Orchestrates hex grid rendering, player movement, encounters, and extraction

import React, { useState, useRef } from 'react';
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
import ExtractionController from '../../logic/singlePlayer/ExtractionController.js';
import aiPersonalities from '../../data/aiData.js';
import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import { mapTiers } from '../../data/mapData.js';
import { buildShipSections } from '../../logic/singlePlayer/shipSectionBuilder.js';
import SoundManager from '../../managers/SoundManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService.js';
import MissionService from '../../logic/missions/MissionService.js';
import MissionPanel from '../ui/MissionPanel.jsx';
import MissionTrackerModal from '../modals/MissionTrackerModal.jsx';
import { TacticalMapTutorialModal } from '../modals/tutorials';
import { HelpCircle } from 'lucide-react';
import TacticalItemsPanel from '../ui/TacticalItemsPanel.jsx';
import TacticalItemConfirmationModal from '../modals/TacticalItemConfirmationModal.jsx';
import { useTacticalSubscriptions } from '../../hooks/useTacticalSubscriptions.js';
import { useTacticalPostCombat } from '../../hooks/useTacticalPostCombat.js';
import { useTacticalWaypoints } from '../../hooks/useTacticalWaypoints.js';
import { useTacticalMovement } from '../../hooks/useTacticalMovement.js';
import { useTacticalEncounters } from '../../hooks/useTacticalEncounters.js';
import { useTacticalExtraction } from '../../hooks/useTacticalExtraction.js';
import { useTacticalEscape } from '../../hooks/useTacticalEscape.js';
import { useTacticalLoot } from '../../hooks/useTacticalLoot.js';
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
