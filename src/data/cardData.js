const fullCardCollection = [
  {
    id: 'CARD001',
    baseCardId: 'CARD001',
    name: 'Laser Blast',
    maxInDeck: 4,
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/LaserBlast.png',
    description: 'Deal 2 damage to target drone. If target is marked, deal 3 damage instead.',
    visualEffect: {
      type: 'LASER_BLAST',
      duration: 600
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      markedBonus: 1
    },
   },

  {
    id: 'CARD001_ENHANCED',
    baseCardId: 'CARD001', // Links to the standard Laser Blast
    name: 'Laser Blast+',
    maxInDeck: 4,
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/LaserBlast.png',
    description: 'Deal 3 damage to any drone.',
    visualEffect: {
      type: 'LASER_BLAST',
      duration: 600
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3
    }
  },

    {
    id: 'CARD002',
    baseCardId: 'CARD002',
    name: 'System Reboot',
    maxInDeck: 4,
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/Reboot.png',
    description: 'Draw 2 cards from your deck. Go again.',
    // No targeting key is needed for this card
    effect: {
      type: 'DRAW',
      value: 2,
      goAgain: true
    }
  },
      {
    id: 'CARD002_ENHANCED',
    baseCardId: 'CARD002',
    name: 'System Reboot+',
    maxInDeck: 4,
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/Reboot.png',
    description: 'Draw 3 cards from your deck Go again.',
    // No targeting key is needed for this card
    effect: {
      type: 'DRAW',
      value: 3,
      goAgain: true
     }
  },
   {
    id: 'CARD003',
    baseCardId: 'CARD003',
    name: 'Out Think',
    maxInDeck: 4,
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/OutThink.png',
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
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/EnergySurge.png',
    description: 'Gain 2 Energy. Go again',
    // No targeting is needed for this effect
    effect: {
      type: 'GAIN_ENERGY',
      value: 2,
      goAgain: true
    }
  },
      {
    id: 'CARD004_ENHANCED',
    baseCardId: 'CARD004',
    name: 'Energy Surge+',
    maxInDeck: 4,
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/EnergySurge.png',
    description: 'Gain 3 Energy. Go again.',
    // No targeting is needed for this effect
    effect: {
      type: 'GAIN_ENERGY',
      value: 3,
      goAgain: true
    }
  },
    {
    id: 'CARD005',
    baseCardId: 'CARD005',
    name: 'Adrenaline Rush',
    maxInDeck: 4,
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/AdrenalineRush.png',
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
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/AdrenalineRush.png',
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
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/NanobotRepair.png',
    description: 'Restore 3 hull to a friendly drone. Cannot exceed its maximum hull. Go again.',
    targeting: {
      type: 'DRONE',
      affinity: 'FRIENDLY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'HEAL_HULL',
      value: 3,
      goAgain:  true
    }
  },
  {
    id: 'CARD007',
    baseCardId: 'CARD007',
    name: 'Emergency Patch',
    maxInDeck: 4,
    type: 'Support',
    cost: 3,
    image: '/DroneWars/cards/EmergencyPatch.png',
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
    type: 'Support',
    cost: 3,
    image: '/DroneWars/cards/EmergencyPatch.png',
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
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldRecharge.png',
    description: 'Restore 2 shield to all friendly drones in a target lane. Go again.',
    targeting: {
      type: 'LANE', // New targeting type
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_SHIELDS',
      value: 2,
      goAgain: true
    }
  },
  // Single-target destroy (requires marked)
  {
    id: 'CARD009',
    baseCardId: 'CARD009',
    name: 'Target Lock',
    maxInDeck: 2,
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/TargetLock.png',
    description: 'Destroy target marked enemy drone.',
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE',
      custom: ['MARKED']
    },
    effect: {
      type: 'DESTROY',
      scope: 'SINGLE'
    }
  },

  // Filtered-target destroy
  {
    id: 'CARD010',
    baseCardId: 'CARD010',
    name: 'Shrieker Missiles',
    maxInDeck: 2,
    type: 'Ordnance',
    cost: 5,
    image: '/DroneWars/cards/ShriekerMissiles.png',
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
    maxInDeck: 2,
    type: 'Ordnance',
    cost: 8, // Increased cost to reflect its power
    image: '/DroneWars/cards/Nuke.png',
    description: 'Destroy ALL drones in a selected lane (both sides).',
    visualEffect: {
      type: 'NUKE_BLAST',
      duration: 1200
    },
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
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/PiercingShot.png',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    visualEffect: {
      type: 'LASER_BLAST',
      duration: 800
    },
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
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/PiercingShot.png',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    visualEffect: {
      type: 'LASER_BLAST',
      duration: 800
    },
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
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/SidewinderMissiles.png',
    description: 'Deal 2 damage to all enemy drones with a speed of 3 or Less in a selected lane.',
    visualEffect: {
      type: 'ENERGY_WAVE',
      duration: 800
    },
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
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/Overcharge.png',
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
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/Streamline.png',
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
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StaticField.png',
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
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/Boosters.png',
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
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/DesperateMeasures.png',
    description: 'Draw 1 card and gain 1 Energy. Repeat this effect for each of your damaged or critical ship sections.',
    effect: {
      type: 'REPEATING_EFFECT',
      effects: [{ type: 'DRAW', value: 1 }, { type: 'GAIN_ENERGY', value: 1 }],
      condition: 'OWN_DAMAGED_SECTIONS',
      goAgain: true
    }
  },
    {
    id: 'CARD019',
    baseCardId: 'CARD019',
    name: 'Reposition',
    maxInDeck: 4,
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/Reposition.png',
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
    type: 'Upgrade',
    cost: 3,
    image: '/DroneWars/cards/SlimlineBodywork.png',
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
    image: '/DroneWars/cards/OverclockedThrusters.png',
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
// --- UPGRADE DESTRUCTION CARD (Tactic) ---
{
    id: 'CARD022',
    baseCardId: 'CARD022',
    name: 'System Sabotage',
    maxInDeck: 4,
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SystemSabotage.png',
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
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/Maneuver.png',
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
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/Maneuver.png',
    description: 'Move a friendly drone to an adjacent lane. The drone is not exhausted by this move. Go again.',
    effect: {
      type: 'SINGLE_MOVE',
      properties: ['DO_NOT_EXHAUST'],
      goAgain: true
    }
},
// --- NEW: UPGRADE CARDS ---
{
    id: 'CARD028',
    baseCardId: 'CARD028',
    name: 'Combat Enhancement',
    maxInDeck: 2,
    type: 'Upgrade',
    cost: 5,
    image: '/DroneWars/cards/CombatEnhancement.png',
    description: 'Permanently increase the attack of all drones of a target type by 1.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'attack', value: 1 }
    },
    maxApplications: 2
},
{
    id: 'CARD029',
    baseCardId: 'CARD029',
    name: 'Shield Amplifier',
    maxInDeck: 2,
    type: 'Upgrade',
    cost: 4,
    image: '/DroneWars/cards/ShieldAmplifier.png',
    description: 'Permanently increase the shields of all drones of a target type by 1.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'shields', value: 1 }
    },
    maxApplications: 2
},
{
    id: 'CARD024',
    baseCardId: 'CARD024',
    name: 'Piercing Rounds',
    maxInDeck: 1,
    type: 'Upgrade',
    cost: 6,
    image: '/DroneWars/cards/PiercingRounds.png',
    description: 'Permanently grant all drones of a target type the Piercing keyword.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: {
        stat: 'ability',
        abilityToAdd: {
          name: 'Piercing',
          type: 'PASSIVE',
          effect: { type: 'GRANT_KEYWORD', keyword: 'PIERCING' }
        }
      }
    },
    maxApplications: 1
},

