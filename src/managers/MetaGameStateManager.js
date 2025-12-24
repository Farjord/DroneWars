/**
 * MetaGameStateManager
 * Manages persistent player data (meta-game state)
 *
 * This manager handles:
 * - Player profile (credits, AI cores)
 * - Card inventory (quantities of each card owned)
 * - Drone instances with damage tracking
 * - Ship component instances with hull tracking
 * - Ship slots (6 slots for different ship configurations)
 * - Quick deployments (up to 5 preset deployments)
 * - Faction reputation
 * - Mission tracking
 *
 * Lifecycle:
 * - State persists across app session
 * - loadFromSave() initializes from saved data
 * - getSaveData() returns data for persistence
 * - reset() clears to default state (new game)
 *
 * This manager is NOT affected by tactical map or combat operations.
 * It only changes when player explicitly modifies inventory/ships.
 */

class MetaGameStateManager {
  constructor() {
    // Initialize with default state
    this.state = this._createDefaultState();

    // Subscribers for state changes
    this.listeners = new Set();
  }

  /**
   * Create default state for new game
   * @returns {Object} Default state
   */
  _createDefaultState() {
    return {
      // Player profile
      credits: 0,
      aiCores: 0,

      // Card inventory (cardId -> quantity)
      cardInventory: {},

      // Drone instances with damage tracking
      droneInstances: [],

      // Ship component instances with hull tracking
      shipComponentInstances: [],

      // Discovered cards (for collection tracking)
      discoveredCards: [],

      // Ship slots (6 slots, slot 0 is starter deck)
      shipSlots: Array(6).fill(null).map((_, i) => ({
        id: i,
        isStarterDeck: i === 0,
        deck: [],
        shipId: null,
        shipComponents: {}
      })),

      // Quick deployments (max 5)
      quickDeployments: [],

      // Faction reputation (factionId -> value)
      factionReputation: {},

      // Missions
      activeMissions: [],
      completedMissions: []
    };
  }

