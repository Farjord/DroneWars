/**
 * TransitionManager
 * Coordinator for all state transitions between TacticalMap and Combat
 *
 * This manager provides a single entry/exit point for all combat transitions,
 * ensuring complete state preservation and restoration.
 *
 * Responsibilities:
 * - Single prepareForCombat() entry point for ALL 5 combat paths
 * - Single returnFromCombat() exit point for ALL 4 combat outcomes
 * - Complete state snapshot before combat
 * - State restoration with delta application after combat
 * - Verbose transition logging with validation
 *
 * Entry Reasons:
 * - poi_encounter: Standard POI encounter
 * - salvage_encounter: Combat triggered during salvage
 * - blockade: Blockade encounter at extraction gate
 * - quick_deploy_poi: POI with quick deploy selected
 * - auto_encounter: Random encounter during movement
 * - blueprint_poi: Blueprint POI encounter
 *
 * Exit Types:
 * - regular: Standard victory with loot
 * - blockade: Blockade victory with extraction
 * - blueprint: Victory with blueprint reward
 * - defeat: Player lost combat
 */

import tacticalMapStateManager from './TacticalMapStateManager.js';
import gameStateManager from './GameStateManager.js';
import { debugLog } from '../utils/debugLogger.js';

class TransitionManager {
  constructor() {
    // Singleton pattern
    if (TransitionManager.instance) {
      return TransitionManager.instance;
    }
    TransitionManager.instance = this;

    // Session-only state (no localStorage)
    this.currentSnapshot = null;
    this.transitionHistory = [];
    this.transitionInProgress = false;
  }

  /**
   * Prepare for combat transition
   * Single entry point for ALL combat paths
   *
   * @param {Object} context - Combat context
   * @param {string} context.entryReason - One of: poi_encounter, salvage_encounter, blockade, quick_deploy_poi, auto_encounter, blueprint_poi
   * @param {string} context.sourceLocation - Code location (e.g., 'TacticalMapScreen:1345')
   * @param {string} context.aiId - AI opponent ID
   * @param {Object} [context.poi] - POI data if applicable
   * @param {Object} [context.waypointContext] - Waypoint context if path should be stored
   * @param {Object} [context.salvageState] - Active salvage state if mid-salvage
   * @param {boolean} [context.isBlockade] - Blockade encounter flag
   * @param {boolean} [context.isBlueprintPoI] - Blueprint POI flag
   * @param {string} [context.quickDeployId] - Quick deploy template ID if used
   * @returns {Object} Complete state snapshot
   */
  prepareForCombat(context) {
    // Validation
    if (!tacticalMapStateManager.isRunActive()) {
      throw new Error('Cannot prepare for combat - no active run');
    }

    if (this.transitionInProgress) {
      throw new Error('Transition already in progress');
    }

    if (!context.entryReason) {
      throw new Error('entryReason is required');
    }

    if (!context.aiId) {
      throw new Error('aiId is required');
    }

    // Capture tactical map state
    const tacticalState = tacticalMapStateManager.getState();

    // Validate state
    if (!tacticalState.playerPosition) {
      throw new Error('Invalid player position');
    }

    if (!this._validateShipSections(tacticalState.shipSections)) {
      throw new Error('Invalid ship sections');
    }

    // Mark transition in progress
    this.transitionInProgress = true;

    try {
      // Create snapshot
      const snapshot = this._createSnapshot(context, tacticalState);

      // Store waypoint data if provided
      if (context.waypointContext) {
        snapshot.waypointData = this._captureWaypointState(context.waypointContext);

        // Persist to TacticalMapStateManager
        // Use pendingWaypointDestinations (not pendingWaypointIndexes) for WaypointManager compatibility
        if (snapshot.waypointData) {
          tacticalMapStateManager.setState({
            pendingPath: snapshot.waypointData.pathHexes,
            pendingWaypointDestinations: this._buildWaypointDestinations(context.waypointContext)
          });
        }
      } else {
        snapshot.waypointData = null;
      }

      // Capture salvage state if provided
      if (context.salvageState) {
        snapshot.salvageState = this._captureSalvageState(context.salvageState);

        // PERSIST to TacticalMapStateManager so it survives combat
        tacticalMapStateManager.setState({
          pendingSalvageState: snapshot.salvageState
        });
      } else {
        snapshot.salvageState = null;
      }

      // Store snapshot
      this.currentSnapshot = snapshot;

      // Log transition start
      this._logTransitionStart(snapshot);

      return snapshot;
    } catch (error) {
      // Reset flag on any failure during snapshot creation
      // This prevents the "Transition already in progress" error from blocking future encounters
      this.transitionInProgress = false;
      this.currentSnapshot = null;
      throw error;
    }
  }

