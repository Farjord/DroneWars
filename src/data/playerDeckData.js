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

  // 40 Asset Cards - StateInitializer.js imports this decklist
  decklist: [
    {
      id: 'CARD009',
      quantity: 4
    },
    {
      id: 'CARD001',
      quantity: 4
    },
    {
      id: 'CARD010',
      quantity: 2
    },
    {
      id: 'CARD013',
      quantity: 2
    },
    {
      id: 'CARD037',
      quantity: 4
    },
    {
      id: 'CARD014',
      quantity: 4
    },
    {
      id: 'CARD028',
      quantity: 2
    },
    {
      id: 'CARD029',
      quantity: 2
    },
    {
      id: 'CARD005',
      quantity: 4
    },
    {
      id: 'CARD_TACTICS_4',
      quantity: 4
    },
    {
      id: 'CARD_TACTICS_1',
      quantity: 4
    },
    {
      id: 'CARD016',
      quantity: 4
    } 
  ],
  // 5 Drones (Extraction Mode uses exactly 5 drones, no selection phase)
  droneSlots: [
    { slotIndex: 0, slotDamaged: false, assignedDrone: 'Scanner' },
    { slotIndex: 1, slotDamaged: false, assignedDrone: 'Shark' },
    { slotIndex: 2, slotDamaged: false, assignedDrone: 'Dart' },
    { slotIndex: 3, slotDamaged: false, assignedDrone: 'Talon' },
    { slotIndex: 4, slotDamaged: false, assignedDrone: 'Mammoth' },
  ],

  // Ship components (standard layout)
  shipComponents: {
    'POWERCELL_001': 'l',        // Left lane
    'BRIDGE_002': 'm',     // Middle lane
    'DRONECONTROL_001': 'r'   // Right lane
  }
};

// Export as array for future expansion (multiple starter decks)
export const playerDecks = [starterDeck];

export default playerDecks;
