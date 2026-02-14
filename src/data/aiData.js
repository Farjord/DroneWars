const aiPersonalities = [
  {
    name: 'TEST AI',
    description: 'Used for test scenarios.',
    difficulty: 'Easy',
    reputationMultiplier: 0.5,
    modes: ['vs'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/TEST.png',
    dronePool: [
      'Mammoth',
      'Talon',
      'Firefly',
      'Devastator',
      'Locust'
    ],
    shipComponents: {
      'POWERCELL_001': 'l',
      'BRIDGE_001': 'm',
      'DRONECONTROL_001': 'r'
    },
    decklist: [
      { id: 'CARD001_ENHANCED', quantity: 40 }
    ]
  },
  {
    name: 'Manticore - Class II Gunship',
    description: 'Focuses on overwhelming firepower and direct damage to drones and ship sections.',
    difficulty: 'Normal',
    reputationMultiplier: 1.0,
    modes: ['vs'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Manticore.png',
    dronePool: [
      'Avenger',
      'Devastator',
      'Mammoth',
      'Gladiator',
      'Dart',
      'Skirmisher',
      'Behemoth',
      'Vindicator',
      'Sabot',
      'Tempest'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'DRONECONTROL_001': 'm',
      'POWERCELL_001': 'r'
    },
    decklist: [
      { id: 'CARD011', quantity: 2 },
      { id: 'CARD010_ENHANCED', quantity: 2 },
      { id: 'CARD030', quantity: 2 },
      { id: 'CARD016', quantity: 2 },
      { id: 'CARD018', quantity: 2 },
      { id: 'CARD023_ENHANCED', quantity: 2 },
      { id: 'CARD004_ENHANCED', quantity: 2 },
      { id: 'CARD002_ENHANCED', quantity: 2 },
      { id: 'CARD051', quantity: 4 },
      { id: 'CARD012_ENHANCED', quantity: 2 },
      { id: 'CARD050', quantity: 4 },
      { id: 'CARD033_ENHANCED', quantity: 4 },
      { id: 'CARD_TACTICS_1', quantity: 4 },
      { id: 'CARD_STATUS_4', quantity: 4 },
      { id: 'CARD_TACTICS_4', quantity: 4 },
      { id: 'CARD005', quantity: 4 },
      { id: 'CARD007_ENHANCED', quantity: 4 },
      { id: 'CARD028', quantity: 2 },
      { id: 'CARD024', quantity: 2 },
      { id: 'CARD029', quantity: 2 },
      { id: 'DOCTRINE_003', quantity: 2 },
      { id: 'DOCTRINE_002', quantity: 2 }
    ]
  },
  {
    name: 'Rogue Scout Pattern',
    description: 'Defensive scout with minimal aggression',
    difficulty: 'Easy',
    reputationMultiplier: 0.5,
    modes: ['extraction'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Scout.png',
    escapeDamage: { min: 1, max: 2 },
    dronePool: [
      'Dart',
      'Threat Transmitter',
      'Talon',
      'Ion Drone',
      'Signal Beacon'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    },
    decklist: [
      { id: 'CARD039', quantity: 3 },
      { id: 'CARD002', quantity: 4 },
      { id: 'CARD003', quantity: 4 },
      { id: 'CARD004', quantity: 4 },
      { id: 'CARD005', quantity: 3 },
      { id: 'CARD007', quantity: 4 },
      { id: 'CARD008', quantity: 3 },
      { id: 'CARD033', quantity: 2 },
      { id: 'CARD015', quantity: 3 },
      { id: 'CARD016', quantity: 4 },
      { id: 'CARD018', quantity: 4 },
      { id: 'CARD019', quantity: 2 },
      { id: 'Raise_the_Alarm', quantity: 2 },
      { id: 'Transmit_Threat', quantity: 4 }
    ]
  },
  {
    name: 'Specialized Hunter Group',
    description: 'Fast and aggressive interceptor',
    difficulty: 'Medium',
    reputationMultiplier: 1.0,
    modes: ['extraction'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Hunter.png',
    escapeDamage: { min: 2, max: 3 },
    dronePool: [
      'Signal Beacon',
      'Threat Transmitter',
      'Avenger',
      'Talon',
      'Mammoth'
    ],
    shipComponents: {
      'POWERCELL_001': 'l',
      'BRIDGE_001': 'm',
      'DRONECONTROL_001': 'r'
    },
    decklist: [
      { id: 'CARD039_ENHANCED', quantity: 4 },
      { id: 'CARD002', quantity: 4 },
      { id: 'CARD003', quantity: 3 },
      { id: 'CARD004', quantity: 3 },
      { id: 'CARD005', quantity: 4 },
      { id: 'CARD006', quantity: 2 },
      { id: 'CARD007', quantity: 3 },
      { id: 'CARD009', quantity: 4 },
      { id: 'CARD012', quantity: 3 },
      { id: 'CARD015', quantity: 4 },
      { id: 'CARD016', quantity: 3 },
      { id: 'CARD019', quantity: 3 },
      { id: 'Raise_the_Alarm', quantity: 2 },
      { id: 'Transmit_Threat', quantity: 4 }
    ]
  },
  {
    name: 'Capital-Class Blockade Fleet',
    description: 'Overwhelming force, heavy defenses',
    difficulty: 'Hard',
    reputationMultiplier: 1.5,
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Blockade.png',
    escapeDamage: { min: 3, max: 5 },
    dronePool: [
      'Firefly',
      'Mammoth',
      'Talon',
      'Devastator',
      'Dart'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'DRONECONTROL_001': 'm',
      'POWERCELL_001': 'r'
    },
    decklist: [
      { id: 'CARD039_ENHANCED', quantity: 4 },
      { id: 'CARD002', quantity: 4 },
      { id: 'CARD003', quantity: 2 },
      { id: 'CARD004', quantity: 3 },
      { id: 'CARD005', quantity: 4 },
      { id: 'CARD006', quantity: 4 },
      { id: 'CARD007', quantity: 3 },
      { id: 'CARD008', quantity: 4 },
      { id: 'CARD053_Enhanced', quantity: 3 },
      { id: 'CARD012', quantity: 4 },
      { id: 'CARD013', quantity: 2 },
      { id: 'CARD016', quantity: 3 }
    ]
  },
  {
    bossId: 'BOSS_T1_NEMESIS',
    name: 'Nemesis-Class Dreadnought',
    description: 'The infamous commander of the Eremos blockade. A formidable opponent with advanced combat protocols and overwhelming firepower.',
    difficulty: 'Hard',
    reputationMultiplier: 0,
    modes: ['boss'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Boss_Nemesis.png',
    dronePool: [
      'Mammoth',
      'Devastator',
      'Avenger',
      'Bastion',
      'Aegis'
    ],
    shipComponents: {
      'DRONECONTROL_001': 'l',
      'BRIDGE_001': 'm',
      'POWERCELL_001': 'r'
    },
    decklist: [
      { id: 'CARD039_ENHANCED', quantity: 4 },
      { id: 'CARD002_ENHANCED', quantity: 3 },
      { id: 'CARD004_ENHANCED', quantity: 4 },
      { id: 'CARD006', quantity: 4 },
      { id: 'CARD007_ENHANCED', quantity: 4 },
      { id: 'CARD008', quantity: 4 },
      { id: 'CARD053_Enhanced', quantity: 3 },
      { id: 'CARD012_ENHANCED', quantity: 4 },
      { id: 'CARD013', quantity: 3 },
      { id: 'CARD016', quantity: 4 }
    ],
    bossConfig: {
      displayName: 'THE NEMESIS',
      subtitle: 'Commander of the Eremos Blockade',
      description: 'A legendary dreadnought that has claimed countless ships. Defeating it will prove your supremacy in the Shallows.',
      firstTimeReward: {
        credits: 5000,
        aiCores: 3,
        reputation: 500,
        blueprintId: null
      },
      repeatReward: {
        credits: 1000,
        aiCores: 1,
        reputation: 100
      }
    }
  }
];

export default aiPersonalities;
