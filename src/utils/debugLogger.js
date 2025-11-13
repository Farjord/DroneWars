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
    PLACEMENT_CASCADE: false,   // Placement optimistic cascade tracking (DISABLED - replaced by GUEST_CASCADE)
    PHASE_TRANSITIONS: false,   // Game phase transitions and flow (DISABLED - too verbose)
    AI_DECISIONS: false,        // AI decision making
    MULTIPLAYER: false,         // Network sync and multiplayer (DISABLED - too verbose, critical errors use console.error)
    P2P_CONNECTION: false,      // PeerJS connection diagnostics
    ANIMATIONS: true,           // Animation system (ENABLED for Railgun investigation)
    OPTIMISTIC: false,          // Animation deduplication and matching logic (DISABLED - already debugged)
    COMMITMENTS: false,         // Simultaneous phase commitments (DISABLED - too verbose)
    COMBAT: false,              // Combat resolution
    PASS_LOGIC: false,           // Pass handling and pass notification debugging (DISABLED)
    STATE_SYNC: false,          // State synchronization (DISABLED - too verbose)
    BROADCAST_TIMING: false,    // Broadcast timing and state validation (DISABLED - too verbose)
    ENERGY: false,              // Energy management (shield allocation)
    RESOURCE_RESET: false,       // Energy and deployment budget reset between rounds (DISABLED)
    CARDS: true,                // Card play and effects (ENABLED for Railgun investigation)
    RAILGUN_ANIMATION: true,    // Railgun-specific animation investigation (NEW)
    HAND_VIEW: false,            // Hand display and card interaction (ENABLED for mandatoryAction debugging)
    CARD_PLAY: false,            // Card playability and clicking (ENABLED for mandatoryAction debugging)
    SHIELD_CLICKS: false,       // Shield allocation click tracking
    BUTTON_CLICKS: false,       // Button click tracking and effects
    MOVEMENT_LANES: false,      // Movement card lane highlighting diagnostics
    GUEST_CASCADE: false,        // Guest optimistic cascade flow (ENABLED for checkpoint testing)
    CASCADE_LOOP: false,        // Cascade loop iteration details (DISABLED - already debugged)
    VALIDATION: false,           // State validation and reconciliation (ENABLED for checkpoint testing)
    TIMING: false,               // High-resolution timing milestones with timestamps (ENABLED for pass notification debugging)
    SUBTITLE_CALC: false,       // Phase animation subtitle calculation (DISABLED - already debugged)
    FIRST_PLAYER: false,        // First player determination and seeded random (DISABLED for clean logs)

    // Effect System Refactoring - Modular Processor Logging
    EFFECT_ROUTING: true,       // Effect router decisions (which processor handles effect)
    EFFECT_PROCESSING: true,    // Effect processor execution (DrawEffectProcessor, etc.)
    EFFECT_FALLBACK: true,      // Effects falling back to monolithic switch (not yet extracted)

    // Targeting System Refactoring - Modular Processor Logging
    TARGETING_ROUTING: true,    // Targeting router decisions (DISABLED - Phase 2 complete and verified)
    TARGETING_PROCESSING: true, // Targeting processor execution (DISABLED - Phase 2 complete and verified)
    TARGETING_FALLBACK: true,   // Targeting falling back to monolithic function (DISABLED - no fallbacks expected)
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
// TIMING UTILITIES
// ========================================
// High-resolution timing functions for performance analysis

/**
 * Get absolute timestamp for cross-window timing comparison
 * Uses Date.now() instead of performance.now() to enable comparison between host and guest windows
 * @returns {number} Timestamp in milliseconds since Unix epoch (absolute time)
 */
export const getTimestamp = () => Date.now();

/**
 * Format elapsed time between two timestamps
 * @param {number} startTime - Start timestamp from getTimestamp()
 * @param {number} endTime - End timestamp from getTimestamp()
 * @returns {string} Formatted elapsed time (e.g., "45ms")
 */
export const formatElapsed = (startTime, endTime) => {
  return `${(endTime - startTime)}ms`;
};

/**
 * Timing-specific debug log with automatic elapsed calculation
 * @param {string} label - Timing milestone label (e.g., '[HOST] Broadcast sending')
 * @param {Object} data - Additional data to log
 * @param {number} startTime - Optional start time for elapsed calculation
 * @param {string} context - Optional context/trigger information (e.g., 'after_action', 'phase_transition')
 * @returns {number} Current timestamp for chaining
 *
 * @example
 * // Start timing
 * const startTime = timingLog('[GUEST] Processing started', { phase: 'action' });
 * // ... do work ...
 * // End timing (automatically calculates elapsed)
 * timingLog('[GUEST] Processing complete', { phase: 'action' }, startTime);
 *
 * // With context
 * timingLog('[HOST] Broadcast preparing', { phase: 'action' }, null, 'after_player_pass');
 */
export const timingLog = (label, data = {}, startTime = null, context = null) => {
  const now = getTimestamp();
  const elapsed = startTime ? ` (elapsed: ${formatElapsed(startTime, now)})` : '';
  const contextStr = context ? ` [${context}]` : '';

  debugLog('TIMING', `⏱️ ${label}${contextStr}${elapsed}`, {
    timestamp: now.toString(),
    ...data
  });

  return now;
};

/**
 * Get current browser state for debugging rendering issues
 * @returns {Object} Browser state information
 */
export const getBrowserState = () => {
  return {
    hasFocus: document.hasFocus(),
    visibilityState: document.visibilityState,
    hidden: document.hidden,
    timestamp: getTimestamp()
  };
};

/**
 * Log browser state with timing information
 * Useful for debugging rendering delays caused by tab visibility or focus issues
 * @param {string} label - Context label for the log
 */
export const logBrowserState = (label) => {
  const state = getBrowserState();
  timingLog(`[BROWSER STATE] ${label}`, state);
  return state;
};

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
