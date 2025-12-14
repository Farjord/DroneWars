// ========================================
// ROUND MANAGER
// ========================================
// Handles round start state transitions
// Extracted from gameLogic.js Phase 9.2B

import { calculateEffectiveStats } from '../statsCalculator.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';

/**
 * RoundManager
 * Manages round start transitions and state updates
 *
 * Key responsibilities:
 * - Ready all drones (unexhaust, restore shields, remove temporary mods)
 * - Reset energy and deployment budgets for new round
 * - Draw cards to hand limit with deck shuffling
 * - Orchestrate complete round transition
 *
 * This is a stateless singleton - all methods are pure functions
 * that transform state without side effects.
 */
class RoundManager {
  /**
   * Ready drones and restore shields for new round
   * - Unexhausts all drones
   * - Removes temporary stat modifications
   * - Restores shields to maximum
   *
   * @param {Object} playerState - Player state object
   * @param {Object} opponentState - Opponent state object
   * @param {Object} placedSections - Placed ship sections
   * @returns {Object} Updated player state with readied drones
   */
  readyDronesAndRestoreShields(playerState, opponentState, placedSections) {
    const newDronesOnBoard = { ...playerState.dronesOnBoard };

    for (const lane in newDronesOnBoard) {
      newDronesOnBoard[lane] = newDronesOnBoard[lane].map(drone => {
        const effectiveStats = calculateEffectiveStats(
          drone,
          lane,
          playerState,
          opponentState,
          placedSections
        );

        return {
          ...drone,
          // Filter statMods to remove temporary effects
          statMods: drone.statMods ? drone.statMods.filter(mod => mod.type === 'permanent') : [],
          isExhausted: false,
          currentShields: effectiveStats.maxShields,
          // Reset RAPID/ASSAULT ability usage flags for new round
          rapidUsed: false,
          assaultUsed: false,
          // Reset ability activation counts for new round
          abilityActivations: [],
        };
      });
    }

    // Reset ship section ability activation counts for new round
    let newShipSections = playerState.shipSections;
    if (playerState.shipSections) {
      newShipSections = {};
      for (const sectionName in playerState.shipSections) {
        newShipSections[sectionName] = {
          ...playerState.shipSections[sectionName],
          abilityActivationCount: 0,
        };
      }
    }

    return { ...playerState, dronesOnBoard: newDronesOnBoard, shipSections: newShipSections };
  }

  /**
   * Calculate complete new round player state
   * Combines drone readying with resource updates
   *
   * @param {Object} playerState - Player state object
   * @param {number} turn - Current turn number
   * @param {Object} effectiveShipStats - Computed ship stats
   * @param {Object} opponentState - Opponent state object
   * @param {Object} placedSections - Placed ship sections
   * @returns {Object} Updated player state for new round
   */
  calculateNewRoundPlayerState(playerState, turn, effectiveShipStats, opponentState, placedSections) {
    // Ready drones and restore shields
    const readiedState = this.readyDronesAndRestoreShields(playerState, opponentState, placedSections);

    // Update energy and deployment budget using computed ship stats
    const baseState = {
      ...readiedState,
      energy: effectiveShipStats.totals.energyPerTurn,
      initialDeploymentBudget: 0,
      deploymentBudget: effectiveShipStats.totals.deploymentBudget
    };

    return baseState;
  }

  /**
   * Draw cards until hand reaches limit
   * Handles deck exhaustion by shuffling discard pile
   *
   * @param {Object} playerState - Player state object
   * @param {number} handLimit - Maximum hand size
   * @param {Object} gameState - Optional game state for seeded shuffling
   * @returns {Object} Updated player state with drawn cards
   */
  drawToHandLimit(playerState, handLimit, gameState = null) {
    let newDeck = [...playerState.deck];
    let newHand = [...playerState.hand];
    let newDiscard = [...playerState.discardPile];

    while (newHand.length < handLimit) {
      if (newDeck.length === 0) {
        if (newDiscard.length > 0) {
          // Use seeded RNG for deterministic shuffling
          const rng = gameState
            ? SeededRandom.fromGameState(gameState)
            : new SeededRandom(playerState.deck?.length + playerState.hand?.length + playerState.discardPile?.length);
          newDeck = rng.shuffle(newDiscard);
          newDiscard = [];
        } else {
          break;
        }
      }
      const drawnCard = newDeck.pop();
      newHand.push(drawnCard);
      debugLog('CARDS', `📥 Card drawn to hand: ${drawnCard.name}`, {
        id: drawnCard.id,
        instanceId: drawnCard.instanceId,
        hasInstanceId: drawnCard.instanceId !== undefined,
        playerName: playerState.name
      });
    }

    return { ...playerState, deck: newDeck, hand: newHand, discardPile: newDiscard };
  }

  /**
   * Process complete round start transition
   * Orchestrates: ready → resources → draw → first player determination
   *
   * @param {Object} currentState - Current game state
   * @param {number} turn - New turn number
   * @param {Object} player1EffectiveStats - Player 1 computed stats
   * @param {Object} player2EffectiveStats - Player 2 computed stats
   * @param {Function} determineFirstPlayerFn - Function to determine first player
   * @returns {Object} New state and UI effects
   */
  processRoundStart(currentState, turn, player1EffectiveStats, player2EffectiveStats, determineFirstPlayerFn) {
    // Calculate new player states using computed stats
    const newPlayer1State = this.calculateNewRoundPlayerState(
      currentState.player1,
      turn,
      player1EffectiveStats,
      currentState.player2,
      currentState.placedSections
    );

    const newPlayer2State = this.calculateNewRoundPlayerState(
      currentState.player2,
      turn,
      player2EffectiveStats,
      currentState.player1,
      currentState.opponentPlacedSections
    );

    // Draw to hand limit using computed stats
    const player1WithCards = this.drawToHandLimit(
      newPlayer1State,
      player1EffectiveStats.totals.handLimit
    );

    const player2WithCards = this.drawToHandLimit(
      newPlayer2State,
      player2EffectiveStats.totals.handLimit
    );

    // Determine first player (function passed as parameter to avoid gameLogic import)
    const firstPlayer = determineFirstPlayerFn(
      turn,
      currentState.firstPlayerOverride,
      currentState.firstPasserOfPreviousRound
    );

    const newState = {
      ...currentState,
      turn: turn,
      turnPhase: 'deployment',
      currentPlayer: firstPlayer,
      firstPlayerOfRound: firstPlayer,
      firstPasserOfPreviousRound: currentState.passInfo.firstPasser,
      passInfo: {
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      },
      player1: player1WithCards,
      player2: player2WithCards
    };

    const uiEffects = [
      {
        type: 'ROUND_START',
        turn: turn,
        firstPlayer: firstPlayer
      },
      {
        type: 'LOG_ENTRY',
        entry: {
          player: 'SYSTEM',
          actionType: 'NEW_ROUND',
          source: `Round ${turn}`,
          target: 'N/A',
          outcome: 'New round begins.'
        }
      },
      {
        type: 'SHOW_ROUND_START_MODAL',
        turn: turn
      }
    ];

    return {
      newState,
      uiEffects
    };
  }
}

// Export as singleton
export default new RoundManager();