{
    id: 'CARD025',
    baseCardId: 'CARD025',
    name: 'Strategic Planning',
    maxInDeck: 4,
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/StrategicPlanning.png',
    description: 'Look at the top 5 cards of your deck and draw 1. Shuffle your deck.',
    effect: {
        type: 'SEARCH_AND_DRAW',
        searchCount: 5,
        drawCount: 1,
        shuffleAfter: true
    }
},

// --- NEW: FILTERED SEARCH CARD ---
{
    id: 'CARD026',
    baseCardId: 'CARD026',
    name: 'Equipment Cache',
    maxInDeck: 4,
    type: 'Support',
    cost: 4,
    image: '/DroneWars/cards/EquipmentCache.png',
    description: 'Search your deck for an Upgrade card and add it to your hand. Shuffle your deck.',
    effect: {
        type: 'SEARCH_AND_DRAW',
        searchCount: 999, // Search entire deck
        drawCount: 1,
        shuffleAfter: true,
        filter: {
            type: 'Upgrade'
        }
    }
},

// --- NEW: COST-REDUCING UPGRADE CARD ---
{
    id: 'CARD027',
    baseCardId: 'CARD027',
    name: 'Efficiency Module',
    maxInDeck: 2,
    type: 'Upgrade',
    cost: 4,
    image: '/DroneWars/cards/EfficiencyModule.png',
    description: 'Permanently reduce the deployment cost of all drones of a target type by 1.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'cost', value: -1 }
    },
    maxApplications: 1
},

