// ========================================
// ASSET PRELOADER SERVICE
// ========================================
// Preloads game assets via fetch-to-blob for deterministic instant rendering
// Blob URLs serve from JS memory — no HTTP cache lookup or network round-trip

import { assetManifest, getAllAssetPaths } from './assetManifest.js';
import { debugLog } from '../utils/debugLogger.js';
import fullDroneCollection from '../data/droneData.js';
import fullCardCollection from '../data/cardData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import { poiTypes } from '../data/pointsOfInterestData.js';
import aiPersonalities from '../data/aiData.js';
import { BACKGROUNDS } from '../config/backgrounds.js';
import { shipCollection } from '../data/shipData.js';
import { tacticalItemCollection } from '../data/tacticalItemData.js';
import { SALVAGE_ITEMS } from '../data/salvageItemData.js';

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

/**
 * @typedef {Object} DataSourceDescriptor
 * @property {Array<Object>} items - Array of data objects to patch
 * @property {string} key - Property key containing the image URL
 */

class AssetPreloader {
  constructor() {
    /** @type {Map<string, string>} originalUrl → blobUrl */
    this.loadedAssets = new Map();
    /** @type {string[]} */
    this.failedAssets = [];
    /** @type {boolean} */
    this.isLoading = false;
    /** @type {boolean} */
    this.loadComplete = false;
    /** @type {Promise<LoadResult>|null} */
    this.loadingPromise = null;
    /** @type {Map<Object, Array<{key: string, originalUrl: string}>>} item → original values for reset */
    this.originalUrls = new Map();
  }

  /**
   * Preload a single image via fetch → blob → createObjectURL
   * @param {string} url - Image URL to preload
   * @returns {Promise<string>} Blob URL
   */
  async preloadImage(url) {
    if (this.loadedAssets.has(url)) {
      return this.loadedAssets.get(url);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${url} (${response.status})`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.loadedAssets.set(url, blobUrl);
      return blobUrl;
    } catch (err) {
      this.failedAssets.push(url);
      throw err;
    }
  }

  /**
   * Resolve a URL to its blob URL if preloaded, otherwise return the original
   * @param {string} url - Original image URL
   * @returns {string} Blob URL if preloaded, original URL otherwise
   */
  resolveUrl(url) {
    if (!url) return url;
    return this.loadedAssets.get(url) || url;
  }

  /**
   * Patch data source objects to replace image URLs with blob URLs
   * Stores originals for restoration on reset
   * @param {DataSourceDescriptor[]} sources - Data sources to patch
   */
  patchDataSources(sources) {
    for (const { items, key } of sources) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const originalUrl = item[key];
        if (typeof originalUrl !== 'string') continue;
        const blobUrl = this.loadedAssets.get(originalUrl);
        if (blobUrl) {
          const entries = this.originalUrls.get(item) || [];
          entries.push({ key, originalUrl });
          this.originalUrls.set(item, entries);
          item[key] = blobUrl;
        }
      }
    }
  }

  /**
   * Patch all game data sources to use blob URLs
   * Called once after loadAll() completes — mutates data arrays in-place
   */
  patchAllDataSources() {
    const staticBgs = BACKGROUNDS.filter(bg => bg.type === 'static' && bg.path);
    this.patchDataSources([
      { items: fullDroneCollection, key: 'image' },
      { items: fullCardCollection, key: 'image' },
      { items: shipComponentCollection, key: 'image' },
      { items: poiTypes, key: 'image' },
      { items: aiPersonalities, key: 'imagePath' },
      { items: shipCollection, key: 'image' },
      { items: tacticalItemCollection, key: 'image' },
      { items: SALVAGE_ITEMS, key: 'image' },
      { items: staticBgs, key: 'path' },
    ]);

    const patched = this.originalUrls.size;
    debugLog('ASSET_PRELOAD', `🔗 Patched ${patched} data source URLs with blob URLs`);
  }

  /**
   * Load assets with concurrency limit to avoid overwhelming the browser
   * @param {string[]} urls - URLs to load
   * @param {number} limit - Max concurrent requests
   * @param {Function} onItemLoaded - Callback after each item loads
   * @returns {Promise<Array>}
   */
  async loadWithConcurrency(urls, limit, onItemLoaded) {
    const results = [];
    const executing = new Set();

    for (const url of urls) {
      const promise = this.preloadImage(url)
        .then(blobUrl => {
          onItemLoaded();
          return blobUrl;
        })
        .catch(err => {
          debugLog('ASSET_PRELOAD', `❌ Image failed: ${url}`, { error: err.message });
          onItemLoaded(); // Still increment progress on failure
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

    // Note: individual .catch() handlers above convert rejections to fulfilled (undefined)
    // so Promise.all is correct here — no promise will reject
    return Promise.all(results);
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
        debugLog('ASSET_PRELOAD', '⚠️ Failed to load assets:', this.failedAssets);
      }

      // Mutate data source objects to use blob URLs
      this.patchAllDataSources();

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
   * Reset the preloader state — revokes blob URLs and restores original data source values
   */
  reset() {
    // Revoke all blob URLs to free memory
    for (const blobUrl of this.loadedAssets.values()) {
      URL.revokeObjectURL(blobUrl);
    }

    // Restore original URLs on patched data source items
    for (const [item, entries] of this.originalUrls) {
      for (const { key, originalUrl } of entries) {
        item[key] = originalUrl;
      }
    }

    this.loadedAssets.clear();
    this.originalUrls.clear();
    this.failedAssets = [];
    this.isLoading = false;
    this.loadComplete = false;
    this.loadingPromise = null;
  }
}

// Singleton instance
const assetPreloader = new AssetPreloader();

/**
 * Resolve a URL to its preloaded blob URL, or return original if not preloaded
 * Convenience export for components with non-data-sourced image paths
 * @param {string} url - Original image URL
 * @returns {string} Blob URL or original URL
 */
export const resolveAssetUrl = (url) => assetPreloader.resolveUrl(url);

export default assetPreloader;