  /**
   * Return from combat transition
   * Single exit point for ALL combat outcomes
   *
   * @param {Object} outcome - Combat outcome
   * @param {string} outcome.result - 'victory' or 'defeat'
   * @param {string} [outcome.type] - Victory type: 'regular', 'blockade', 'blueprint'
   * @param {Object} [outcome.lootCollected] - Collected loot data
   * @param {Object} [outcome.hullDelta] - Hull changes per section
   * @param {boolean} [outcome.shouldRestoreWaypoints] - Whether to restore waypoints
   * @param {boolean} [outcome.shouldRestoreSalvage] - Whether to restore salvage modal
   * @param {string} [outcome.defeatReason] - Reason for defeat if applicable
   * @param {Array} [outcome.eventChain] - Event chain for game over logging
   * @param {Object} [outcome.blueprint] - Blueprint data if blueprint victory
   * @returns {Object} Restoration result
   */
  returnFromCombat(outcome) {
    // Validation
    if (!this.currentSnapshot) {
      throw new Error('No snapshot to restore');
    }

    if (!outcome.result) {
      throw new Error('result is required');
    }

    const result = {
      snapshotRestored: false,
      waypointsRestored: false,
      salvageRestored: false,
      restoredWaypoints: null,
      restoredSalvageState: null,
      validationWarnings: [],
      gameOverChain: null,
      hasPendingBlueprint: false
    };

    // Get current state for comparison
    const currentState = tacticalMapStateManager.getState();

    // Check position (warning only, don't throw)
    if (currentState.playerPosition &&
        this.currentSnapshot.tacticalMapState.playerPosition &&
        (currentState.playerPosition.q !== this.currentSnapshot.tacticalMapState.playerPosition.q ||
         currentState.playerPosition.r !== this.currentSnapshot.tacticalMapState.playerPosition.r)) {
      result.validationWarnings.push('Position mismatch');
    }

    if (outcome.result === 'defeat') {
      // Handle defeat
      result.gameOverChain = outcome.eventChain || [];
      this._logGameOverChain(outcome, this.currentSnapshot);
    } else {
      // Handle victory
      result.snapshotRestored = true;

      // Apply hull delta
      if (outcome.hullDelta) {
        this._applyHullDelta(outcome.hullDelta);
      }

      // Apply loot delta
      if (outcome.lootCollected) {
        this._applyLootDelta(outcome.lootCollected);
      }

      // Handle blockade victory
      if (outcome.type === 'blockade') {
        tacticalMapStateManager.setState({
          pendingBlockadeExtraction: true,
          blockadeCleared: true
        });
      }

      // Handle blueprint victory
      if (outcome.type === 'blueprint' && outcome.blueprint) {
        result.hasPendingBlueprint = true;
      }

      // Restore waypoints if requested
      if (outcome.shouldRestoreWaypoints && this.currentSnapshot.waypointData) {
        result.restoredWaypoints = this._restoreWaypoints(currentState);
        result.waypointsRestored = result.restoredWaypoints !== null;
      }

      // Restore salvage if requested
      if (outcome.shouldRestoreSalvage && this.currentSnapshot.salvageState) {
        result.restoredSalvageState = this._restoreSalvageState();
        result.salvageRestored = result.restoredSalvageState !== null;
      }
    }

    // Log transition complete
    this._logTransitionComplete(outcome, result);

    // Record in history
    this.transitionHistory.push({
      entryReason: this.currentSnapshot.metadata.entryReason,
      result: outcome.result,
      type: outcome.type,
      timestamp: Date.now()
    });

    // NOTE: Do NOT clear pendingPath here!
    // WaypointManager.restorePathAfterCombat() is responsible for clearing it
    // after TacticalMapScreen reads and restores the waypoints.

    // Clear snapshot and transition flag
    this.currentSnapshot = null;
    this.transitionInProgress = false;

    return result;
  }

