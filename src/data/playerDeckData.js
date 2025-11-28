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
    { id: 'CARD001', quantity: 4 }, 
    { id: 'CARD010', quantity: 2 },  
    { id: 'CARD013', quantity: 2 },  
    { id: 'CARD005', quantity: 2 },  
    { id: 'CARD023', quantity: 2 },  
    { id: 'CARD014', quantity: 2 },  
    { id: 'CARD016', quantity: 2 },  
    { id: 'CARD018', quantity: 2 },  
    { id: 'CARD007', quantity: 2 },  
    { id: 'CARD003', quantity: 4 },  
    { id: 'CARD033', quantity: 2 },  
    { id: 'CARD035', quantity: 2 },  
    { id: 'CARD002', quantity: 2 },  
    { id: 'CARD006', quantity: 2 },  
    { id: 'CARD028', quantity: 2 },  
    { id: 'CARD027', quantity: 1 },  
    { id: 'CARD029', quantity: 2 },  
    { id: 'CARD019', quantity: 2 },  
    { id: 'CARD020', quantity: 1 }, 
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
