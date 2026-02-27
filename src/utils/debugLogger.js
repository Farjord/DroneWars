// ========================================
// DEBUG LOGGER UTILITY
// ========================================
// Centralized debug logging system with category-based control
// Provides consistent logging format and easy enable/disable

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
    DRAG_DROP_DEPLOY: false,   // Drag-and-drop deployment debugging
    DRONE_SELECTION: false,     // Drone selection phase and data
    DECK_SELECTION: false,      // Deck selection phase
    PLACEMENT: false,           // Ship placement phase
    PLACEMENT_CASCADE: false,   // Placement optimistic cascade tracking
    PHASE_TRANSITIONS: false,    // Game phase transitions and flow
    PHASE_MANAGER: false,        // Phase Manager state tracking and transitions
    AI_TURN_TRACE: true,        // Numbered step-by-step AI turn trace
    MULTIPLAYER: false,          // Network sync and multiplayer
    P2P_CONNECTION: false,      // PeerJS connection diagnostics
    ANIMATIONS: false,           // Animation system
    OPTIMISTIC: false,           // Animation deduplication and matching logic
    COMMITMENTS: false,          // Simultaneous phase commitments
    COMBAT: false,              // Combat resolution
    PASS_LOGIC: false,           // Pass handling and pass notification debugging
    STATE_SYNC: false,          // State synchronization
    BROADCAST_TIMING: false,    // Broadcast timing and state validation
    ENERGY: false,              // Energy management (shield allocation)
    RESOURCE_RESET: false,        // Energy and deployment budget reset between rounds
    CARDS: false,                // Card play and effects
    RAILGUN_ANIMATION: false,    // Railgun-specific animation investigation
    HAND_VIEW: false,            // Hand display and card interaction
    CARD_PLAY: false,             // Card playability and clicking
    SHIELD_CLICKS: false,       // Shield allocation click tracking
    BUTTON_CLICKS: false,         // Button click tracking and effects
    MOVEMENT_LANES: false,        // Movement card lane highlighting diagnostics
    GUEST_CASCADE: false,        // Guest optimistic cascade flow
    CASCADE_LOOP: false,        // Cascade loop iteration details
    VALIDATION: false,           // State validation and reconciliation
    TIMING: false,               // High-resolution timing milestones with timestamps
    ANNOUNCE_TRACE: false,      // Announcement queueing and playback tracing
    SUBTITLE_CALC: false,       // Phase animation subtitle calculation
    FIRST_PLAYER: false,        // First player determination and seeded random
    SHIP_ABILITY: false,        // Ship ability execution and turn ending
    EXTRACTION: false,           // Single-player extraction mode (hangar, tactical map, deployment)
    SAVE: false,                 // Save game migration and format conversion
    ENCOUNTER: false,          // Random encounter rolls and combat triggers
    QUICK_DEPLOY: false,         // Quick deployment validation and selection
    PHASE_FLOW: false,           // Phase transitions and announcements
    TICKER: false,              // News ticker message generation and data flow
    INTERCEPTOR_GLOW: false,     // Interceptor glow calculation debugging
    CARD_SIZING: false,           // Card wrapper and sizing debugging
    ASSET_PRELOAD: false,          // Asset preloading and splash screen timing
    SP_COMBAT: false,              // Single-player combat init, abandon, and state transitions
    DECK_BUILDER: false,           // Deck builder save, toast, and validation debugging
    SALVAGE_LOOT: false,          // PoI loot distribution: slot count, card count, rarities, positions
    SALVAGE_ENCOUNTER: false,     // Encounter rolls: chance, roll value, increase per salvage
    DRAG_PERF: false,             // Drag performance investigation: cursor position, re-renders, state updates
    MODE_TRANSITION: false,        // All mode transitions: hangar <-> tacticalMap <-> inGame (with trigger source)
    RUN_STATE: false,              // TacticalMapStateManager persistence debugging (background, waypoints)
    COMBAT_FLOW: false,            // Combat type identification and state restoration after combat
    WAYPOINT_MANAGER: false,      // Waypoint path storage and restoration debugging
    REWARD_MANAGER: false,        // Reward generation and seed management debugging
    TRANSITION_MANAGER: false,     // State transitions between TacticalMap and Combat
    PATH_HIGHLIGHTING: false,      // Path/waypoint display state in HexGridRenderer
    SOUND: false,                     // Sound system: unlock, preload, playback, bridge events

    // Effect Chain Investigation
    EFFECT_CHAIN_DEBUG: true,   // Temporary: effect chain auto-commit investigation

    // Card Play Pipeline
    CARD_PLAY_TRACE: true,      // End-to-end card play milestone trace (10 numbered steps)

    // Effect System - Modular Processor Logging
    EFFECT_PROCESSING: false,    // Effect processor execution (DrawEffectProcessor, etc.)

    // Targeting System Refactoring - Modular Processor Logging
    TARGETING_ROUTING: false,    // Targeting router decisions
    TARGETING_PROCESSING: false, // Targeting processor execution
    TARGETING_FALLBACK: false,   // Targeting falling back to monolithic function
    LANE_TARGETING: false,       // Lane-targeting cards and filtered drone effects (affectedDroneIds)
    TACTICAL_ITEMS: false,        // Tactical item panel clicks and usage
    MOVEMENT_EFFECT: false,       // Movement effect execution (DO_NOT_EXHAUST, drone state changes)
    TURN_TRANSITION_DEBUG: false,  // Turn transition investigation
    AVAILABILITY: false,             // Drone availability system (dots, readyCount, inPlayCount)
    SINGLE_MOVE_FLOW: false,         // ✅ Comprehensive SINGLE_MOVE card flow logging (card selection → modal → resolution)

    // Additional Cost Card Flow Debugging
    ADDITIONAL_COST_UI: false,         // UI state transitions, drag/drop, phase changes
    ADDITIONAL_COST_TARGETING: false,  // Target calculation, filtering, routing
    ADDITIONAL_COST_HIGHLIGHT: false,  // Visual highlighting state and rendering
    ADDITIONAL_COST_VALIDATION: false,  // Cost/effect validation checks
    ADDITIONAL_COST: false,             // Card execution, cost processing, animations
    ADDITIONAL_COST_MODE: false,       // Additional cost mode validation and flow control
    ADDITIONAL_COST_EFFECT_FLOW: false, // Comprehensive effect selection completion flow

    // Checkpoint flow debugging for drag-drop event tracking
    CHECKPOINT_FLOW: false,            // Drag-drop event checkpoint tracking

    // Modal and click debugging for additional cost investigation
    LANE_CLICK_ENTRY: false,   // Track all lane click invocations
    MODAL_TRIGGER: false,       // Track "Invalid Move" modal triggers

    // Stat Calculation Debugging
    STAT_CALCULATION: false,           // Effective stat calculation for targeting comparisons
    // Momentum Glow Debugging
    MOMENTUM_GLOW: false,             // Card hover logging for momentum glow debugging
    CONSUMPTION_DEBUG: false,           // Snared/suppressed consumption flow tracing
    ON_MOVE_EFFECTS: false,             // ON_MOVE ability trigger flow (HEAL, MODIFY_STAT)
    TRIGGERS: false,                     // Unified trigger system (TriggerProcessor)

    // Single-Player State Management
    SP_SAVE: false,                    // Save/load, profile creation, migration
    SP_INVENTORY: false,               // Card inventory, discovery state
    SP_SHIP: false,                    // Ship slot CRUD, deck management, component instances
    SP_REPAIR: false,                  // Drone slot and section repair operations
    SP_SHOP: false,                    // Tactical item and card pack purchases
    SP_DRONE: false,                   // Drone instance creation, updates, queries

    // Tactical Map Screen
    MOVEMENT: false,                   // Hex movement loop, scan, journey commence/pause/stop
    SALVAGE: false,                    // Salvage slot selection, leave, combat, quit
    LOOT: false,                       // Loot collection, POI loot, blueprint rewards
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
