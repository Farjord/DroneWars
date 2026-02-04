const aiPersonalities = [
  {
    name: 'TEST AI',
    description: 'Used for test scenarios.',
    difficulty: 'Easy',
    reputationMultiplier: 0.5,  // Easy AI: 0.5x reputation
    modes: ['vs'],  // VS Mode only
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/TEST.png',
    // The specific 5 drones this AI will use.
    dronePool: [
      'Mammoth',
      'Talon',
      'Firefly',
      'Devastator',
      'Locust'
    ],
    // Strategic ship section placement [lane0, lane1, lane2]
    shipDeployment: {
      strategy: 'aggressive',
      placement: ['powerCell', 'bridge', 'droneControlHub'],
      reasoning: 'Places powerCell in outer lane for safety, bridge in middle lane for combat bonus, droneControlHub in outer lane for flexibility'
    },
    // The specific cards and quantities for this AI's deck.
    decklist: [
    { id: 'CARD001_ENHANCED', quantity: 40 },
    { id: 'CARD002', quantity: 0 },
    { id: 'CARD003', quantity: 0 },
    { id: 'CARD004', quantity: 0 },
    { id: 'CARD005', quantity: 0 },
    { id: 'CARD006', quantity: 0 },
    { id: 'CARD007', quantity: 0 },
    { id: 'CARD008', quantity: 0 },
    { id: 'CARD009', quantity: 0 },
    { id: 'CARD010', quantity: 0 },
    { id: 'CARD011', quantity: 0 },
    { id: 'CARD012', quantity: 0 },
    { id: 'CARD013', quantity: 0 },
    { id: 'CARD014', quantity: 0 },
    { id: 'CARD015', quantity: 0 }, 
    { id: 'CARD016', quantity: 0 }, 
    { id: 'CARD017', quantity: 0 }, 
    { id: 'CARD018', quantity: 0 }, 
    { id: 'CARD019', quantity: 0 },
    ]
  },
  {
    name: 'Manticore - Class II Gunship',
    description: 'Focuses on overwhelming firepower and direct damage to drones and ship sections.',
    difficulty: 'Normal',
    reputationMultiplier: 1.0,  // Normal AI: 1.0x reputation
    modes: ['vs'],  // VS Mode only
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Manticore.png',
    dronePool: [
      'Avenger',
      'Devastator',
      'Mammoth',
      'Firefly',
      'Dart',
      'Skirmisher',
      'Locust',
      'Vindicator',
      'Sabot',
      'Talon'

    ],
    // Strategic ship section placement [lane0, lane1, lane2]
    shipDeployment: {
      strategy: 'balanced',
      placement: ['bridge', 'droneControlHub', 'powerCell'],
      reasoning: 'Places bridge in outer lane for durability, droneControlHub in middle for deployment bonus, powerCell in outer for resource safety'
    },
    // The specific cards and quantities for this AI's deck.
  decklist: [
    { id: 'CARD011',quantity: 2},
    { id: 'CARD010',quantity: 2 },
    { id: 'CARD030', quantity: 2 },
    { id: 'CARD016', quantity: 2 },
    { id: 'CARD018', quantity: 2},
    { id: 'CARD023_ENHANCED',quantity: 2},
    { id: 'CARD004_ENHANCED', quantity: 2 },
    { id: 'CARD002_ENHANCED', quantity: 2 },
    { id: 'CARD001_ENHANCED', quantity: 4 },
    { id: 'CARD012_ENHANCED', quantity: 2 },
    { id: 'CARD050', quantity: 4 },
    { id: 'CARD033', quantity: 4 },
    { id: 'CARD_TACTICS_1', quantity: 4 },
    { id: 'CARD_STATUS_4', quantity: 4 },
    { id: 'CARD_TACTICS_4', quantity: 4 },
    { id: 'CARD005', quantity: 4 },
    { id: 'CARD007_ENHANCED', quantity: 4 },
    { id: 'CARD028', quantity: 2},
    { id: 'CARD021', quantity: 2 },   
    { id: 'CARD029', quantity: 2 },
    { id: 'DOCTRINE_003', quantity: 2 },
    { id: 'DOCTRINE_002', quantity: 2 }
  ]
  },

  // === EXTRACTION MODE AIs ===
  // TIER 1 - LOW THREAT (0-49% Detection)
  {
    name: 'Rogue Scout Pattern',
    description: 'Defensive scout with minimal aggression',
    difficulty: 'Easy',
    reputationMultiplier: 0.5,  // Easy AI: 0.5x reputation
    modes: ['extraction'],  // Extraction Mode only
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Scout.png',
    escapeDamage: { min: 1, max: 2 },  // Damage taken when escaping
    dronePool: [
      'Dart',
      'Threat Transmitter',
      'Talon',
      'Ion Drone',
      'Signal Beacon'  // Threat drone: +1 threat per round
    ],
    shipDeployment: {
      strategy: 'defensive',
      placement: ['bridge', 'powerCell', 'droneControlHub'],
      reasoning: 'Defensive positioning prioritizing survival'
    },
    decklist: [
      { id: 'CARD001', quantity: 3 },   // Laser Blast
      { id: 'CARD002', quantity: 4 },   // System Reboot
      { id: 'CARD003', quantity: 4 },   // Out Think
      { id: 'CARD004', quantity: 4 },   // Energy Surge
      { id: 'CARD005', quantity: 3 },   // Adrenaline Rush
      { id: 'CARD007', quantity: 4 },   // Emergency Patch
      { id: 'CARD008', quantity: 3 },   // Shield Recharge
      { id: 'CARD009', quantity: 2 },   // Target Lock
      { id: 'CARD015', quantity: 3 },   // Streamline
      { id: 'CARD016', quantity: 4 },   // Static Field
      { id: 'CARD018', quantity: 4 },   // Desperate Measures
      { id: 'CARD019', quantity: 2 },   // Reposition
    ]
  },

// {
//    name: 'Automated Patrol Unit',
//    description: 'Balanced combat AI',
/*     difficulty: 'Easy',
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Patrol.png',
    dronePool: [
      'Talon',
      'Talon',
      'Mammoth',
      'Bastion',
      'Harrier',
      'Signal Beacon',       // Threat drone: +1 threat per round
      'Threat Transmitter'   // Threat drone: +2 threat on ship hull damage
    ],
    shipDeployment: {
      strategy: 'balanced',
      placement: ['powerCell', 'droneControlHub', 'bridge'],
      reasoning: 'Balanced approach with resource generation priority'
    },
    decklist: [
      { id: 'CARD001', quantity: 4 },   // Laser Blast
      { id: 'CARD002', quantity: 3 },   // System Reboot
      { id: 'CARD003', quantity: 4 },   // Out Think
      { id: 'CARD004', quantity: 4 },   // Energy Surge
      { id: 'CARD005', quantity: 4 },   // Adrenaline Rush
      { id: 'CARD006', quantity: 2 },   // Nanobot Repair
      { id: 'CARD007', quantity: 3 },   // Emergency Patch
      { id: 'CARD008', quantity: 3 },   // Shield Recharge
      { id: 'CARD009', quantity: 2 },   // Target Lock
      { id: 'CARD012', quantity: 3 },   // Armor-Piercing Shot
      { id: 'CARD016', quantity: 4 },   // Static Field
      { id: 'CARD018', quantity: 4 },   // Desperate Measures
    ]
  }, */

  // TIER 2 - MEDIUM THREAT (50-79% Detection)
/*   {
    name: 'Heavy Cruiser Defense Pattern',
    description: 'Aggressive with heavy firepower',
    difficulty: 'Medium',
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Cruiser.png',
    dronePool: [
      'Mammoth',
      'Mammoth',
      'Devastator',
      'Bastion',
      'Aegis',
      'Signal Beacon',       // Threat drone: +1 threat per round
      'Threat Transmitter'   // Threat drone: +2 threat on ship hull damage
    ],
    shipDeployment: {
      strategy: 'aggressive',
      placement: ['droneControlHub', 'powerCell', 'bridge'],
      reasoning: 'Aggressive forward positioning with heavy firepower'
    },
    decklist: [
      { id: 'CARD001', quantity: 4 },   // Laser Blast
      { id: 'CARD002', quantity: 3 },   // System Reboot
      { id: 'CARD003', quantity: 3 },   // Out Think
      { id: 'CARD004', quantity: 4 },   // Energy Surge
      { id: 'CARD005', quantity: 4 },   // Adrenaline Rush
      { id: 'CARD006', quantity: 3 },   // Nanobot Repair
      { id: 'CARD007', quantity: 2 },   // Emergency Patch
      { id: 'CARD008', quantity: 4 },   // Shield Recharge
      { id: 'CARD009', quantity: 3 },   // Target Lock
      { id: 'CARD012', quantity: 4 },   // Armor-Piercing Shot
      { id: 'CARD013', quantity: 2 },   // Sidewinder Missiles
      { id: 'CARD016', quantity: 4 },   // Static Field
    ]
  }, */

  {
    name: 'Specialized Hunter Group',
    description: 'Fast and aggressive interceptor',
    difficulty: 'Medium',
    reputationMultiplier: 1.0,  // Medium AI: 1.0x reputation
    modes: ['extraction'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Hunter.png',
    escapeDamage: { min: 2, max: 3 },  // Damage taken when escaping
    dronePool: [
      'Signal Beacon',  // Threat drone: +1 threat per round
      'Threat Transmitter',
      'Avenger',
      'Talon',
      'Mammoth'
    ],
    shipDeployment: {
      strategy: 'aggressive',
      placement: ['powerCell', 'bridge', 'droneControlHub'],
      reasoning: 'Speed-focused deployment for rapid strikes'
    },
    decklist: [
      { id: 'CARD001', quantity: 4 },   // Laser Blast
      { id: 'CARD002', quantity: 4 },   // System Reboot
      { id: 'CARD003', quantity: 3 },   // Out Think
      { id: 'CARD004', quantity: 3 },   // Energy Surge
      { id: 'CARD005', quantity: 4 },   // Adrenaline Rush
      { id: 'CARD006', quantity: 2 },   // Nanobot Repair
      { id: 'CARD007', quantity: 3 },   // Emergency Patch
      { id: 'CARD009', quantity: 4 },   // Target Lock
      { id: 'CARD012', quantity: 3 },   // Armor-Piercing Shot
      { id: 'CARD015', quantity: 4 },   // Streamline
      { id: 'CARD016', quantity: 3 },   // Static Field
      { id: 'CARD019', quantity: 3 },   // Reposition
    ]
  },

  // TIER 3 - HIGH THREAT (80-100% Detection)
  {
    name: 'Capital-Class Blockade Fleet',
    description: 'Overwhelming force, heavy defenses',
    difficulty: 'Hard',
    reputationMultiplier: 1.5,  // Hard AI: 1.5x reputation
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Blockade.png',
    escapeDamage: { min: 3, max: 5 },  // Damage taken when escaping
    dronePool: [
      'Firefly',
      'Mammoth',
      'Talon',
      'Devastator',
      'Dart',       // Threat drone: +1 threat per round

    ],
    shipDeployment: {
      strategy: 'defensive',
      placement: ['bridge', 'droneControlHub', 'powerCell'],
      reasoning: 'Heavy defensive positioning with overwhelming force'
    },
    decklist: [
      { id: 'CARD001', quantity: 4 },   // Laser Blast
      { id: 'CARD002', quantity: 4 },   // System Reboot
      { id: 'CARD003', quantity: 2 },   // Out Think
      { id: 'CARD004', quantity: 3 },   // Energy Surge
      { id: 'CARD005', quantity: 4 },   // Adrenaline Rush
      { id: 'CARD006', quantity: 4 },   // Nanobot Repair
      { id: 'CARD007', quantity: 3 },   // Emergency Patch
      { id: 'CARD008', quantity: 4 },   // Shield Recharge
      { id: 'CARD009', quantity: 3 },   // Target Lock
      { id: 'CARD012', quantity: 4 },   // Armor-Piercing Shot
      { id: 'CARD013', quantity: 2 },   // Sidewinder Missiles
      { id: 'CARD016', quantity: 3 },   // Static Field
    ]
  },

  // === BOSS ENCOUNTERS ===
  // Special permanent encounters on the hangar map
  {
    bossId: 'BOSS_T1_NEMESIS',
    name: 'Nemesis-Class Dreadnought',
    description: 'The infamous commander of the Eremos blockade. A formidable opponent with advanced combat protocols and overwhelming firepower.',
    difficulty: 'Hard',
    reputationMultiplier: 0,  // Boss uses boss reward system, not combat rep
    modes: ['boss'],  // Boss Mode - special permanent encounter
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Boss_Nemesis.png',
    dronePool: [
      'Mammoth',
      'Devastator',
      'Avenger',
      'Bastion',
      'Aegis'
    ],
    shipDeployment: {
      strategy: 'aggressive',
      placement: ['droneControlHub', 'bridge', 'powerCell'],
      reasoning: 'Boss-tier aggressive configuration with maximum threat'
    },
    decklist: [
      { id: 'CARD001_ENHANCED', quantity: 4 },   // Enhanced Laser Blast
      { id: 'CARD002_ENHANCED', quantity: 3 },   // Enhanced System Reboot
      { id: 'CARD004_ENHANCED', quantity: 4 },   // Enhanced Energy Surge
      { id: 'CARD006', quantity: 4 },            // Nanobot Repair
      { id: 'CARD007_ENHANCED', quantity: 4 },   // Enhanced Emergency Patch
      { id: 'CARD008', quantity: 4 },            // Shield Recharge
      { id: 'CARD009', quantity: 3 },            // Target Lock
      { id: 'CARD012_ENHANCED', quantity: 4 },   // Enhanced Armor-Piercing Shot
      { id: 'CARD013', quantity: 3 },            // Sidewinder Missiles
      { id: 'CARD016', quantity: 4 },            // Static Field
    ],
    // Boss-specific configuration
    bossConfig: {
      displayName: 'THE NEMESIS',
      subtitle: 'Commander of the Eremos Blockade',
      description: 'A legendary dreadnought that has claimed countless ships. Defeating it will prove your supremacy in the Shallows.',
      // Rewards for first-time victory
      firstTimeReward: {
        credits: 5000,
        aiCores: 3,
        reputation: 500,
        blueprintId: null  // Could add a unique blueprint reward here
      },
      // Rewards for repeat victories
      repeatReward: {
        credits: 1000,
        aiCores: 1,
        reputation: 100
      }
    }
  }

  // You can add more AI personalities here in the future
  // {
  //   name: 'Swarm Tactician',
  //   description: 'Overwhelms the enemy with numerous, low-cost drones.',
  //   dronePool: ['Locust', 'Dart', 'Talon', 'Harrier', 'Seraph'],
  //   shipDeployment: {
  //     strategy: 'defensive',
  //     placement: ['droneControlHub', 'powerCell', 'bridge'],
  //     reasoning: 'Places droneControlHub in outer for swarm deployment, powerCell in middle for energy bonus, bridge in outer for protection'
  //   },
  //   decklist: [
  //      { id: 'CARD002', quantity: 2 },
  //      { id: 'CARD008', quantity: 2 },
  //   ]
  // }
];

export default aiPersonalities;

