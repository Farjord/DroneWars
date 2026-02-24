/**
 * SeededRNG
 * Pure utility functions for deterministic random number generation.
 *
 * Extracted from RewardManager to enable reuse across loot subsystems.
 * These are stateless pure functions (except for the RNG object's internal state).
 */

/**
 * Create a seeded random number generator (linear congruential generator)
 * @param {number} seed - Integer seed value
 * @returns {{ random: () => number }} - RNG object with random() method returning [0, 1)
 */
export function createRNG(seed) {
  let state = seed;
  return {
    random: () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    }
  };
}

/**
 * Fisher-Yates shuffle using seeded RNG
 * Mutates the array in place.
 * @param {Array} array - Array to shuffle in place
 * @param {{ random: () => number }} rng - Seeded random number generator
 */
export function shuffleArray(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
