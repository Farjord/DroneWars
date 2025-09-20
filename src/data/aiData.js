const aiPersonalities = [
  {
    name: 'Annihilator Alpha',
    description: 'Focuses on overwhelming firepower and direct destruction.',
    // The specific 5 drones this AI will use.
    dronePool: [
      'Heavy Fighter', 
      'Standard Fighter', 
      'Kamikaze Drone', 
      'Bomber', 
      'Swarm Drone'
    ],
    // The specific cards and quantities for this AI's deck.
    decklist: [
    { id: 'CARD001', quantity: 0 },
    { id: 'CARD002', quantity: 0 },
    { id: 'CARD003', quantity: 0 },
    { id: 'CARD004', quantity: 0 },
    { id: 'CARD005', quantity: 0 },
    { id: 'CARD006', quantity: 0 },
    { id: 'CARD007', quantity: 0 },
    { id: 'CARD008', quantity: 0 },
    { id: 'CARD009', quantity: 20 },
    { id: 'CARD010', quantity: 0 },
    { id: 'CARD011', quantity: 0 },
    { id: 'CARD012', quantity: 0 },
    { id: 'CARD013', quantity: 0 },
    { id: 'CARD014', quantity: 0 },
    { id: 'CARD015', quantity: 0 }, 
    { id: 'CARD016', quantity: 0 }, 
    { id: 'CARD017', quantity: 0 }, 
    { id: 'CARD018', quantity: 0 }, 
    { id: 'CARD019', quantity: 2 },
    ]
  },
  {
    name: 'The Schiazami Syndicate',
    description: 'Focuses on overwhelming firepower and direct damage to drones and ship sections.',
    // The specific 5 drones this AI will use.
    dronePool: [
      'Heavy Fighter', 
      'Standard Fighter', 
      'Kamikaze Drone', 
      'Bomber', 
      'Avenger Drone'
    ],
    // The specific cards and quantities for this AI's deck.
    decklist: [
      // High-Power Removal (Limited Copies)
      { id: 'CARD011', quantity: 1 }, // Nuke
      { id: 'CARD009', quantity: 2 }, // Target Lock
      { id: 'CARD010', quantity: 2 }, // Shrieker Missiles
      
      // Core Damage & Buffs (Multiple Copies)
      { id: 'CARD001_ENHANCED', quantity: 4 }, // Laser Blast
      { id: 'CARD012_ENHANCED', quantity: 4 }, // Armor-Piercing Shot
      { id: 'CARD013', quantity: 4 }, // Sidewinder Missiles
      { id: 'CARD014', quantity: 4 }, // Overcharge
      { id: 'CARD017', quantity: 3 }, // Boosters
      { id: 'CARD016', quantity: 3 }, // Static Field
      { id: 'CARD005_ENHANCED', quantity: 2 }, // Adrenaline Rush
      
      // Resource & Consistency (Max Copies)
      { id: 'CARD004_ENHANCED', quantity: 2 }, // Energy Surge
      { id: 'CARD003', quantity: 2 }, // Out Think
      { id: 'CARD002_ENHANCED', quantity: 3 }, // System Reboot
      { id: 'CARD018', quantity: 4 }, // Desperate Measures
    ]
  },

  // You can add more AI personalities here in the future
  // {
  //   name: 'Swarm Tactician',
  //   description: 'Overwhelms the enemy with numerous, low-cost drones.',
  //   dronePool: ['Swarm Drone', 'Scout Drone', 'Standard Fighter', 'Interceptor', 'Repair Drone'],
  //   decklist: [
  //      { id: 'CARD002', quantity: 2 },
  //      { id: 'CARD008', quantity: 2 },
  //   ]
  // }
];

export default aiPersonalities;
