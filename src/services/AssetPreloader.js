// ========================================
// ASSET PRELOADER SERVICE
// ========================================
// Preloads game assets with progress tracking and error handling
// Uses browser's native Image loading with concurrency control

import { assetManifest, getAllAssetPaths } from './assetManifest.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * @typedef {Object} CategoryProgress
 * @property {number} total - Total assets in category
 * @property {number} loaded - Number loaded so far
 * @property {'pending'|'loading'|'complete'} status - Category status
 */

/**
 * @typedef {Object} LoadProgress
 * @property {number} total - Total assets to load
 * @property {number} loaded - Assets loaded so far
 * @property {number} failed - Assets that failed to load
 * @property {number} percentage - Progress percentage (0-100)
 * @property {string} currentCategory - Category currently being loaded
 * @property {Object.<string, CategoryProgress>} categories - Per-category progress
 */

/**
 * @typedef {Object} LoadResult
 * @property {boolean} success - True if all assets loaded successfully
 * @property {number} loaded - Number of assets loaded
 * @property {number} failed - Number of assets that failed
 * @property {string[]} failedAssets - URLs of failed assets
 * @property {boolean} isComplete - True if loading is complete
 */

class AssetPreloader {
  constructor() {
    /** @type {Map<string, HTMLImageElement>} */
    this.loadedAssets = new Map();
    /** @type {string[]} */
    this.failedAssets = [];
    /** @type {boolean} */
    this.isLoading = false;
    /** @type {boolean} */
    this.loadComplete = false;
    /** @type {Promise<LoadResult>|null} */
    this.loadingPromise = null;
  }

  /**
   * Preload a single image
   * @param {string} url - Image URL to preload
   * @returns {Promise<HTMLImageElement>}
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loadedAssets.has(url)) {
        resolve(this.loadedAssets.get(url));
        return;
      }

      const img = new Image();

      img.onload = () => {
        this.loadedAssets.set(url, img);
        resolve(img);
      };

      img.onerror = () => {
        this.failedAssets.push(url);
        reject(new Error(`Failed to load: ${url}`));
      };

      // Start loading
      img.src = url;
    });
  }

  /**
   * Load assets with concurrency limit to avoid overwhelming the browser
   * @param {string[]} urls - URLs to load
   * @param {number} limit - Max concurrent requests
   * @param {Function} onItemLoaded - Callback after each item loads
   * @returns {Promise<PromiseSettledResult<HTMLImageElement>[]>}
   */
  async loadWithConcurrency(urls, limit, onItemLoaded) {
    const results = [];
    const executing = new Set();

    for (const url of urls) {
      const promise = this.preloadImage(url)
        .then(img => {
          onItemLoaded();
          return img;
        })
        .catch(err => {
          debugLog('ASSET_PRELOAD', `❌ Image failed: ${url}`, { error: err.message });
          onItemLoaded(); // Still increment progress on failure
          // Removed: throw err — was causing Promise.race to reject, aborting all remaining categories
        })
        .finally(() => {
          executing.delete(promise);
        });

      results.push(promise);
      executing.add(promise);

      // If at limit, wait for one to complete before continuing
      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }

    return Promise.allSettled(results);
  }

  /**
   * Preload all assets with progress reporting
   * @param {Function} onProgress - Callback for progress updates
   * @returns {Promise<LoadResult>}
   */
  async loadAll(onProgress) {
    // Return early if already loaded
    if (this.loadComplete) {
      return this.getLoadResult();
    }

    // Return existing promise if load already in progress (fixes React StrictMode double-invoke)
    if (this.isLoading && this.loadingPromise) {
      debugLog('STATE_SYNC', 'AssetPreloader: Load already in progress, returning existing promise');
      return this.loadingPromise;
    }

    this.isLoading = true;

    // Store the promise so concurrent callers can await it
    this.loadingPromise = (async () => {
      const startTime = performance.now();

      const categories = Object.entries(assetManifest);
      const totalAssets = getAllAssetPaths().length;
      let loadedCount = 0;

      // Initialize category status
      const categoryStatus = {};
      for (const [cat, paths] of categories) {
        categoryStatus[cat] = {
          total: paths.length,
          loaded: 0,
          status: 'pending'
        };
      }

      // Send initial progress
      onProgress?.({
        total: totalAssets,
        loaded: 0,
        failed: 0,
        percentage: 0,
        currentCategory: '',
        categories: { ...categoryStatus }
      });

      // Process each category
      for (const [categoryName, paths] of categories) {
        if (paths.length === 0) {
          categoryStatus[categoryName].status = 'complete';
          continue;
        }

        debugLog('ASSET_PRELOAD', `📂 Category starting: ${categoryName}`, {
          count: paths.length,
          loadedSoFar: loadedCount,
          totalAssets
        });

        categoryStatus[categoryName].status = 'loading';

        // Notify category started
        onProgress?.({
          total: totalAssets,
          loaded: loadedCount,
          failed: this.failedAssets.length,
          percentage: Math.round((loadedCount / totalAssets) * 100),
          currentCategory: categoryName,
          categories: { ...categoryStatus }
        });

        // Load category assets with concurrency limit
        await this.loadWithConcurrency(
          paths,
          6, // Concurrent requests limit (browser typically allows 6-8)
          () => {
            loadedCount++;
            categoryStatus[categoryName].loaded++;

            // Update progress
            onProgress?.({
              total: totalAssets,
              loaded: loadedCount,
              failed: this.failedAssets.length,
              percentage: Math.round((loadedCount / totalAssets) * 100),
              currentCategory: categoryName,
              categories: { ...categoryStatus }
            });
          }
        );

        debugLog('ASSET_PRELOAD', `✅ Category complete: ${categoryName}`, {
          loaded: categoryStatus[categoryName].loaded,
          total: paths.length,
          failedSoFar: this.failedAssets.length
        });

        categoryStatus[categoryName].status = 'complete';
      }

      this.isLoading = false;
      this.loadComplete = true;

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      debugLog('ASSET_PRELOAD',
        `🏁 loadAll() finished: ${loadedCount}/${totalAssets} loaded, ` +
        `${this.failedAssets.length} failed, ${elapsed}s`
      );
      debugLog('STATE_SYNC',
        `Asset preload complete: ${loadedCount}/${totalAssets} loaded, ` +
        `${this.failedAssets.length} failed, ${elapsed}s`
      );

      if (this.failedAssets.length > 0) {
        console.warn('Failed to load assets:', this.failedAssets);
      }

      return this.getLoadResult();
    })();

    return this.loadingPromise;
  }

  /**
   * Get load result summary
   * @returns {LoadResult}
   */
  getLoadResult() {
    return {
      success: this.failedAssets.length === 0,
      loaded: this.loadedAssets.size,
      failed: this.failedAssets.length,
      failedAssets: [...this.failedAssets],
      isComplete: this.loadComplete
    };
  }

  /**
   * Check if preloading is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.loadComplete;
  }

  /**
   * Get a preloaded image by URL
   * @param {string} url - Image URL
   * @returns {HTMLImageElement|undefined}
   */
  getImage(url) {
    return this.loadedAssets.get(url);
  }

  /**
   * Reset the preloader state (for testing/debugging)
   */
  reset() {
    this.loadedAssets.clear();
    this.failedAssets = [];
    this.isLoading = false;
    this.loadComplete = false;
    this.loadingPromise = null;
  }
}

// Singleton instance
const assetPreloader = new AssetPreloader();

export default assetPreloader;
