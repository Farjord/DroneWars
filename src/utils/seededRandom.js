// ========================================
// SEEDED RANDOM NUMBER GENERATOR
// ========================================
// Deterministic RNG for multiplayer synchronization
// Uses game state properties as seed to ensure Host and Guest generate identical "random" sequences

/**
 * SeededRandom - Deterministic random number generator using mulberry32 algorithm
 *
 * Usage:
 * const rng = new SeededRandom(12345);
 * const value = rng.random(); // Returns float between 0 and 1
 *
 * For game state-based seeding:
 * const rng = SeededRandom.fromGameState(gameState);
 */
export class SeededRandom {
  /**
   * Create a new seeded random number generator
   * @param {number} seed - Integer seed value
   */
  constructor(seed) {
    this.seed = seed >>> 0; // Convert to unsigned 32-bit integer
  }

  /**
   * Generate next random number between 0 and 1
   * Uses mulberry32 algorithm - fast and high quality
   * @returns {number} Random float between 0 (inclusive) and 1 (exclusive)
   */
  random() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random integer
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with seeded randomness
   * @param {Array} array - Array to shuffle (creates copy, doesn't mutate)
   * @returns {Array} Shuffled copy of array
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Select a random element from an array
   * @param {Array} array - Array to select from
   * @returns {*} Random element, or undefined if empty
   */
  select(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.randomInt(0, array.length)];
  }

  /**
   * Check if a percentage roll succeeds
   * @param {number} chance - Success chance as percentage (0-100)
   * @returns {boolean} True if roll succeeds
   */
  chance(chance) {
    return this.random() * 100 < chance;
  }

  /**
   * Generate random integer in range [min, max] (both inclusive)
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random integer
   */
  randomIntInclusive(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Create SeededRandom from game state properties
   * Uses deterministic properties to generate same seed on Host and Guest
   *
   * @param {Object} gameState - Current game state
   * @returns {SeededRandom} New seeded RNG instance
   */
  static fromGameState(gameState) {
    // Use deterministic properties that are synchronized between Host and Guest
    // Avoid using timestamps or local-only properties
    const seedComponents = [
      gameState.roundNumber || 1,
      gameState.player1?.energy || 0,
      gameState.player2?.energy || 0,
      gameState.player1?.deck?.length || 0,
      gameState.player2?.deck?.length || 0,
      gameState.player1?.hand?.length || 0,
      gameState.player2?.hand?.length || 0,
      gameState.player1?.discardPile?.length || 0,
      gameState.player2?.discardPile?.length || 0
    ];

    // Hash the components into a single seed
    let seed = 0;
    for (let i = 0; i < seedComponents.length; i++) {
      seed = ((seed << 5) - seed + seedComponents[i]) | 0;
    }

    // Ensure seed is positive
    seed = Math.abs(seed);

    return new SeededRandom(seed);
  }

  /**
   * Create SeededRandom for card shuffling operations
   * Uses base game seed + unique offset for deterministic but varying shuffles
   *
   * @param {Object} gameState - Current game state
   * @param {string} playerId - Player performing shuffle ('player1' or 'player2')
   * @returns {SeededRandom} New seeded RNG instance
   */
  static forCardShuffle(gameState, playerId) {
    const gameSeed = gameState.gameSeed || 12345; // Fallback for tests
    const playerState = gameState[playerId];

    // Use game seed + unique offset based on game progress for determinism
    // Each reshuffle in the same game gets a unique but deterministic seed
    const playerOffset = playerId === 'player1' ? 1000 : 2000;
    const roundOffset = (gameState.roundNumber || 1) * 100;
    const deckLengthOffset = (playerState?.deck?.length || 0);

    const seed = gameSeed + playerOffset + roundOffset + deckLengthOffset;
    return new SeededRandom(seed);
  }
}

export default SeededRandom;
