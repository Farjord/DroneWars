/**
 * Player Deck Data
 * Defines pre-configured player decks for Extraction Mode
 * This file contains the starter deck and drones for single-player gameplay
 */

export const starterDeck = {
  id: 'STARTER_001',
  name: 'Reconnaissance Corvette',
  description: 'A leightweight configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,  // Cannot be edited (for Slot 0 in Extraction Mode)
  shipId: 'SHIP_001', // Default ship card

  // 40 Asset Cards - Exactly as defined in StateInitializer.js
  decklist: [
    { id: 'CARD002', quantity: 4 }, 
    { id: 'CARD005', quantity: 4 },  
    { id: 'CARD007', quantity: 2 },  
    { id: 'CARD010', quantity: 2 },  
    { id: 'CARD014', quantity: 4 },  
    { id: 'CARD017', quantity: 4 },  
    { id: 'CARD021', quantity: 2 },  
    { id: 'CARD028', quantity: 2 },   
    { id: 'CARD033', quantity: 4 },  
    { id: 'CARD037', quantity: 4 },  
    { id: 'CARD038', quantity: 4 },  
    { id: 'CARD039', quantity: 4 },  
  ],
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
    'POWERCELL_001': 'l',        // Left lane
    'BRIDGE_001': 'm',     // Middle lane
    'DRONECONTROL_001': 'r'   // Right lane
  }
};

// Export as array for future expansion (multiple starter decks)
export const playerDecks = [starterDeck];

export default playerDecks;
