/**
 * Player Deck Data
 * Defines pre-configured player decks for Extraction Mode
 * This file contains the starter deck and drones for single-player gameplay
 */

export const starterDeck = {
  id: 'STARTER_001',
  name: 'Standard Loadout',
  description: 'A balanced configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,  // Cannot be edited (for Slot 0 in Extraction Mode)

  // 40 Asset Cards - Exactly as defined in StateInitializer.js
  decklist: [
    { id: 'CARD018', quantity: 4 },  // Desperate Measures
    { id: 'CARD019', quantity: 2 },  // Reposition
    { id: 'CARD009', quantity: 2 },  // Target Lock
    { id: 'CARD007', quantity: 2 },  // Emergency Patch
    { id: 'CARD012', quantity: 2 },  // Armor-Piercing Shot
    { id: 'CARD005', quantity: 4 },  // Adrenaline Rush
    { id: 'CARD006', quantity: 2 },  // Nanobot Repair
    { id: 'CARD015', quantity: 2 },  // Streamline
    { id: 'CARD008', quantity: 2 },  // Shield Recharge
    { id: 'CARD001', quantity: 2 },  // Laser Blast
    { id: 'CARD002', quantity: 4 },  // System Reboot
    { id: 'CARD003', quantity: 4 },  // Out Think
    { id: 'CARD004', quantity: 4 },  // Energy Surge
    { id: 'CARD016', quantity: 4 },  // Static Field
  ],
  // Total: 4+2+2+2+2+4+2+2+2+2+4+4+4+4 = 40 cards ✓

  // 5 Drones (Extraction Mode uses exactly 5 drones, no selection phase)
  drones: [
    { name: 'Scout Drone', isDamaged: false },
    { name: 'Standard Fighter', isDamaged: false },
    { name: 'Heavy Fighter', isDamaged: false },
    { name: 'Guardian Drone', isDamaged: false },
    { name: 'Repair Drone', isDamaged: false },
  ],

  // Ship components (standard layout)
  shipComponents: {
    'BRIDGE_001': 'l',        // Left lane
    'POWERCELL_001': 'm',     // Middle lane
    'DRONECONTROL_001': 'r'   // Right lane
  }
};

// Export as array for future expansion (multiple starter decks)
export const playerDecks = [starterDeck];

export default playerDecks;
