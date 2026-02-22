import React, { useState, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState';
import useHangarMapState from '../../hooks/useHangarMapState.js';
import useHangarData from '../../hooks/useHangarData.js';
import { createCopyStarterDeckSlot, createEmptyDeckSlot } from '../../logic/singlePlayer/deckSlotFactory.js';
import SoundManager from '../../managers/SoundManager.js';
import SaveLoadModal from '../modals/SaveLoadModal';
import InventoryModal from '../modals/InventoryModal';
import MapOverviewModal from '../modals/MapOverviewModal';
import BlueprintsModal from '../modals/BlueprintsModal';
import ReplicatorModal from '../modals/ReplicatorModal';
import ShopModal from '../modals/ShopModal';
import RunSummaryModal from '../modals/RunSummaryModal';
import MIARecoveryModal from '../modals/MIARecoveryModal';
import BossEncounterModal from '../modals/BossEncounterModal';
import miaRecoveryService from '../../logic/singlePlayer/MIARecoveryService.js';
import SinglePlayerCombatInitializer from '../../logic/singlePlayer/SinglePlayerCombatInitializer.js';
import aiPersonalities from '../../data/aiData.js';
import ConfirmationModal from '../modals/ConfirmationModal';
import DeployingScreen from '../ui/DeployingScreen';
import LoadingEncounterScreen from '../ui/LoadingEncounterScreen';
import QuickDeployManager from '../quickDeploy/QuickDeployManager';
import ReputationTrack from '../ui/ReputationTrack';
import ReputationProgressModal from '../modals/ReputationProgressModal';
import ReputationRewardModal from '../modals/ReputationRewardModal';
import ReputationService from '../../logic/reputation/ReputationService';
import MissionPanel from '../ui/MissionPanel';
import MissionTrackerModal from '../modals/MissionTrackerModal';
import MissionService from '../../logic/missions/MissionService';
import {
  IntroTutorialModal,
  InventoryTutorialModal,
  ReplicatorTutorialModal,
  BlueprintsTutorialModal,
  ShopTutorialModal,
  RepairBayTutorialModal,
  TacticalMapOverviewTutorialModal,
  DeckBuilderTutorialModal,
} from '../modals/tutorials';
import NewsTicker from '../ui/NewsTicker';
import {
  getOffScreenPOIs, getArrowEdgePosition,
  getTierColor, GRID_COLS, GRID_ROWS
} from '../../logic/singlePlayer/hexGrid.js';
import { getMapType, getMapBackground } from '../../logic/extraction/mapExtraction';
import { debugLog } from '../../utils/debugLogger.js';
import { validateDeckForDeployment } from '../../utils/singlePlayerDeckUtils.js';
import { validateShipSlot } from '../../utils/slotDamageUtils.js';
import { ECONOMY } from '../../data/economyData.js';
import { starterDeck } from '../../data/playerDeckData.js';
import { Plus, Minus, RotateCcw, ChevronRight, Star, Trash2, AlertTriangle, Cpu, Lock, HelpCircle } from 'lucide-react';
import { getShipById } from '../../data/shipData.js';

// Background image for the map area
const eremosBackground = new URL('/Eremos/Eremos.jpg', import.meta.url).href;

// Hangar button images
const hangarImages = {
  inventory: new URL('/Hanger/Inventory.png', import.meta.url).href,
  replicator: new URL('/Hanger/Replicator.png', import.meta.url).href,
  blueprints: new URL('/Hanger/Blueprints.png', import.meta.url).href,
  shop: new URL('/Hanger/Shop.png', import.meta.url).href,
  repairBay: new URL('/Hanger/RepairBay.png', import.meta.url).href
};

/**
 * HangarScreen Component
 * Main single-player hub - Extraction Mode interface
 *
 * Layout: Top header + Central map area + Right sidebar
 */
const HangarScreen = () => {
  const { gameState, gameStateManager } = useGameState();

  // State management
  const [sidebarMode, setSidebarMode] = useState('options'); // 'options' or 'ships'
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [selectedMiaSlot, setSelectedMiaSlot] = useState(null);
  const [newDeckOption, setNewDeckOption] = useState(null); // 'empty', 'copyFromSlot0', or null
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { slotId, slotName }
  const [copyStarterConfirmation, setCopyStarterConfirmation] = useState(false); // Show copy starter deck confirmation
  const [emptyDeckConfirmation, setEmptyDeckConfirmation] = useState(false); // Show empty deck creation confirmation
  const [hoveredButton, setHoveredButton] = useState(null); // Track hovered image button
  const [showReputationProgress, setShowReputationProgress] = useState(false); // Show reputation progress modal
  const [showReputationRewards, setShowReputationRewards] = useState(false); // Show reputation reward modal
  const [showDeployingScreen, setShowDeployingScreen] = useState(false); // Show deploying transition screen
  const [deployingData, setDeployingData] = useState(null); // Data for deploying screen (slotId, map, gateId, quickDeploy)
  const [selectedBossId, setSelectedBossId] = useState(null); // Boss ID for BossEncounterModal
  const [showBossLoadingScreen, setShowBossLoadingScreen] = useState(false); // Boss encounter transition
  const [bossLoadingData, setBossLoadingData] = useState(null); // Data for boss loading screen
  const [showMissionTracker, setShowMissionTracker] = useState(false); // Show mission tracker modal
  const [isHelpIconTutorial, setIsHelpIconTutorial] = useState(false); // Track if tutorial triggered from help icon

  // Extract single-player state
  const {
    singlePlayerProfile,
    singlePlayerInventory,
    singlePlayerShipSlots,
    singlePlayerDroneInstances,
    singlePlayerShipComponentInstances,
    singlePlayerDiscoveredCards,
    lastRunSummary,
  } = gameState;

  // Shared ref for map container (used by both hooks)
  const mapContainerRef = useRef(null);

  // Derived data: hex grid, maps, boss, tutorials
  const {
    hexGridData, generatedMaps, bossHexCell,
    mapsWithCoordinates, activeSectors,
    showTutorial, setShowTutorial
  } = useHangarData(singlePlayerProfile, mapContainerRef, showDeployingScreen);

  // Pan/Zoom state and handlers
  const {
    zoom, pan, isDragging,
    transformRef,
    zoomToSector,
    handleMapMouseDown, handleMapMouseMove, handleMapMouseUp,
    handleResetView
  } = useHangarMapState(hexGridData, mapContainerRef);



  /**
   * Event Handlers
   */

  // Sidebar mode toggle
  const handleModeToggle = (mode) => {
    setSidebarMode(mode);
  };

  // Ship slot click - opens deck editor
  const handleSlotClick = (slot) => {
    SoundManager.getInstance().play('ui_click');
    if (slot.status === 'mia') {
      // Open MIA recovery modal
      setSelectedMiaSlot(slot);
      setActiveModal('miaRecovery');
      return;
    }

    if (slot.status === 'empty') {
      // Show new deck prompt modal
      setSelectedSlotId(slot.id);
      setActiveModal('newDeckPrompt');
    } else if (slot.status === 'active') {
      // Navigate to deck editor screen (read-only for slot 0)
      gameStateManager.setState({
        appState: 'extractionDeckBuilder',
        extractionDeckSlotId: slot.id,
        extractionNewDeckOption: null
      });
    }
  };

  // Close MIA recovery modal
  const handleCloseMiaModal = () => {
    setSelectedMiaSlot(null);
    setActiveModal(null);
  };

  // Handle star toggle (set as default ship)
  const handleStarToggle = (e, slotId) => {
    e.stopPropagation(); // Prevent slot click
    const currentDefault = singlePlayerProfile?.defaultShipSlotId ?? 0;
    // Toggle: if already default, set to slot 0; otherwise set this slot as default
    const newDefault = currentDefault === slotId ? 0 : slotId;
    gameStateManager.setDefaultShipSlot(newDefault);
  };

  // Handle delete click
  const handleDeleteClick = (e, slot) => {
    e.stopPropagation(); // Prevent slot click
    setDeleteConfirmation({
      slotId: slot.id,
      slotName: slot.name || `Ship Slot ${slot.id}`
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deleteConfirmation) {
      gameStateManager.deleteShipSlotDeck(deleteConfirmation.slotId);
      setDeleteConfirmation(null);
    }
  };

  // Cancel delete
  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  // Handle slot unlock - unlocks the next deck slot (sequential)
  const handleUnlockSlot = (e) => {
    e.stopPropagation(); // Prevent slot click
    const result = gameStateManager.unlockNextDeckSlot();
    if (!result.success) {
      debugLog('HANGAR', 'Failed to unlock slot:', result.error);
    }
  };

  // Handle new deck option selection - show confirmation modal for both options
  const handleNewDeckOption = (option) => {
    setActiveModal(null);
    if (option === 'copyFromSlot0') {
      // Show confirmation modal for copy from starter deck
      setCopyStarterConfirmation(true);
    } else if (option === 'empty') {
      // Show confirmation modal for empty deck (costs 500 credits)
      setEmptyDeckConfirmation(true);
    }
  };

  // Handle confirm copy from starter deck
  const handleConfirmCopyStarter = () => {
    const result = createCopyStarterDeckSlot(
      selectedSlotId, singlePlayerProfile, singlePlayerInventory,
      singlePlayerDroneInstances, singlePlayerShipComponentInstances
    );
    if (!result) {
      setCopyStarterConfirmation(false);
      return;
    }

    gameStateManager.setState({
      singlePlayerProfile: result.profileUpdate,
      singlePlayerInventory: result.inventoryUpdate,
      singlePlayerDroneInstances: result.droneInstances,
      singlePlayerShipComponentInstances: result.componentInstances
    });
    gameStateManager.saveShipSlotDeck(selectedSlotId, result.deckData);

    setCopyStarterConfirmation(false);
    gameStateManager.setState({
      appState: 'extractionDeckBuilder',
      extractionDeckSlotId: selectedSlotId,
      extractionNewDeckOption: null
    });

    debugLog('HANGAR', `Copied starter deck to slot ${selectedSlotId}`);
  };

  // Handle cancel copy starter
  const handleCancelCopyStarter = () => {
    setCopyStarterConfirmation(false);
  };

  // Handle confirm empty deck creation
  const handleConfirmEmptyDeck = () => {
    const result = createEmptyDeckSlot(selectedSlotId, singlePlayerProfile);
    if (!result) {
      setEmptyDeckConfirmation(false);
      return;
    }

    gameStateManager.setState({ singlePlayerProfile: result.profileUpdate });
    gameStateManager.saveShipSlotDeck(selectedSlotId, result.deckData);

    setEmptyDeckConfirmation(false);
    gameStateManager.setState({
      appState: 'extractionDeckBuilder',
      extractionDeckSlotId: selectedSlotId,
      extractionNewDeckOption: null
    });

    debugLog('HANGAR', `Created empty deck in slot ${selectedSlotId}`);
  };

  // Handle cancel empty deck creation
  const handleCancelEmptyDeck = () => {
    setEmptyDeckConfirmation(false);
  };

  // Action button clicks
  const handleActionClick = (action) => {
    // Screens that have tutorials (modals)
    const tutorialModalScreens = ['inventory', 'replicator', 'blueprints', 'shop'];

    // Show tutorial if not dismissed (tutorial will overlay on top of modal)
    if (tutorialModalScreens.includes(action) && !MissionService.isTutorialDismissed(action)) {
      setShowTutorial(action);
    }

    // Record screen visit for mission progress
    if (tutorialModalScreens.includes(action)) {
      MissionService.recordProgress('SCREEN_VISIT', { screen: action });
    }

    // Handle repairBay separately (navigates to different screen, not a modal)
    if (action === 'repairBay') {
      if (!MissionService.isTutorialDismissed('repairBay')) {
        setShowTutorial('repairBay');
        return; // Don't navigate yet - tutorial onDismiss will navigate
      }
      MissionService.recordProgress('SCREEN_VISIT', { screen: 'repairBay' });
      gameStateManager.setState({ appState: 'repairBay' });
      return;
    }

    switch(action) {
      case 'inventory':
        setActiveModal('inventory');
        break;
      case 'replicator':
        setActiveModal('replicator');
        break;
      case 'blueprints':
        setActiveModal('blueprints');
        break;
      case 'shop':
        setActiveModal('shop');
        break;
      case 'saveLoad':
        setActiveModal('saveLoad');
        break;
      case 'exit':
        gameStateManager.setState({ appState: 'menu' });
        break;
      default:
        break;
    }
  };

  // Map selection handler
  const handleMapSelected = (mapData) => {
    setSelectedMap(mapData);

    // Show tutorial if not dismissed (tutorial will overlay on top of modal)
    if (!MissionService.isTutorialDismissed('tacticalMapOverview')) {
      setShowTutorial('tacticalMapOverview');
    }

    // Record screen visit for missions
    MissionService.recordProgress('SCREEN_VISIT', { screen: 'tacticalMapOverview' });
    setActiveModal('mapOverview');
  };

  // Map icon click handler
  const handleMapIconClick = (mapIndex, coordinate) => {
    SoundManager.getInstance().play('hex_click');
    const map = generatedMaps[mapIndex];
    if (!map) {
      debugLog('EXTRACTION', 'Map data not generated yet', { mapIndex });
      return;
    }

    // Zoom to the clicked sector
    zoomToSector(coordinate);

    // Use default ship slot if set, otherwise first active slot
    const defaultSlotId = singlePlayerProfile?.defaultShipSlotId;
    let activeSlot = defaultSlotId
      ? singlePlayerShipSlots.find(slot => slot.id === defaultSlotId && slot.status === 'active')
      : null;

    // Fallback to first active slot if default not set or not active
    if (!activeSlot) {
      activeSlot = singlePlayerShipSlots.find(slot => slot.status === 'active');
    }

    if (!activeSlot) {
      debugLog('EXTRACTION', 'No active ship available for map click');
      return;
    }

    const slotValidation = validateShipSlot(activeSlot);
    if (slotValidation.isUndeployable) {
      debugLog('EXTRACTION', 'Ship undeployable', { slotId: activeSlot.id });
      return;
    }

    debugLog('EXTRACTION', 'Map icon clicked', { mapIndex, coordinate, slotId: activeSlot.id });

    setSelectedSlotId(activeSlot.id);
    setSelectedMap(map);
    setSelectedCoordinate(coordinate);

    // Show tutorial if not dismissed (tutorial will overlay on top of modal)
    if (!MissionService.isTutorialDismissed('tacticalMapOverview')) {
      setShowTutorial('tacticalMapOverview');
    }

    // Record screen visit for missions
    MissionService.recordProgress('SCREEN_VISIT', { screen: 'tacticalMapOverview' });
    setActiveModal('mapOverview');

    debugLog('EXTRACTION', '⏱️ State set calls queued (async batch)');
  };

  // Boss hex click handler
  const handleBossHexClick = (bossId) => {
    debugLog('HANGAR', '💀 Boss hex clicked', { bossId });

    // Use default ship slot if set, otherwise first active slot
    const defaultSlotId = singlePlayerProfile?.defaultShipSlotId ?? 0;

    setSelectedBossId(bossId);
    setSelectedSlotId(defaultSlotId);
    setActiveModal('bossEncounter');
  };

  // Boss challenge handler - shows loading screen first
  const handleBossChallenge = (slotId, bossId) => {
    debugLog('HANGAR', '⚔️ Boss challenge initiated', { slotId, bossId });

    // Close modal first
    setActiveModal(null);
    setSelectedBossId(null);

    // Get boss config for display name
    const bossAI = aiPersonalities.find(ai => ai.bossId === bossId);
    const displayName = bossAI?.bossConfig?.displayName || bossAI?.name || 'Unknown Boss';

    // Show loading screen with boss data
    setBossLoadingData({
      aiName: displayName,
      difficulty: 'BOSS',
      threatLevel: 'high',
      isAmbush: false,
      slotId: slotId,
      bossId: bossId
    });
    setShowBossLoadingScreen(true);
  };

  // Boss loading screen complete handler
  const handleBossLoadingComplete = async () => {
    const { slotId, bossId } = bossLoadingData;
    setShowBossLoadingScreen(false);
    setBossLoadingData(null);

    // Now initiate boss combat
    const result = await SinglePlayerCombatInitializer.initiateBossCombat(bossId, slotId);
    if (!result) {
      debugLog('HANGAR', 'Failed to initiate boss combat');
    }
  };

  // Deploy handler - shows deploying screen first
  const handleDeploy = (slotId, map, entryGateId = 0, quickDeploy = null) => {
    if (slotId == null || map == null) {
      debugLog('EXTRACTION', 'Cannot deploy: missing parameters', { slotId, hasMap: map != null });
      return;
    }

    const shipSlot = singlePlayerShipSlots.find(s => s.id === slotId);
    if (shipSlot) {
      const slotValidation = validateShipSlot(shipSlot);
      if (slotValidation.isUndeployable) {
        debugLog('EXTRACTION', 'Cannot deploy: ship undeployable', { slotId });
        return;
      }
    }

    debugLog('MODE_TRANSITION', 'hangar -> tacticalMap', {
      slotId, mapName: map.name, tier: map.tier, entryGateId
    });

    // Store deploy data and show deploying screen
    setDeployingData({ slotId, map, entryGateId, quickDeploy, shipName: shipSlot?.name });
    setShowDeployingScreen(true);
    closeAllModals();
  };

  // Handle deploying screen completion - actually start the run
  const handleDeployingComplete = () => {
    if (deployingData) {
      const { slotId, map, entryGateId, quickDeploy } = deployingData;
      debugLog('EXTRACTION', 'Deploying complete, starting run', { slotId, mapName: map.name });

      gameStateManager.startRun(slotId, map.tier, entryGateId, map, quickDeploy);
    }
    setShowDeployingScreen(false);
    setDeployingData(null);
  };

  // Close all modals
  const closeAllModals = () => {
    setActiveModal(null);
    setSelectedSlotId(null);
    setSelectedMap(null);
    setSelectedCoordinate(null);
  };

  // Navigate to a different sector in the modal
  const handleNavigateSector = (coordinate) => {
    const sector = activeSectors.find(s => s.coordinate === coordinate);
    if (sector) {
      setSelectedCoordinate(coordinate);
      setSelectedMap(generatedMaps[sector.mapIndex]);
      zoomToSector(coordinate); // Also zoom/pan the hangar map
    }
  };

  // Dismiss run summary modal
  const handleDismissRunSummary = () => {
    gameStateManager.setState({ lastRunSummary: null });
  };

  return (
    <div className="heading-font" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      {/* Header Section */}
      <header style={{
        background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(-45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(20, 28, 42, 0.95) 0%, rgba(10, 14, 22, 0.95) 100%)',
        backgroundSize: '10px 10px, 10px 10px, 100% 100%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
        zIndex: 10
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{
            fontSize: '1.5rem',
            color: '#e5e7eb',
            letterSpacing: '0.1em'
          }}>HANGAR</h1>
          <button
            onClick={() => {
              setShowTutorial('intro');
              setIsHelpIconTutorial(true);
            }}
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
          {[
            { label: 'CREDITS', value: singlePlayerProfile?.credits || 0, color: '#fbbf24' },
            { label: 'AI CORES', value: singlePlayerProfile?.aiCores || 0, color: '#f97316', icon: Cpu },
            { label: 'TOKENS', value: singlePlayerProfile?.securityTokens || 0, color: '#06b6d4' },
            { label: 'MAP KEYS', value: 0, color: '#60a5fa' },
            { label: 'RUNS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#e5e7eb' },
            { label: 'EXTRACTIONS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#22c55e' },
            { label: 'COMBATS WON', value: singlePlayerProfile?.stats?.totalCombatsWon || 0, color: '#10b981' },
            { label: 'MAX TIER', value: singlePlayerProfile?.stats?.highestTierCompleted || 1, color: '#a855f7' }
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
              <span className="dw-stat-box-label">{label}</span>
              <span className="dw-stat-box-value" style={{ color }}>{value}</span>
            </div>
          ))}

          {/* Reputation Track */}
          {(() => {
            const repData = ReputationService.getLevelData();
            const unclaimed = ReputationService.getUnclaimedRewards();
            return (
              <ReputationTrack
                current={repData.currentRep}
                level={repData.level}
                progress={repData.progress}
                currentInLevel={repData.currentInLevel}
                requiredForNext={repData.requiredForNext}
                unclaimedCount={unclaimed.length}
                isMaxLevel={repData.isMaxLevel}
                onClick={() => { SoundManager.getInstance().play('ui_click'); setShowReputationProgress(true); }}
              />
            );
          })()}

          {/* Mission Panel */}
          <MissionPanel
            activeCount={MissionService.getActiveCount()}
            claimableCount={MissionService.getClaimableCount()}
            onClick={() => { SoundManager.getInstance().play('ui_click'); setShowMissionTracker(true); }}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        overflow: 'hidden'
      }}>
        {/* Central Map Area */}
        <div
          ref={mapContainerRef}
          style={{
            position: 'relative',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            // Enhanced monitor-style border
            border: '2px solid rgba(6, 182, 212, 0.6)',
            boxShadow: `
              inset 0 0 30px rgba(0, 0, 0, 0.8),
              0 0 20px rgba(6, 182, 212, 0.3),
              0 0 40px rgba(6, 182, 212, 0.1)
            `,
            borderRadius: '4px',
            margin: '16px'
          }}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
        >
          {/* News Ticker - sector intel feed (only render when hexGridData is ready for stable data) */}
          {hexGridData && <NewsTicker maps={mapsWithCoordinates} />}

          {/* Transformable container for pan/zoom */}
          <div
            ref={transformRef}
            style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}>
          {/* Background image element - uses img for better quality scaling */}
           <img
            src={eremosBackground}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
          {/* SVG Hex Grid - integrated grid and map icons */}
          {hexGridData && (
            <svg
              width={hexGridData.width}
              height={hexGridData.height}
              style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}
            >
              {/* SVG Filters for glow effects */}
              <defs>
                <filter id="hexGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {hexGridData.allCells.map((cell, i) => {
                const { hexWidth, hexHeight } = hexGridData;

                // SVG path for pointy-top hexagon
                const hexPath = `M${hexWidth/2},0 L${hexWidth},${hexHeight*0.25} L${hexWidth},${hexHeight*0.75} L${hexWidth/2},${hexHeight} L0,${hexHeight*0.75} L0,${hexHeight*0.25} Z`;

                if (cell.isActive) {
                  // Active cell - vibrant cyan with glow and ping effects
                  const map = generatedMaps[cell.mapIndex];
                  const isGenerated = !!map;
                  const centerX = hexWidth / 2;
                  const centerY = hexHeight / 2;

                  // Determine sector color: orange for token-required maps, cyan for normal
                  const requiresToken = map?.requiresToken;
                  const sectorColor = requiresToken ? '#f97316' : '#06b6d4';
                  const sectorColorRgba = requiresToken ? 'rgba(249,115,22,0.15)' : 'rgba(6,182,212,0.15)';
                  const sectorColorFaint = requiresToken ? 'rgba(249,115,22,0.5)' : 'rgba(6,182,212,0.5)';
                  const pulseAnimation = requiresToken
                    ? 'hexRestrictedPulse 1.5s ease-in-out infinite'
                    : 'hexPulse 2s ease-in-out infinite';

                  return (
                    <g
                      key={i}
                      transform={`translate(${cell.x}, ${cell.y})`}
                      onClick={() => isGenerated && handleMapIconClick(cell.mapIndex, cell.coordinate)}
                      style={{ cursor: isGenerated ? 'pointer' : 'default' }}
                    >
                      {/* Pulsing glow layer behind hex */}
                      <path
                        d={hexPath}
                        fill="none"
                        stroke={sectorColor}
                        strokeWidth="10"
                        style={{
                          filter: 'blur(6px)',
                          animation: pulseAnimation,
                          animationDelay: `${cell.mapIndex * 0.3}s`
                        }}
                      />

                      {/* Radar ping circle - expands outward */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r="20"
                        fill="none"
                        stroke={sectorColor}
                        strokeWidth="2"
                        style={{
                          animation: 'hexRadarPing 4s ease-out infinite',
                          animationDelay: `${cell.mapIndex * 0.7}s`
                        }}
                      />

                      {/* Outer hex - vibrant border */}
                      <path
                        d={hexPath}
                        fill={sectorColorRgba}
                        stroke={sectorColor}
                        strokeWidth="3"
                        filter="url(#hexGlow)"
                      />

                      {/* Inner hex - darker content area */}
                      <path
                        d={`M${hexWidth/2},4 L${hexWidth-4},${hexHeight*0.25+2} L${hexWidth-4},${hexHeight*0.75-2} L${hexWidth/2},${hexHeight-4} L4,${hexHeight*0.75-2} L4,${hexHeight*0.25+2} Z`}
                        fill="rgba(17,24,39,0.9)"
                        stroke={sectorColorFaint}
                        strokeWidth="1"
                      />

                      {/* Sector coordinate as main label */}
                      <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={Math.max(10, hexWidth * 0.16)}
                        fontWeight="bold"
                        style={{
                          pointerEvents: 'none',
                          textShadow: '0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)'
                        }}
                      >
                        SECTOR {cell.coordinate}
                      </text>
                    </g>
                  );
                } else {
                  // Inactive cell - just grid outline
                  return (
                    <path
                      key={i}
                      d={hexPath}
                      transform={`translate(${cell.x}, ${cell.y})`}
                      fill="none"
                      stroke="rgba(6,182,212,0.3)"
                      strokeWidth="1"
                    />
                  );
                }
              })}

              {/* Boss Hex - rendered separately for distinct styling */}
              {bossHexCell && (() => {
                const { hexWidth, hexHeight } = hexGridData;
                const hexPath = `M${hexWidth/2},0 L${hexWidth},${hexHeight*0.25} L${hexWidth},${hexHeight*0.75} L${hexWidth/2},${hexHeight} L0,${hexHeight*0.75} L0,${hexHeight*0.25} Z`;
                const centerX = hexWidth / 2;
                const centerY = hexHeight / 2;

                return (
                  <g
                    transform={`translate(${bossHexCell.x}, ${bossHexCell.y})`}
                    onClick={() => handleBossHexClick(bossHexCell.bossId)}
                    style={{ cursor: 'pointer' }}
                    data-boss-hex="true"
                    data-coordinate={bossHexCell.coordinate}
                  >
                    {/* Pulsing glow layer - red for boss */}
                    <path
                      d={hexPath}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="12"
                      style={{
                        filter: 'blur(8px)',
                        animation: 'hexDangerPulse 1.5s ease-in-out infinite'
                      }}
                    />

                    {/* Radar ping circle */}
                    <circle
                      cx={centerX}
                      cy={centerY}
                      r="25"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      style={{
                        animation: 'hexRadarPing 3s ease-out infinite'
                      }}
                    />

                    {/* Outer hex - red border */}
                    <path
                      d={hexPath}
                      fill="rgba(239,68,68,0.2)"
                      stroke="#ef4444"
                      strokeWidth="4"
                      filter="url(#hexGlow)"
                    />

                    {/* Inner hex - dark with red tint */}
                    <path
                      d={`M${hexWidth/2},4 L${hexWidth-4},${hexHeight*0.25+2} L${hexWidth-4},${hexHeight*0.75-2} L${hexWidth/2},${hexHeight-4} L4,${hexHeight*0.75-2} L4,${hexHeight*0.25+2} Z`}
                      fill="rgba(17,24,39,0.95)"
                      stroke="rgba(239,68,68,0.6)"
                      strokeWidth="1"
                    />

                    {/* Skull icon placeholder - using text for now */}
                    <text
                      x={centerX}
                      y={centerY - 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={Math.max(16, hexWidth * 0.25)}
                      style={{
                        pointerEvents: 'none'
                      }}
                    >
                      ☠
                    </text>

                    {/* BOSS label */}
                    <text
                      x={centerX}
                      y={centerY + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={Math.max(10, hexWidth * 0.14)}
                      fontWeight="bold"
                      style={{
                        pointerEvents: 'none',
                        textShadow: '0 0 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      BOSS
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
          </div>
          {/* End transformable container */}

          {/* Vignette Layer 1: Deep corner shadows */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.95) 100%)',
            pointerEvents: 'none',
            zIndex: 3
          }} />

          {/* Vignette Layer 2: Top/bottom edge tints */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom,
              rgba(6, 182, 212, 0.03) 0%,
              transparent 3%,
              transparent 97%,
              rgba(6, 182, 212, 0.03) 100%
            )`,
            pointerEvents: 'none',
            zIndex: 4
          }} />

          {/* Vignette Layer 3: Inner frame shadow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
            zIndex: 5
          }} />

          {/* CRT Scanline Effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1.5px,
              rgba(0, 0, 0, 0.06) 1.5px,
              rgba(0, 0, 0, 0.06) 3px
            )`,
            pointerEvents: 'none',
            zIndex: 6
          }} />

          {/* Zoom Controls - small buttons at bottom-left corner */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10
          }}>
            <button
              className="dw-btn dw-btn-secondary"
              onClick={() => setZoom(z => Math.min(3, z + 0.2))}
              style={{ padding: '8px 12px' }}
            >
              <Plus size={18} />
            </button>
            <button
              className="dw-btn dw-btn-secondary"
              onClick={() => setZoom(z => Math.max(1, z - 0.2))}
              style={{ padding: '8px 12px' }}
            >
              <Minus size={18} />
            </button>
            <button
              className="dw-btn dw-btn-secondary"
              onClick={handleResetView}
              style={{ padding: '8px 12px' }}
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* POI Direction Arrows */}
          {hexGridData && mapContainerRef.current && zoom > 1 && (() => {
            const container = mapContainerRef.current.getBoundingClientRect();
            const offScreenPOIs = getOffScreenPOIs(hexGridData, zoom, pan, container.width, container.height);
            return offScreenPOIs.map((poi, i) => {
              const pos = getArrowEdgePosition(poi.angle, container.width, container.height);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: pos.left,
                    top: pos.top,
                    transform: `rotate(${poi.angle}deg)`,
                    zIndex: 8,
                    pointerEvents: 'none',
                    animation: 'poiArrowPulse 1.5s ease-in-out infinite'
                  }}
                >
                  <ChevronRight size={36} color="#06b6d4" strokeWidth={3} />
                </div>
              );
            });
          })()}
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col p-6" style={{
          borderRadius: 0,
          borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
          background: 'rgba(0, 0, 0, 0.4)',
          gap: '1rem'
        }}>
          {/* Toggle Buttons */}
          <div className="flex gap-2" style={{ marginBottom: '0.5rem' }}>
            <button
              onClick={() => handleModeToggle('options')}
              className={`dw-btn ${sidebarMode === 'options' ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
              style={{ flex: 1 }}
            >
              OPTIONS
            </button>
            <button
              onClick={() => handleModeToggle('ships')}
              className={`dw-btn ${sidebarMode === 'ships' ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
              style={{ flex: 1 }}
            >
              SHIPS
            </button>
          </div>

          {/* Dynamic Panel */}
          <div className="flex flex-col panel-scrollable" style={{ flex: 1, gap: '0.75rem' }}>
            {sidebarMode === 'options' ? (
              // Options Mode: Image Buttons (stacked vertically, filling space)
              <>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                  {[
                    { key: 'inventory', label: 'INVENTORY', image: hangarImages.inventory },
                    { key: 'replicator', label: 'REPLICATOR', image: hangarImages.replicator },
                    { key: 'blueprints', label: 'BLUEPRINTS', image: hangarImages.blueprints },
                    { key: 'shop', label: 'SHOP', image: hangarImages.shop },
                    { key: 'repairBay', label: 'REPAIR BAY', image: hangarImages.repairBay }
                  ].map(({ key, label, image }) => {
                    const isHovered = hoveredButton === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleActionClick(key)}
                        onMouseEnter={() => { SoundManager.getInstance().play('hover_over'); setHoveredButton(key); }}
                        onMouseLeave={() => setHoveredButton(null)}
                        style={{
                          backgroundImage: `url('${image}')`,
                          backgroundPosition: 'center',
                          backgroundSize: isHovered ? '115%' : '100%',
                          flex: 1,
                          minHeight: '100px',
                          border: '1px solid rgba(6, 182, 212, 0.4)',
                          borderRadius: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: 0,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'background-size 0.3s ease'
                        }}
                      >
                        {/* Full-width dark strip at bottom */}
                        <div style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '8px 12px',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: '#fff'
                          }}>{label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleActionClick('saveLoad')}
                  className="dw-btn dw-btn-secondary dw-btn--full"
                >
                  SAVE / LOAD
                </button>
                <button
                  onClick={() => handleActionClick('exit')}
                  className="dw-btn dw-btn-danger dw-btn--full"
                  style={{ marginTop: 'auto' }}
                >
                  EXIT
                </button>
              </>
            ) : (
              // Ships Mode: Ship Cards with star toggle and delete
              <>
                {singlePlayerShipSlots.map((slot) => {
                  const isDefault = singlePlayerProfile?.defaultShipSlotId === slot.id;
                  const isSlot0 = slot.id === 0;
                  const isActive = slot.status === 'active';
                  const isEmpty = slot.status === 'empty';
                  const isMia = slot.status === 'mia';

                  // Deck slot unlock state
                  const isUnlocked = gameStateManager.isSlotUnlocked(slot.id);
                  const highestUnlocked = singlePlayerProfile?.highestUnlockedSlot ?? 0;
                  const isNextToUnlock = !isUnlocked && slot.id === highestUnlocked + 1;
                  const unlockCost = isNextToUnlock ? ECONOMY.DECK_SLOT_UNLOCK_COSTS[slot.id] : null;
                  const credits = singlePlayerProfile?.credits ?? 0;
                  const canAfford = unlockCost !== null && credits >= unlockCost;

                  // Get card/drone counts for active slots
                  const cardCount = isActive ? (slot.decklist || []).reduce((sum, c) => sum + c.quantity, 0) : 0;
                  const droneCount = isActive ? (slot.droneSlots || []).filter(s => s.assignedDrone).length : 0;

                  // Get ship and deck limit for active slots
                  const ship = isActive ? getShipById(slot.shipId) : null;
                  const deckLimit = ship?.deckLimits?.totalCards ?? 40;

                  // Get loadout value for reputation display
                  const loadoutValueData = isActive ? ReputationService.getLoadoutValue(slot) : null;

                  // Check if deck is valid (for active slots)
                  const deckValidation = isActive ? (() => {
                    const deckObj = {};
                    (slot.decklist || []).forEach(card => {
                      deckObj[card.id] = card.quantity;
                    });
                    const dronesObj = {};
                    (slot.droneSlots || []).forEach(s => {
                      if (s.assignedDrone) dronesObj[s.assignedDrone] = 1;
                    });
                    return validateDeckForDeployment(deckObj, dronesObj, slot.shipComponents, deckLimit);
                  })() : { valid: true };
                  const isValidDeck = deckValidation.valid;

                  // Check if ship is undeployable (all sections destroyed)
                  const slotValidation = isActive ? validateShipSlot(slot) : { isUndeployable: false };
                  const isUndeployable = slotValidation.isUndeployable;

                  // Determine slot state class
                  const getSlotClass = () => {
                    if (!isUnlocked) return 'dw-deck-slot--locked';
                    if (isMia) return 'dw-deck-slot--mia';
                    if (isEmpty) return 'dw-deck-slot--empty';
                    if (isUndeployable) return 'dw-deck-slot--undeployable';
                    if (isDefault) return 'dw-deck-slot--default';
                    return 'dw-deck-slot--active';
                  };

                  // Get ship image for active slots background
                  const shipImage = ship?.image || null;

                  return (
                    <div
                      key={slot.id}
                      className={`dw-deck-slot ${getSlotClass()}`}
                      onClick={() => isUnlocked && handleSlotClick(slot)}
                      style={shipImage ? {
                        backgroundImage: `url(${shipImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : undefined}
                    >
                      {!isUnlocked ? (
                        // LOCKED SLOT CONTENT
                        <div className="dw-deck-slot-locked-content">
                          <Lock size={18} className="dw-deck-slot-lock-icon" />
                          <span className="dw-deck-slot-locked-label">SLOT {slot.id}</span>

                          {isNextToUnlock ? (
                            <button
                              className={`dw-btn dw-btn-confirm dw-btn--sm dw-btn--full ${!canAfford ? 'dw-btn--disabled' : ''}`}
                              onClick={handleUnlockSlot}
                              disabled={!canAfford}
                            >
                              UNLOCK - {unlockCost?.toLocaleString()}
                            </button>
                          ) : (
                            <span className="dw-deck-slot-locked-hint">
                              Unlock Slot {slot.id - 1} first
                            </span>
                          )}
                        </div>
                      ) : (
                        // UNLOCKED SLOT CONTENT - wrapped in overlay div for ship image backgrounds
                        <div className={shipImage ? 'dw-deck-slot-content' : undefined}>
                          {/* Header Row: Slot name/id + Star + Delete */}
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-orbitron text-sm flex items-center gap-1 ${isMia ? 'text-red-400' : isUndeployable ? 'text-red-400' : 'text-cyan-400'}`}>
                              {isSlot0 ? 'STARTER' : `SLOT ${slot.id}`}
                              {isActive && isUndeployable && (
                                <AlertTriangle size={14} className="text-red-400" title="Ship undeployable - all sections destroyed" />
                              )}
                              {isActive && !isValidDeck && !isUndeployable && (
                                <AlertTriangle size={14} className="text-orange-400" title="Incomplete deck" />
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Star button (only for active slots) */}
                              {isActive && (
                                <button
                                  onClick={(e) => handleStarToggle(e, slot.id)}
                                  className={`p-1 rounded transition-colors ${
                                    isDefault
                                      ? 'text-yellow-400 hover:text-yellow-300'
                                      : 'text-gray-500 hover:text-gray-400'
                                  }`}
                                  title={isDefault ? 'Default ship for deployment' : 'Set as default'}
                                >
                                  <Star size={16} fill={isDefault ? 'currentColor' : 'none'} />
                                </button>
                              )}
                              {/* Delete button (not for slot 0 or empty slots) */}
                              {isActive && !isSlot0 && (
                                <button
                                  onClick={(e) => handleDeleteClick(e, slot)}
                                  className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                                  title="Delete deck"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Deck Name */}
                          <div className="font-medium text-white text-sm truncate">
                            {isActive ? (slot.name || 'Unnamed Deck') : isMia ? 'MIA' : 'Empty Slot'}
                          </div>

                          {/* Stats for active slots */}
                          {isActive && (
                            <div className={`text-xs mt-1 ${isUndeployable ? 'text-red-400' : isValidDeck ? 'text-gray-400' : 'text-orange-400'}`}>
                              {isUndeployable
                                ? 'UNDEPLOYABLE - All sections destroyed'
                                : <>
                                    {cardCount}/{deckLimit} cards • {droneCount}/5 drones
                                    {!isValidDeck && ' (incomplete)'}
                                  </>
                              }
                            </div>
                          )}

                          {/* Loadout value for reputation */}
                          {isActive && (
                            <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '4px' }}>
                              {loadoutValueData?.isStarterDeck
                                ? 'Loadout Value: None (Starter)'
                                : `Loadout Value: ${loadoutValueData?.totalValue?.toLocaleString() || 0}`}
                            </div>
                          )}

                          {/* MIA Recovery Cost (not shown for slot 0 which can't go MIA) */}
                          {isActive && !isSlot0 && (
                            <div style={{ fontSize: '11px', color: '#f97316', marginTop: '2px' }}>
                              MIA Recovery: {miaRecoveryService.calculateRecoveryCost(slot.id).toLocaleString()}
                            </div>
                          )}

                          {/* MIA indicator */}
                          {isMia && (
                            <div className="text-xs text-red-400 mt-1">
                              Click to recover
                            </div>
                          )}

                          {/* Empty slot indicator */}
                          {isEmpty && (
                            <div className="text-xs text-gray-500 mt-1">
                              Click to create
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Quick Deployments Button */}
                <button
                  onClick={() => setActiveModal('quickDeploy')}
                  className="dw-btn dw-btn-secondary dw-btn--full"
                  style={{ marginTop: '0.5rem' }}
                >
                  QUICK DEPLOYMENTS
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals (conditionally rendered) */}
      {activeModal === 'saveLoad' && <SaveLoadModal onClose={closeAllModals} />}
      {activeModal === 'inventory' && <InventoryModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('inventory')} />}
      {activeModal === 'blueprints' && <BlueprintsModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('blueprints')} />}
      {activeModal === 'replicator' && <ReplicatorModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('replicator')} />}
      {activeModal === 'shop' && <ShopModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('shop')} />}
      {activeModal === 'quickDeploy' && <QuickDeployManager onClose={closeAllModals} />}

      {/* Boss Encounter Modal */}
      {activeModal === 'bossEncounter' && selectedBossId && (
        <BossEncounterModal
          bossId={selectedBossId}
          selectedSlotId={selectedSlotId}
          onChallenge={handleBossChallenge}
          onClose={closeAllModals}
        />
      )}

      {activeModal === 'mapOverview' && (() => {
        debugLog('EXTRACTION', '🖼️ Rendering MapOverviewModal', {
          selectedSlotId,
          selectedMapName: selectedMap?.name,
          selectedCoordinate,
          hasSlotId: selectedSlotId != null,
          hasMap: selectedMap != null
        });

        return (
          <MapOverviewModal
            selectedSlotId={selectedSlotId}
            selectedMap={selectedMap}
            selectedCoordinate={selectedCoordinate}
            activeSectors={activeSectors}
            onNavigate={handleNavigateSector}
            onDeploy={handleDeploy}
            onClose={closeAllModals}
            onShowHelp={() => setShowTutorial('tacticalMapOverview')}
          />
        );
      })()}

      {/* Run Summary Modal - shown after returning from a run */}
      {lastRunSummary && (
        <RunSummaryModal
          summary={lastRunSummary}
          onClose={handleDismissRunSummary}
        />
      )}

      {/* MIA Recovery Modal - shown when clicking on MIA ship slot */}
      {activeModal === 'miaRecovery' && selectedMiaSlot && (
        <MIARecoveryModal
          shipSlot={selectedMiaSlot}
          onClose={handleCloseMiaModal}
        />
      )}

      {/* New Deck Prompt Modal */}
      {activeModal === 'newDeckPrompt' && (
        <div className="dw-modal-overlay" onClick={closeAllModals}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Create New Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text">How would you like to start your new deck?</p>
            </div>
            <div className="dw-modal-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleNewDeckOption('empty')}
                className="dw-btn dw-btn-confirm dw-btn--full"
              >
                Start Empty
              </button>
              {singlePlayerShipSlots[0]?.status === 'active' && (
                <button
                  onClick={() => handleNewDeckOption('copyFromSlot0')}
                  className="dw-btn dw-btn-secondary dw-btn--full"
                >
                  Copy from {singlePlayerShipSlots[0]?.name || 'Starter Deck'}
                </button>
              )}
              <button
                onClick={closeAllModals}
                className="dw-btn dw-btn-cancel dw-btn--full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deck Confirmation Modal */}
      {deleteConfirmation && (
        <ConfirmationModal
          confirmationModal={{
            type: 'delete',
            text: `Delete "${deleteConfirmation.slotName}"? All non-starter cards will be returned to your inventory.`,
            onConfirm: handleDeleteConfirm,
            onCancel: handleDeleteCancel
          }}
          show={true}
        />
      )}

      {/* Copy Starter Deck Confirmation Modal */}
      {copyStarterConfirmation && (
        <div className="dw-modal-overlay" onClick={handleCancelCopyStarter}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Copy Starter Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
                This will create owned copies of all starter deck items in your inventory:
              </p>
              <ul style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '12px', paddingLeft: '20px' }}>
                <li>{starterDeck.decklist?.reduce((sum, c) => sum + c.quantity, 0) || 40} cards</li>
                <li>{starterDeck.droneSlots?.filter(s => s.assignedDrone).length || 5} drones</li>
                <li>{Object.keys(starterDeck.shipComponents || {}).length || 3} ship components</li>
                <li>1 ship</li>
              </ul>
            </div>
            <div className="dw-modal-actions">
              <button
                onClick={handleCancelCopyStarter}
                className="dw-btn dw-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCopyStarter}
                className="dw-btn dw-btn-confirm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Deck Creation Confirmation Modal */}
      {emptyDeckConfirmation && (
        <div className="dw-modal-overlay" onClick={handleCancelEmptyDeck}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Create Empty Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
                This will create a new empty deck slot that you can customize with any cards.
              </p>
              <p className="dw-modal-text" style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '12px' }}>
                Starter cards are always available in unlimited quantities for deck building.
              </p>
            </div>
            <div className="dw-modal-actions">
              <button
                onClick={handleCancelEmptyDeck}
                className="dw-btn dw-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmptyDeck}
                className="dw-btn dw-btn-confirm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reputation Progress Modal */}
      {showReputationProgress && (
        <ReputationProgressModal
          onClose={() => setShowReputationProgress(false)}
          onClaimRewards={() => {
            setShowReputationProgress(false);
            setShowReputationRewards(true);
          }}
        />
      )}

      {/* Reputation Reward Modal */}
      {showReputationRewards && (
        <ReputationRewardModal
          onClose={() => setShowReputationRewards(false)}
        />
      )}

      {/* Mission Tracker Modal */}
      {showMissionTracker && (
        <MissionTrackerModal
          onClose={() => setShowMissionTracker(false)}
          onRewardClaimed={() => {
            // Force re-render to update mission counts
          }}
        />
      )}

      {/* Tutorial Modals */}
      {showTutorial === 'intro' && (
        <IntroTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('intro');
            setShowTutorial(null);
            setIsHelpIconTutorial(false);
          }}
          onSkipAll={!isHelpIconTutorial ? () => {
            MissionService.skipIntroMissions();
            MissionService.dismissTutorial('intro');
            MissionService.dismissTutorial('inventory');
            MissionService.dismissTutorial('replicator');
            MissionService.dismissTutorial('blueprints');
            MissionService.dismissTutorial('shop');
            MissionService.dismissTutorial('repairBay');
            MissionService.dismissTutorial('deckBuilder');
            setShowTutorial(null);
            setIsHelpIconTutorial(false);
          } : undefined}
        />
      )}
      {showTutorial === 'inventory' && (
        <InventoryTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('inventory');
            setShowTutorial(null);
          }}
        />
      )}
      {showTutorial === 'replicator' && (
        <ReplicatorTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('replicator');
            setShowTutorial(null);
          }}
        />
      )}
      {showTutorial === 'blueprints' && (
        <BlueprintsTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('blueprints');
            setShowTutorial(null);
          }}
        />
      )}
      {showTutorial === 'shop' && (
        <ShopTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('shop');
            setShowTutorial(null);
          }}
        />
      )}
      {showTutorial === 'repairBay' && (
        <RepairBayTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('repairBay');
            MissionService.recordProgress('SCREEN_VISIT', { screen: 'repairBay' });
            setShowTutorial(null);
            gameStateManager.setState({ appState: 'repairBay' });
          }}
        />
      )}
      {showTutorial === 'tacticalMapOverview' && (
        <TacticalMapOverviewTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('tacticalMapOverview');
            setShowTutorial(null);
          }}
        />
      )}
      {showTutorial === 'deckBuilder' && (
        <DeckBuilderTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('deckBuilder');
            MissionService.recordProgress('SCREEN_VISIT', { screen: 'deckBuilder' });
            setShowTutorial(null);
            // DeckBuilder is accessed from other places, not HangarScreen directly
          }}
        />
      )}

      {/* Deploying Screen (transition from Hangar to Tactical Map) */}
      {showDeployingScreen && (
        <DeployingScreen
          deployData={{
            shipName: deployingData?.shipName,
            destination: deployingData?.map?.name || `Sector ${selectedCoordinate}`
          }}
          onComplete={handleDeployingComplete}
        />
      )}

      {/* Boss Encounter Loading Screen (transition before boss combat) */}
      {showBossLoadingScreen && bossLoadingData && (
        <LoadingEncounterScreen
          encounterData={bossLoadingData}
          onComplete={handleBossLoadingComplete}
        />
      )}
    </div>
  );
};

export default HangarScreen;
