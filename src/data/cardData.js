const fullCardCollection = [
  {
    id: 'CARD001',
    baseCardId: 'CARD001',
    name: 'Laser Blast',
    maxInDeck: 4,
    type: 'Action',
    cost: 2,
    image: '/cards/LaserBlast.png',
    description: 'Deal 3 damage to any drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3
    },
   },

  {
    id: 'CARD001_ENHANCED',
    baseCardId: 'CARD001', // Links to the standard Laser Blast
    name: 'Laser Blast+',
    maxInDeck: 4,
    type: 'Action',
    cost: 2,
    image: '/cards/LaserBlast.png',
    description: 'Deal 4 damage to any drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 4
    }
  },

    {
    id: 'CARD002',
    baseCardId: 'CARD002',
    name: 'System Reboot',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/Reboot.png',
    description: 'Draw 2 cards from your deck.',
    // No targeting key is needed for this card
    effect: {
      type: 'DRAW',
      value: 2
    }
  },
      {
    id: 'CARD002_ENHANCED',
    baseCardId: 'CARD002',
    name: 'System Reboot+',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/Reboot.png',
    description: 'Draw 3 cards from your deck.',
    // No targeting key is needed for this card
    effect: {
      type: 'DRAW',
      value: 3
    }
  },
   {
    id: 'CARD003',
    baseCardId: 'CARD003',
    name: 'Out Think',
    maxInDeck: 4,
    type: 'Action',
    cost: 0,
    image: '/cards/OutThink.png',
    description: 'Draw 1 card.',
    // No targeting is needed
    effect: {
      type: 'DRAW',
      value: 1,
     }
  },
    {
    id: 'CARD004',
    baseCardId: 'CARD004',
    name: 'Energy Surge',
    maxInDeck: 4,
    type: 'Action',
    cost: 0,
    image: '/cards/EnergySurge.png',
    description: 'Gain 2 Energy.',
    // No targeting is needed for this effect
    effect: {
      type: 'GAIN_ENERGY',
      value: 2
    }
  },
      {
    id: 'CARD004_ENHANCED',
    baseCardId: 'CARD004',
    name: 'Energy Surge+',
    maxInDeck: 4,
    type: 'Action',
    cost: 0,
    image: '/cards/EnergySurge.png',
    description: 'Gain 3 Energy.',
    // No targeting is needed for this effect
    effect: {
      type: 'GAIN_ENERGY',
      value: 3
    }
  },
    {
    id: 'CARD005',
    baseCardId: 'CARD005',
    name: 'Adrenaline Rush',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/AdrenalineRush.png',
    description: 'Ready an exhausted friendly drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE',
      custom: ['EXHAUSTED'] 
    },
    effect: {
      type: 'READY_DRONE'
    }
  },
      {
    id: 'CARD005_ENHANCED',
    baseCardId: 'CARD005',
    name: 'Adrenaline Rush+',
    maxInDeck: 4,
    type: 'Action',
    cost: 2,
    image: '/cards/AdrenalineRush.png',
    description: 'Ready an exhausted friendly drone. Go again',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE',
      custom: ['EXHAUSTED'] 
    },
    effect: {
      type: 'READY_DRONE',
      goAgain: true
    }
  },
    {
    id: 'CARD006',
    baseCardId: 'CARD006',
    name: 'Nanobot Repair',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/NanobotRepair.png',
    description: 'Restore 3 hull to a friendly drone. Cannot exceed its maximum hull.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'HEAL_HULL', 
      value: 3
    }
  },
  {
    id: 'CARD007',
    baseCardId: 'CARD007',
    name: 'Emergency Patch',
    maxInDeck: 4,
    type: 'Action',
    cost: 3,
    image: '/cards/EmergencyPatch.png',
    description: 'Restore 4 hull to one of your ship sections.',
    targeting: {
      type: 'SHIP_SECTION',
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_HULL', 
      value: 4
    }
  },
    {
    id: 'CARD007_ENHANCED',
    baseCardId: 'CARD007',
    name: 'Emergency Patch+',
    maxInDeck: 4,
    type: 'Action',
    cost: 3,
    image: '/cards/EmergencyPatch.png',
    description: 'Restore 5 hull to one of your ship sections.',
    targeting: {
      type: 'SHIP_SECTION',
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_HULL', 
      value: 5
    }
  },
  {
    id: 'CARD008',
    baseCardId: 'CARD008',
    name: 'Shield Recharge',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/ShieldRecharge.png',
    description: 'Restore 1 shield to all friendly drones in a target lane.',
    targeting: {
      type: 'LANE', // New targeting type
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_SHIELDS',
      value: 1
    }
  },
  // Single-target destroy
  {
    id: 'CARD009',
    baseCardId: 'CARD009',
    name: 'Target Lock',
    maxInDeck: 4,
    type: 'Action',
    cost: 4, // High cost for a powerful effect
    image: '/cards/TargetLock.png',
    description: 'Destroy a single target drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DESTROY',
      scope: 'SINGLE' // Our new 'scope' for single targets
    }
  },

  // Filtered-target destroy
  {
    id: 'CARD010',
    baseCardId: 'CARD010',
    name: 'Shrieker Missiles',
    maxInDeck: 4,
    type: 'Action',
    cost: 4,
    image: '/cards/ShriekerMissiles.png',
    description: 'Destroy all enemy drones with a speed of 5 or higher in a selected lane.',
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY' // This card can only target enemy lanes
    },
    effect: {
      type: 'DESTROY',
      scope: 'FILTERED', // Our new 'scope' for conditional effects
      filter: { stat: 'speed', comparison: 'GTE', value: 5 }
    }
  },

  // NUKE card
  {
    id: 'CARD011',
    baseCardId: 'CARD011',
    name: 'Nuke',
    maxInDeck: 4,
    type: 'Action',
    cost: 7, // Increased cost to reflect its power
    image: '/cards/Nuke.png',
    description: 'Destroy ALL drones in a selected lane (both sides).',
    targeting: {
      type: 'LANE',
      affinity: 'ANY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'LANE' // This scope remains the same
    }
  },
