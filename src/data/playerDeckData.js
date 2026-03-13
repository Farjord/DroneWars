export const starterDeck = {
  id: 'STARTER_001',
  name: 'Reconnaissance Corvette',
  description: 'A lightweight configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,
  shipId: 'SHIP_001',
  decklist: [
    { id: 'FINISHING_VOLLEY', quantity: 2 },
    { id: 'SHRIEKER_MISSILES', quantity: 2 },
    { id: 'SIDEWINDER_MISSILES', quantity: 2 },
    { id: 'THERMAL_LANCE', quantity: 2 },
    { id: 'PREY_ON_THE_WEAK', quantity: 2 },
    { id: 'EMP_BURST', quantity: 2 },
    { id: 'MEMORY_LEAK', quantity: 2 },
    { id: 'POWER_DRAIN', quantity: 2 },
    { id: 'TEMPORAL_DAMPENER', quantity: 2 },
    { id: 'WEAPON_OVERLOAD', quantity: 2 },
    { id: 'BOOSTERS', quantity: 2 },
    { id: 'OVERCHARGE', quantity: 2 },
    { id: 'REACTIVATION_PROTOCOL', quantity: 2 },
    { id: 'SHIELD_BOOST', quantity: 2 },
    { id: 'COMBAT_ENHANCEMENT', quantity: 2 },
    { id: 'OVERCLOCKED_THRUSTERS', quantity: 2 },
    { id: 'SHIELD_AMPLIFIER', quantity: 2 },
    { id: 'SCATTER_SHOT', quantity: 2 },
    { id: 'SYSTEM_SABOTAGE', quantity: 2 },
    { id: 'SYSTEM_RESTORE', quantity: 2 }
  ],
  droneSlots: [
    { slotIndex: 0, slotDamaged: false, assignedDrone: 'Behemoth' },
    { slotIndex: 1, slotDamaged: false, assignedDrone: 'Dart' },
    { slotIndex: 2, slotDamaged: false, assignedDrone: 'Locust' },
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
