export const starterDeck = {
  id: 'STARTER_001',
  name: 'Reconnaissance Corvette',
  description: 'A leightweight configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,
  shipId: 'SHIP_001',
  decklist: [
    { id: 'LANE_CONTROL_DAMAGE', quantity: 4 },
    { id: 'CARD010', quantity: 2 },
    { id: 'CARD013', quantity: 2 },
    { id: 'CARD037', quantity: 4 },
    { id: 'CARD014', quantity: 4 },
    { id: 'CARD028', quantity: 2 },
    { id: 'CARD029', quantity: 2 },
    { id: 'Rally', quantity: 2 },
    { id: 'CARD_TACTICS_4', quantity: 4 },
    { id: 'CARD_TACTICS_1', quantity: 4 },
    { id: 'CARD016', quantity: 4 },
    { id: 'CARD033', quantity: 4 },
    { id: 'CARD039', quantity: 4 },
    { id: 'CARD_TACTICS_5', quantity: 4 },
    { id: 'LANE_CONTROL_ENERGY', quantity: 4 },
    { id: 'LANE_CONTROL_DRAW', quantity: 4 },
    { id: 'Exhaust', quantity: 2 },
    { id: 'DOCTRINE_002', quantity: 2 },
    { id: 'CARD020', quantity: 2 }
  ],
  droneSlots: [
    { slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' },
    { slotIndex: 1, slotDamaged: false, assignedDrone: 'Dominator' },
    { slotIndex: 2, slotDamaged: false, assignedDrone: 'Infiltrator' },
    { slotIndex: 3, slotDamaged: false, assignedDrone: 'Talon' },
    { slotIndex: 4, slotDamaged: false, assignedDrone: 'Mammoth' }
  ],
  shipComponents: {
    'POWERCELL_001': 'l',
    'BRIDGE_001': 'm',
    'DRONECONTROL_001': 'r'
  }
};

export const playerDecks = [starterDeck];

export default playerDecks;
