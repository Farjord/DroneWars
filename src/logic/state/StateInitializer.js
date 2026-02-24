// ========================================
// STATE INITIALIZER
// ========================================
// Handles game state initialization and deck building
// Extracted from gameLogic.js Phase 9.1

import fullCardCollection from '../../data/cardData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getShipById, getDefaultShip } from '../../data/shipData.js';
import { calculateEffectiveShipStats, calculateSectionBaseStats } from '../statsCalculator.js';
import SeededRandom from '../../utils/seededRandom.js';
import { starterDeck } from '../../data/playerDeckData.js';
import { initializeForCombat as initializeDroneAvailability } from '../availability/DroneAvailabilityManager.js';

// ========================================
// DEFAULT GAME CONFIGURATIONS
// ========================================

// Standard starting deck (40 cards)
// Imported from playerDeckData.js for consistency with Extraction Mode
export const startingDecklist = starterDeck.decklist;

// Standard AI drone selection (10 drones for deck)
export const startingDroneList = [
  'Dart',
  'Talon',
  'Mammoth',
  'Bastion',
  'Devastator',
  'Seraph',
  'Harrier',
  'Aegis',
  'Firefly',
  'Locust'
];

/**
 * StateInitializer
 * Manages game state initialization and deck building
 *
 * Key responsibilities:
 * - Create card instances with unique IDs
 * - Build and shuffle decks from decklists
 * - Initialize player state objects
 * - Handle deterministic deck shuffling for multiplayer
 *
 * This is a stateless singleton - all methods are pure functions
 * that create state without side effects.
 */
class StateInitializer {
  /**
   * Create a card instance with unique ID
   *
   * @param {Object} cardTemplate - Card data from cardData.js
   * @param {string} instanceId - Unique instance identifier
   * @returns {Object} Card instance with instanceId
   */
  createCard(cardTemplate, instanceId) {
    return { ...cardTemplate, instanceId };
  }

  /**
   * Build deck from decklist with deterministic shuffling
   *
   * Uses seeded random for multiplayer synchronization:
   * - Same gameSeed + playerId always produces same deck order
   * - Each player gets unique offset to ensure different shuffles
   *
   * @param {Array} decklist - Array of {id, quantity} objects
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number|null} gameSeed - Seed for deterministic shuffling (null = use default)
   * @returns {Array} Shuffled deck of card instances
   */
  buildDeckFromList(decklist, playerId = 'player1', gameSeed = null) {
    const deck = [];
    let instanceCounter = 0;

    decklist.forEach(item => {
      // Find the full card data using the id from the decklist
      const cardTemplate = fullCardCollection.find(c => c.id === item.id);
      if (cardTemplate) {
        // Add the specified quantity of that card
        for (let i = 0; i < item.quantity; i++) {
          deck.push(this.createCard(cardTemplate, `card-${crypto.randomUUID()}`));
        }
      }
    });

    // Shuffle the final deck using game seed for deterministic multiplayer synchronization
    // Same game seed always produces same deck order
    const seed = gameSeed || 12345; // Fallback for tests
    const playerOffset = playerId === 'player1' ? 1 : 2;  // Unique offset per player
    const rng = new SeededRandom(seed + playerOffset);
    return rng.shuffle(deck);
  }

  /**
   * Create initial player state
   *
   * Initializes a player with:
   * - Ship card configuration (baseline stats)
   * - Ship sections with computed hull/shields/thresholds
   * - Shuffled deck built from decklist
   * - Empty hand, discard pile, and battlefield
   * - Base deployment budget (calculated from ship stats)
   *
   * @param {string} name - Player name
   * @param {Array} decklist - Deck configuration (array of {id, quantity})
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number|null} gameSeed - Seed for deterministic deck shuffling
   * @param {string|null} shipId - Ship card ID (optional, defaults to SHIP_001)
   * @returns {Object} Initial player state object
   */
  initialPlayerState(name, decklist, playerId = 'player1', gameSeed = null, shipId = null) {
    // Get ship card (default if not specified)
    const shipCard = shipId ? getShipById(shipId) : getDefaultShip();

    // Build ship sections with computed base stats from Ship Card + Section modifiers
    const computedShipSections = {};
    const defaultSectionKeys = ['bridge', 'powerCell', 'droneControlHub'];
    for (const key of defaultSectionKeys) {
      const sectionTemplate = shipComponentCollection.find(c => c.key === key);
      if (sectionTemplate) {
        const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
        computedShipSections[key] = {
          ...sectionTemplate,
          // Computed values from Ship + Section
          hull: baseStats.hull,
          maxHull: baseStats.maxHull,
          shields: baseStats.shields,
          allocatedShields: baseStats.allocatedShields,
          thresholds: baseStats.thresholds
        };
      }
    }

    const effectiveStats = calculateEffectiveShipStats({ shipSections: computedShipSections }, []).totals;

    // Initialize empty drone availability (will be populated when drones are selected)
    const activeDronePool = [];
    const appliedUpgrades = {};

    return {
        name: name,
        shipId: shipCard.id,  // Track which ship is in use
        shipSections: computedShipSections,
        energy: 0, // Energy will be set correctly during round start with actual placed sections
        momentum: 0, // Momentum earned by controlling more lanes than opponent (cap: 4)
        initialDeploymentBudget: effectiveStats.initialDeployment,
        deploymentBudget: 0,
        hand: [],
        deck: this.buildDeckFromList(decklist, playerId, gameSeed),
        discardPile: [],
        activeDronePool: activeDronePool,
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        deployedDroneCounts: {},
        totalDronesDeployed: 0,  // Global deployment counter for deterministic IDs
        appliedUpgrades: appliedUpgrades,
        droneAvailability: initializeDroneAvailability(activeDronePool, appliedUpgrades),
    };
  }
}

// Export singleton instance
export default new StateInitializer();
