// ========================================
// GAME DATA CACHE
// ========================================
// Simple but effective caching layer for expensive game calculations
// Provides performance improvements for repeated calculateEffectiveStats calls

/**
 * GameDataCache - Caching implementation for game data calculations
 *
 * Features:
 * - Map-based cache with automatic key generation
 * - Cache invalidation on game state changes
 * - Performance statistics tracking
 * - Memory-efficient with automatic cleanup
 */
class GameDataCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalRequests: 0
    };

    console.log('💾 GameDataCache initialized');
  }

  /**
   * Generate consistent cache key for given parameters
   * @param {string} type - Type of data being cached
   * @param {...any} params - Parameters to include in key
   * @returns {string} Cache key
   */
  generateKey(type, ...params) {
    // Create deterministic key from parameters
    const keyParts = [type, ...params.map(p => {
      if (typeof p === 'object' && p !== null) {
        // For objects, use a stable identifier
        return p.id || p.name || JSON.stringify(p);
      }
      return String(p);
    })];

    return keyParts.join('|');
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found
   */
  get(key) {
    this.stats.totalRequests++;

    if (this.cache.has(key)) {
      this.stats.hits++;
      return this.cache.get(key);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    // Prevent cache from growing too large
    if (this.cache.size > 1000) {
      // Clear oldest entries (Map maintains insertion order)
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 200);
      keysToDelete.forEach(k => this.cache.delete(k));
    }

    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Remove specific key from cache
   * @param {string} key - Cache key to remove
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   * Called when game state changes to ensure data consistency
   */
  invalidateAll() {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.invalidations++;

    if (previousSize > 0) {
      console.log(`💾 Cache invalidated: ${previousSize} entries cleared`);
    }
  }

  /**
   * Invalidate cache entries by type
   * More granular invalidation for specific data types
   * @param {string} type - Type of data to invalidate
   */
  invalidateByType(type) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(type + '|')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`💾 Cache invalidated: ${keysToDelete.length} ${type} entries cleared`);
    }
  }

  /**
   * Get cache performance statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0
      ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalRequests: 0
    };
  }

  /**
   * Get current cache size
   * @returns {number} Number of cached entries
   */
  size() {
    return this.cache.size;
  }
}

// Create singleton instance
const gameDataCache = new GameDataCache();

export default gameDataCache;