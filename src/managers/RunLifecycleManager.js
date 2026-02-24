// ========================================
// RUN LIFECYCLE MANAGER
// ========================================
// Manages extraction run start/end orchestration for single-player mode.
// Builds run state, calculates hull from ship components, transfers loot,
// persists damage, and awards reputation.
// Extracted from GameStateManager — receives GSM via constructor injection.

import { shipComponentCollection } from '../data/shipSectionData.js';
import { getAllShips, getDefaultShip } from '../data/shipData.js';
import { calculateSectionBaseStats } from '../logic/statsCalculator.js';
import fullCardCollection from '../data/cardData.js';
import ReputationService from '../logic/reputation/ReputationService.js';
import { calculateExtractedCredits } from '../logic/singlePlayer/ExtractionController.js';
import { generateRandomShopPack } from '../data/cardPackData.js';
import { generateMapData } from '../logic/map/mapGenerator.js';
import tacticalMapStateManager from './TacticalMapStateManager.js';
import transitionManager from './TransitionManager.js';
import { debugLog } from '../utils/debugLogger.js';

class RunLifecycleManager {
  constructor(gameStateManager) {
    this.gsm = gameStateManager;
  }

  /**
   * Start extraction run
   * @param {Object} options
   * @param {number} options.shipSlotId - Ship slot ID to use (0-5)
   * @param {number} options.mapTier - Map tier (1-3)
   * @param {number} [options.entryGateId=0] - Selected entry gate ID (0-indexed)
   * @param {Object} [options.preGeneratedMap=null] - Optional pre-generated map data from Hangar preview
   * @param {Object} [options.quickDeploy=null] - Optional quick deploy template to use for first combat
   */
  startRun({ shipSlotId, mapTier, entryGateId = 0, preGeneratedMap = null, quickDeploy = null }) {
    debugLog('EXTRACTION', '=== START RUN ===', {
      shipSlotId,
      mapTier,
      entryGateId,
      hasPreGeneratedMap: !!preGeneratedMap,
      hasQuickDeploy: !!quickDeploy,
      currentAppState: this.gsm.state.appState,
      hasExistingRun: tacticalMapStateManager.isRunActive(),
      runAbandoning: this.gsm.state.runAbandoning
    });

    const shipSlot = this.gsm.state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
    if (!shipSlot) {
      throw new Error('Invalid ship slot ID');
    }

    if (shipSlot.status !== 'active') {
      throw new Error(`Ship slot ${shipSlotId} is not active (status: ${shipSlot.status})`);
    }

    // Get ship card for proper hull/threshold calculation
    // Uses ship's baseHull + section's hullModifier instead of deprecated absolute values
    const shipCard = shipSlot?.shipId
      ? getAllShips().find(s => s.id === shipSlot.shipId)
      : getDefaultShip();

    // Use pre-generated map if provided (from Hangar preview), otherwise generate new
    let mapData;
    if (preGeneratedMap && preGeneratedMap.hexes) {
      mapData = preGeneratedMap;
    } else {
      // Fallback: Generate map using deterministic seed
      const seed = Date.now(); // See FUTURE_IMPROVEMENTS #37 — profile-based seed for reproducibility
      const mapType = 'GENERIC'; // See FUTURE_IMPROVEMENTS #37 — map type selection
      mapData = generateMapData(seed, mapTier, mapType);
    }

    // Deduct security token if map requires it
    if (mapData.requiresToken) {
      const currentTokens = this.gsm.state.singlePlayerProfile?.securityTokens || 0;
      if (currentTokens < 1) {
        debugLog('EXTRACTION', '🚨 Cannot start run - insufficient tokens');
        return;
      }

      // Deduct token
      this.gsm.setState({
        singlePlayerProfile: {
          ...this.gsm.state.singlePlayerProfile,
          securityTokens: currentTokens - 1
        }
      });
      debugLog('EXTRACTION', `Deducted 1 security token. Remaining: ${currentTokens - 1}`);
    }

    // Set player starting position to selected entry gate
    const startingGate = mapData.gates[entryGateId] || mapData.gates[0];

    // Build per-section hull tracking from ship slot components
    // Uses slot-based damage model: damage is stored in sectionSlots, not instances
    const runShipSections = {};
    let totalHull = 0;
    let maxHull = 0;

    // Helper to normalize component type to lowercase camelCase key
    // This ensures consistency with CombatOutcomeProcessor and SinglePlayerCombatInitializer
    // which expect keys like 'bridge', 'powerCell', 'droneControlHub'
    const normalizeTypeToKey = (type) => {
      const typeToKey = {
        'Bridge': 'bridge',
        'Power Cell': 'powerCell',
        'Drone Control Hub': 'droneControlHub'
      };
      return typeToKey[type] || type.charAt(0).toLowerCase() + type.slice(1).replace(/\s+/g, '');
    };

    // Use new slot-based format if available, fall back to legacy
    if (shipSlot?.sectionSlots) {
      // New slot-based format: { l: { componentId, damageDealt }, m: {...}, r: {...} }
      const laneNames = { l: 'left', m: 'middle', r: 'right' };

      Object.entries(shipSlot.sectionSlots).forEach(([lane, sectionSlot]) => {
        if (!sectionSlot?.componentId) return;

        const component = shipComponentCollection.find(c => c.id === sectionSlot.componentId);
        if (component) {
          // Calculate base stats using ship card + section modifiers (correct approach)
          const baseStats = calculateSectionBaseStats(shipCard, component);
          const componentMaxHull = baseStats.maxHull;
          const damageDealt = sectionSlot.damageDealt || 0;

          // For slot 0 (starter deck), ignore any damage
          const hullValue = (shipSlotId === 0)
            ? componentMaxHull
            : Math.max(0, componentMaxHull - damageDealt);

          // Use normalized lowercase key for consistency with CombatOutcomeProcessor
          const sectionKey = normalizeTypeToKey(component.type);
          runShipSections[sectionKey] = {
            id: sectionSlot.componentId,
            name: component.name,
            type: component.type,
            hull: hullValue,
            maxHull: componentMaxHull,
            thresholds: baseStats.thresholds,
            lane: lane
          };
          totalHull += hullValue;
          maxHull += componentMaxHull;
        }
      });
    } else if (shipSlot?.shipComponents) {
      // Legacy format fallback: { componentId: lane }
      Object.entries(shipSlot.shipComponents).forEach(([componentId, lane]) => {
        const component = shipComponentCollection.find(c => c.id === componentId);
        if (component) {
          // Calculate base stats using ship card + section modifiers (correct approach)
          const baseStats = calculateSectionBaseStats(shipCard, component);
          const componentMaxHull = baseStats.maxHull;

          // Use normalized lowercase key for consistency with CombatOutcomeProcessor
          const sectionKey = normalizeTypeToKey(component.type);
          runShipSections[sectionKey] = {
            id: componentId,
            name: component.name,
            type: component.type,
            hull: componentMaxHull,
            maxHull: componentMaxHull,
            thresholds: baseStats.thresholds,
            lane: lane
          };
          totalHull += componentMaxHull;
          maxHull += componentMaxHull;
        }
      });
    }

    // Fallback to default sections if no components defined
    // Uses ship card values instead of hardcoded 10/10
    // Keys use lowercase camelCase for consistency with CombatOutcomeProcessor
    if (Object.keys(runShipSections).length === 0) {
      const defaultThresholds = shipCard?.baseThresholds || { damaged: 4, critical: 0 };
      const defaultHull = shipCard?.baseHull || 8;

      runShipSections.bridge = { type: 'Bridge', hull: defaultHull, maxHull: defaultHull, thresholds: defaultThresholds, lane: 'm' };
      runShipSections.powerCell = { type: 'Power Cell', hull: defaultHull, maxHull: defaultHull, thresholds: defaultThresholds, lane: 'l' };
      runShipSections.droneControlHub = { type: 'Drone Control Hub', hull: defaultHull, maxHull: defaultHull, thresholds: defaultThresholds, lane: 'r' };
      totalHull = defaultHull * 3;
      maxHull = defaultHull * 3;
    }

    const runState = {
      shipSlotId,
      mapTier,
      detection: mapData.baseDetection || 0,  // Use map's starting detection
      playerPosition: startingGate,
      // Track insertion gate separately (gates[0] = entry, gates[1+] = extraction)
      insertionGate: { q: startingGate.q, r: startingGate.r },
      collectedLoot: [],
      creditsEarned: 0,
      mapData,
      // Per-section hull tracking for damage persistence across combats
      shipSections: runShipSections,
      currentHull: totalHull,
      maxHull: maxHull,

      // Run statistics tracking
      runStartTime: Date.now(),
      hexesMoved: 0,
      hexesExplored: [{ q: startingGate.q, r: startingGate.r }], // Start with insertion gate
      poisVisited: [],
      lootedPOIs: [],  // Track POIs that have been looted (prevents re-looting)
      fledPOIs: [],  // Track POIs where player fled/escaped (escape or evade)
      highAlertPOIs: [],  // Track POIs in high alert state after combat victory (increased encounter chance)
      combatsWon: 0,
      combatsLost: 0,
      damageDealtToEnemies: 0,

      // Quick deploy for first combat (consumed after use)
      pendingQuickDeploy: quickDeploy || null,

      // Blockade flags - MUST be initialized false for fresh runs
      // These track post-blockade extraction state and must not persist across runs
      pendingBlockadeExtraction: false,
      blockadeCleared: false,
    };

    debugLog('MODE_TRANSITION', '=== MODE: hangar -> tacticalMap ===', {
      trigger: 'async_event',
      source: 'RunLifecycleManager.startRun',
      detail: 'Deploying screen completed, run initialized',
      shipSlotId,
      mapTier,
      mapName: mapData.name
    });

    // Initialize TacticalMapStateManager with run data
    // This provides clean separation of tactical map state from combat state
    tacticalMapStateManager.startRun({
      shipSlotId,
      mapTier,
      mapData,
      startingGate,
      shipSections: runShipSections
    });
    debugLog('STATE_SYNC', 'TacticalMapStateManager initialized for run');

    this.gsm.setState({
      appState: 'tacticalMap',
      // CRITICAL: Clear stale flags from previous runs to prevent race conditions
      // runAbandoning must be false or SinglePlayerCombatInitializer will reject combat init
      runAbandoning: false,
    });

    // CRITICAL: Reset TransitionManager to clear any stale transition state from previous runs
    // This prevents "Transition already in progress" errors when entering combat
    transitionManager.forceReset();

    debugLog('EXTRACTION', 'Run started via TacticalMapStateManager');
    debugLog('EXTRACTION', `Map generated: ${mapData.name} (${mapData.poiCount} PoIs, ${mapData.gateCount} gates)`);
  }

