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
    modes: ['vs'],  // VS Mode only
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Manticore.png',
    // The specific 5 drones this AI will use.
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

