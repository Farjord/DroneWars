const vsDecks = [
  {
    id: 'VS_DECK_001',
    name: 'Mobile Assault',
    description: 'Use movement tricks and subterfuge to outwit your opponent.',
    imagePath: '/Menu/Deck.png',
    shipId: 'SHIP_001',
    decklist: [
    { id: 'SUPPRESSION_FIRE', quantity: 2 },
    { id: 'SHRIEKER_MISSILES', quantity: 2 },
    { id: 'COMBAT_ENHANCEMENT', quantity: 2 },
    { id: 'SHIELD_AMPLIFIER', quantity: 2 },
    { id: 'RALLY', quantity: 2 },
    { id: 'EMP_BURST', quantity: 2 },
    { id: 'TACTICAL_REPOSITIONING', quantity: 2 },
    { id: 'WEAPON_OVERLOAD', quantity: 2 },
    { id: 'DEPLOY_RALLY_BEACON', quantity: 2 },
    { id: 'THERMAL_LANCE', quantity: 2},
    { id: 'TEMPORAL_DAMPENER', quantity: 2 },
    { id: 'SLIMLINE_BODYWORK', quantity: 2 },
    { id: 'TACTICAL_SHIFT', quantity: 2 },
    { id: 'ASSAULT_REPOSITION', quantity: 2 },
    { id: 'FORCED_REPOSITIONING', quantity: 2 },
    { id: 'REPOSITION', quantity: 2 },
    { id: 'MANEUVER', quantity: 2 },
    { id: 'SWIFT_MANEUVER', quantity: 2 },
    { id: 'BARRAGE_ENHANCED', quantity: 1 },
    { id: 'OVERWHELMING_FORCE', quantity: 2 },
    { id: 'OVERRUN', quantity: 1 }
  ],
  dronePool: [
    'Specter', 'Blitz', 'Tempest', 'Dart', 'Osiris',
    'Infiltrator', 'Bastion', 'Behemoth', 'Basilisk', 'Mammoth'
  ],
  shipComponents: { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' }
  },
  {
    id: 'VS_DECK_002',
    name: 'Swarm Tactics',
    description: 'Fast, cheap drone pressure with rapid deployment and lane control.',
    imagePath: '/Menu/Deck.png',
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
    dronePool: [
      'Dart', 'Talon', 'Mammoth', 'Bastion', 'Devastator',
      'Seraph', 'Harrier', 'Aegis', 'Firefly', 'Locust'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    }
  },
  {
    id: 'VS_DECK_003',
    name: 'Fortress Command',
    description: 'Defensive shield and attrition strategy focused on outlasting your opponent.',
    imagePath: '/Menu/Deck.png',
    shipId: 'SHIP_001',
    decklist: [
      { id: 'SHIELD_RECHARGE', quantity: 4 },
      { id: 'SHIELD_BOOST', quantity: 4 },
      { id: 'NANOBOT_REPAIR', quantity: 4 },
      { id: 'EMERGENCY_PATCH', quantity: 2 },
      { id: 'SHIELD_AMPLIFIER', quantity: 2 },
      { id: 'THRUSTER_MALFUNCTION', quantity: 4 },
      { id: 'WEAPON_MALFUNCTION', quantity: 4 },
      { id: 'SUPPRESSION_FIRE', quantity: 4 },
      { id: 'STRATEGIC_DOMINANCE', quantity: 4 },
      { id: 'WEAPON_OVERLOAD', quantity: 4 },
      { id: 'THERMAL_LANCE', quantity: 4 },
      { id: 'TACTICAL_REPOSITIONING', quantity: 4 },
      { id: 'OVERCHARGE', quantity: 4 },
      { id: 'FINISHING_VOLLEY', quantity: 4 },
      { id: 'SIDEWINDER_MISSILES', quantity: 2 },
      { id: 'EXHAUST', quantity: 2 },
      { id: 'BREACH_THE_LINE', quantity: 2 }
    ],
    dronePool: [
      'Mammoth', 'Bastion', 'Aegis', 'Behemoth', 'Devastator',
      'Seraph', 'Talon', 'Sentinel', 'Firefly', 'Basilisk'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    }
  }
];

export default vsDecks;