  // ============================================================
  // State Capture Methods
  // ============================================================

  _createSnapshot(context, tacticalState) {
    const timestamp = Date.now();

    return {
      metadata: {
        snapshotId: `snap_${timestamp}`,
        timestamp,
        entryReason: context.entryReason,
        sourceLocation: context.sourceLocation || 'unknown',
        combatContext: {
          aiId: context.aiId,
          isBlockade: context.isBlockade || false,
          isBlueprintPoI: context.isBlueprintPoI || false,
          quickDeployId: context.quickDeployId || null
        }
      },
      tacticalMapState: { ...tacticalState },
      waypointData: null, // Set separately
      salvageState: null  // Set separately
    };
  }

  _captureWaypointState(waypointContext) {
    const { waypoints, currentWaypointIndex, currentHexIndex, isAtPOI } = waypointContext;

    // Handle null/empty waypoints
    if (!waypoints || waypoints.length === 0) {
      return null;
    }

    const pathHexes = [];
    const waypointIndexes = [];

    // Determine starting point based on whether we're at POI
    const startWaypointIndex = isAtPOI ? currentWaypointIndex + 1 : currentWaypointIndex;

    // If no remaining waypoints, return null
    if (startWaypointIndex >= waypoints.length) {
      return null;
    }

    // Build flat hex list
    // First, add remaining hexes from current waypoint (if mid-path)
    if (!isAtPOI && waypoints[currentWaypointIndex]?.pathFromPrev) {
      const currentPath = waypoints[currentWaypointIndex].pathFromPrev;
      for (let i = currentHexIndex + 1; i < currentPath.length; i++) {
        pathHexes.push(`${currentPath[i].q},${currentPath[i].r}`);
      }
      // Mark current waypoint destination
      if (pathHexes.length > 0) {
        waypointIndexes.push(pathHexes.length - 1);
      }
    }

    // Add hexes from subsequent waypoints
    for (let wp = startWaypointIndex + (isAtPOI ? 0 : 1); wp < waypoints.length; wp++) {
      const wpPath = waypoints[wp].pathFromPrev;
      if (wpPath) {
        // Skip first hex (it's the previous waypoint's destination, already included)
        for (let i = 1; i < wpPath.length; i++) {
          pathHexes.push(`${wpPath[i].q},${wpPath[i].r}`);
        }
        // Mark this waypoint's destination index
        waypointIndexes.push(pathHexes.length - 1);
      }
    }

    // If no remaining path, return null
    if (pathHexes.length === 0) {
      return null;
    }

    return {
      pathHexes,
      waypointIndexes,
      currentHexIndex,
      isAtPOI
    };
  }

  _captureSalvageState(salvageState) {
    // Deep clone salvage state
    const captured = JSON.parse(JSON.stringify(salvageState));

    // Calculate revealed loot
    const revealedLoot = {
      cards: [],
      salvageItems: [],
      tokens: []
    };

    for (const slot of captured.slots) {
      if (slot.revealed) {
        if (slot.type === 'card') {
          revealedLoot.cards.push(slot.content);
        } else if (slot.type === 'salvageItem') {
          revealedLoot.salvageItems.push(slot.content);
        } else if (slot.type === 'token') {
          revealedLoot.tokens.push(slot.content);
        }
      }
    }

    captured.revealedLoot = revealedLoot;

    return captured;
  }

