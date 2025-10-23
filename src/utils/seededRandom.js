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
   * Adds additional entropy from player-specific state
   *
   * @param {Object} gameState - Current game state
   * @param {string} playerId - Player performing shuffle ('player1' or 'player2')
   * @returns {SeededRandom} New seeded RNG instance
   */
  static forCardShuffle(gameState, playerId) {
    const playerState = gameState[playerId];

    // Use player-specific state plus global state
    const seedComponents = [
      gameState.roundNumber || 1,
      playerState?.deck?.length || 0,
      playerState?.discardPile?.length || 0,
      playerState?.hand?.length || 0,
      // Add hash of first card in discard pile for additional entropy
      playerState?.discardPile?.[0]?.id?.charCodeAt(0) || 0
    ];

    let seed = 0;
    for (let i = 0; i < seedComponents.length; i++) {
      seed = ((seed << 5) - seed + seedComponents[i]) | 0;
    }

    seed = Math.abs(seed);
    return new SeededRandom(seed);
  }
}

export default SeededRandom;
