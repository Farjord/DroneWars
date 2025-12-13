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
import MovementController from '../../logic/map/MovementController.js';
import lootGenerator from '../../logic/loot/LootGenerator.js';
import { generateSalvageItemFromValue } from '../../data/salvageItemData.js';
import DetectionManager from '../../logic/detection/DetectionManager.js';
import EncounterController from '../../logic/encounters/EncounterController.js';
import SinglePlayerCombatInitializer from '../../logic/singlePlayer/SinglePlayerCombatInitializer.js';
import ExtractionController from '../../logic/singlePlayer/ExtractionController.js';
import SalvageController from '../../logic/salvage/SalvageController.js';
import aiPersonalities from '../../data/aiData.js';
import gameStateManager from '../../managers/GameStateManager.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { mapTiers } from '../../data/mapData.js';
import { getValidDeploymentsForDeck } from '../../logic/quickDeploy/QuickDeployValidator.js';
import { getAllShips, getDefaultShip } from '../../data/shipData.js';
import { calculateSectionBaseStats } from '../../logic/statsCalculator.js';
import { debugLog } from '../../utils/debugLogger.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService.js';
import './TacticalMapScreen.css';

/**
 * Build ship sections array with hull data for each component
 * Priority order for hull values:
 * 1. currentRunState.shipSections (live run damage)
 * 2. singlePlayerShipComponentInstances (persistent slot damage)
 * 3. Base stats from ship card + section modifiers (fresh/default)
 *
 * Hull values are calculated using calculateSectionBaseStats() which combines:
 * - Ship's baseHull from shipData.js
 * - Section's hullModifier from shipSectionData.js
 * Thresholds also come from the ship's baseThresholds.
 */