  /**
   * Build waypoint destinations array for WaypointManager compatibility
   *
   * Creates the pendingWaypointDestinations array that WaypointManager.restorePathAfterCombat()
   * expects, preserving all waypoint properties (segmentCost, detection, etc.)
   *
   * @param {Object} waypointContext - Waypoint context from prepareForCombat
   * @returns {Array} Array of waypoint destination objects
   */
  _buildWaypointDestinations(waypointContext) {
    const { waypoints, currentWaypointIndex, isAtPOI } = waypointContext;

    // Handle null/empty waypoints
    if (!waypoints || waypoints.length === 0) {
      return [];
    }

    // Determine starting waypoint based on whether we're at POI
    const startIdx = isAtPOI ? currentWaypointIndex + 1 : currentWaypointIndex;

    // If no remaining waypoints, return empty array
    if (startIdx >= waypoints.length) {
      return [];
    }

    const destinations = [];

    for (let wp = startIdx; wp < waypoints.length; wp++) {
      const waypoint = waypoints[wp];
      destinations.push({
        hex: waypoint.hex,
        segmentCost: waypoint.segmentCost,
        cumulativeDetection: waypoint.cumulativeDetection,
        segmentEncounterRisk: waypoint.segmentEncounterRisk,
        cumulativeEncounterRisk: waypoint.cumulativeEncounterRisk
      });
    }

    return destinations;
  }

  // ============================================================
  // State Restoration Methods
  // ============================================================

  _applyHullDelta(hullDelta) {
    const currentState = tacticalMapStateManager.getState();
    const shipSections = { ...currentState.shipSections };

    // Apply delta to each section
    for (const [section, delta] of Object.entries(hullDelta)) {
      if (shipSections[section]) {
        shipSections[section] = {
          ...shipSections[section],
          hull: shipSections[section].hull + delta
        };
      }
    }

    // Calculate total hull from ALL sections
    let totalHull = 0;
    for (const section of Object.values(shipSections)) {
      if (section.hull !== undefined) {
        totalHull += section.hull;
      }
    }

    tacticalMapStateManager.setState({
      shipSections,
      currentHull: totalHull
    });
  }

  _applyLootDelta(lootCollected) {
    const currentState = tacticalMapStateManager.getState();

    const updates = {
      creditsEarned: currentState.creditsEarned + (lootCollected.credits || 0),
      aiCoresEarned: currentState.aiCoresEarned + (lootCollected.aiCores || 0)
    };

    // Add cards to collected loot
    if (lootCollected.cards && lootCollected.cards.length > 0) {
      updates.collectedLoot = [
        ...(currentState.collectedLoot || []),
        ...lootCollected.cards.map(card => ({ ...card, type: 'card' }))
      ];
    }

    // Note: salvage item credit values are expected to be included in lootCollected.credits
    // by the caller (CombatOutcomeProcessor), so we don't double-count them here

    tacticalMapStateManager.setState(updates);
  }

  _restoreWaypoints(currentState) {
    const { pathHexes, waypointIndexes } = this.currentSnapshot.waypointData;
    const playerPosition = currentState.playerPosition;

    if (!pathHexes || pathHexes.length === 0) {
      return null;
    }

    // Parse hex strings to objects
    const hexes = pathHexes.map(coord => {
      const [q, r] = coord.split(',').map(Number);
      return { q, r };
    });

    // Reconstruct waypoints
    const waypoints = [];
    let currentPath = [playerPosition];
    let hexIndex = 0;
    let waypointIdx = 0;

    while (hexIndex < hexes.length && waypointIdx < waypointIndexes.length) {
      const destinationIdx = waypointIndexes[waypointIdx];

      // Collect hexes until destination
      while (hexIndex <= destinationIdx) {
        currentPath.push(hexes[hexIndex]);
        hexIndex++;
      }

      // Create waypoint
      const destination = currentPath[currentPath.length - 1];
      waypoints.push({
        hex: destination,
        pathFromPrev: [...currentPath]
      });

      // Next waypoint starts from this destination
      currentPath = [destination];
      waypointIdx++;
    }

    return waypoints;
  }

