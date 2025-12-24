import { debugLog } from '../utils/debugLogger.js';

/**
 * TacticalMapStateManager
 * Manages state for the tactical map / extraction run
 *
 * This manager handles run-specific state:
 * - mapData (hexes, pois, gates, backgroundIndex)
 * - playerPosition, detection
 * - shipSections (run-specific damage tracking)
 * - collectedLoot, creditsEarned, aiCoresEarned
 * - POI tracking (lootedPOIs, fledPOIs, highAlertPOIs)
 * - pendingPOICombat, pendingWaypoints
 *
 * Lifecycle:
 * - State is null when no run is active
 * - startRun() initializes state for a new run
 * - endRun() clears state when run ends
 *
 * Key invariant: Combat operations (CombatStateManager) do NOT touch this manager.
 * This ensures properties like backgroundIndex survive combat transitions.
 */

class TacticalMapStateManager {
  constructor() {
    // State is null when no run is active
    this.state = null;

    // Subscribers for state changes
    this.listeners = new Set();
  }

  /**
   * Check if a run is currently active
   * @returns {boolean} True if run is active
   */
  isRunActive() {
    return this.state !== null;
  }

  /**
   * Get current state
   * @returns {Object|null} Current state or null if no run active
   */
  getState() {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @param {string} eventType - Type of change
   */
  _emit(eventType = 'STATE_UPDATE') {
    this.listeners.forEach(listener => {
      try {
        listener({ type: eventType, state: this.getState() });
      } catch (error) {
        console.error('[TacticalMapStateManager] Error in listener:', error);
      }
    });
  }

  /**
   * Start a new run
   * @param {Object} config - Run configuration
   * @param {number} config.shipSlotId - Ship slot ID (0-5)
   * @param {number} config.mapTier - Map tier (1-3)
   * @param {Object} config.mapData - Generated map data (hexes, pois, gates, backgroundIndex, etc.)
   * @param {Object} config.startingGate - Starting gate coordinates {q, r}
   * @param {Object} [config.shipSections] - Optional ship sections with hull values
   */
  startRun(config) {
    const { shipSlotId, mapTier, mapData, startingGate, shipSections } = config;

    this.state = {
      // Run identity
      shipSlotId,
      mapTier,

      // Map data (READ-ONLY after initialization)
      // This includes backgroundIndex which must survive combat
      mapData,

      // Player position
      playerPosition: { ...startingGate },
      insertionGate: { ...startingGate },

      // Detection (starts at map's base detection)
      detection: mapData.baseDetection || 0,

      // Ship state (run-specific damage tracking)
      shipSections: shipSections || {},
      currentHull: 0,
      maxHull: 0,

      // Loot collected this run
      collectedLoot: [],
      creditsEarned: 0,
      aiCoresEarned: 0,

      // POI tracking
      lootedPOIs: [],
      fledPOIs: [],
      highAlertPOIs: [],

      // Run statistics
      runStartTime: Date.now(),
      hexesMoved: 0,
      hexesExplored: [{ q: startingGate.q, r: startingGate.r }],
      poisVisited: [],
      combatsWon: 0,
      combatsLost: 0,
      damageDealtToEnemies: 0,

      // Pending state (for combat transitions)
      pendingPOICombat: null,
      pendingWaypoints: null,
      pendingQuickDeploy: null,
      pendingSalvageLoot: null,
      pendingSalvageState: null,

      // Blockade flags
      pendingBlockadeExtraction: false,
      blockadeCleared: false
    };

    this._emit('RUN_STARTED');
  }

  /**
   * Update state with partial updates
   * @param {Object} updates - Partial state updates
   * @throws {Error} If no run is active
   */
  setState(updates) {
    if (!this.isRunActive()) {
      throw new Error('[TacticalMapStateManager] Cannot update state - no run is active');
    }

    // Log if mapData is being modified (background change detection)
    if (updates.mapData) {
      const oldBg = this.state?.mapData?.backgroundIndex;
      const newBg = updates.mapData?.backgroundIndex;
      if (oldBg !== newBg) {
        debugLog('RUN_STATE', '⚠️ TacticalMapStateManager: mapData.backgroundIndex changing!', { from: oldBg, to: newBg });
      }
    }

    // Merge updates into current state
    this.state = { ...this.state, ...updates };

    this._emit('STATE_UPDATE');
  }

  /**
   * End the current run
   * Clears all state
   */
  endRun() {
    this.state = null;
    this._emit('RUN_ENDED');
  }

  /**
   * Get a specific state property
   * @param {string} key - Property name
   * @returns {*} Property value or undefined
   */
  get(key) {
    return this.state ? this.state[key] : undefined;
  }

  /**
   * Load state from a saved run
   * Used when loading a save file that has an active run
   * @param {Object} savedState - The saved run state
   */
  loadFromSave(savedState) {
    if (!savedState) {
      return;
    }
    this.state = { ...savedState };
    this._emit('RUN_LOADED');
  }
}

// Export singleton instance
const tacticalMapStateManager = new TacticalMapStateManager();

// Also export the class for testing
export { TacticalMapStateManager };
export default tacticalMapStateManager;
