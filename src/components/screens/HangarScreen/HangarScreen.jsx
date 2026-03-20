import React, { useState, useRef } from 'react';
import { useGameState } from '../../../hooks/useGameState';
import useHangarMapState from './hooks/useHangarMapState.js';
import useHangarData from './hooks/useHangarData.js';
import { createCopyStarterDeckSlot, createEmptyDeckSlot } from '../../../logic/singlePlayer/deckSlotFactory.js';
import SoundManager from '../../../managers/SoundManager.js';
import SinglePlayerCombatInitializer from '../../../logic/singlePlayer/SinglePlayerCombatInitializer.js';
import aiPersonalities from '../../../data/aiData.js';
import MissionService from '../../../logic/missions/MissionService';
import HangarHeader from '../../ui/HangarHeader';
import HangarHexMap from '../../ui/HangarHexMap';
import HangarSidebar from '../../ui/HangarSidebar';
import HangarModals from '../../ui/HangarModals';
import { debugLog } from '../../../utils/debugLogger.js';
import { validateShipSlot } from '../../../logic/combat/shipSlotUtils.js';

// Background image for the map area
const eremosBackground = new URL('/Eremos/Eremos.jpg', import.meta.url).href;

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
  const [pendingShipConfirm, setPendingShipConfirm] = useState(null); // { slotId, shipId, shipName } awaiting confirm
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
    zoom, setZoom, pan, isDragging,
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

  // Ship slot click - opens deck editor or ship selection
  const handleSlotClick = (slot) => {
    SoundManager.getInstance().play('ui_click');

    if (slot.status === 'empty') {
      // Show ship selection modal — player must assign a ship first
      setSelectedSlotId(slot.id);
      setActiveModal('shipSelection');
    } else if (slot.status === 'active') {
      // Navigate to deck editor screen (read-only for slot 0)
      gameStateManager.setState({
        appState: 'extractionDeckBuilder',
        extractionDeckSlotId: slot.id,
        extractionNewDeckOption: null
      });
    }
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

  // Handle ship selected from ship selection modal — show confirmation
  const handleShipChosen = (shipId, shipName) => {
    setActiveModal(null);
    setPendingShipConfirm({ slotId: selectedSlotId, shipId, shipName });
  };

  // Handle ship assignment confirmation
  const handleConfirmShipAssign = () => {
    if (!pendingShipConfirm) return;
    const { slotId, shipId } = pendingShipConfirm;
    const result = gameStateManager.assignShipToSlot(slotId, shipId);
    setPendingShipConfirm(null);

    if (!result.success) {
      debugLog('HANGAR', 'Failed to assign ship:', result.error);
      return;
    }

    // Ship assigned — now show copy/empty deck options
    setActiveModal('newDeckPrompt');
  };

  // Cancel ship assignment
  const handleCancelShipAssign = () => {
    setPendingShipConfirm(null);
  };

  // Handle new deck option selection - show confirmation modal for both options
  const handleNewDeckOption = (option) => {
    setActiveModal(null);
    if (option === 'copyFromSlot0') {
      setCopyStarterConfirmation(true);
    } else if (option === 'empty') {
      setEmptyDeckConfirmation(true);
    }
  };

  // Handle confirm copy from starter deck
  const handleConfirmCopyStarter = () => {
    const result = createCopyStarterDeckSlot(selectedSlotId, singlePlayerProfile);
    if (!result) {
      setCopyStarterConfirmation(false);
      return;
    }

    gameStateManager.setState({
      singlePlayerProfile: result.profileUpdate,
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
    const tutorialModalScreens = ['inventory', 'enhancer', 'blueprints', 'shop'];

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
      case 'enhancer':
        setActiveModal('enhancer');
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
    const map = mapsWithCoordinates[mapIndex];
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

      gameStateManager.startRun({ shipSlotId: slotId, mapTier: map.tier, entryGateId, preGeneratedMap: map, quickDeploy });
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
    setPendingShipConfirm(null);
  };

  // Navigate to a different sector in the modal
  const handleNavigateSector = (coordinate) => {
    const sector = activeSectors.find(s => s.coordinate === coordinate);
    if (sector) {
      setSelectedCoordinate(coordinate);
      setSelectedMap(mapsWithCoordinates[sector.mapIndex]);
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
      <HangarHeader
        singlePlayerProfile={singlePlayerProfile}
        onShowHelp={() => { setShowTutorial('intro'); setIsHelpIconTutorial(true); }}
        onShowReputationProgress={() => setShowReputationProgress(true)}
        onShowMissionTracker={() => setShowMissionTracker(true)}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        overflow: 'hidden'
      }}>
        <HangarHexMap
          mapContainerRef={mapContainerRef}
          transformRef={transformRef}
          isDragging={isDragging}
          zoom={zoom}
          setZoom={setZoom}
          pan={pan}
          handleMapMouseDown={handleMapMouseDown}
          handleMapMouseMove={handleMapMouseMove}
          handleMapMouseUp={handleMapMouseUp}
          handleResetView={handleResetView}
          hexGridData={hexGridData}
          generatedMaps={generatedMaps}
          bossHexCell={bossHexCell}
          mapsWithCoordinates={mapsWithCoordinates}
          handleMapIconClick={handleMapIconClick}
          handleBossHexClick={handleBossHexClick}
          eremosBackground={eremosBackground}
        />

        <HangarSidebar
          sidebarMode={sidebarMode}
          hoveredButton={hoveredButton}
          setHoveredButton={setHoveredButton}
          singlePlayerShipSlots={singlePlayerShipSlots}
          singlePlayerProfile={singlePlayerProfile}
          gameStateManager={gameStateManager}
          onModeToggle={handleModeToggle}
          onActionClick={handleActionClick}
          onSlotClick={handleSlotClick}
          onStarToggle={handleStarToggle}
          onDeleteClick={handleDeleteClick}
          onQuickDeploy={() => setActiveModal('quickDeploy')}
        />
      </div>

      <HangarModals
        activeModal={activeModal}
        closeAllModals={closeAllModals}
        selectedBossId={selectedBossId}
        selectedSlotId={selectedSlotId}
        selectedMap={selectedMap}
        selectedCoordinate={selectedCoordinate}
        activeSectors={activeSectors}
        onBossChallenge={handleBossChallenge}
        onNavigateSector={handleNavigateSector}
        onDeploy={handleDeploy}
        lastRunSummary={lastRunSummary}
        onDismissRunSummary={handleDismissRunSummary}
        singlePlayerShipSlots={singlePlayerShipSlots}
        singlePlayerInventory={singlePlayerInventory}
        onNewDeckOption={handleNewDeckOption}
        onShipChosen={handleShipChosen}
        pendingShipConfirm={pendingShipConfirm}
        onConfirmShipAssign={handleConfirmShipAssign}
        onCancelShipAssign={handleCancelShipAssign}
        deleteConfirmation={deleteConfirmation}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={handleDeleteCancel}
        copyStarterConfirmation={copyStarterConfirmation}
        onCancelCopyStarter={handleCancelCopyStarter}
        onConfirmCopyStarter={handleConfirmCopyStarter}
        emptyDeckConfirmation={emptyDeckConfirmation}
        onCancelEmptyDeck={handleCancelEmptyDeck}
        onConfirmEmptyDeck={handleConfirmEmptyDeck}
        showReputationProgress={showReputationProgress}
        setShowReputationProgress={setShowReputationProgress}
        showReputationRewards={showReputationRewards}
        setShowReputationRewards={setShowReputationRewards}
        showMissionTracker={showMissionTracker}
        setShowMissionTracker={setShowMissionTracker}
        showTutorial={showTutorial}
        setShowTutorial={setShowTutorial}
        isHelpIconTutorial={isHelpIconTutorial}
        setIsHelpIconTutorial={setIsHelpIconTutorial}
        gameStateManager={gameStateManager}
        showDeployingScreen={showDeployingScreen}
        deployingData={deployingData}
        onDeployingComplete={handleDeployingComplete}
        showBossLoadingScreen={showBossLoadingScreen}
        bossLoadingData={bossLoadingData}
        onBossLoadingComplete={handleBossLoadingComplete}
      />
    </div>
  );
};

export default HangarScreen;
