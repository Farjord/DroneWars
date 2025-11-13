// ========================================
// STATE INITIALIZER
// ========================================
// Handles game state initialization and deck building
// Extracted from gameLogic.js Phase 9.1

import fullCardCollection from '../../data/cardData.js';
import shipSectionData from '../../data/shipData.js';
import { calculateEffectiveShipStats } from '../statsCalculator.js';
import SeededRandom from '../../utils/seededRandom.js';

// ========================================
// DEFAULT GAME CONFIGURATIONS
// ========================================

// Standard starting deck (40 cards)
export const startingDecklist = [
    // Powerful "Silver Bullet" Cards (Limited Copies)
    { id: 'CARD018', quantity: 4 }, // Desperate Measures
    { id: 'CARD019', quantity: 2 }, // Reposition
    { id: 'CARD009', quantity: 2 }, // Target Lock
    { id: 'CARD007', quantity: 2 }, // Emergency Patch
    { id: 'CARD012', quantity: 2 }, // Armor-Piercing Shot

    // Core Tactical & Synergy Cards (Multiple Copies)
    { id: 'CARD005', quantity: 4 }, // Adrenaline Rush
    { id: 'CARD006', quantity: 2 }, // Nanobot Repair
    { id: 'CARD015', quantity: 2 }, // Streamline
    { id: 'CARD008', quantity: 2 }, // Shield Recharge
    { id: 'CARD001', quantity: 2 }, // Laser Blast

    // Resource & Consistency (Max Copies)
    { id: 'CARD002', quantity: 4 }, // System Reboot
    { id: 'CARD003', quantity: 4 }, // Out Think
    { id: 'CARD004', quantity: 4 }, // Energy Surge
    { id: 'CARD016', quantity: 4 }, // Static Field
];

// Standard AI drone selection (10 drones for deck)
export const startingDroneList = [
  'Scout Drone',
  'Standard Fighter',
  'Heavy Fighter',
  'Guardian Drone',
  'Bomber',
  'Repair Drone',
  'Interceptor',
  'Aegis Drone',
  'Kamikaze Drone',
  'Swarm Drone'
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
          deck.push(this.createCard(cardTemplate, `card-${Date.now()}-${instanceCounter++}`));
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
   * - Ship sections with full configuration
   * - Shuffled deck built from decklist
   * - Empty hand, discard pile, and battlefield
   * - Base deployment budget (calculated from ship stats)
   *
   * @param {string} name - Player name
   * @param {Array} decklist - Deck configuration (array of {id, quantity})
   * @param {string} playerId - 'player1' or 'player2'
   * @param {number|null} gameSeed - Seed for deterministic deck shuffling
   * @returns {Object} Initial player state object
   */
  initialPlayerState(name, decklist, playerId = 'player1', gameSeed = null) {
    const baseStats = calculateEffectiveShipStats({ shipSections: shipSectionData }, []).totals;

    return {
        name: name,
        shipSections: shipSectionData,
        energy: 0, // Energy will be set correctly during round start with actual placed sections
        initialDeploymentBudget: baseStats.initialDeployment,
        deploymentBudget: 0,
        hand: [],
        deck: this.buildDeckFromList(decklist, playerId, gameSeed),
        discardPile: [],
        activeDronePool: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        deployedDroneCounts: {},
        totalDronesDeployed: 0,  // Global deployment counter for deterministic IDs
        appliedUpgrades: {},
    };
  }
}

// Export singleton instance
export default new StateInitializer();
