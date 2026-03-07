export const starterDeck = {
  id: 'STARTER_001',
  name: 'Reconnaissance Corvette',
  description: 'A lightweight configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,
  shipId: 'SHIP_001',
  decklist: [
    { id: 'SUPPRESSION_FIRE', quantity: 4 },
    { id: 'SHRIEKER_MISSILES', quantity: 2 },
    { id: 'SIDEWINDER_MISSILES', quantity: 2 },
    { id: 'SHIELD_BOOST', quantity: 4 },
    { id: 'OVERCHARGE', quantity: 4 },
    { id: 'COMBAT_ENHANCEMENT', quantity: 2 },
    { id: 'SHIELD_AMPLIFIER', quantity: 2 },
    { id: 'RALLY', quantity: 2 },
    { id: 'EMP_BURST', quantity: 4 },
    { id: 'TACTICAL_REPOSITIONING', quantity: 4 },
    { id: 'WEAPON_OVERLOAD', quantity: 4 },
    { id: 'FINISHING_VOLLEY', quantity: 4 },
    { id: 'THERMAL_LANCE', quantity: 4 },
    { id: 'TEMPORAL_DAMPENER', quantity: 4 },
    { id: 'STRATEGIC_DOMINANCE', quantity: 4 },
    { id: 'TACTICAL_ADVANTAGE', quantity: 4 },
    { id: 'EXHAUST', quantity: 2 },
    { id: 'BREACH_THE_LINE', quantity: 2 },
    { id: 'SLIMLINE_BODYWORK', quantity: 2 }
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