  /**
   * End extraction run
   * @param {boolean} success - True if successful extraction, false if MIA
   */
  endRun(success = true) {
    debugLog('SP_COMBAT', '=== END RUN CALLED ===', {
      success,
      currentAppState: this.gsm.state.appState,
      currentTurnPhase: this.gsm.state.turnPhase,
      currentGameActive: this.gsm.state.gameActive,
      currentGameStage: this.gsm.state.gameStage,
      hasPlayer1: !!this.gsm.state.player1,
      hasPlayer2: !!this.gsm.state.player2
    });

    // Read run state from TacticalMapStateManager
    const runState = tacticalMapStateManager.getState();
    if (!runState) {
      debugLog('EXTRACTION', '⚠️ No active run to end');
      debugLog('SP_COMBAT', 'WARNING: No active run to end');
      return;
    }

    // Generate run summary BEFORE clearing state
    const hexesExploredCount = runState.hexesExplored?.length || 0;
    const totalHexes = runState.mapData?.hexes?.length || 1;
    const runDuration = Date.now() - (runState.runStartTime || Date.now());

    // Get full card data for collected cards
    const cardsCollected = (runState.collectedLoot || [])
      .filter(item => item.type === 'card')
      .map(item => {
        const fullCard = fullCardCollection.find(c => c.id === item.cardId);
        return fullCard ? { ...fullCard, source: item.source } : null;
      })
      .filter(Boolean);

    // Get blueprint data for collected blueprints
    const blueprintsCollected = (runState.collectedLoot || [])
      .filter(item => item.type === 'blueprint')
      .map(item => ({
        blueprintId: item.blueprintId,
        blueprintType: item.blueprintType || 'drone',
        rarity: item.rarity,
        droneData: item.droneData
      }));

    // Calculate credits from salvage items in collectedLoot (not legacy creditsEarned)
    const extractedCredits = calculateExtractedCredits(runState.collectedLoot || []);

    const lastRunSummary = {
      success,
      mapName: runState.mapData?.name || 'Unknown Sector',
      mapTier: runState.mapTier || 1,

      // Movement & Exploration
      hexesMoved: runState.hexesMoved || 0,
      hexesExplored: hexesExploredCount,
      totalHexes,
      mapCompletionPercent: ((hexesExploredCount / totalHexes) * 100).toFixed(1),

      // POIs & Loot
      poisVisited: runState.poisVisited?.length || 0,
      totalPois: runState.mapData?.poiCount || 0,
      cardsCollected, // Full card objects for display
      blueprintsCollected, // Drone blueprints unlocked this run
      creditsEarned: extractedCredits, // Calculated from salvage items
      aiCoresEarned: runState.aiCoresEarned || 0,

      // Combat
      combatsWon: runState.combatsWon || 0,
      combatsLost: runState.combatsLost || 0,
      damageDealtToEnemies: runState.damageDealtToEnemies || 0,

      // Ship Status
      hullDamageTaken: (runState.maxHull || 0) - (runState.currentHull || 0),
      finalHull: runState.currentHull || 0,
      maxHull: runState.maxHull || 0,

      // Time
      runDuration,

      // Detection
      finalDetection: runState.detection || 0,
    };

    debugLog('EXTRACTION', 'Run summary generated', { lastRunSummary });

    // Build all state changes immutably, then apply via setState at the end
    const newInventory = { ...this.gsm.state.singlePlayerInventory };
    const newProfile = {
      ...this.gsm.state.singlePlayerProfile,
      stats: { ...this.gsm.state.singlePlayerProfile.stats }
    };
    let newShipSlots = [...this.gsm.state.singlePlayerShipSlots];

    if (success) {
      // Transfer loot to inventory
      const newBlueprints = [...(newProfile.unlockedBlueprints || [])];
      runState.collectedLoot.forEach(item => {
        if (item.type === 'card') {
          newInventory[item.cardId] = (newInventory[item.cardId] || 0) + 1;
        } else if (item.type === 'blueprint') {
          if (!newBlueprints.includes(item.blueprintId)) {
            newBlueprints.push(item.blueprintId);
          }
        }
      });
      newProfile.unlockedBlueprints = newBlueprints;

      // Add credits (calculated from salvage items, not legacy creditsEarned)
      newProfile.credits += extractedCredits;

      // Add AI Cores earned from combat
      newProfile.aiCores = (newProfile.aiCores || 0) + (runState.aiCoresEarned || 0);

      // Update statistics
      newProfile.stats.runsCompleted++;
      newProfile.stats.totalCreditsEarned += extractedCredits;
      newProfile.stats.totalCombatsWon =
        (newProfile.stats.totalCombatsWon || 0) + (runState.combatsWon || 0);

      // Track highest tier completed
      const currentTier = runState.mapTier || 1;
      if (currentTier > (newProfile.stats.highestTierCompleted || 0)) {
        newProfile.stats.highestTierCompleted = currentTier;
      }

      // Refresh shop pack for next hangar visit (uses updated highestTierCompleted)
      const highestTier = newProfile.stats.highestTierCompleted || 0;
      newProfile.shopPack = generateRandomShopPack(highestTier, Date.now());
      debugLog('EXTRACTION', 'Shop pack refreshed', { shopPack: newProfile.shopPack });

      debugLog('EXTRACTION', 'Run ended successfully - loot transferred');

      // Persist ship section hull damage using slot-based format
      if (runState.shipSlotId !== 0 && runState.shipSections) {
        const slotIndex = newShipSlots.findIndex(s => s.id === runState.shipSlotId);

        if (slotIndex >= 0 && newShipSlots[slotIndex].sectionSlots) {
          const shipSlot = { ...newShipSlots[slotIndex] };
          const newSectionSlots = { ...shipSlot.sectionSlots };

          Object.entries(runState.shipSections).forEach(([sectionName, sectionData]) => {
            const lane = sectionData.lane;
            if (lane && newSectionSlots[lane]) {
              const damageDealt = (sectionData.maxHull || 10) - (sectionData.hull || 0);
              newSectionSlots[lane] = {
                ...newSectionSlots[lane],
                damageDealt: Math.max(0, damageDealt)
              };
            }
          });

          shipSlot.sectionSlots = newSectionSlots;
          newShipSlots[slotIndex] = shipSlot;
          debugLog('EXTRACTION', 'Ship section hull damage persisted to sectionSlots');
        }
      }
    } else {
      // MIA: Wipe loot, mark slot
      // Slot 0 (Starter Deck) never goes MIA - player just loses loot
      if (runState.shipSlotId !== 0) {
        const slotIndex = newShipSlots.findIndex(s => s.id === runState.shipSlotId);
        if (slotIndex >= 0) {
          newShipSlots[slotIndex] = { ...newShipSlots[slotIndex], status: 'mia' };
        }
      }

      // Update statistics
      newProfile.stats.runsLost++;

      debugLog('EXTRACTION', 'Run ended - MIA protocol triggered');
    }

    // Calculate total combat reputation from run
    const combatReputationArray = runState.combatReputationEarned || [];
    const totalCombatRep = combatReputationArray.reduce((sum, entry) => sum + entry.repEarned, 0);

    debugLog('REPUTATION', 'Combat reputation summary:', {
      combatCount: combatReputationArray.length,
      totalCombatRep,
      breakdown: combatReputationArray
    });

    // Award reputation based on loadout value + combat reputation
    const shipSlot = newShipSlots.find(s => s.id === runState.shipSlotId);
    const reputationResult = ReputationService.awardReputation(
      shipSlot,
      runState.mapTier || 1,
      success,
      totalCombatRep
    );

    // Add reputation info to run summary
    lastRunSummary.reputation = {
      repGained: reputationResult.repGained || 0,
      loadoutRepGained: reputationResult.loadoutRepGained || 0,
      combatRepGained: reputationResult.combatRepGained || 0,
      previousRep: reputationResult.previousRep || 0,
      newRep: reputationResult.newRep || 0,
      previousLevel: reputationResult.previousLevel || 1,
      newLevel: reputationResult.newLevel || 1,
      leveledUp: reputationResult.leveledUp || false,
      levelsGained: reputationResult.levelsGained || 0,
      newRewards: reputationResult.newRewards || [],
      loadoutValue: reputationResult.loadout?.totalValue || 0,
      isStarterDeck: reputationResult.loadout?.isStarterDeck || false,
      wasCapped: reputationResult.wasCapped || false,
      tierCap: reputationResult.tierCap || 0,
    };

    debugLog('EXTRACTION', 'Reputation awarded', { reputation: lastRunSummary.reputation });

    // End the run in TacticalMapStateManager
    tacticalMapStateManager.endRun();
    debugLog('STATE_SYNC', 'TacticalMapStateManager run ended');

    // Apply all state changes via setState so subscribers are notified
    this.gsm.setState({
      lastRunSummary,
      singlePlayerProfile: newProfile,
      singlePlayerInventory: newInventory,
      singlePlayerShipSlots: newShipSlots,
    });

    debugLog('SP_COMBAT', '=== END RUN COMPLETE ===', {
      clearedRunState: !tacticalMapStateManager.isRunActive(),
      // Note: game state (player1, player2, gameActive) is NOT cleared by endRun
      gameActiveStillSet: this.gsm.state.gameActive,
      turnPhaseStillSet: this.gsm.state.turnPhase,
      hasPlayer1StillSet: !!this.gsm.state.player1,
      hasPlayer2StillSet: !!this.gsm.state.player2
    });
  }
}

export default RunLifecycleManager;
