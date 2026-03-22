export const starterDeck = {
  id: 'STARTER_001',
  name: 'Reconnaissance Corvette',
  description: 'A lightweight configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,
  shipId: 'SHIP_001',
  decklist: [
    { id: 'FINISHING_VOLLEY', quantity: 3 },
    { id: 'THERMAL_LANCE', quantity: 3 },
    { id: 'EMP_BURST', quantity: 3 },
    { id: 'TEMPORAL_DAMPENER', quantity: 3 },
    { id: 'WEAPON_OVERLOAD', quantity: 3 },
    { id: 'BOOSTERS', quantity: 3 },
    { id: 'OVERCHARGE', quantity: 3 },
    { id: 'SHIELD_BOOST', quantity: 3 },
    { id: 'COMBAT_ENHANCEMENT', quantity: 2 },
    { id: 'OVERCLOCKED_THRUSTERS', quantity: 2 },
    { id: 'SCATTER_SHOT', quantity: 3 },
    { id: 'SYSTEM_SABOTAGE', quantity: 3 },
    { id: 'SYSTEM_RESTORE', quantity: 3 },
    { id: 'SUPPRESSION_FIRE', quantity: 3 }
  ],
  droneSlots: [
    { slotIndex: 0, assignedDrone: 'Behemoth' },
    { slotIndex: 1, assignedDrone: 'Dart' },
    { slotIndex: 2, assignedDrone: 'Locust' },
    { slotIndex: 3, assignedDrone: 'Talon' },
    { slotIndex: 4, assignedDrone: 'Mammoth' }
  ],
  shipComponents: {
    'POWERCELL_001': 'l',
    'BRIDGE_001': 'm',
    'DRONECONTROL_001': 'r'
  }
};

export const playerDecks = [starterDeck];

export default playerDecks;
