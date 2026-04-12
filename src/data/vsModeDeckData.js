const vsDecks = [
  {
    id: 'VS_DECK_001',
    name: 'Mobile Assault',
    description: 'Use movement tricks and subterfuge to outwit your opponent.',
    imagePath: '/Menu/Deck.png',
    shipId: 'SHIP_001',
  decklist: [
    { id: 'SUPPRESSION_FIRE', quantity: 3 },
    { id: 'COMBAT_ENHANCEMENT', quantity: 2 },
    { id: 'RALLY', quantity: 1 },
    { id: 'TACTICAL_REPOSITIONING', quantity: 3 },
    { id: 'WEAPON_OVERLOAD', quantity: 3 },
    { id: 'DEPLOY_RALLY_BEACON', quantity: 2 },
    { id: 'THERMAL_LANCE', quantity: 3 },
    { id: 'TEMPORAL_DAMPENER', quantity: 3 },
    { id: 'SLIMLINE_BODYWORK', quantity: 2 },
    { id: 'TACTICAL_SHIFT', quantity: 2 },
    { id: 'ASSAULT_REPOSITION', quantity: 2 },
    { id: 'FORCED_REPOSITIONING', quantity: 2 },
    { id: 'REPOSITION', quantity: 1 },
    { id: 'MANEUVER', quantity: 3 },
    { id: 'SWIFT_MANEUVER', quantity: 2 },
    { id: 'DEPLOY_RELAY_BEACON', quantity: 2 },
    { id: 'DEPLOY_PROXIMITY_MINE', quantity: 2 },
    { id: 'BARRAGE', quantity: 2 }
  ],
  dronePool: [
    'Specter', 'Blitz', 'Tempest', 'Dart', 'Osiris',
    'Infiltrator', 'Behemoth', 'Mammoth', 'Wraith', 'Phalanx'
  ],
  shipComponents: { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' }
},
  {
    id: 'VS_DECK_002',
    name: 'Patient Hunter',
    description: 'Mark your targets and strike with precision.',
    imagePath: '/Menu/Deck.png',
    shipId: 'SHIP_001',
  decklist: [
    { id: 'CONDEMNATION_RAY', quantity: 2 },
    { id: 'CONVERGENCE_BEAM', quantity: 3 },
    { id: 'MARK_ENEMY', quantity: 3 },
    { id: 'MARK_EXPLOIT', quantity: 2 },
    { id: 'TARGET_LOCK', quantity: 3 },
    { id: 'TARGET_ACQUISITION', quantity: 2 },
    { id: 'RAILGUN_STRIKE', quantity: 1 },
    { id: 'PURGE_PROTOCOL', quantity: 1 },
    { id: 'OUT_THINK', quantity: 3 },
    { id: 'SUPERIOR_INTEL', quantity: 1 },
    { id: 'REBOOT', quantity: 2 },
    { id: 'SCAVENGER_SHOT', quantity: 2 },
    { id: 'TACTICAL_ADVANTAGE', quantity: 3 },
    { id: 'EQUIPMENT_CACHE', quantity: 2 },
    { id: 'PIERCING_ROUNDS', quantity: 1 },
    { id: 'COMBAT_ENHANCEMENT', quantity: 1 },
    { id: 'SHIELD_AMPLIFIER', quantity: 1 },
    { id: 'OVERCLOCKED_THRUSTERS', quantity: 1 },
    { id: 'SACRIFICE_FOR_POWER', quantity: 2 },
    { id: 'DEPLOY_JAMMERS', quantity: 3 },
    { id: 'OVERRUN', quantity: 1 }
  ],
    dronePool: [
    'Bastion', 'Seraph', 'Harrier', 'Aegis', 'Hunter',
    'Scanner', 'Shark', 'Odin', 'Manticore', 'Avenger'
    ],
  shipComponents: { 'BRIDGE_001': 'm', 'POWERCELL_001': 'r', 'DRONECONTROL_001': 'l' }
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
