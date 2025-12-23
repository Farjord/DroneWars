/**
 * Rarity color constants for UI display
 */
export const RARITY_COLORS = {
  Common: '#808080',     // Grey
  Uncommon: '#22c55e',   // Green
  Rare: '#3b82f6',       // Blue
  Mythic: '#a855f7'      // Purple
};

const fullCardCollection = [
  {
    id: 'CARD001',
    baseCardId: 'CARD001',
    name: 'Laser Blast',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/LaserBlast.png',
    description: 'Deal 2 damage to target drone. If target is marked, deal 3 damage instead.',
    visualEffect: {
      type: 'LASER_BLAST'
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
    baseCardId: 'CARD001',
    name: 'Laser Blast+',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/LaserBlast.png',
    description: 'Deal 2 damage to target drone. If target is marked, deal 4 damage instead.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      markedBonus: 2
    }
  },

    {
    id: 'CARD002',
    baseCardId: 'CARD002',
    name: 'System Reboot',
    maxInDeck: 4,
    rarity: 'Common',
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
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/Reboot.png',
    description: 'Draw 3 cards from your deck. Go again.',
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
    rarity: 'Common',
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
    rarity: 'Common',
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
    rarity: 'Uncommon',
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
    rarity: 'Common',
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
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/AdrenalineRush.png',
    description: 'Ready an exhausted friendly drone. Go again.',
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
    rarity: 'Common',
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
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/EmergencyPatch.png',
    description: 'Restore 1 hull to one of your ship sections.',
    targeting: {
      type: 'SHIP_SECTION',
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'HEAL_HULL',
      value: 1
    }
  },
    {
    id: 'CARD007_ENHANCED',
    baseCardId: 'CARD007',
    name: 'Emergency Patch+',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 4,
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
    id: 'CARD008',
    baseCardId: 'CARD008',
    name: 'Shield Recharge',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldRecharge.png',
    description: 'Restore 2 shield to all friendly drones in a target lane. Go again.',
    targeting: {
      type: 'LANE',
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
    maxInDeck: 4,
    rarity: 'Common',
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

  {
    id: 'CARD010',
    baseCardId: 'CARD010',
    name: 'Shrieker Missiles',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 5,
    image: '/DroneWars/cards/ShriekerMissiles.png',
    description: 'Destroy all enemy drones with a speed of 5 or higher in a selected lane.',
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'FILTERED',
      filter: { stat: 'speed', comparison: 'GTE', value: 5 }
    }
  },

  {
    id: 'CARD011',
    baseCardId: 'CARD011',
    name: 'Nuke',
    maxInDeck: 2,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 8,
    image: '/DroneWars/cards/Nuke.png',
    description: 'Destroy ALL drones in a selected lane (both sides).',
    visualEffect: {
      type: 'NUKE_BLAST'
    },
    targeting: {
      type: 'LANE',
      affinity: 'ANY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'LANE'
    }
  },

    {
    id: 'CARD012',
    baseCardId: 'CARD012',
    name: 'Piercing Shot',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/PiercingShot.png',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      damageType: 'PIERCING'
    }
  },
      {
    id: 'CARD012_ENHANCED',
    baseCardId: 'CARD012',
    name: 'Piercing Shot+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/PiercingShot.png',
    description: 'Deal 2 piercing damage to any drone. (Piercing damage ignores shields).',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      damageType: 'PIERCING'
    }
  },

   {
    id: 'CARD013',
    baseCardId: 'CARD013',
    name: 'Sidewinder Missiles',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/SidewinderMissiles.png',
    description: 'Deal 2 damage to all enemy drones with a speed of 4 or Less in a selected lane.',
    visualEffect: {
      type: 'ENERGY_WAVE'
    },
    targeting: {
      type: 'LANE',
      affinity: 'ENEMY'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
      scope: 'FILTERED', 
       filter: { stat: 'speed', comparison: 'LTE', value: 4 }
    }
  },
   {
    id: 'CARD014',
    baseCardId: 'CARD014',
    name: 'Overcharge',
    maxInDeck: 4,
    rarity: 'Common',
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
    rarity: 'Uncommon',
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
    rarity: 'Common',
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
    rarity: 'Common',
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
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/DesperateMeasures.png',
    description: 'Draw 1 card and gain 1 Energy. Repeat this effect for each of your damaged or critical ship sections. Go again.',
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
    rarity: 'Common',
    type: 'Tactic',
    cost: 4,
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
    rarity: 'Common',
    type: 'Upgrade',
    cost: 3,
    slots: 1,
    image: '/DroneWars/cards/SlimlineBodywork.png',
    description: 'Permanently increase the deployment limit of a target drone type by 1.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'limit', value: 1 },
    },
    maxApplications: 1
},
  {
    id: 'CARD020_ENHANCED',
    baseCardId: 'CARD020',
    name: 'Slimline Bodywork+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 3,
    slots: 1,
    image: '/DroneWars/cards/SlimlineBodywork.png',
    description: 'Permanently increase the deployment limit of a target drone type by 1. Go again.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'limit', value: 1 },
      goAgain: true
    },
    maxApplications: 1
},
{
    id: 'CARD021',
    baseCardId: 'CARD021',
    name: 'Overclocked Thrusters',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Upgrade',
    cost: 3,
    slots: 2,
    image: '/DroneWars/cards/OverclockedThrusters.png',
    description: 'Permanently grant all drones of a target type +1 Speed.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'speed', value: 1 },
    },
    maxApplications: 2
},
{
    id: 'CARD021_ENHANCED',
    baseCardId: 'CARD021',
    name: 'Overclocked Thrusters+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 3,
    slots: 1,
    image: '/DroneWars/cards/OverclockedThrusters.png',
    description: 'Permanently grant all drones of a target type +1 Speed.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'speed', value: 1 },
    },
    maxApplications: 2
},
{
    id: 'CARD022',
    baseCardId: 'CARD022',
    name: 'System Sabotage',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SystemSabotage.png',
    description: 'Destroy a single applied Upgrade on an enemy drone type.',
    targeting: {
      type: 'APPLIED_UPGRADE', 
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
    rarity: 'Common',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/Maneuver.png',
    description: 'Move a friendly drone to an adjacent lane. The drone is not exhausted by this move.',
    effect: {
      type: 'SINGLE_MOVE',
      properties: ['DO_NOT_EXHAUST'],
    }
},
{
    id: 'CARD023_ENHANCED',
    baseCardId: 'CARD023',
    name: 'Maneuver+',
    maxInDeck: 4,
    rarity: 'Uncommon',
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
// ========================================
// MOVEMENT CARDS WITH CONDITIONALS
// ========================================
{
    id: 'CARD060',
    baseCardId: 'CARD060',
    name: 'Swift Maneuver',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SwiftManeuver.png',
    description: 'Move a friendly drone to an adjacent lane. If its speed is 5 or higher, go again.',
    effect: {
      type: 'SINGLE_MOVE'
    },
    conditionalEffects: [{
      id: 'fast-goagain',
      timing: 'POST',
      condition: { type: 'TARGET_STAT_GTE', stat: 'speed', value: 5 },
      grantedEffect: { type: 'GO_AGAIN' }
    }]
},
{
    id: 'CARD061',
    baseCardId: 'CARD061',
    name: 'Tactical Shift',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/TacticalShift.png',
    description: 'Move a friendly drone to an adjacent lane without exhausting it. If the opponent has more drones in that lane, draw a card.',
    effect: {
      type: 'SINGLE_MOVE',
      properties: ['DO_NOT_EXHAUST']
    },
    conditionalEffects: [{
      id: 'contested-draw',
      timing: 'POST',
      condition: { type: 'OPPONENT_HAS_MORE_IN_LANE', lane: 'DESTINATION', count: 'TOTAL' },
      grantedEffect: { type: 'DRAW', value: 1 }
    }]
},
{
    id: 'CARD062',
    baseCardId: 'CARD062',
    name: 'Assault Reposition',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/AssaultReposition.png',
    description: 'Move a friendly drone to an adjacent lane. If its attack is less than 4, give it +1 attack.',
    effect: {
      type: 'SINGLE_MOVE'
    },
    conditionalEffects: [{
      id: 'attack-buff',
      timing: 'POST',
      condition: { type: 'TARGET_STAT_LTE', stat: 'attack', value: 3 },
      grantedEffect: { type: 'MODIFY_STAT', stat: 'attack', value: 1 }
    }]
},
{
    id: 'CARD063',
    baseCardId: 'CARD063',
    name: 'Follow-Up Strike',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FollowUpStrike.png',
    description: 'Deal 2 damage to target drone. If this is not your first action this turn, deal 4 instead.',
    targeting: {
      type: 'DRONE',
      team: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2
    },
    conditionalEffects: [{
      id: 'momentum-bonus',
      timing: 'PRE',
      condition: { type: 'NOT_FIRST_ACTION' },
      grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
    }]
},
{
    id: 'CARD028',
    baseCardId: 'CARD028',
    name: 'Combat Enhancement',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Upgrade',
    cost: 5,
    slots: 2,
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
    id: 'CARD028_ENHANCED',
    baseCardId: 'CARD028',
    name: 'Combat Enhancement+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 5,
    slots: 1,
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
    rarity: 'Common',
    type: 'Upgrade',
    cost: 2,
    slots: 1,
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
    id: 'CARD029_ENHANCED',
    baseCardId: 'CARD029',
    name: 'Shield Amplifier+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 3,
    slots: 1,
    image: '/DroneWars/cards/ShieldAmplifier.png',
    description: 'Permanently increase the shields of all drones of a target type by 2.',
    targeting: {
      type: 'DRONE_CARD'
    },
    effect: {
      type: 'MODIFY_DRONE_BASE',
      mod: { stat: 'shields', value: 2 }
    },
    maxApplications: 2
},
{
    id: 'CARD024',
    baseCardId: 'CARD024',
    name: 'Piercing Rounds',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Upgrade',
    cost: 6,
    slots: 2,
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
    rarity: 'Common',
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

{
    id: 'CARD026',
    baseCardId: 'CARD026',
    name: 'Equipment Cache',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 4,
    image: '/DroneWars/cards/EquipmentCache.png',
    description: 'Search your deck for an Upgrade card and add it to your hand. Shuffle your deck.',
    effect: {
        type: 'SEARCH_AND_DRAW',
        searchCount: 999, 
        drawCount: 1,
        shuffleAfter: true,
        filter: {
            type: 'Upgrade'
        }
    }
},


{
    id: 'CARD027',
    baseCardId: 'CARD027',
    name: 'Efficiency Module',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 4,
    slots: 1,
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

{
    id: 'CARD030',
    baseCardId: 'CARD030',
    name: 'Deploy Jammers',
    maxInDeck: 2,
    rarity: 'Uncommon',
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

{
    id: 'CARD031',
    baseCardId: 'CARD031',
    name: 'Railgun Strike',
    maxInDeck: 2,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 5,
    image: '/DroneWars/cards/RailgunStrike.png',
    description: 'Deal 2 piercing damage to target drone. Excess damage overflows to the ship section in that lane. If target is marked, deal 4 piercing damage instead.',
    visualEffect: {
      type: 'RAILGUN_ANIMATION'
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

{
    id: 'CARD032',
    baseCardId: 'CARD032',
    name: 'Barrage',
    maxInDeck: 2,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/Barrage.png',
    description: 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash). If you control 3 or more drones in target lane, deal 2 damage instead.',
    visualEffect: {
      type: 'SPLASH_EFFECT'
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

{
    id: 'CARD033',
    baseCardId: 'CARD033',
    name: 'Finishing Volley',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FinishingVolley.png',
    description: 'Destroy target exhausted enemy drone.',
    visualEffect: {
      type: 'LASER_BLAST'
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

{
    id: 'CARD034',
    baseCardId: 'CARD034',
    name: 'Strafe Run',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/StrafeRun.png',
    description: 'Deal 1 damage to up to 3 enemy drones in target lane (front to back).',
    visualEffect: {
      type: 'LASER_BLAST' 
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
        value: 0 
      }
    }
},

{
    id: 'CARD035',
    baseCardId: 'CARD035',
    name: 'Overwhelming Force',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/OverwhelmingForce.png',
    description: 'Deal damage to target drone equal to the number of ready friendly drones in that lane.',
    visualEffect: {
      type: 'LASER_BLAST' 
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

{
    id: 'CARD036',
    baseCardId: 'CARD036',
    name: 'Purge Protocol',
    maxInDeck: 1,
    rarity: 'Mythic',
    type: 'Ordnance',
    cost: 7,
    image: '/DroneWars/cards/PurgeProtocol.png',
    description: 'Destroy all marked enemy drones.',
    visualEffect: {
      type: 'NUKE_BLAST'
    },
    targeting: {
      type: 'ALL_MARKED',
      affinity: 'ENEMY'
    },
    effect: {
      type: 'DESTROY',
      scope: 'ALL'
    }
},

{
    id: 'CARD037',
    baseCardId: 'CARD037',
    name: 'Shield Boost',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldBoost.png',
    description: 'Restore up to 2 shields to a friendly ship section.',
    targeting: {
      type: 'SHIP_SECTION',
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'RESTORE_SECTION_SHIELDS',
      value: 2
    }
},
{
    id: 'CARD037_ENHANCED',
    baseCardId: 'CARD037',
    name: 'Shield Boost+',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldBoost.png',
    description: 'Restore up to 2 shields to a friendly ship section. Go again.',
    targeting: {
      type: 'SHIP_SECTION',
      affinity: 'FRIENDLY'
    },
    effect: {
      type: 'RESTORE_SECTION_SHIELDS',
      value: 2,
      goAgain: true
    }
},

  {
    id: 'CARD038',
    baseCardId: 'CARD038',
    name: 'Particle Whip',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 1,
    image: '/DroneWars/cards/ParticleWhip.png',
    description: 'Deal 1 damage to target drone. Go Again.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 1,
      goAgain: true
    },
  },
    {
    id: 'CARD039',
    baseCardId: 'CARD039',
    name: 'Thermal Lance',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/ThermalLance.png',
    description: 'Deal 2 damage to target drone.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2,
    },
   },
    {
    id: 'CARD039_ENHANCED',
    baseCardId: 'CARD039',
    name: 'Thermal Lance+',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/ThermalLance.png',
    description: 'Deal 3 damage to target drone.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ANY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3,
    },
   },

  // ========================================
  // CONDITIONAL EFFECT CARDS
  // ========================================
  // Cards demonstrating the modular conditional effects system

  // POST timing: Draw on Destroy
  {
    id: 'CARD050',
    baseCardId: 'CARD050',
    name: 'Scavenger Shot',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/ScavengerShot.png',
    description: 'Deal 2 damage to target drone. If it is destroyed, draw a card.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2
    },
    conditionalEffects: [{
      id: 'draw-on-destroy',
      timing: 'POST',
      condition: { type: 'ON_DESTROY' },
      grantedEffect: { type: 'DRAW', value: 1 }
    }]
  },

  // PRE timing: Bonus Damage on Low Hull
  {
    id: 'CARD051',
    baseCardId: 'CARD051',
    name: 'Finishing Blow',
    maxInDeck: 4,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/FinishingBlow.png',
    description: 'Deal 2 damage to target drone. If its hull is 2 or less, deal 4 damage instead.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2
    },
    conditionalEffects: [{
      id: 'execute-bonus',
      timing: 'PRE',
      condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
      grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
    }]
  },

  // Multiple Conditionals: PRE and POST
  {
    id: 'CARD052',
    baseCardId: 'CARD052',
    name: 'Opportunist Strike',
    maxInDeck: 4,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/OpportunistStrike.png',
    description: 'Deal 2 damage. +2 if target is marked. If destroyed, gain 2 energy and go again.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 2
    },
    conditionalEffects: [
      {
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
      },
      {
        id: 'energy-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
      },
      {
        id: 'goagain-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'GO_AGAIN' }
      }
    ]
  },

  // Conditional Destroy
  {
    id: 'CARD053',
    baseCardId: 'CARD053',
    name: 'Executioner',
    maxInDeck: 4,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/Executioner.png',
    description: 'Destroy target enemy drone if its current hull is less than 2.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 0
    },
    conditionalEffects: [{
      id: 'execute-weak',
      timing: 'PRE',
      condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
      grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
    }]
  },

  {
    id: 'CARD054',
    baseCardId: 'CARD054',
    name: 'Energy Leech',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/EnergyLeech.png',
    description: 'Deal 1 damage to target drone. If hull damage is dealt, gain 3 energy.',
    visualEffect: {
      type: 'LASER_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 1
    },
    conditionalEffects: [{
      id: 'energy-on-hull-damage',
      timing: 'POST',
      condition: { type: 'ON_HULL_DAMAGE' },
      grantedEffect: { type: 'GAIN_ENERGY', value: 3 }
    }]
  },

  {
    id: 'CARD_SB01',
    baseCardId: 'CARD_SB01',
    name: 'EMP Surge',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/EMPSurge.png',
    description: 'Deal 3 shield-breaker damage to target drone. Each point removes 2 shields, then remaining damage hits hull.',
    visualEffect: {
      type: 'EMP_BLAST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3,
      damageType: 'SHIELD_BREAKER'
    }
  },

  {
    id: 'CARD_ION01',
    baseCardId: 'CARD_ION01',
    name: 'Ion Pulse',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/IonPulse.png',
    description: 'Deal 3 ion damage to target drone. Ion damage only affects shields.',
    visualEffect: {
      type: 'ION_BURST'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3,
      damageType: 'ION'
    }
  },

  {
    id: 'CARD_KIN01',
    baseCardId: 'CARD_KIN01',
    name: 'Kinetic Slug',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/KineticSlug.png',
    description: 'Deal 3 kinetic damage to target drone. Kinetic damage only affects hull; blocked by any shields.',
    visualEffect: {
      type: 'KINETIC_IMPACT'
    },
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: 'ANY_LANE'
    },
    effect: {
      type: 'DAMAGE',
      value: 3,
      damageType: 'KINETIC'
    }
  }
];


export default fullCardCollection;