// --- NEW: TOKEN CREATION CARD ---
{
    id: 'CARD030',
    baseCardId: 'CARD030',
    name: 'Deploy Jammers',
    maxInDeck: 4,
    type: 'Tactic',
    cost: 5,
    image: '/DroneWars/cards/DeployJammers.png',
    description: 'Create a Jammer drone token in each of your lanes. (Jammer: 0/1, Speed 1. Opponent card effects can only target Jammer drones.)',
    effect: {
      type: 'CREATE_TOKENS',
      tokenName: 'Jammer',
      locations: ['lane1', 'lane2', 'lane3'],
      ignoresCPULimit: true
    }
},

// --- NEW: OVERFLOW ORDNANCE CARD ---
{
    id: 'CARD031',
    baseCardId: 'CARD031',
    name: 'Railgun Strike',
    maxInDeck: 2,
    type: 'Ordnance',
    cost: 5,
    image: '/DroneWars/cards/RailgunStrike.png',
    description: 'Deal 2 piercing damage to target drone. Excess damage overflows to the ship section in that lane. If target is marked, deal 4 piercing damage instead.',
    visualEffect: {
      type: 'OVERFLOW_PROJECTILE',
      duration: 1200
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'OVERFLOW_DAMAGE',
      baseDamage: 2,
      isPiercing: true,
      markedBonus: 2
    }
},

// --- NEW: SPLASH ORDNANCE CARD ---
{
    id: 'CARD032',
    baseCardId: 'CARD032',
    name: 'Barrage',
    maxInDeck: 4,
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/Barrage.png',
    description: 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash). If you control 3 or more drones in target lane, deal 2 damage instead.',
    visualEffect: {
      type: 'SPLASH_EFFECT',
      duration: 1000
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'SPLASH_DAMAGE',
      primaryDamage: 1,
      splashDamage: 1,
      conditional: {
        type: 'FRIENDLY_COUNT_IN_LANE',
        threshold: 3,
        bonusDamage: 1
      }
    }
},

// --- FINISHING VOLLEY (Destroy exhausted) ---
{
    id: 'CARD033',
    baseCardId: 'CARD033',
    name: 'Finishing Volley',
    maxInDeck: 4,
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FinishingVolley.png',
    description: 'Destroy target exhausted enemy drone.',
    visualEffect: {
      type: 'LASER_BLAST', // Placeholder - can be updated later
      duration: 600
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE',
      custom: ['EXHAUSTED']
    },
    effect: {
      type: 'DESTROY',
      scope: 'SINGLE'
    }
},

// --- STRAFE RUN (Lane-wide damage) ---
// TODO: Full multi-target UI support needed for original "up to 3 drones in different lanes" design
{
    id: 'CARD034',
    baseCardId: 'CARD034',
    name: 'Strafe Run',
    maxInDeck: 4,
    type: 'Ordnance',
    cost: 3,  // Reduced cost due to simplified effect
    image: '/DroneWars/cards/StrafeRun.png',
    description: 'Deal 1 damage to up to 3 enemy drones in target lane (front to back).',
    visualEffect: {
      type: 'LASER_BLAST', // Placeholder - can be updated later
      duration: 800
    },
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY'
    },
    effect: {
      type: 'DAMAGE',
      value: 1,
      scope: 'FILTERED',
      maxTargets: 3,
      filter: {
        stat: 'hull',
        comparison: 'GTE',
        value: 0  // Any drone (all have hull >= 0)
      }
    }
},

// --- OVERWHELMING FORCE (Scaling damage) ---
{
    id: 'CARD035',
    baseCardId: 'CARD035',
    name: 'Overwhelming Force',
    maxInDeck: 2,
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/OverwhelmingForce.png',
    description: 'Deal damage to target drone equal to the number of ready friendly drones in that lane.',
    visualEffect: {
      type: 'LASER_BLAST', // Placeholder - can be updated later
      duration: 600
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE_SCALING',
      source: 'READY_DRONES_IN_LANE'
    }
},

// --- PURGE PROTOCOL (Mass marked destroy) ---
{
    id: 'CARD036',
    baseCardId: 'CARD036',
    name: 'Purge Protocol',
    maxInDeck: 1,
    type: 'Ordnance',
    cost: 7,
    image: '/DroneWars/cards/PurgeProtocol.png',
    description: 'Destroy all marked enemy drones.',
    visualEffect: {
      type: 'NUKE_BLAST', // Placeholder - can be updated later
      duration: 1000
    },
    targeting: {
      type: 'ALL_MARKED',
      affinity: 'ENEMY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'ALL'
    }
}
];


export default fullCardCollection;