const vsDecks = [
  {
    id: 'VS_DECK_001',
    name: 'Mobile Assault',
    description: 'Use movement tricks and subtefuge to outwit your opponent.',
    imagePath: '/Menu/Deck.png',
  shipId: 'SHIP_001',
 decklist: [
    { id: 'LANE_CONTROL_DAMAGE', quantity: 4 },
    { id: 'CARD010', quantity: 2 },
    { id: 'CARD028', quantity: 2 },
    { id: 'CARD029', quantity: 2 },
    { id: 'Rally', quantity: 2 },
    { id: 'CARD_TACTICS_4', quantity: 2 },
    { id: 'CARD_TACTICS_1', quantity: 4 },
    { id: 'CARD016', quantity: 4 },
    { id: 'Deploy_Rally_Beacon', quantity: 4 },
    { id: 'CARD039', quantity: 4 },
    { id: 'CARD_TACTICS_5', quantity: 4 },
    { id: 'CARD020', quantity: 2 },
    { id: 'CARD061', quantity: 2 },
    { id: 'CARD062', quantity: 4 },
    { id: 'FORCED_REPOSITION', quantity: 2 },
    { id: 'CARD019', quantity: 4 },
    { id: 'CARD023', quantity: 4 },
    { id: 'CARD060', quantity: 2 },
    { id: 'CARD032_Enhanced', quantity: 2 },
    { id: 'CARD035', quantity: 2 },
    { id: 'DOCTRINE_003', quantity: 2 }
  ],
  dronePool: [
    'Specter', 'Blitz', 'Tempest', 'Dart', 'Harrier',
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
    dronePool: [
      'Dart', 'Talon', 'Mammoth', 'Bastion', 'Devastator',
      'Seraph', 'Harrier', 'Aegis', 'Firefly', 'Locust'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    }
  }
];

export default vsDecks;
