const aiPersonalities = [
  {
    name: 'TEST AI',
    description: 'Used for test scenarios.',
    difficulty: 'Easy',
    modes: ['vs'],  // VS Mode only
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/TEST.png',
    // The specific 5 drones this AI will use.
    dronePool: [
      'Heavy Fighter',
      'Standard Fighter',
      'Kamikaze Drone',
      'Bomber',
      'Swarm Drone'
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
    modes: ['vs'],  // VS Mode only
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Manticore.png',
    // The specific 5 drones this AI will use.
    dronePool: [
      'Avenger Drone',
      'Bomber',
      'Heavy Fighter',
      'Kamikaze Drone',
      'Scout Drone',
      'Skirmisher Drone',
      'Swarm Drone',
      'Vindicator Drone',
      'Sabot Drone',
      'Standard Fighter'

    ],
    // Strategic ship section placement [lane0, lane1, lane2]
    shipDeployment: {
      strategy: 'balanced',
      placement: ['bridge', 'droneControlHub', 'powerCell'],
      reasoning: 'Places bridge in outer lane for durability, droneControlHub in middle for deployment bonus, powerCell in outer for resource safety'
    },
    // The specific cards and quantities for this AI's deck.
    decklist: [
      { id: 'CARD001_ENHANCED', quantity: 4 },
      { id: 'CARD011', quantity: 1 },
      { id: 'CARD012_ENHANCED', quantity: 2 },
      { id: 'CARD010', quantity: 2 },
      { id: 'CARD013', quantity: 1 },
      { id: 'CARD030', quantity: 2 },
      { id: 'CARD014', quantity: 2 },
      { id: 'CARD016', quantity: 2 },
      { id: 'CARD018', quantity: 2 },
      { id: 'CARD015_ENHANCED', quantity: 2 },
      { id: 'CARD023_ENHANCED', quantity: 2 },
      { id: 'CARD007_ENHANCED', quantity: 4 },
      { id: 'CARD004_ENHANCED', quantity: 3 },
      { id: 'CARD002_ENHANCED', quantity: 3 } ,
    ]
  },

  // === EXTRACTION MODE AIs ===
  // TIER 1 - LOW THREAT (0-49% Detection)
  {
    name: 'Rogue Scout Pattern',
    description: 'Defensive scout with minimal aggression',
    difficulty: 'Easy',
    modes: ['extraction'],  // Extraction Mode only
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Scout.png',
    escapeDamage: { min: 1, max: 3 },  // Easy AI: low escape damage
    dronePool: [
      'Swarm Drone',
      'Scout Drone',
      'Standard Fighter',
      'Interceptor',
      'Scanner'
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
      { id: 'CARD017', quantity: 4 },   // Boosters
      { id: 'CARD008', quantity: 3 },   // Shield Recharge
      { id: 'CARD009', quantity: 2 },   // Target Lock
      { id: 'CARD015', quantity: 3 },   // Streamline
      { id: 'CARD016', quantity: 4 },   // Static Field
      { id: 'CARD018', quantity: 4 },   // Desperate Measures
      { id: 'CARD019', quantity: 2 },   // Reposition
    ]
  },

  {
    name: 'Automated Patrol Unit',
    description: 'Balanced combat AI',
    difficulty: 'Easy',
    modes: ['extraction'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Patrol.png',
    escapeDamage: { min: 1, max: 3 },  // Easy AI: low escape damage
    dronePool: [
      'Scout Drone',
      'Standard Fighter',
      'Heavy Fighter',
      'Kamikaze Drone',
      'Interceptor'
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
      { id: 'CARD014', quantity: 3 },   // Overcharge
      { id: 'CARD008', quantity: 3 },   // Shield Recharge
      { id: 'CARD009', quantity: 2 },   // Target Lock
      { id: 'CARD012', quantity: 3 },   // Armor-Piercing Shot
      { id: 'CARD016', quantity: 4 },   // Static Field
      { id: 'CARD018', quantity: 4 },   // Desperate Measures
    ]
  },

  // TIER 2 - MEDIUM THREAT (50-79% Detection)
  {
    name: 'Heavy Cruiser Defense Pattern',
    description: 'Aggressive with heavy firepower',
    difficulty: 'Medium',
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Cruiser.png',
    escapeDamage: { min: 2, max: 4 },  // Medium AI: moderate escape damage
    dronePool: [
      'Swarm Drone',
      'Heavy Fighter',
      'Bomber',
      'Guardian Drone',
      'Aegis Drone'
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
  },

  {
    name: 'Specialized Hunter Group',
    description: 'Fast and aggressive interceptor',
    difficulty: 'Medium',
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Hunter.png',
    escapeDamage: { min: 2, max: 4 },  // Medium AI: moderate escape damage
    dronePool: [
      'Kamikaze Drone',
      'Interceptor',
      'Standard Fighter',
      'Bomber',
      'Swarm Drone'
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
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Blockade.png',
    escapeDamage: { min: 3, max: 5 },  // Hard AI: high escape damage
    dronePool: [
      'Heavy Fighter',
      'Bomber',
      'Skirmisher Drone',
      'Aegis Drone',
      'Guardian Drone'
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

  // You can add more AI personalities here in the future
  // {
  //   name: 'Swarm Tactician',
  //   description: 'Overwhelms the enemy with numerous, low-cost drones.',
  //   dronePool: ['Swarm Drone', 'Scout Drone', 'Standard Fighter', 'Interceptor', 'Repair Drone'],
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