  /**
   * Get current state
   * @returns {Object} Current state (copy)
   */
  getState() {
    return { ...this.state };
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
        console.error('[MetaGameStateManager] Error in listener:', error);
      }
    });
  }

  /**
   * Update state with partial updates
   * @param {Object} updates - Partial state updates
   */
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this._emit('STATE_UPDATE');
  }

  /**
   * Load state from save game data
   * @param {Object} saveData - Saved game data
   */
  loadFromSave(saveData) {
    this.state = {
      credits: saveData.credits || 0,
      aiCores: saveData.aiCores || 0,
      cardInventory: saveData.cardInventory || {},
      droneInstances: saveData.droneInstances || [],
      shipComponentInstances: saveData.shipComponentInstances || [],
      discoveredCards: saveData.discoveredCards || [],
      shipSlots: saveData.shipSlots || this._createDefaultState().shipSlots,
      quickDeployments: saveData.quickDeployments || [],
      factionReputation: saveData.factionReputation || {},
      activeMissions: saveData.activeMissions || [],
      completedMissions: saveData.completedMissions || []
    };
    this._emit('SAVE_LOADED');
  }

  /**
   * Get data suitable for saving
   * @returns {Object} Save data
   */
  getSaveData() {
    return { ...this.state };
  }

  /**
   * Reset to default state (new game)
   */
  reset() {
    this.state = this._createDefaultState();
    this._emit('RESET');
  }

  // --- CREDITS ---

  /**
   * Add credits
   * @param {number} amount - Amount to add
   * @returns {boolean} Success
   */
  addCredits(amount) {
    if (amount < 0) return false;
    this.setState({ credits: this.state.credits + amount });
    return true;
  }

  /**
   * Spend credits
   * @param {number} amount - Amount to spend
   * @returns {boolean} Success (false if insufficient)
   */
  spendCredits(amount) {
    if (amount > this.state.credits) return false;
    this.setState({ credits: this.state.credits - amount });
    return true;
  }

  // --- AI CORES ---

  /**
   * Add AI cores
   * @param {number} amount - Amount to add
   */
  addAICores(amount) {
    if (amount < 0) return false;
    this.setState({ aiCores: this.state.aiCores + amount });
    return true;
  }

  /**
   * Spend AI cores
   * @param {number} amount - Amount to spend
   * @returns {boolean} Success (false if insufficient)
   */
  spendAICores(amount) {
    if (amount > this.state.aiCores) return false;
    this.setState({ aiCores: this.state.aiCores - amount });
    return true;
  }

  // --- CARD INVENTORY ---

  /**
   * Add a card to inventory
   * @param {string} cardId - Card ID
   */
  addCard(cardId) {
    const inventory = { ...this.state.cardInventory };
    inventory[cardId] = (inventory[cardId] || 0) + 1;
    this.setState({ cardInventory: inventory });
  }

  /**
   * Add multiple cards to inventory
   * @param {string[]} cardIds - Array of card IDs
   */
  addCards(cardIds) {
    const inventory = { ...this.state.cardInventory };
    cardIds.forEach(cardId => {
      inventory[cardId] = (inventory[cardId] || 0) + 1;
    });
    this.setState({ cardInventory: inventory });
  }

  /**
   * Remove a card from inventory
   * @param {string} cardId - Card ID
   */
  removeCard(cardId) {
    const inventory = { ...this.state.cardInventory };
    if (inventory[cardId] > 0) {
      inventory[cardId] = inventory[cardId] - 1;
    }
    this.setState({ cardInventory: inventory });
  }

  /**
   * Get card count
   * @param {string} cardId - Card ID
   * @returns {number} Quantity owned
   */
  getCardCount(cardId) {
    return this.state.cardInventory[cardId] || 0;
  }

  // --- SHIP SLOTS ---

  /**
   * Get ship slot by ID
   * @param {number} slotId - Slot ID (0-5)
   * @returns {Object|null} Ship slot or null
   */
  getShipSlot(slotId) {
    return this.state.shipSlots.find(s => s.id === slotId) || null;
  }

  /**
   * Update ship slot
   * @param {number} slotId - Slot ID
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success
   */
  updateShipSlot(slotId, updates) {
    const slotIndex = this.state.shipSlots.findIndex(s => s.id === slotId);
    if (slotIndex === -1) return false;

    const slots = [...this.state.shipSlots];
    slots[slotIndex] = { ...slots[slotIndex], ...updates };
    this.setState({ shipSlots: slots });
    return true;
  }

  // --- QUICK DEPLOYMENTS ---

  /**
   * Add quick deployment
   * @param {Object} deployment - Deployment config
   */
  addQuickDeployment(deployment) {
    const deployments = [...this.state.quickDeployments];
    if (deployments.length >= 5) {
      // Max 5 deployments - replace oldest if full
      deployments.shift();
    }
    deployments.push(deployment);
    this.setState({ quickDeployments: deployments });
  }

  /**
   * Remove quick deployment
   * @param {string} deploymentId - Deployment ID
   */
  removeQuickDeployment(deploymentId) {
    const deployments = this.state.quickDeployments.filter(d => d.id !== deploymentId);
    this.setState({ quickDeployments: deployments });
  }

  // --- DRONE INSTANCES ---

  /**
   * Add drone instance
   * @param {Object} instance - Drone instance
   */
  addDroneInstance(instance) {
    const instances = [...this.state.droneInstances, instance];
    this.setState({ droneInstances: instances });
  }

  /**
   * Update drone instance
   * @param {string} instanceId - Instance ID
   * @param {Object} updates - Updates to apply
   */
  updateDroneInstance(instanceId, updates) {
    const instances = this.state.droneInstances.map(d =>
      d.id === instanceId ? { ...d, ...updates } : d
    );
    this.setState({ droneInstances: instances });
  }

  // --- SHIP COMPONENT INSTANCES ---

  /**
   * Add ship component instance
   * @param {Object} instance - Component instance
   */
  addShipComponentInstance(instance) {
    const instances = [...this.state.shipComponentInstances, instance];
    this.setState({ shipComponentInstances: instances });
  }

  /**
   * Update ship component instance
   * @param {string} instanceId - Instance ID
   * @param {Object} updates - Updates to apply
   */
  updateShipComponentInstance(instanceId, updates) {
    const instances = this.state.shipComponentInstances.map(c =>
      c.id === instanceId ? { ...c, ...updates } : c
    );
    this.setState({ shipComponentInstances: instances });
  }

  // --- REPUTATION ---

  /**
   * Update faction reputation
   * @param {string} factionId - Faction ID
   * @param {number} change - Amount to change (positive or negative)
   */
  updateReputation(factionId, change) {
    const reputation = { ...this.state.factionReputation };
    reputation[factionId] = (reputation[factionId] || 0) + change;
    this.setState({ factionReputation: reputation });
  }

  /**
   * Get faction reputation
   * @param {string} factionId - Faction ID
   * @returns {number} Reputation value
   */
  getReputation(factionId) {
    return this.state.factionReputation[factionId] || 0;
  }
}

// Export singleton instance
const metaGameStateManager = new MetaGameStateManager();

// Also export the class for testing
export { MetaGameStateManager };
export default metaGameStateManager;