// Piercing Attack Card
    {
    id: 'CARD012',
    baseCardId: 'CARD012',
    name: 'Piercing Shot',
    maxInDeck: 4,
    type: 'Action',
    cost: 3,
    image: '/cards/PiercingShot.png',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      damageType: 'PIERCING' // This new property defines the damage type
    }
  },
      {
    id: 'CARD012_ENHANCED',
    baseCardId: 'CARD012',
    name: 'Piercing Shot+',
    maxInDeck: 4,
    type: 'Action',
    cost: 2,
    image: '/cards/PiercingShot.png',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    targeting: {
      type: 'DRONE',
      affinity: 'ANY', 
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      damageType: 'PIERCING' // This new property defines the damage type
    }
  },

   {
    id: 'CARD013',
    baseCardId: 'CARD013',
    name: 'Sidewinder Missiles',
    maxInDeck: 4,
    type: 'Action',
    cost: 3,
    image: '/cards/SidewinderMissiles.png',
    description: 'Deal 2 damage to all enemy drones with a speed of 3 or Less in a selected lane.',
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY' // This card can only target enemy lanes
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      scope: 'FILTERED', // Our new 'scope' for conditional effects
       filter: { stat: 'speed', comparison: 'LTE', value: 3 }
    }
  },
   {
    id: 'CARD014',
    baseCardId: 'CARD014',
    name: 'Overcharge',
    maxInDeck: 4,
    type: 'Action',
    cost: 0,
    image: '/cards/Overcharge.png',
    description: 'Give a friendly drone +2 attack until the end of the turn.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'attack', value: 2, type: 'temporary' },
    }
  },
  {
    id: 'CARD015',
    baseCardId: 'CARD015',
    name: 'Streamline',
    maxInDeck: 4,
    type: 'Action',
    cost: 2,
    image: '/cards/Streamline.png',
    description: 'Give all friendly drones in a line a permanent +1 speed bonus. Go again.',
    targeting: {
      type: 'LANE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'speed', value: 1, type: 'permanent' },
      goAgain: true
    }
  },
  {
    id: 'CARD016',
    baseCardId: 'CARD016',
    name: 'Static Field',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/StaticField.png',
    description: 'Give an enemy drone -2 attack until the end of the turn. Go again.',
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'attack', value: -2, type: 'temporary' },
      goAgain: true
    }
  },
  {
    id: 'CARD017',
    baseCardId: 'CARD017',
    name: 'Boosters',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/Boosters.png',
    description: 'Give a friendly drone +2 speed until the end of the turn.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'speed', value: 2, type: 'temporary' },
    }
  },
  {
    id: 'CARD018',
    baseCardId: 'CARD018',
    name: 'Desperate Measures',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/DesperateMeasures.png',
    description: 'Draw 1 card and gain 1 Energy. Repeat this effect for each of your damaged or critical ship sections.',
    effect: {
      type: 'REPEATING_EFFECT',
      effects: [{ type: 'DRAW', value: 1 }, { type: 'GAIN_ENERGY', value: 1 }],
      condition: 'OWN_DAMAGED_SECTIONS'
    }
  },
    {
    id: 'CARD019',
    baseCardId: 'CARD019',
    name: 'Reposition',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/Reposition.png',
    description: 'Select a lane. Move up to 3 friendly drones from that lane to another. The moved drones are not exhausted.',
    effect: {
      type: 'MULTI_MOVE',
      count: 3,
      source: { location: 'SAME_LANE', affinity: 'FRIENDLY' },
      destination: { affinity: 'FRIENDLY' },
      properties: ['DO_NOT_EXHAUST']
    }
  },
  {
    id: 'CARD020',
    baseCardId: 'CARD020',
    name: 'Slimline Bodywork',
    maxInDeck: 2,
    type: 'Upgrade', // New card type
    cost: 3,
    image: '/cards/SlimlineBodywork.png',
    description: 'Permanently increase the deployment limit of a target drone type by 1. Go again.',
    targeting: {
      type: 'DRONE_CARD' // New targeting type for drone cards in your active pool
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'limit', value: 1 },
      goAgain: true
    },
    maxApplications: 1 // This upgrade can only be applied once per drone type
},
{
    id: 'CARD021',
    baseCardId: 'CARD021',
    name: 'Overclocked Thrusters',
    maxInDeck: 2,
    type: 'Upgrade',
    cost: 3,
    image: '/cards/OverclockedThrusters.png',
    description: 'Permanently grant all drones of a target type +1 Speed.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'speed', value: 1 },
    },
    maxApplications: 2 // This can be stacked twice on the same drone type
},
// --- NEW: UPGRADE DESTRUCTION CARD ---
{
    id: 'CARD022',
    baseCardId: 'CARD022',
    name: 'System Sabotage',
    maxInDeck: 3,
    type: 'Action',
    cost: 1,
    image: '/cards/SystemSabotage.png',
    description: 'Destroy a single applied Upgrade on an enemy drone type.',
    targeting: {
      type: 'APPLIED_UPGRADE', // New targeting for an active upgrade
      affinity: 'ENEMY'
    },
    effect: {
      type: 'DESTROY_UPGRADE'
    }
},

{
    id: 'CARD023',
    baseCardId: 'CARD023',
    name: 'Maneuver',
    maxInDeck: 4,
    type: 'Action',
    cost: 1,
    image: '/cards/Maneuver.png',
    description: 'Move a friendly drone to an adjacent lane. The drone is not exhausted by this move. Go again.',
    effect: {
      type: 'SINGLE_MOVE',
      properties: ['DO_NOT_EXHAUST'],
      goAgain: true
    }
},
{
    id: 'CARD023_ENHANCED',
    baseCardId: 'CARD023',
    name: 'Maneuver+',
    maxInDeck: 4,
    type: 'Action',
    cost: 0,
    image: '/cards/Maneuver.png',
    description: 'Move a friendly drone to an adjacent lane. The drone is not exhausted by this move. Go again.',
    effect: {
      type: 'SINGLE_MOVE',
      properties: ['DO_NOT_EXHAUST'],
      goAgain: true
    }
}
];


export default fullCardCollection;