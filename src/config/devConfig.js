// ========================================
// DEV MODE CONFIGURATION
// ========================================
// Central control for all development-only features
// Set DEV_MODE to false for production builds

const DEV_MODE = true; // Master toggle - change this to false for production

const DEV_CONFIG = {
  // Master dev mode flag
  enabled: DEV_MODE,

  // Individual feature flags (all controlled by master DEV_MODE by default)
  // You can override individual features for fine-grained control
  features: {
    // Debug View button in game header settings dropdown
    // Shows GameDebugModal with raw state and calculated stats
    debugView: DEV_MODE,

    // Click opponent's hand badge to view AI's cards
    // Useful for debugging AI decision-making
    aiHandDebug: false,

    // "Debug Source" column in game log table
    // Shows internal source of log entries for debugging
    logDebugSource: DEV_MODE,

    // ℹ️ button in log to view AI decision reasoning
    // Shows detailed AI decision context and logic
    aiDecisionDrillDown: DEV_MODE,

    // Modal Showcase screen for previewing all modals
    // Accessible via MenuScreen button or Ctrl+M shortcut
    modalShowcase: DEV_MODE,

    // Testing Mode screen for quick scenario setup
    // Bypass normal game flow and start directly at action phase
    // Configure exact drones, cards, resources, and game state
    testingMode: DEV_MODE,

    // Add Card to Hand button in game header settings dropdown
    // Allows adding cards to either player's hand during gameplay
    // Useful for testing specific card interactions and game states
    addCardToHand: DEV_MODE,

    // Force Win button in game header settings dropdown
    // Instantly wins combat by damaging all opponent ship sections
    // Useful for testing extraction mode victory flows
    forceWin: false
  }
};

export default DEV_CONFIG;
