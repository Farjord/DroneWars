// ========================================
// DEBUG LOGGER UTILITY
// ========================================
// Centralized debug logging system with category-based control
// Provides consistent logging format and easy enable/disable

import { FastForward } from "lucide-react";

/**
 * Debug configuration - single source of truth for all debug logging
 */
const DEBUG_CONFIG = {
  // Master switch - set to false to disable ALL debug logging
  enabled: true,

  // Filter out all non-debugLog console.log messages
  // When true, only messages from debugLog() will appear in console
  filterNonDebugLogs: true,

  // Category-specific toggles
  categories: {
    DEPLOYMENT: false,          // Drone deployment tracking
    DRONE_SELECTION: false,     // Drone selection phase and data
    DECK_SELECTION: false,      // Deck selection phase
    PLACEMENT: false,           // Ship placement phase
    PHASE_TRANSITIONS: false,   // Game phase transitions and flow
    AI_DECISIONS: false,        // AI decision making
    MULTIPLAYER: false,         // Network sync and multiplayer
    ANIMATIONS: true,           // Animation system
    COMMITMENTS: false,         // Simultaneous phase commitments
    COMBAT: true,               // Combat resolution
    PASS_LOGIC: false,          // Pass handling
    STATE_SYNC: false,          // State synchronization
    ENERGY: false,              // Energy management
    CARDS: true,                // Card play and effects
    HAND_VIEW: false,           // Hand display and card interaction
    CARD_PLAY: false,           // Card playability and clicking
  }
};

/**
 * Main debug logging function
 * @param {string} category - Debug category (must match key in DEBUG_CONFIG.categories)
 * @param {string} message - Log message
 * @param {*} data - Optional data to log (object, array, etc.)
 */
export const debugLog = (category, message, data = null) => {
  if (!DEBUG_CONFIG.enabled) return;
  if (!DEBUG_CONFIG.categories[category]) return;

  const prefix = `🔍 [${category} DEBUG]`;

  if (data !== null && data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

/**
 * Enable or disable all debug logging
 * @param {boolean} enabled - Whether to enable debug logging
 */
export const setDebugEnabled = (enabled) => {
  DEBUG_CONFIG.enabled = enabled;
  console.log(`🔧 Debug logging ${enabled ? 'enabled' : 'disabled'}`);
};

/**
 * Enable or disable a specific debug category
 * @param {string} category - Category to toggle
 * @param {boolean} enabled - Whether to enable this category
 */
export const setDebugCategory = (category, enabled) => {
  if (category in DEBUG_CONFIG.categories) {
    DEBUG_CONFIG.categories[category] = enabled;
    console.log(`🔧 Debug category '${category}' ${enabled ? 'enabled' : 'disabled'}`);
  } else {
    console.warn(`⚠️ Unknown debug category: ${category}`);
  }
};

/**
 * Get current debug configuration
 * @returns {Object} Current debug config
 */
export const getDebugConfig = () => {
  return {
    enabled: DEBUG_CONFIG.enabled,
    categories: { ...DEBUG_CONFIG.categories }
  };
};

/**
 * Get list of all available debug categories
 * @returns {Array<string>} Array of category names
 */
export const getDebugCategories = () => {
  return Object.keys(DEBUG_CONFIG.categories);
};

// Export config for direct access if needed
export { DEBUG_CONFIG };

// Example usage:
// import { debugLog } from './utils/debugLogger.js';
// debugLog('DRONE_SELECTION', 'Deck commitments:', { player1: [...], player2: [...] });

// ========================================
// CONSOLE FILTERING
// ========================================
// Override console.log to filter out non-debugLog messages
// This ensures only debugLog() messages appear in console when enabled

let originalConsoleLog = null;

/**
 * Restore original console.log if it was overridden
 */
export const restoreConsoleLog = () => {
  if (originalConsoleLog) {
    console.log = originalConsoleLog;
    console.log('🔧 Console.log restored to original behavior');
    originalConsoleLog = null;
  }
};

// Apply console filtering if enabled
if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.filterNonDebugLogs) {
  // Store original console.log
  originalConsoleLog = console.log;

  // Override console.log to only show debugLog messages
  console.log = (...args) => {
    const firstArg = args[0];
    const str = firstArg?.toString() || '';

    // Allow messages that start with 🔍 (debugLog prefix)
    if (str.startsWith('🔍')) {
      originalConsoleLog(...args);
    }
    // Silently ignore all other console.log calls
  };

  // Use original console.log to announce filtering is active
  originalConsoleLog('🔧 Debug logger active: Filtering console to show only debugLog messages');
  originalConsoleLog('🔧 Active categories:', Object.entries(DEBUG_CONFIG.categories)
    .filter(([_, enabled]) => enabled)
    .map(([category]) => category)
    .join(', ') || 'NONE');
}
