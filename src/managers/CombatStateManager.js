/**
 * CombatStateManager
 * Manages active combat/game state
 *
 * This manager handles:
 * - Game identity (seed, active state)
 * - Turn state (phase, round, current player)
 * - Player states (player1, player2 - full game state)
 * - Combat mechanics (attacks, damage, winner)
 * - Commitments (for simultaneous phases)
 * - Encounter info (AI, rewards)
 *
 * Lifecycle:
 * - State is null when no combat is active
 * - startCombat() initializes state for new combat
 * - endCombat() clears state when combat ends
 *
 * Key invariant: This manager is COMPLETELY ISOLATED from tactical map.
 * When endCombat() is called, only combat state is cleared.
 * TacticalMapStateManager is NOT touched.
 */

class CombatStateManager {
  constructor() {
    // State is null when no combat is active
    this.state = null;

    // Subscribers for state changes
    this.listeners = new Set();
  }

  /**
   * Check if combat is currently active
   * @returns {boolean} True if combat is active
   */
  isActive() {
    return this.state !== null;
  }

  /**
   * Get current state
   * @returns {Object|null} Current state or null if no combat active
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
        console.error('[CombatStateManager] Error in listener:', error);
      }
    });
  }

  /**
   * Start a new combat
   * @param {Object} config - Combat configuration
   * @param {number} config.gameSeed - Random seed for deterministic gameplay
   * @param {Object} config.encounterInfo - Encounter metadata (AI, rewards, etc.)
   */
  startCombat(config) {
    const { gameSeed, encounterInfo } = config;

    this.state = {
      // Game identity
      gameSeed,
      gameActive: true,

      // Turn state
      turnPhase: 'placement',
      roundNumber: 1,
      turn: 1,
      currentPlayer: null,
      actionsTakenThisTurn: 0,
      firstPlayerOfRound: null,

      // Player states (null until set by game initialization)
      player1: null,
      player2: null,

      // Combat state
      attackInProgress: null,
      lastCombatResult: null,
      winner: null,

      // Commitments (for simultaneous phases)
      commitments: {},

      // Encounter info (passed in from TacticalMapStateManager at start)
      encounterInfo: {
        aiId: encounterInfo.aiId,
        aiName: encounterInfo.aiName,
        aiDifficulty: encounterInfo.aiDifficulty || null,
        isBlockade: encounterInfo.isBlockade || false,
        tier: encounterInfo.tier,
        reward: encounterInfo.reward
      },

      // Pass info (for round end)
      passInfo: {
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      },

      // UI state
      gameLog: [],
      placedSections: [],
      opponentPlacedSections: [],
      shieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: []
    };

    this._emit('COMBAT_STARTED');
  }

  /**
   * Update state with partial updates
   * @param {Object} updates - Partial state updates
   * @throws {Error} If combat is not active
   */
  setState(updates) {
    if (!this.isActive()) {
      throw new Error('[CombatStateManager] Cannot update state - no combat is active');
    }

    this.state = { ...this.state, ...updates };
    this._emit('STATE_UPDATE');
  }

  /**
   * End the current combat
   * Clears all state - does NOT affect TacticalMapStateManager
   */
  endCombat() {
    this.state = null;
    this._emit('COMBAT_ENDED');
  }

  // --- PLAYER STATE ---

  /**
   * Set player1 state
   * @param {Object} playerState - Full player state
   */
  setPlayer1(playerState) {
    this.setState({ player1: playerState });
  }

  /**
   * Set player2 (AI) state
   * @param {Object} playerState - Full player state
   */
  setPlayer2(playerState) {
    this.setState({ player2: playerState });
  }

  /**
   * Update player1 with partial updates
   * @param {Object} updates - Partial player state updates
   */
  updatePlayer1(updates) {
    if (!this.state?.player1) return;
    this.setState({ player1: { ...this.state.player1, ...updates } });
  }

  /**
   * Update player2 with partial updates
   * @param {Object} updates - Partial player state updates
   */
  updatePlayer2(updates) {
    if (!this.state?.player2) return;
    this.setState({ player2: { ...this.state.player2, ...updates } });
  }

  // --- TURN MANAGEMENT ---

  /**
   * Set the current turn phase
   * @param {string} phase - Phase name
   */
  setPhase(phase) {
    this.setState({ turnPhase: phase });
  }

  /**
   * Advance to next round
   */
  advanceRound() {
    this.setState({
      roundNumber: this.state.roundNumber + 1,
      turn: this.state.turn + 1
    });
  }

  /**
   * Set current player
   * @param {string} playerId - 'player1' or 'player2'
   */
  setCurrentPlayer(playerId) {
    this.setState({ currentPlayer: playerId });
  }

  /**
   * Increment actions taken this turn
   */
  incrementActions() {
    this.setState({ actionsTakenThisTurn: this.state.actionsTakenThisTurn + 1 });
  }

  /**
   * Reset action counter
   */
  resetActions() {
    this.setState({ actionsTakenThisTurn: 0 });
  }

  // --- COMBAT RESOLUTION ---

  /**
   * Set attack in progress
   * @param {Object} attack - Attack data
   */
  setAttackInProgress(attack) {
    this.setState({ attackInProgress: attack });
  }

  /**
   * Clear attack in progress
   */
  clearAttackInProgress() {
    this.setState({ attackInProgress: null });
  }

  /**
   * Set winner
   * @param {string} playerId - Winner ID
   */
  setWinner(playerId) {
    this.setState({ winner: playerId });
  }

  /**
   * Set last combat result
   * @param {Object} result - Combat result data
   */
  setLastCombatResult(result) {
    this.setState({ lastCombatResult: result });
  }

  // --- COMMITMENTS ---

  /**
   * Set commitment for a phase/player
   * @param {string} phase - Phase name
   * @param {string} playerId - Player ID
   * @param {Object} commitment - Commitment data
   */
  setCommitment(phase, playerId, commitment) {
    const commitments = { ...this.state.commitments };
    if (!commitments[phase]) {
      commitments[phase] = {};
    }
    commitments[phase][playerId] = commitment;
    this.setState({ commitments });
  }

  /**
   * Clear commitments for a phase
   * @param {string} phase - Phase name
   */
  clearCommitments(phase) {
    const commitments = { ...this.state.commitments };
    delete commitments[phase];
    this.setState({ commitments });
  }

  // --- OUTCOME ---

  /**
   * Get combat outcome data for processing
   * @returns {Object|null} Outcome data or null if not active
   */
  getOutcome() {
    if (!this.isActive()) return null;

    return {
      winner: this.state.winner,
      encounterInfo: { ...this.state.encounterInfo },
      player1ShipSections: this.state.player1?.shipSections,
      player2Deck: this.state.player2?.deck,
      roundsPlayed: this.state.roundNumber
    };
  }
}

// Export singleton instance
const combatStateManager = new CombatStateManager();

// Also export the class for testing
export { CombatStateManager };
export default combatStateManager;
