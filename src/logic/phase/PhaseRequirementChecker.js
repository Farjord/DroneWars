// --- Phase Requirement Checker ---
// Stateless query logic: determines whether each round phase is required
// based on current game state. No side effects, no state mutations.

import { debugLog } from '../../utils/debugLogger.js';

class PhaseRequirementChecker {
  constructor(gameDataService) {
    this.gameDataService = gameDataService;
  }

  /**
   * Check if a phase is required based on current game state
   * @param {string} phase - Phase to check
   * @param {Object} gameState - Current game state
   * @param {Object} options - Additional context
   * @param {boolean} options.quickDeployExecutedThisRound - Whether quick deploy ran this round
   * @returns {boolean} True if phase is required
   */
  isPhaseRequired(phase, gameState, { quickDeployExecutedThisRound = false } = {}) {
    switch (phase) {
      case 'roundInitialization':
        // Round 1: already ran via PRE_GAME_PHASES (after placement)
        // Round 2+: runs via ROUND_PHASES (after optionalDiscard)
        return gameState.roundNumber !== 1;
      case 'mandatoryDiscard':
        return this.anyPlayerExceedsHandLimit(gameState);
      case 'optionalDiscard':
        // Skip in Round 1 — cards already drawn in roundInitialization
        if (gameState.roundNumber === 1) return false;
        return this.anyPlayerHasCards(gameState);
      case 'allocateShields':
        return this.anyPlayerHasShieldsToAllocate(gameState);
      case 'mandatoryDroneRemoval':
        return this.anyPlayerExceedsDroneLimit(gameState);
      case 'deployment':
        // Skip deployment if quick deploy already handled it in round 1
        if (quickDeployExecutedThisRound && gameState.roundNumber === 1) {
          debugLog('PHASE_TRANSITIONS', '⚡ Quick deploy was executed, skipping deployment phase');
          return false;
        }
        return true;
      case 'action':
        return true;
      default:
        return true;
    }
  }

  /**
   * Check if any player exceeds hand limit
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player needs to discard
   */
  anyPlayerExceedsHandLimit(gameState) {
    if (!this.gameDataService) {
      debugLog('PHASE_TRANSITIONS', 'GameDataService not initialized for hand limit check');
      return false;
    }

    const player1HandCount = gameState.player1.hand ? gameState.player1.hand.length : 0;
    const player1Stats = this.gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
    const player1HandLimit = player1Stats.totals.handLimit;

    const player2HandCount = gameState.player2.hand ? gameState.player2.hand.length : 0;
    const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
    const player2HandLimit = player2Stats.totals.handLimit;

    const player1Exceeds = player1HandCount > player1HandLimit;
    const player2Exceeds = player2HandCount > player2HandLimit;

    debugLog('PHASE_TRANSITIONS', `🃏 Hand limit check:`, {
      gameMode: gameState.gameMode,
      player1: { handCount: player1HandCount, handLimit: player1HandLimit, exceeds: player1Exceeds },
      player2: { handCount: player2HandCount, handLimit: player2HandLimit, exceeds: player2Exceeds },
      anyPlayerExceeds: player1Exceeds || player2Exceeds
    });

    return player1Exceeds || player2Exceeds;
  }

  /**
   * Check if any player has shields to allocate
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has unallocated shields
   */
  anyPlayerHasShieldsToAllocate(gameState) {
    // Shield allocation phase starts from Round 2 onwards (skip Round 1)
    if (gameState.roundNumber === 1) {
      debugLog('PHASE_TRANSITIONS', `🛡️ Round 1 — skipping shields phase`);
      return false;
    }

    const hasShields = gameState.shieldsToAllocate > 0 || gameState.opponentShieldsToAllocate > 0;

    debugLog('PHASE_TRANSITIONS', `🛡️ Shield check: ${hasShields ? 'REQUIRED' : 'SKIP'}`, {
      player1Shields: gameState.shieldsToAllocate,
      player2Shields: gameState.opponentShieldsToAllocate
    });

    return hasShields;
  }

  /**
   * Check if any player has cards in hand
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has at least 1 card in hand
   */
  anyPlayerHasCards(gameState) {
    const player1HasCards = gameState.player1.hand && gameState.player1.hand.length > 0;
    const player2HasCards = gameState.player2.hand && gameState.player2.hand.length > 0;
    return player1HasCards || player2HasCards;
  }

  /**
   * Check if any player exceeds drone limit
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has too many drones
   */
  anyPlayerExceedsDroneLimit(gameState) {
    if (!this.gameDataService) {
      debugLog('PHASE_TRANSITIONS', 'GameDataService not initialized for drone limit check');
      return false;
    }

    const player1DronesCount = Object.values(gameState.player1.dronesOnBoard || {}).flat().filter(d => !d.isToken).length;
    const player1Stats = this.gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
    if (player1DronesCount > player1Stats.totals.cpuLimit) return true;

    const player2DronesCount = Object.values(gameState.player2.dronesOnBoard || {}).flat().filter(d => !d.isToken).length;
    const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
    return player2DronesCount > player2Stats.totals.cpuLimit;
  }

  /**
   * Check if a specific player exceeds their hand limit
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if this player exceeds their hand limit
   */
  playerExceedsHandLimit(playerId, gameState) {
    if (!this.gameDataService) {
      debugLog('PHASE_TRANSITIONS', 'GameDataService not initialized for hand limit check');
      return false;
    }

    const player = gameState[playerId];
    if (!player) return false;

    const handCount = player.hand ? player.hand.length : 0;
    const placedSections = playerId === 'player1' ? gameState.placedSections : gameState.opponentPlacedSections;
    const stats = this.gameDataService.getEffectiveShipStats(player, placedSections);
    return handCount > stats.totals.handLimit;
  }

  /**
   * Check if a specific player exceeds their drone limit
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if this player exceeds their drone limit
   */
  playerExceedsDroneLimit(playerId, gameState) {
    if (!this.gameDataService) {
      debugLog('PHASE_TRANSITIONS', 'GameDataService not initialized for drone limit check');
      return false;
    }

    const player = gameState[playerId];
    if (!player) return false;

    const droneCount = Object.values(player.dronesOnBoard || {}).flat().filter(d => !d.isToken).length;
    const placedSections = playerId === 'player1' ? gameState.placedSections : gameState.opponentPlacedSections;
    const stats = this.gameDataService.getEffectiveShipStats(player, placedSections);
    return droneCount > stats.totals.cpuLimit;
  }
}

export default PhaseRequirementChecker;
