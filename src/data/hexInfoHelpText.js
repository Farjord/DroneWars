// ========================================
// HEX INFO PANEL HELP TEXT DATA
// ========================================
// Contextual help content for hex info panel stats.
// Used by HexInfoPanel to explain game mechanics to new players.

export const HEX_INFO_HELP_TEXT = {
  // Empty hex stat
  movementEncounterChance: {
    title: 'Movement Encounter Chance',
    description: 'Chance of a random encounter when moving through this hex. Based on the zone danger level.'
  },
  // PoI-specific stats
  baseSalvageRisk: {
    title: 'Base Salvage Risk',
    description: 'Starting encounter chance for the first salvage slot. Each additional slot you salvage increases this risk.'
  },
  salvageThreat: {
    title: 'Salvage Threat',
    description: 'Detection added when you leave after salvaging. The more you take, the more attention you draw.'
  },
  // Common stats
  threatIncrease: {
    title: 'Threat Increase',
    description: 'Detection added per hex traveled. Higher in dangerous zones.'
  },
  distance: {
    title: 'Distance',
    description: 'Number of hexes to travel. Longer journeys mean more detection and encounter chances.'
  },
  journeyEncounterRisk: {
    title: 'Movement Encounter Risk',
    description: 'Total chance of at least one random encounter during the entire journey.'
  },
  threatAfterMove: {
    title: 'Threat After Move',
    description: 'Your detection level after completing this journey. Higher = higher blockade chance.'
  },
  extractionBlockadeChance: {
    title: 'Extraction Blockade Chance',
    description: 'Chance enemies intercept you when extracting. Equals your current detection level.'
  },
  threatLevel: {
    title: 'Threat Level',
    description: 'Defines the strength of AI enemies you encounter. Higher threat means tougher opponents in combat.'
  }
};