function buildShipSections(shipSlot, slotId, shipComponentInstances, runShipSections) {
  const sections = [];

  // If we have run-state ship sections, use those (contains live damage from combat)
  if (runShipSections && Object.keys(runShipSections).length > 0) {
    for (const [sectionType, sectionData] of Object.entries(runShipSections)) {
      sections.push({
        id: sectionData.id || sectionType,
        name: sectionData.name || sectionType,
        type: sectionData.type || sectionType,
        hull: sectionData.hull ?? 8,
        maxHull: sectionData.maxHull ?? 8,
        thresholds: sectionData.thresholds || { damaged: 4, critical: 0 },
        lane: sectionData.lane ?? 1
      });
    }
    return sections;
  }

  // Get ship card for proper hull/threshold calculation
  const shipCard = shipSlot?.shipId
    ? getAllShips().find(s => s.id === shipSlot.shipId)
    : getDefaultShip();

  // Fallback: build from ship slot components
  const componentEntries = Object.entries(shipSlot?.shipComponents || {});

  for (const [componentId, lane] of componentEntries) {
    const componentData = shipComponentCollection.find(c => c.id === componentId);
    if (!componentData) continue;

    // Calculate base stats using ship card + section modifiers (CORRECT approach)
    const baseStats = calculateSectionBaseStats(shipCard, componentData);
    let currentHull = baseStats.hull;
    let maxHull = baseStats.maxHull;
    let thresholds = baseStats.thresholds;

    // For slots 1-5, check instances for persistent damage
    if (slotId !== 0) {
      const instance = shipComponentInstances?.find(
        i => i.id === componentId && i.assignedToSlot === slotId
      );
      if (instance) {
        currentHull = instance.currentHull;
        maxHull = instance.maxHull;
      }
    }

    sections.push({
      id: componentId,
      name: componentData.name,
      type: componentData.type,
      hull: currentHull,
      maxHull: maxHull,
      thresholds: thresholds,
      lane: lane
    });
  }

  return sections;
}

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

  // Extraction confirmation modal state
  const [showExtractionConfirm, setShowExtractionConfirm] = useState(false);
  const [extractionQuickDeployPending, setExtractionQuickDeployPending] = useState(false);

  // Ref to track pause state in async movement loop
  const isPausedRef = useRef(false);
  const shouldStopMovement = useRef(false);
  const totalWaypointsRef = useRef(0);

  // Ref to resolve encounter promise (allows async waiting in movement loop)
  const encounterResolveRef = useRef(null);

  // Ref to track initial mount (skip safety redirect on first render)
  const isInitialMount = useRef(true);

  // Movement animation speed (ms per hex)
  // Split into scan + move for dramatic effect
  const SCAN_DELAY = 500;   // Time to show scan animation
  const MOVE_DELAY = 400;   // Time after moving to next hex
  const TOTAL_MOVEMENT_DELAY = SCAN_DELAY + MOVE_DELAY;

  // Movement warning state (for "ENEMY THREAT SCAN ACTIVE" overlay)
  const [isScanningHex, setIsScanningHex] = useState(false);

  // Subscribe to game state updates
  useEffect(() => {
    const unsubscribe = gameStateManager.subscribe(() => {
      setGameState(gameStateManager.getState());
    });
    return unsubscribe;
  }, []);

  // Check for pending PoI loot after returning from combat
  // This handles the case where player won combat at a PoI and should now loot it
  useEffect(() => {
    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    if (runState?.pendingPOICombat) {
      console.log('[TacticalMap] Pending PoI combat detected after combat:', runState.pendingPOICombat);

      const { packType, q, r, poiName, remainingWaypoints, fromSalvage } = runState.pendingPOICombat;

      // Store remaining waypoints for journey resumption after loot
      if (remainingWaypoints?.length > 0) {
        console.log('[TacticalMap] Storing remaining waypoints for resumption:', remainingWaypoints.length);
        setPendingResumeWaypoints(remainingWaypoints);
      }

      // Clear pendingPOICombat from run state
      gameStateManager.setState({
        currentRunState: {
          ...runState,
          pendingPOICombat: null
        }
      });

      // If from salvage, loot was already combined with combat rewards - just resume journey
      if (fromSalvage) {
        console.log('[TacticalMap] Salvage combat - loot already collected via combat, resuming journey');
        // Resume journey if waypoints remain (will be picked up by pendingResumeWaypoints)
        return;
      }

      // Regular PoI combat (no salvage) - generate PoI loot as reward
      const tier = runState.mapData?.tier || 1;
      const tierConfig = mapTiers[tier - 1];

      // Find the hex to get zone for loot generation
      const hex = runState.mapData?.hexes?.find(h => h.q === q && h.r === r);
      const zone = hex?.zone || 'mid';

      // Generate PoI loot
      const poiLoot = lootGenerator.openPack(packType, tier, zone, tierConfig);
      console.log('[TacticalMap] Generated PoI loot after regular combat:', poiLoot);

      // Set up for loot modal display
      setPendingLootEncounter({
        poi: { q, r, poiData: { name: poiName, threatIncrease: 10 } }
      });
      setPoiLootToReveal(poiLoot);
    }
  }, []); // Run once on mount

  // Track if we need to auto-extract after blockade victory
  const pendingBlockadeExtractionRef = useRef(false);

  // Check for pending blockade extraction on mount
  // This handles returning from blockade combat - triggers extraction automatically
  useEffect(() => {
    const runState = gameStateManager.getState().currentRunState;
    if (runState?.pendingBlockadeExtraction) {
      console.log('[TacticalMap] Pending blockade extraction detected - will auto-extract');
      pendingBlockadeExtractionRef.current = true;

      // Clear the flag
      gameStateManager.setState({
        currentRunState: {
          ...runState,
          pendingBlockadeExtraction: undefined
        }
      });
    }
  }, []); // Run once on mount

  // Effect to trigger extraction after flag is detected (separate to avoid calling handleExtract during render)
  useEffect(() => {
    if (pendingBlockadeExtractionRef.current) {
      pendingBlockadeExtractionRef.current = false;
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        console.log('[TacticalMap] Triggering auto-extraction after blockade victory');
        // Call the extraction handler directly - it will handle loot selection and run summary
        const currentState = gameStateManager.getState();
        const runState = currentState.currentRunState;
        if (runState) {
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
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Run once on mount

  const { currentRunState, singlePlayerShipSlots, singlePlayerShipComponentInstances, quickDeployments } = gameState;

  // Calculate valid quick deployments for current ship slot
  const validQuickDeployments = React.useMemo(() => {
    debugLog('QUICK_DEPLOY', '=== Validation Start ===');
    debugLog('QUICK_DEPLOY', 'quickDeployments count:', quickDeployments?.length);
    debugLog('QUICK_DEPLOY', 'shipSlotId:', currentRunState?.shipSlotId);

    if (!quickDeployments || !singlePlayerShipSlots || currentRunState?.shipSlotId == null) {
      debugLog('QUICK_DEPLOY', 'Early return - missing data', {
        hasQuickDeployments: !!quickDeployments,
        hasShipSlots: !!singlePlayerShipSlots,
        shipSlotId: currentRunState?.shipSlotId
      });
      return [];
    }

    const currentSlot = singlePlayerShipSlots.find(s => s.id === currentRunState.shipSlotId);
    debugLog('QUICK_DEPLOY', 'currentSlot found:', { found: !!currentSlot, status: currentSlot?.status });

    if (!currentSlot || currentSlot.status !== 'active') {
      debugLog('QUICK_DEPLOY', 'Early return - slot not found or not active');
      return [];
    }

    debugLog('QUICK_DEPLOY', 'slot drones:', currentSlot?.droneSlots?.filter(s => s.assignedDrone).map(s => s.assignedDrone));

    // Get ship card for stats calculation
    const shipCard = getAllShips().find(s => s.id === currentSlot.shipId);
    debugLog('QUICK_DEPLOY', 'shipCard found:', { found: !!shipCard, shipId: currentSlot.shipId });

    if (!shipCard) {
      debugLog('QUICK_DEPLOY', 'Early return - ship card not found');
      return [];
    }

    // Convert shipComponents { sectionId: lane } to ordered array [left, middle, right]
    const shipComponentsObj = currentSlot.shipComponents || {};
    const laneOrder = { 'l': 0, 'm': 1, 'r': 2 };
    const placedSections = Object.entries(shipComponentsObj)
      .sort((a, b) => laneOrder[a[1]] - laneOrder[b[1]])
      .map(([sectionId]) => sectionId);

    debugLog('QUICK_DEPLOY', 'placedSections:', placedSections);

    // Build proper ship sections with hull/thresholds
    const shipSections = {};
    for (const sectionId of placedSections) {
      const sectionTemplate = shipComponentCollection.find(c => c.id === sectionId);
      if (sectionTemplate) {
        const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
        shipSections[sectionId] = {
          ...JSON.parse(JSON.stringify(sectionTemplate)),
          hull: baseStats.hull,
          maxHull: baseStats.maxHull,
          thresholds: baseStats.thresholds
        };
      }
    }

    debugLog('QUICK_DEPLOY', 'shipSections built:', Object.keys(shipSections));
    debugLog('QUICK_DEPLOY', '=== Calling validator ===');

    const mockPlayerState = { shipSections };
    const result = getValidDeploymentsForDeck(quickDeployments, currentSlot, mockPlayerState, placedSections);

    debugLog('QUICK_DEPLOY', 'Valid deployments returned:', result.length);
    return result;
  }, [quickDeployments, singlePlayerShipSlots, currentRunState?.shipSlotId]);

  // Safety check - redirect to hangar if no active run
  // Skip on initial mount to avoid race condition with state propagation
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!currentRunState || !currentRunState.mapData) {
      console.warn('[TacticalMap] No active run detected, returning to hangar');
      gameStateManager.setState({ appState: 'hangar' });
    }
  }, [currentRunState]);

  // ========================================
  // HOOKS MUST BE BEFORE EARLY RETURNS
  // React requires hooks to be called in the same order every render
  // ========================================

  /**
   * Helper to wait with pause support
   * Returns true if should continue, false if should stop
   */
  const waitWithPauseSupport = useCallback(async (ms) => {
    const startTime = Date.now();
    const endTime = startTime + ms;

    while (Date.now() < endTime) {
      // Check if we should stop
      if (shouldStopMovement.current) {
        return false;
      }

      // If paused, wait until unpaused
      while (isPausedRef.current) {
        if (shouldStopMovement.current) return false;
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Small sleep to prevent busy-waiting
      await new Promise(resolve => setTimeout(resolve, Math.min(50, endTime - Date.now())));
    }

    return !shouldStopMovement.current;
  }, []);

  /**
   * Move player to a single hex and update state
   * Uses zone-based detection cost
   * IMPORTANT: Updates detection AND position in single atomic setState to avoid race condition
   * Also tracks hexesMoved and hexesExplored for run summary
   */
  const moveToSingleHex = useCallback((hex, tierConfig, mapRadius) => {
    const currentState = gameStateManager.getState();
    const { currentRunState: runState } = currentState;

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
    gameStateManager.setState({
      currentRunState: {
        ...runState,
        detection: newDetection,
        playerPosition: { q: hex.q, r: hex.r },
        hexesMoved: (runState.hexesMoved || 0) + 1,
        hexesExplored: updatedHexesExplored
      }
    });

    console.log(`[TacticalMap] Moved to hex (${hex.q}, ${hex.r}) - Zone: ${hex.zone} - Detection: ${runState.detection.toFixed(1)}% -> ${newDetection.toFixed(1)}% (+${hexCost.toFixed(1)}%)`);

    // Check for MIA trigger
    if (newDetection >= 100) {
      DetectionManager.triggerMIA();
    }

    return hexCost;
  }, []);

  /**
   * Commence journey - start moving through waypoints hex-by-hex
   * Uses zone-based detection costs and checks for random encounters
   */
  const handleCommenceJourney = useCallback(async () => {
    if (waypoints.length === 0) return;

    console.log('[TacticalMap] Commencing journey with', waypoints.length, 'waypoints');
    totalWaypointsRef.current = waypoints.length;
    setIsMoving(true);
    setIsPaused(false);
    isPausedRef.current = false;
    shouldStopMovement.current = false;
    setCurrentWaypointIndex(0);
    setCurrentHexIndex(0);  // Reset hex index
    setIsScanningHex(true);  // Start scan overlay for entire journey

    const currentState = gameStateManager.getState();
    const { currentRunState: runState } = currentState;
    const tierConfig = mapTiers[runState.mapData.tier - 1];
    const mapRadius = runState.mapData.radius;

    // Process each waypoint
    for (let wpIndex = 0; wpIndex < waypoints.length; wpIndex++) {
      if (shouldStopMovement.current) break;

      setCurrentWaypointIndex(wpIndex);
      setCurrentHexIndex(0);  // Reset hex index for new waypoint
      const waypoint = waypoints[wpIndex];
      const path = waypoint.pathFromPrev;

      if (!path || path.length < 2) continue;

      console.log(`[TacticalMap] Moving to waypoint ${wpIndex + 1}: ${path.length - 1} hexes`);

      // Move through each hex in the path (skip first hex - that's current position)
      for (let hexIndex = 1; hexIndex < path.length; hexIndex++) {
        if (shouldStopMovement.current) break;

        // Update hex index BEFORE the scan/move so UI shows NEXT hex info
        setCurrentHexIndex(hexIndex);
        const targetHex = path[hexIndex];

        // Phase 1: Scan delay (warning overlay stays active throughout journey)
        const shouldContinueScan = await waitWithPauseSupport(SCAN_DELAY);
        if (!shouldContinueScan) break;

        // Phase 2: Move to hex (zone-based detection cost)
        moveToSingleHex(targetHex, tierConfig, mapRadius);

        // Phase 3: Check for random encounter on this hex
        const encounterResult = EncounterController.checkMovementEncounter(targetHex, tierConfig);

        if (encounterResult) {
          // Pause movement and show encounter modal
          console.log('[TacticalMap] Random encounter triggered on hex!');
          setCurrentEncounter(encounterResult);
          setShowPOIModal(true);

          // Wait for encounter to be resolved
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
      console.log(`[TacticalMap] Arrived at waypoint ${wpIndex + 1}: ${arrivedHex.type}`);

      if (arrivedHex.type === 'poi') {
        // Check if POI has already been looted
        const currentState = gameStateManager.getState();
        const lootedPOIs = currentState.currentRunState?.lootedPOIs || [];
        const alreadyLooted = lootedPOIs.some(p => p.q === arrivedHex.q && p.r === arrivedHex.r);

        if (alreadyLooted) {
          console.log(`[TacticalMap] PoI at (${arrivedHex.q}, ${arrivedHex.r}) already looted, skipping encounter`);
          // Skip encounter and continue to next waypoint
        } else {
          console.log('[TacticalMap] PoI arrived - initializing salvage');

          // Initialize salvage state for this POI
          const zone = arrivedHex.zone || 'mid';
          const tier = runState.mapData?.tier || 1;
          const detection = DetectionManager.getCurrentDetection();

          const salvageState = SalvageController.initializeSalvage(
            arrivedHex,
            tierConfig,
            zone,
            lootGenerator,
            tier
          );

          // Store remaining waypoints for journey resumption after salvage
          const remainingWps = waypoints.slice(wpIndex + 1);
          setPendingResumeWaypoints(remainingWps.length > 0 ? remainingWps : null);

          console.log('[TacticalMap] Salvage initialized:', {
            totalSlots: salvageState.totalSlots,
            zone: salvageState.zone,
            baseEncounterChance: salvageState.currentEncounterChance
          });

          // Pause movement and show salvage modal
          setIsScanningHex(false);  // Turn off scan overlay
          setActiveSalvage({ ...salvageState, detection });
          setShowSalvageModal(true);

          // Wait for salvage to be resolved (player leaves or combat triggers)
          await new Promise(resolve => {
            encounterResolveRef.current = resolve;
          });

          // Check if movement was cancelled while waiting
          if (shouldStopMovement.current) break;
        }
      } else if (arrivedHex.type === 'gate') {
        console.log('[TacticalMap] Arrived at gate - extraction available');
        // Gate extraction handled via HUD Extract button
      }

      // Brief pause at waypoint before continuing to next
      if (wpIndex < waypoints.length - 1) {
        const shouldContinue = await waitWithPauseSupport(500);
        if (!shouldContinue) break;
      }
    }

    // Journey complete - clear waypoints and reset state
    console.log('[TacticalMap] Journey complete');
    setWaypoints([]);
    setIsMoving(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsScanningHex(false);
    setCurrentWaypointIndex(0);
    setCurrentHexIndex(0);
  }, [waypoints, waitWithPauseSupport, moveToSingleHex, SCAN_DELAY, MOVE_DELAY]);

  /**
   * Toggle pause/resume during movement
   */
  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => {
      const newValue = !prev;
      isPausedRef.current = newValue;
      console.log(`[TacticalMap] Movement ${newValue ? 'paused' : 'resumed'}`);
      return newValue;
    });
  }, []);

  /**
   * Stop movement completely (cancel journey)
   */
  const handleStopMovement = useCallback(() => {
    console.log('[TacticalMap] Movement cancelled');
    shouldStopMovement.current = true;
    isPausedRef.current = false;
    setIsScanningHex(false);  // Turn off scan overlay immediately
  }, []);

  /**
   * Handle POI encounter - called when player proceeds from modal
   */
  const handleEncounterProceed = useCallback(() => {
    if (!currentEncounter) return;

    console.log('[TacticalMap] Encounter proceed clicked');
    console.log('[TacticalMap] Encounter outcome:', currentEncounter.outcome);

    // Check if this encounter triggers combat
    if (currentEncounter.outcome === 'combat') {
      console.log('[TacticalMap] Combat encounter - showing loading screen');

      // Find AI personality info for the loading screen
      const aiId = currentEncounter.aiId || 'Rogue Scout Pattern';
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
      setShowLoadingEncounter(true);

      // Stop movement
      shouldStopMovement.current = true;
      setIsScanningHex(false);
      setIsMoving(false);

      return;
    }

    // For loot outcome - generate loot and show reveal modal
    if (currentEncounter.outcome === 'loot') {
      console.log('[TacticalMap] Loot encounter - generating loot');

      // Get pack type from POI reward (default to MIXED_PACK)
      const packType = currentEncounter.reward?.rewardType || 'MIXED_PACK';
      const tier = currentRunState?.mapData?.tier || 1;

      // Get zone for reward weighting (core zones give better rewards)
      const zone = currentEncounter.poi?.zone || 'mid';
      const tierConfig = currentRunState?.mapData ? mapTiers[currentRunState.mapData.tier - 1] : null;

      // Handle special reward types that don't use pack system
      let loot;
      if (packType === 'TOKEN_REWARD') {
        // Token reward - guaranteed 1 security token + salvage item (50-100 credits)
        const creditValue = 50 + Math.floor(Math.random() * 51);
        const rng = { random: () => Math.random() };
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
        console.log('[TacticalMap] Generated token reward:', loot);
      } else {
        // Generate loot using LootGenerator with zone-based weighting
        loot = lootGenerator.openPack(packType, tier, zone, tierConfig);
        console.log('[TacticalMap] Generated loot:', { zone, loot });
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
  }, [currentEncounter, currentRunState]);

  /**
   * Handle closing POI modal without proceeding
   */
  const handleEncounterClose = useCallback(() => {
    // For now, closing is same as proceeding
    // Later could add "flee" option with different consequences
    handleEncounterProceed();
  }, [handleEncounterProceed]);

  // ========================================
  // SALVAGE HANDLERS
  // ========================================

  /**
   * Handle salvage slot attempt - reveal next slot, check for encounter
   */
  const handleSalvageSlot = useCallback(() => {
    if (!activeSalvage) return;

    console.log('[TacticalMap] Salvage slot attempt');

    const runState = gameStateManager.getState().currentRunState;
    const tierConfig = runState?.mapData ? mapTiers[runState.mapData.tier - 1] : null;

    // Attempt salvage - this reveals the slot and checks for encounter
    const result = SalvageController.attemptSalvage(activeSalvage, tierConfig);

    // Use the updated salvage state directly from the result
    setActiveSalvage(result.salvageState);

    console.log('[TacticalMap] Salvage result:', {
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

    console.log('[TacticalMap] Salvage leave - preparing loot reveal');

    // Collect revealed loot
    const loot = SalvageController.collectRevealedLoot(activeSalvage);
    const hasRevealedSlots = SalvageController.hasRevealedAnySlots(activeSalvage);

    // Close salvage modal first
    setActiveSalvage(null);
    setShowSalvageModal(false);

    // If player revealed any slots, show LootRevealModal
    // Check for cards OR salvageItems (salvageItems replaced credits)
    if (hasRevealedSlots && loot && (loot.cards?.length > 0 || loot.salvageItems?.length > 0)) {
      // Convert to LootRevealModal format
      // Keep salvageItems as array - each should be shown individually
      const lootForModal = {
        cards: (loot.cards || []).map(card => ({
          cardId: card.cardId,
          cardName: card.cardName,
          rarity: card.rarity
        })),
        // Pass salvageItems array directly - each item should be shown separately
        salvageItems: loot.salvageItems || []
      };

      console.log('[TacticalMap] Showing loot reveal modal:', lootForModal);

      // Set pending encounter info for handlePOILootCollected
      setPendingLootEncounter({ poi: activeSalvage.poi });
      // Show loot reveal modal
      setPoiLootToReveal(lootForModal);

      // Note: encounterResolveRef will be resolved by handlePOILootCollected
    } else {
      // No loot revealed - just resume journey
      console.log('[TacticalMap] No loot revealed, resuming journey');

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

    console.log('[TacticalMap] Salvage encounter - engaging combat');

    // First collect current revealed loot
    const loot = SalvageController.collectRevealedLoot(activeSalvage);

    // Store salvage loot for combination with combat rewards in CombatOutcomeProcessor
    // This allows both salvage loot and combat rewards to appear in one LootRevealModal
    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    // Check for cards OR salvageItems (salvageItems replaced credits)
    if (runState && loot && (loot.cards?.length > 0 || loot.salvageItems?.length > 0)) {
      // Convert salvageItems array to single salvageItem for CombatOutcomeProcessor
      const totalCreditValue = (loot.salvageItems || []).reduce((sum, item) => sum + (item.creditValue || 0), 0);
      const firstSalvageItem = loot.salvageItems?.[0];

      gameStateManager.setState({
        currentRunState: {
          ...runState,
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
            } : null
          }
        }
      });
    }

    // Mark POI as looted
    const updatedRunState = gameStateManager.getState().currentRunState;
    const lootedPOIs = updatedRunState.lootedPOIs || [];
    gameStateManager.setState({
      currentRunState: {
        ...updatedRunState,
        lootedPOIs: [...lootedPOIs, { q: activeSalvage.poi.q, r: activeSalvage.poi.r }]
      }
    });

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

    // Create encounter for loading screen
    setCurrentEncounter({
      poi: activeSalvage.poi,
      outcome: 'combat',
      aiId,
      reward: {
        credits: 50,
        rewardType: activeSalvage.poi?.poiData?.rewardType || 'MIXED_PACK',
        poiName: activeSalvage.poi?.poiData?.name || 'Unknown Location'
      },
      detection,
      threatLevel: DetectionManager.getThreshold(),
      fromSalvage: true
    });

    // Set up loading encounter data
    setLoadingEncounterData({
      aiName: aiPersonality?.name || 'Unknown Hostile',
      difficulty: aiPersonality?.difficulty || 'Medium',
      threatLevel: DetectionManager.getThreshold(),
      isAmbush: false
    });

    // Show loading screen
    setShowLoadingEncounter(true);

    // Stop movement
    shouldStopMovement.current = true;
    setIsMoving(false);
  }, [activeSalvage]);

  /**
   * Handle salvage abort (MIA) - player abandons run when encounter triggered
   */
  const handleSalvageQuit = useCallback(() => {
    if (!activeSalvage) return;

    console.log('[TacticalMap] Salvage abort - triggering MIA');

    // Close salvage modal
    setActiveSalvage(null);
    setShowSalvageModal(false);

    // Trigger MIA flow
    DetectionManager.triggerMIA();
  }, [activeSalvage]);

  /**
   * Handle POI encounter with quick deploy - similar to handleEncounterProceed but with quick deploy
   */
  const handleEncounterProceedWithQuickDeploy = useCallback((deployment) => {
    console.log('[TacticalMap] Quick deploy selected:', deployment.name);

    // Check if this is an extraction blockade quick deploy
    if (extractionQuickDeployPending) {
      console.log('[TacticalMap] Extraction blockade with quick deploy');
      setExtractionQuickDeployPending(false);

      const currentState = gameStateManager.getState();
      const runState = currentState.currentRunState;

      if (!runState) {
        console.warn('[TacticalMap] No run state for blockade quick deploy');
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

      // Store selected quick deploy
      setSelectedQuickDeploy(deployment);

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
      console.log('[TacticalMap] Salvage combat with quick deploy');
      setSalvageQuickDeployPending(false);

      // Collect current revealed loot (same as handleSalvageCombat)
      const loot = SalvageController.collectRevealedLoot(activeSalvage);

      // Store salvage loot for combination with combat rewards
      const currentState = gameStateManager.getState();
      const runState = currentState.currentRunState;

      if (runState && loot && (loot.cards?.length > 0 || loot.salvageItems?.length > 0)) {
        const totalCreditValue = (loot.salvageItems || []).reduce((sum, item) => sum + (item.creditValue || 0), 0);
        const firstSalvageItem = loot.salvageItems?.[0];

        gameStateManager.setState({
          currentRunState: {
            ...runState,
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
              } : null
            }
          }
        });
      }

      // Mark POI as looted
      const updatedRunState = gameStateManager.getState().currentRunState;
      const lootedPOIs = updatedRunState.lootedPOIs || [];
      gameStateManager.setState({
        currentRunState: {
          ...updatedRunState,
          lootedPOIs: [...lootedPOIs, { q: activeSalvage.poi.q, r: activeSalvage.poi.r }]
        }
      });

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
          rewardType: activeSalvage.poi?.poiData?.rewardType || 'MIXED_PACK',
          poiName: activeSalvage.poi?.poiData?.name || 'Unknown Location'
        },
        detection,
        threatLevel: DetectionManager.getThreshold(),
        fromSalvage: true
      });

      // Close salvage modal
      setActiveSalvage(null);
      setShowSalvageModal(false);

      // Store selected quick deploy
      setSelectedQuickDeploy(deployment);

      // Set up loading encounter data with quick deploy info
      setLoadingEncounterData({
        aiName: aiPersonality?.name || 'Unknown Hostile',
        difficulty: aiPersonality?.difficulty || 'Medium',
        threatLevel: DetectionManager.getThreshold(),
        isAmbush: false,
        quickDeployId: deployment.id
      });

      // Show loading screen
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
      console.log('[TacticalMap] Combat encounter with quick deploy - showing loading screen');

      // Find AI personality info for the loading screen
      const aiId = currentEncounter.aiId || 'Rogue Scout Pattern';
      const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

      // Set up loading encounter data with quick deploy info
      setLoadingEncounterData({
        aiName: aiPersonality?.name || 'Unknown Hostile',
        difficulty: aiPersonality?.difficulty || 'Medium',
        threatLevel: currentEncounter.threatLevel || 'medium',
        isAmbush: currentEncounter.isAmbush || false,
        quickDeployId: deployment.id  // Pass the quick deploy ID
      });

      // Store selected quick deploy
      setSelectedQuickDeploy(deployment);

      // Show loading screen
      setShowLoadingEncounter(true);

      // Stop movement
      shouldStopMovement.current = true;
      setIsScanningHex(false);
      setIsMoving(false);
    }
  }, [currentEncounter, salvageQuickDeployPending, activeSalvage]);

  /**
   * Handle loading encounter complete - actually start combat
   */
  const handleLoadingEncounterComplete = useCallback(async () => {
    console.log('[TacticalMap] Loading complete - initializing combat');

    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    // Store pending PoI combat info for post-combat loot
    // This allows the player to loot the PoI after winning combat
    if (currentEncounter?.poi) {
      // Capture remaining waypoints (for journey resumption after loot)
      const remainingWps = waypoints.slice(currentWaypointIndex + 1);

      console.log('[TacticalMap] Storing pendingPOICombat for post-combat loot:', {
        poi: { q: currentEncounter.poi.q, r: currentEncounter.poi.r },
        packType: currentEncounter.reward?.rewardType || 'MIXED_PACK',
        remainingWaypoints: remainingWps.length
      });

      gameStateManager.setState({
        currentRunState: {
          ...runState,
          pendingPOICombat: {
            q: currentEncounter.poi.q,
            r: currentEncounter.poi.r,
            packType: currentEncounter.reward?.rewardType || 'MIXED_PACK',
            poiName: currentEncounter.poi.poiData?.name || 'Unknown Location',
            remainingWaypoints: remainingWps,
            fromSalvage: currentEncounter.fromSalvage || false  // Flag to skip post-combat loot generation
          }
        }
      });
    }

    // Get AI from the encounter
    const aiId = currentEncounter?.aiId || 'Rogue Scout Pattern';

    // Get quick deploy ID from loading data (if user selected quick deploy)
    const quickDeployId = loadingEncounterData?.quickDeployId || null;
    console.log('[TacticalMap] Quick deploy ID:', quickDeployId);

    // Re-fetch runState after potential update above
    const updatedRunState = gameStateManager.getState().currentRunState;

    // Initialize combat with optional quick deploy
    // Pass isBlockade flag so post-combat can auto-extract on blockade victory
    const success = await SinglePlayerCombatInitializer.initiateCombat(
      aiId,
      updatedRunState,
      quickDeployId,
      currentEncounter?.isBlockade || false
    );

    if (!success) {
      console.error('[TacticalMap] Failed to initialize combat');
      // Fall back to map
      setShowLoadingEncounter(false);
      setLoadingEncounterData(null);
      setCurrentEncounter(null);
    }

    // GameStateManager will handle the transition to inGame state
    // The appState change will unmount this component
  }, [currentEncounter, loadingEncounterData, waypoints, currentWaypointIndex]);

  /**
   * Handle extraction button click - show confirmation modal or extract directly if blockade already cleared
   */
  const handleExtract = useCallback(() => {
    console.log('[TacticalMap] Extraction button clicked');

    // Stop any ongoing movement
    shouldStopMovement.current = true;
    setIsMoving(false);
    setIsScanningHex(false);

    // Check if blockade was already cleared (player won blockade combat)
    // This prevents double blockade encounters if auto-extraction failed to trigger
    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    if (runState?.blockadeCleared) {
      console.log('[TacticalMap] Blockade already cleared - skipping modal, extracting directly');

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
    console.log('[TacticalMap] Showing extraction confirmation modal');
    setShowExtractionConfirm(true);
  }, []);

  /**
   * Handle extraction cancel - close confirmation modal
   */
  const handleExtractionCancel = useCallback(() => {
    console.log('[TacticalMap] Extraction cancelled');
    setShowExtractionConfirm(false);
  }, []);

  /**
   * Handle safe extraction confirmed - complete the run
   * Called when modal completes scan and no blockade triggered
   */
  const handleExtractionConfirmed = useCallback(() => {
    console.log('[TacticalMap] Safe extraction confirmed - completing run');
    setShowExtractionConfirm(false);

    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    if (!runState) {
      console.warn('[TacticalMap] No run state for extraction');
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
   * Handle blockade combat - engage with standard deploy
   * Called when modal detects blockade and player clicks Engage/Standard Deploy
   */
  const handleBlockadeCombat = useCallback(() => {
    console.log('[TacticalMap] Blockade detected - engaging combat');
    setShowExtractionConfirm(false);

    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    if (!runState) {
      console.warn('[TacticalMap] No run state for blockade combat');
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
    console.log('[TacticalMap] Blockade detected - opening quick deploy selection');
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
      console.log('[TacticalMap] Loot selection required:', result.limit, 'max from', result.collectedLoot.length);
      setPendingLootSelection({
        collectedLoot: result.collectedLoot,
        limit: result.limit
      });
      setShowLootSelectionModal(true);
    } else {
      // Normal extraction complete - go directly to hangar (RunSummaryModal shows there)
      console.log('[TacticalMap] Extraction complete - returning to hangar');
      gameStateManager.setState({ appState: 'hangar' });
    }
  }, []);

  /**
   * Handle abandon run button click - show confirmation modal
   */
  const handleAbandon = useCallback(() => {
    console.log('[TacticalMap] Abandon run requested');
    setShowAbandonModal(true);
  }, []);

  /**
   * Handle abandon confirmation - trigger MIA
   */
  const handleConfirmAbandon = useCallback(() => {
    console.log('[TacticalMap] Abandon confirmed - triggering MIA');

    // Stop any ongoing movement
    shouldStopMovement.current = true;
    setIsMoving(false);
    setIsScanningHex(false);

    // Close modal and trigger MIA
    setShowAbandonModal(false);
    ExtractionController.abandonRun();
  }, []);

  /**
   * Handle escape button click - show escape confirmation modal
   * @param {Object} context - { type: 'poi' | 'salvage', isPOI: boolean }
   */
  const handleEscapeRequest = useCallback((context) => {
    console.log('[TacticalMap] Escape requested:', context);
    setEscapeContext(context);
    setShowEscapeConfirm(true);
  }, []);

  /**
   * Handle escape cancel - close escape confirmation modal
   */
  const handleEscapeCancel = useCallback(() => {
    console.log('[TacticalMap] Escape cancelled');
    setShowEscapeConfirm(false);
    setEscapeContext(null);
  }, []);

  /**
   * Handle escape confirmation - apply damage and show loading screen or trigger MIA
   */
  const handleEscapeConfirm = useCallback(() => {
    console.log('[TacticalMap] Escape confirmed');

    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    if (!runState) {
      console.warn('[TacticalMap] No run state for escape');
      return;
    }

    // Get the AI personality for this encounter (affects escape damage)
    const aiId = currentEncounter?.aiId || 'Rogue Scout Pattern';
    const aiPersonality = aiPersonalities.find(ai => ai.name === aiId) || aiPersonalities[0];

    // Execute escape - applies variable damage based on AI type
    const { wouldDestroy, updatedSections, totalDamage, damageHits, initialSections } = ExtractionController.executeEscape(runState, aiPersonality);

    if (wouldDestroy) {
      // Ship destroyed - trigger MIA
      console.log('[TacticalMap] Escape destroyed ship - triggering MIA');
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
    console.log('[TacticalMap] Escape successful - showing loading screen');

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
  }, [currentEncounter]);

  /**
   * Handle escape loading screen completion - resume journey
   */
  const handleEscapeLoadingComplete = useCallback(() => {
    console.log('[TacticalMap] Escape animation complete - resuming journey');

    setShowEscapeLoadingScreen(false);
    setEscapeLoadingData(null);

    // If this was a POI encounter, mark POI as visited (no loot)
    if (escapeContext?.isPOI && currentEncounter?.poi) {
      const updatedRunState = gameStateManager.getState().currentRunState;
      const lootedPOIs = updatedRunState.lootedPOIs || [];
      gameStateManager.setState({
        currentRunState: {
          ...updatedRunState,
          lootedPOIs: [...lootedPOIs, { q: currentEncounter.poi.q, r: currentEncounter.poi.r }]
        }
      });
      console.log('[TacticalMap] POI marked as visited (escaped):', currentEncounter.poi.q, currentEncounter.poi.r);
    }

    // If this was a salvage encounter, mark POI as visited
    if (escapeContext?.type === 'salvage' && activeSalvage?.poi) {
      const updatedRunState = gameStateManager.getState().currentRunState;
      const lootedPOIs = updatedRunState.lootedPOIs || [];
      gameStateManager.setState({
        currentRunState: {
          ...updatedRunState,
          lootedPOIs: [...lootedPOIs, { q: activeSalvage.poi.q, r: activeSalvage.poi.r }]
        }
      });
      console.log('[TacticalMap] POI marked as visited (salvage escaped):', activeSalvage.poi.q, activeSalvage.poi.r);
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
  }, [currentEncounter, activeSalvage, escapeContext]);

  /**
   * Handle loot selection confirmation - complete extraction with selected items
   */
  const handleLootSelectionConfirm = useCallback((selectedLoot) => {
    console.log('[TacticalMap] Loot selection confirmed:', selectedLoot.length, 'items');

    setShowLootSelectionModal(false);
    setPendingLootSelection(null);

    // Get current run state and complete extraction with selected loot
    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

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
    console.log('[TacticalMap] POI loot collected:', loot);

    const currentState = gameStateManager.getState();
    const runState = currentState.currentRunState;

    if (!runState) {
      console.warn('[TacticalMap] No run state for loot collection');
      return;
    }

    // Add loot cards to collectedLoot
    const newCardLoot = (loot.cards || []).map(card => ({
      type: 'card',
      cardId: card.cardId,
      cardName: card.cardName,
      rarity: card.rarity,
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

    // Add token to loot record (for display in run summary)
    if (loot.token) {
      newCardLoot.push({
        type: 'token',
        tokenType: loot.token.tokenType,
        amount: loot.token.amount,
        source: 'poi_loot'
      });
    }

    const updatedLoot = [...(runState?.collectedLoot || []), ...newCardLoot];
    const salvageTotalCredits = (loot.salvageItems || []).reduce((sum, item) => sum + (item.creditValue || 0), 0);
    const newCredits = (runState?.creditsEarned || 0) + salvageTotalCredits;

    // Handle token collection - save to player profile (persistent across runs)
    if (loot.token) {
      const saveData = gameStateManager.getState();
      const currentTokens = saveData.playerProfile?.securityTokens || 0;
      gameStateManager.setState({
        playerProfile: {
          ...saveData.playerProfile,
          securityTokens: currentTokens + loot.token.amount
        }
      });
      console.log(`[TacticalMap] Security token collected! Total: ${currentTokens + loot.token.amount}`);
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
    gameStateManager.setState({
      currentRunState: {
        ...runState,
        collectedLoot: updatedLoot,
        creditsEarned: newCredits,
        lootedPOIs: updatedLootedPOIs
      }
    });

    // Add detection for looting (from pending encounter)
    if (pendingLootEncounter) {
      const threatIncrease = pendingLootEncounter.poi?.poiData?.threatIncrease || 10;
      DetectionManager.addDetection(threatIncrease, `Looting ${pendingLootEncounter.poi?.poiData?.name || 'PoI'}`);
      console.log(`[TacticalMap] POI marked as looted: (${poiCoords?.q}, ${poiCoords?.r})`);
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
      console.log('[TacticalMap] Resuming journey with remaining waypoints:', pendingResumeWaypoints.length);
      setWaypoints(pendingResumeWaypoints);
      setPendingResumeWaypoints(null);
      // Movement will start via the executeMovement useEffect that watches waypoints
    }

    console.log('[TacticalMap] POI loot finalized, resuming movement');
  }, [pendingLootEncounter, pendingResumeWaypoints]);

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
    console.error('[TacticalMap] Ship slot not found:', currentRunState.shipSlotId);
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

  // Calculate preview path for inspected hex (shown before adding as waypoint)
  const getPreviewPath = () => {
    if (!inspectedHex || isMoving) return null;
    // Don't show preview for current position
    if (inspectedHex.q === playerPosition.q && inspectedHex.r === playerPosition.r) return null;
    // Don't show preview if already a waypoint
    if (waypoints.some(w => w.hex.q === inspectedHex.q && w.hex.r === inspectedHex.r)) return null;

    const startPosition = waypoints.length > 0
      ? waypoints[waypoints.length - 1].hex
      : playerPosition;

    return MovementController.calculatePath(startPosition, inspectedHex, mapData.hexes);
  };

  const previewPath = getPreviewPath();

  // ========================================
  // WAYPOINT MANAGEMENT
  // ========================================

  /**
   * Check if a hex is already a waypoint
   */
  const isWaypoint = (hex) =>
    waypoints.some(w => w.hex.q === hex.q && w.hex.r === hex.r);

  /**
   * Get the last position in the journey (last waypoint or player position)
   */
  const getLastJourneyPosition = () =>
    waypoints.length > 0 ? waypoints[waypoints.length - 1].hex : playerPosition;

  /**
   * Get cumulative detection at end of current journey
   */
  const getJourneyEndDetection = () =>
    waypoints.length > 0 ? waypoints[waypoints.length - 1].cumulativeDetection : detection;

  /**
   * Get cumulative encounter risk at end of current journey (0-100)
   * Returns 0 if no waypoints (fresh start)
   */
  const getJourneyEndEncounterRisk = () =>
    waypoints.length > 0 ? waypoints[waypoints.length - 1].cumulativeEncounterRisk : 0;

  /**
   * Add a waypoint to the end of the journey
   */
  const addWaypoint = (hex) => {
    console.log('[TacticalMap] addWaypoint called with hex:', hex);
    console.log('[TacticalMap] hex q:', hex?.q, 'r:', hex?.r);

    const lastPosition = getLastJourneyPosition();
    console.log('[TacticalMap] lastPosition:', lastPosition);

    // Calculate path from last position to new waypoint
    const path = MovementController.calculatePath(lastPosition, hex, mapData.hexes);
    console.log('[TacticalMap] calculated path:', path);

    if (!path) {
      console.warn('[TacticalMap] No path available to waypoint');
      return false;
    }

    // Calculate detection costs (using zone-based rates)
    let segmentCost = MovementController.calculateDetectionCost(path, tierConfig, mapData.radius);
    // Add looting threat if waypoint is a POI (POI-specific or fallback)
    if (hex.type === 'poi') {
      segmentCost += hex.poiData?.threatIncrease || tierConfig.detectionTriggers.looting;
    }
    const prevDetection = getJourneyEndDetection();
    const cumulativeDetection = prevDetection + segmentCost;

    // Calculate encounter risk for this segment
    const segmentEncounterRisk = MovementController.calculateEncounterRisk(path, tierConfig, mapData);

    // Calculate cumulative encounter risk using probability formula:
    // P(at least one in journey) = 1 - P(none in all segments)
    // P(none) = P(none in prev) × P(none in this segment)
    const prevPNoEncounter = (100 - getJourneyEndEncounterRisk()) / 100;
    const segmentPNoEncounter = (100 - segmentEncounterRisk) / 100;
    const cumulativeEncounterRisk = (1 - (prevPNoEncounter * segmentPNoEncounter)) * 100;

    console.log(`[TacticalMap] Adding waypoint: +${segmentCost.toFixed(1)}% detection → ${cumulativeDetection.toFixed(1)}%`);
    console.log(`[TacticalMap] Encounter risk: ${segmentEncounterRisk.toFixed(1)}% segment → ${cumulativeEncounterRisk.toFixed(1)}% cumulative`);

    setWaypoints([...waypoints, {
      hex,
      pathFromPrev: path,
      segmentCost,
      cumulativeDetection,
      segmentEncounterRisk,
      cumulativeEncounterRisk
    }]);

    return true;
  };

  /**
   * Remove a waypoint and recalculate subsequent paths
   */
  const removeWaypoint = (index) => {
    console.log(`[TacticalMap] Removing waypoint ${index + 1}`);

    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);

    // Recalculate paths and detection from the removed index onward
    recalculateWaypoints(newWaypoints, index);
  };

  /**
   * Recalculate paths, cumulative detection, and encounter risk from a given index
   */
  const recalculateWaypoints = (waypointList, fromIndex) => {
    if (waypointList.length === 0) {
      setWaypoints([]);
      return;
    }

    const recalculated = [...waypointList];

    for (let i = fromIndex; i < recalculated.length; i++) {
      const prevPosition = i === 0 ? playerPosition : recalculated[i - 1].hex;
      const prevDetection = i === 0 ? detection : recalculated[i - 1].cumulativeDetection;
      const prevEncounterRisk = i === 0 ? 0 : recalculated[i - 1].cumulativeEncounterRisk;

      const path = MovementController.calculatePath(prevPosition, recalculated[i].hex, mapData.hexes);

      if (path) {
        // Calculate detection cost
        let segmentCost = MovementController.calculateDetectionCost(path, tierConfig, mapData.radius);
        // Add looting threat if waypoint is a POI (POI-specific or fallback)
        if (recalculated[i].hex.type === 'poi') {
          segmentCost += recalculated[i].hex.poiData?.threatIncrease || tierConfig.detectionTriggers.looting;
        }

        // Calculate encounter risk for this segment
        const segmentEncounterRisk = MovementController.calculateEncounterRisk(path, tierConfig, mapData);

        // Calculate cumulative encounter risk
        const prevPNoEncounter = (100 - prevEncounterRisk) / 100;
        const segmentPNoEncounter = (100 - segmentEncounterRisk) / 100;
        const cumulativeEncounterRisk = (1 - (prevPNoEncounter * segmentPNoEncounter)) * 100;

        recalculated[i] = {
          ...recalculated[i],
          pathFromPrev: path,
          segmentCost,
          cumulativeDetection: prevDetection + segmentCost,
          segmentEncounterRisk,
          cumulativeEncounterRisk
        };
      } else {
        // Path broken - remove this and all subsequent waypoints
        console.warn(`[TacticalMap] Path broken at waypoint ${i + 1}, removing subsequent`);
        setWaypoints(recalculated.slice(0, i));
        return;
      }
    }

    setWaypoints(recalculated);
  };

  /**
   * Clear all waypoints
   */
  const clearAllWaypoints = () => {
    console.log('[TacticalMap] Clearing all waypoints');
    setWaypoints([]);
  };

  // ========================================
  // HEX INTERACTION
  // ========================================

  /**
   * Handle hex click - open Hex Info view
   */
  const handleHexClick = (hex) => {
    if (isMoving) return; // Can't inspect while moving
    setInspectedHex(hex);
  };

  /**
   * Handle waypoint click in list - open Hex Info view for that waypoint
   */
  const handleWaypointClick = (waypointIndex) => {
    setInspectedHex(waypoints[waypointIndex].hex);
  };

  /**
   * Close Hex Info view, return to Waypoint List
   */
  const handleBackToJourney = () => {
    setInspectedHex(null);
  };

  /**
   * Add or remove waypoint (called from Hex Info view)
   */
  const handleToggleWaypoint = (hex) => {
    console.log('[TacticalMap] handleToggleWaypoint called with hex:', hex);

    if (isWaypoint(hex)) {
      const index = waypoints.findIndex(w => w.hex.q === hex.q && w.hex.r === hex.r);
      console.log('[TacticalMap] Removing waypoint at index:', index);
      removeWaypoint(index);
    } else {
      console.log('[TacticalMap] Adding new waypoint');
      const success = addWaypoint(hex);
      console.log('[TacticalMap] addWaypoint result:', success);
    }
    // Return to waypoint list after action
    setInspectedHex(null);
  };

  /**
   * Handle inventory view - show RunInventoryModal
   */
  const handleInventory = () => {
    console.log('[TacticalMap] Opening inventory modal');
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
        <h1 style={{
          fontSize: '1.5rem',
          color: '#e5e7eb',
          letterSpacing: '0.1em',
          margin: 0
        }}>TACTICAL MAP</h1>

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
        shipId={shipSlot.shipId || 'SHIP_001'}
        currentHexIndex={currentHexIndex}
      />

      {/* HUD Overlay - now only bottom buttons */}
      <TacticalMapHUD
        currentRunState={currentRunState}
        shipSections={shipSections}
        onExtractClick={handleExtract}
        onAbandonClick={handleAbandon}
        onInventoryClick={handleInventory}
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
      />

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
            // Proceed to combat with selected quick deploy
            handleEncounterProceedWithQuickDeploy(deployment);
          }}
          onBack={() => {
            setShowQuickDeploySelection(false);
            // Return to appropriate modal based on context
            if (extractionQuickDeployPending) {
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
          onEngageCombat={handleBlockadeCombat}
          onQuickDeploy={handleBlockadeQuickDeploy}
          validQuickDeployments={validQuickDeployments}
        />
      )}

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

      {/* POI Loot Reveal Modal */}
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
        const escapeAiId = currentEncounter?.aiId || 'Rogue Scout Pattern';
        const escapeAiPersonality = aiPersonalities.find(ai => ai.name === escapeAiId) || aiPersonalities[0];
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