  _restoreSalvageState() {
    if (!this.currentSnapshot.salvageState) {
      return null;
    }

    const restored = JSON.parse(JSON.stringify(this.currentSnapshot.salvageState));
    restored.returnedFromCombat = true;
    restored.encounterTriggered = false; // Reset for next slot

    return restored;
  }

  // ============================================================
  // Validation Methods
  // ============================================================

  _validateShipSections(shipSections) {
    if (!shipSections) return false;

    for (const section of Object.values(shipSections)) {
      if (section.hull !== undefined && section.hull < 0) {
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // Logging Methods
  // ============================================================

  _logTransitionStart(snapshot) {
    const { metadata, tacticalMapState, waypointData, salvageState } = snapshot;

    debugLog('TRANSITION_MANAGER', '=== TRANSITION: TacticalMap -> Combat ===', {
      snapshotId: metadata.snapshotId,
      timestamp: new Date(metadata.timestamp).toISOString(),
      entryReason: metadata.entryReason,
      sourceLocation: metadata.sourceLocation,
      combatContext: metadata.combatContext,
      state: {
        position: tacticalMapState.playerPosition,
        detection: tacticalMapState.detection,
        hull: `${tacticalMapState.currentHull}/${tacticalMapState.maxHull}`,
        credits: tacticalMapState.creditsEarned,
        cores: tacticalMapState.aiCoresEarned
      },
      waypoints: waypointData ? {
        hexCount: waypointData.pathHexes.length,
        destinationCount: waypointData.waypointIndexes.length,
        isAtPOI: waypointData.isAtPOI
      } : null,
      salvage: salvageState ? {
        slotsRevealed: `${salvageState.slots.filter(s => s.revealed).length}/${salvageState.totalSlots}`,
        currentSlot: salvageState.currentSlotIndex
      } : null
    });
  }

  _logTransitionComplete(outcome, result) {
    debugLog('TRANSITION_MANAGER', '=== TRANSITION: Combat -> TacticalMap ===', {
      outcome: outcome.result,
      type: outcome.type,
      snapshotRestored: result.snapshotRestored,
      waypointsRestored: result.waypointsRestored,
      salvageRestored: result.salvageRestored,
      validationWarnings: result.validationWarnings,
      timestamp: new Date().toISOString()
    });
  }

  _logGameOverChain(outcome, snapshot) {
    debugLog('TRANSITION_MANAGER', '=== GAME OVER CHAIN ===', {
      defeatReason: outcome.defeatReason,
      entryReason: snapshot.metadata.entryReason,
      eventChain: outcome.eventChain || [],
      finalState: {
        position: snapshot.tacticalMapState.playerPosition,
        hull: snapshot.tacticalMapState.currentHull,
        creditsLost: snapshot.tacticalMapState.creditsEarned,
        lootLost: snapshot.tacticalMapState.collectedLoot?.length || 0
      },
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  hasSnapshot() {
    return this.currentSnapshot !== null;
  }

  getCurrentSnapshot() {
    return this.currentSnapshot;
  }

  getTransitionHistory() {
    return [...this.transitionHistory];
  }

  /**
   * Reset all state (for testing)
   */
  _reset() {
    this.currentSnapshot = null;
    this.transitionHistory = [];
    this.transitionInProgress = false;
  }

  /**
   * Force reset transition state - use for error recovery
   * Called when prepareForCombat fails or combat initialization fails
   * This is safe to call even if no transition is in progress
   */
  forceReset() {
    debugLog('TRANSITION_MANAGER', 'Force resetting transition state', {
      hadSnapshot: !!this.currentSnapshot,
      wasInProgress: this.transitionInProgress
    });
    this.currentSnapshot = null;
    this.transitionInProgress = false;
  }
}

// Export singleton instance
const transitionManager = new TransitionManager();
export default transitionManager;

// Also export class for testing
export { TransitionManager };
