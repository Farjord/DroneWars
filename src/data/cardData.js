import { enrichCardsWithEffects } from '../logic/cards/effectsAdapter';

const fullCardCollection = [

  // --- Ordnance Cards ---

  {
    id: 'CARD_ION01',
    baseCardId: 'CARD_ION01',
    name: 'Ion Pulse',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 1,
    image: '/DroneWars/cards/IonPulse.png',
    description: 'Deal 3 ion damage to target drone. Ion damage only affects shields.',
    visualEffect: { type: 'ION_BURST' },
    effects: [
      { type: 'DAMAGE', value: 3, damageType: 'ION', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_KIN01',
    baseCardId: 'CARD_KIN01',
    name: 'Kinetic Slug',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/KineticSlug.png',
    description: 'Deal 3 kinetic damage to target drone. (Kinetic damage only affects hull. It is blocked by shields.)',
    visualEffect: { type: 'KINETIC_IMPACT' },
    effects: [
      { type: 'DAMAGE', value: 3, damageType: 'KINETIC', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_SB01',
    baseCardId: 'CARD_SB01',
    name: 'Nullwave Cannon',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/EMPSurge.png',
    description: 'Deal 3 shield-breaker damage to target drone. (Deals double damage to shields.)',
    visualEffect: { type: 'EMP_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 3, damageType: 'SHIELD_BREAKER', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD001',
    baseCardId: 'CARD001',
    name: 'Convergence Beam',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/LaserBlast.png',
    description: 'Deal 2 damage to target drone. If target is marked, deal 4 damage instead.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, markedBonus: 2, targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD001_ENHANCED',
    baseCardId: 'CARD001',
    name: 'Convergence Beam+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/LaserBlast.png',
    description: 'Deal 2 damage to target drone. If target is marked, deal 4 damage instead.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, markedBonus: 2, targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD009',
    baseCardId: 'CARD009',
    name: 'Target Lock',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/TargetLock.png',
    description: 'Destroy target marked enemy drone.',
    effects: [
      { type: 'DESTROY', scope: 'SINGLE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: ['MARKED'], } },
    ],


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
    effects: [
      { type: 'DESTROY', targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }] } },
    ],


  },
  {
    id: 'CARD010_ENHANCED',
    baseCardId: 'CARD010',
    name: 'Shrieker Missiles+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/ShriekerMissiles.png',
    description: 'Destroy all enemy drones with a speed of 5 or higher in a selected lane.',
    effects: [
      { type: 'DESTROY', targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }] } },
    ],


  },
  {
    id: 'CARD011',
    baseCardId: 'CARD011',
    name: 'Nuke',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 8,
    image: '/DroneWars/cards/Nuke.png',
    description: 'Destroy ALL drones in a selected lane (both sides).',
    visualEffect: { type: 'NUKE_BLAST' },
    effects: [
      { type: 'DESTROY', scope: 'LANE', targeting: { type: 'LANE', affinity: 'ANY' } },
    ],


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
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, damageType: 'PIERCING', targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


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
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, damageType: 'PIERCING', targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


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
    visualEffect: { type: 'ENERGY_WAVE' },
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 4 }]
        },
      },
    ],


  },
  {
    id: 'CARD031',
    baseCardId: 'CARD031',
    name: 'Railgun Strike',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 5,
    image: '/DroneWars/cards/RailgunStrike.png',
    description: 'Deal 2 piercing damage to target drone. Excess damage overflows to the ship section in that lane. If target is marked, deal 4 piercing damage instead.',
    visualEffect: { type: 'RAILGUN_ANIMATION' },
    effects: [
      {
        type: 'OVERFLOW_DAMAGE',
        baseDamage: 2,
        isPiercing: true,
        markedBonus: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD032',
    baseCardId: 'CARD032',
    name: 'Barrage',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/Barrage.png',
    description: 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash).',
    visualEffect: { type: 'SPLASH_EFFECT' },
    effects: [
      { type: 'SPLASH_DAMAGE', primaryDamage: 1, splashDamage: 1, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD032_ENHANCED',
    baseCardId: 'CARD032',
    name: 'Barrage+',
    maxInDeck: 2,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/Barrage.png',
    description: 'Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash). If you control 3 or more drones in target lane, deal 2 damage instead.',
    visualEffect: { type: 'SPLASH_EFFECT' },
    effects: [
      {
        type: 'SPLASH_DAMAGE',
        primaryDamage: 1,
        splashDamage: 1,
        conditional: { type: 'FRIENDLY_COUNT_IN_LANE', threshold: 3, bonusDamage: 1 },
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD033',
    baseCardId: 'CARD033',
    name: 'Finishing Volley',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FinishingVolley.png',
    description: 'Deal 4 damage to target exhausted enemy drone.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 4, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: ['EXHAUSTED'], } },
    ],


  },
  {
    id: 'CARD033_ENHANCED',
    baseCardId: 'CARD033',
    name: 'Finishing Volley+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FinishingVolley.png',
    description: 'Deal 5 damage to target exhausted enemy drone.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 5, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: ['EXHAUSTED'], } },
    ],


  },
  {
    id: 'CARD034',
    baseCardId: 'CARD034',
    name: 'Strafing Run',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/StrafeRun.png',
    description: 'Deal 1 damage to the first 3 enemy drones in target lane (left to right).',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      {
        type: 'DAMAGE',
        value: 1,
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          affectedFilter: [{ stat: 'hull', comparison: 'GTE', value: 0 }],
          maxTargets: 3
        },
      },
    ],


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
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE_SCALING', source: 'READY_DRONES_IN_LANE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


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
    visualEffect: { type: 'NUKE_BLAST' },
    effects: [
      { type: 'DESTROY', scope: 'ALL', targeting: { type: 'NONE', affinity: 'ENEMY', affectedFilter: ['MARKED'] } },
    ],


  },
  {
    id: 'CARD038',
    baseCardId: 'CARD038',
    name: 'Particle Whip',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/ParticleWhip.png',
    description: 'Deal 1 damage to target drone. Go Again.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 1, goAgain: true, targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD039',
    baseCardId: 'CARD039',
    name: 'Thermal Lance',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/ThermalLance.png',
    description: 'Deal 2 damage to target drone.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD039_ENHANCED',
    baseCardId: 'CARD039',
    name: 'Thermal Lance+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/ThermalLance.png',
    description: 'Deal 3 damage to target drone.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 3, targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD050',
    baseCardId: 'CARD050',
    name: 'Scavenger Shot',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/ScavengerShot.png',
    description: 'Deal 2 damage to target drone. If it is destroyed, draw a card.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'draw-on-destroy',
            timing: 'POST',
            condition: { type: 'ON_DESTROY' },
            grantedEffect: { type: 'DRAW', value: 1 },
          },
        ],
      },
    ],



  },
  {
    id: 'CARD051',
    baseCardId: 'CARD051',
    name: 'Sundering Beam',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/FinishingBlow.png',
    description: 'Deal 2 damage to target drone. If its current hull is 2 or less, deal 4 damage instead.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'execute-bonus',
            timing: 'PRE',
            condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 2 },
          },
        ],
      },
    ],



  },
  {
    id: 'CARD052',
    baseCardId: 'CARD052',
    name: 'Condemnation Ray',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/OpportunistStrike.png',
    description: 'Deal 2 damage. +2 if target is marked. If destroyed, gain 4 energy.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'marked-bonus',
            timing: 'PRE',
            condition: { type: 'TARGET_IS_MARKED' },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 2 },
          },
          {
            id: 'energy-on-destroy',
            timing: 'POST',
            condition: { type: 'ON_DESTROY' },
            grantedEffect: { type: 'GAIN_ENERGY', value: 4 },
          },
        ],
      },
    ],



  },
  {
    id: 'CARD053',
    baseCardId: 'CARD053',
    name: 'Prey on the Weak',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/Executioner.png',
    description: 'Destroy target enemy drone if its current hull is 1 or less.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 0,
        targeting: {
          type: 'DRONE',
          affinity: 'ENEMY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'hull', comparison: 'LTE', value: 1 },
          ],
        },
        conditionals: [
          {
            id: 'execute-weak',
            timing: 'PRE',
            condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 1 },
            grantedEffect: { type: 'DESTROY', scope: 'SINGLE' },
          },
        ],
      },
    ],



  },
  {
    id: 'CARD053_ENHANCED',
    baseCardId: 'CARD053',
    name: 'Prey on the Weak+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/Executioner.png',
    description: 'Destroy target enemy drone if its current hull is 2 or less.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 0,
        targeting: {
          type: 'DRONE',
          affinity: 'ENEMY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'hull', comparison: 'LTE', value: 2 },
          ],
        },
        conditionals: [
          {
            id: 'execute-weak',
            timing: 'PRE',
            condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
            grantedEffect: { type: 'DESTROY', scope: 'SINGLE' },
          },
        ],
      },
    ],



  },
  {
    id: 'CARD054',
    baseCardId: 'CARD054',
    name: 'Energy Leech',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 1,
    image: '/DroneWars/cards/EnergyLeech.png',
    description: 'Deal 1 damage to target drone. If hull damage is dealt, gain 3 energy.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 1,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'energy-on-hull-damage',
            timing: 'POST',
            condition: { type: 'ON_HULL_DAMAGE' },
            grantedEffect: { type: 'GAIN_ENERGY', value: 3 },
          },
        ],
      },
    ],



  },
  {
    id: 'CARD063',
    baseCardId: 'CARD063',
    name: 'Phase-Charged Laser',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FollowUpStrike.png',
    description: 'Deal 2 damage to target drone. If this is not your first action this turn, deal 4 instead.',
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'momentum-bonus',
            timing: 'PRE',
            condition: { type: 'NOT_FIRST_ACTION' },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 2 },
          },
        ],
      },
    ],



  },
  {
    id: 'Deploy_Inhibitor_Mine',
    baseCardId: 'Deploy_Inhibitor_Mine',
    name: 'Deploy Inhibitor Mine',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/InhibitorMine.png',
    description: 'Create an Inhibitor Mine in an enemy lane. (Inhibitor Mine: 0/1. When an enemy drone is deployed here, exhaust it. Then destroy this mine.)',
    effects: [
      {
        type: 'CREATE_TOKENS',
        tokenName: 'Inhibitor Mine',
        targetOwner: 'OPPONENT',
        ignoresCPULimit: true,
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'Deploy_Jitter_Mine',
    baseCardId: 'Deploy_Jitter_Mine',
    name: 'Deploy Jitter Mine',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/JitterMine.png',
    description: 'Create a Jitter Mine in an enemy lane. (Jitter Mine: 0/1. When an enemy drone attacks from this lane, give it -4 attack permanently. Then destroy this mine.)',
    effects: [
      {
        type: 'CREATE_TOKENS',
        tokenName: 'Jitter Mine',
        targetOwner: 'OPPONENT',
        ignoresCPULimit: true,
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'Deploy_Proximity_Mine',
    baseCardId: 'Deploy_Proximity_Mine',
    name: 'Deploy Proximity Mine',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/ProximityMine.png',
    description: 'Create a Proximity Mine in an enemy lane. (Proximity Mine: 0/1. When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.)',
    effects: [
      {
        type: 'CREATE_TOKENS',
        tokenName: 'Proximity Mine',
        targetOwner: 'OPPONENT',
        ignoresCPULimit: true,
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'DOCTRINE_001',
    baseCardId: 'DOCTRINE_001',
    name: 'Crossfire Pattern',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/CrossfirePattern.png',
    description: 'If you control both flank lanes (left and right), deal 3 kinetic damage to both enemy flank ship sections.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane3'],
          operator: 'ALL',
        },
        damage: 3,
        targets: 'FLANK_SECTIONS',
        damageType: 'KINETIC',
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
          validSections: ['left', 'right'],
        },
      },
    ],


  },
  {
    id: 'DOCTRINE_002',
    baseCardId: 'DOCTRINE_002',
    name: 'Breach the Line',
    maxInDeck: 1,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/BreachTheLine.png',
    description: 'If you control the middle lane, deal 6 kinetic damage to the enemy middle ship section.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane2'],
          operator: 'ALL',
        },
        damage: 6,
        targets: 'MIDDLE_SECTION',
        damageType: 'KINETIC',
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
          validSections: ['middle'],
        },
      },
    ],


  },
  {
    id: 'DOCTRINE_003',
    baseCardId: 'DOCTRINE_003',
    name: 'Overrun',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Ordnance',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/Overrun.png',
    description: 'Target a lane you control. If the enemy has no drones in that lane, deal 3 kinetic damage to the corresponding ship section.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: { type: 'CONTROL_LANE_EMPTY', lane: 'TARGET' },
        damage: 3,
        targets: 'CORRESPONDING_SECTION',
        damageType: 'KINETIC',
        targeting: { type: 'SHIP_SECTION', affinity: 'ENEMY', restrictions: ['REQUIRES_LANE_CONTROL'], },
      },
    ],


  },
  {
    id: 'DOCTRINE_004',
    baseCardId: 'DOCTRINE_004',
    name: 'Encirclement',
    maxInDeck: 1,
    rarity: 'Mythic',
    type: 'Ordnance',
    cost: 3,
    momentumCost: 2,
    image: '/DroneWars/cards/Encirclement.png',
    description: 'If you control all three lanes, deal 3 kinetic damage to all enemy ship sections.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane2', 'lane3'],
          operator: 'ALL',
        },
        damage: 3,
        targets: 'ALL_SECTIONS',
        damageType: 'KINETIC',
        targeting: {
          type: 'SHIP_SECTION',
          affinity: 'ENEMY',
          restrictions: ['REQUIRES_LANE_CONTROL'],
          validSections: ['left', 'middle', 'right'],
        },
      },
    ],


  },
  {
    id: 'LANE_CONTROL_DAMAGE',
    baseCardId: 'LANE_CONTROL_DAMAGE',
    name: 'Suppression Fire',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/SuppressionFire.png',
    description: 'Deal 3 damage to an enemy drone in a lane you control.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 3,
        targeting: {
          type: 'DRONE',
          affinity: 'ENEMY',
          location: 'ANY_LANE',
          restrictions: [
            { type: 'IN_LANE_CONTROLLED_BY', controller: 'ACTING_PLAYER' },
          ],
        },
      },
    ],


  },

  // --- Support Cards ---

  {
    id: 'CARD_STATUS_CLEAR',
    baseCardId: 'CARD_STATUS_CLEAR',
    name: 'System Restore',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 3,
    image: '/DroneWars/cards/SystemRestore.png',
    description: 'Remove all status effects from target drone, including marked status. Go again.',
    effects: [
      { type: 'CLEAR_ALL_STATUS', goAgain: true, targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD002',
    baseCardId: 'CARD002',
    name: 'System Reboot',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/Reboot.png',
    description: 'Draw 2 cards from your deck. Go again.',
    effects: [
      { type: 'DRAW', value: 2, goAgain: true, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'CARD002_ENHANCED',
    baseCardId: 'CARD002',
    name: 'System Reboot+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/Reboot.png',
    description: 'Draw 3 cards from your deck. Go again.',
    effects: [
      { type: 'DRAW', value: 3, goAgain: true, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'CARD003',
    baseCardId: 'CARD003',
    name: 'Out Think',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 0,
    image: '/DroneWars/cards/OutThink.png',
    description: 'Draw 2 cards. Can only be played when you control fewer lanes than your opponent.',
    effects: [
      { type: 'DRAW', value: 2, targeting: { type: 'NONE' } },
    ],

    playCondition: { type: 'LANE_CONTROL_COMPARISON', comparison: 'FEWER_THAN_OPPONENT' },
  },
  {
    id: 'CARD004',
    baseCardId: 'CARD004',
    name: 'Energy Surge',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/EnergySurge.png',
    description: 'Gain 3 Energy. Go again',
    effects: [
      { type: 'GAIN_ENERGY', value: 3, goAgain: true, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'CARD004_ENHANCED',
    baseCardId: 'CARD004',
    name: 'Energy Surge+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/EnergySurge.png',
    description: 'Gain 5 Energy. Go again.',
    effects: [
      { type: 'GAIN_ENERGY', value: 5, goAgain: true, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'CARD005',
    baseCardId: 'CARD005',
    name: 'Reactivation Protocol',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 3,
    image: '/DroneWars/cards/AdrenalineRush.png',
    description: 'Ready an exhausted friendly drone with a Class of 2 or less.',
    effects: [
      { type: 'READY_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'FRIENDLY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'class', comparison: 'LTE', value: 2 },
            'EXHAUSTED',
          ],
        },
      },
    ],


  },
  {
    id: 'CARD005_ENHANCED',
    baseCardId: 'CARD005',
    name: 'Reactivation Protocol+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 5,
    image: '/DroneWars/cards/AdrenalineRush.png',
    description: 'Ready an exhausted friendly drone.',
    effects: [
      { type: 'READY_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['EXHAUSTED'], } },
    ],


  },
  {
    id: 'CARD006',
    baseCardId: 'CARD006',
    name: 'Nanobot Repair',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/NanobotRepair.png',
    description: 'Restore 3 hull to a friendly drone. Cannot exceed its maximum hull. Go again.',
    effects: [
      { type: 'HEAL_HULL', value: 3, goAgain: true, targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
    ],


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
    effects: [
      { type: 'HEAL_HULL', value: 1, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'CARD007_ENHANCED',
    baseCardId: 'CARD007',
    name: 'Emergency Patch+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 4,
    image: '/DroneWars/cards/EmergencyPatch.png',
    description: 'Restore 4 hull to one of your ship sections.',
    effects: [
      { type: 'HEAL_HULL', value: 4, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'CARD008',
    baseCardId: 'CARD008',
    name: 'Shield Recharge',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldRecharge.png',
    description: 'Restore 2 shield to all friendly drones in a target lane. Go again.',
    effects: [
      { type: 'HEAL_SHIELDS', value: 2, goAgain: true, targeting: { type: 'LANE', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'CARD014',
    baseCardId: 'CARD014',
    name: 'Overcharge',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/Overcharge.png',
    description: 'Give a friendly drone +2 attack until the end of the turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: 2, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD015',
    baseCardId: 'CARD015',
    name: 'Streamline',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/Streamline.png',
    description: 'Give all friendly drones in a lane +1 speed until the end of the turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'speed', value: 1, type: 'temporary' },
        targeting: { type: 'LANE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD017',
    baseCardId: 'CARD017',
    name: 'Boosters',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 0,
    image: '/DroneWars/cards/Boosters.png',
    description: 'Give a friendly drone +2 speed until the end of the turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'speed', value: 2, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD018',
    baseCardId: 'CARD018',
    name: 'Desperate Measures',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/DesperateMeasures.png',
    description: 'Draw 1 card and gain 1 Energy. Repeat this effect for each of your damaged or critical ship sections. Go again.',
    effects: [
      {
        type: 'REPEATING_EFFECT',
        effects: [
          { type: 'DRAW', value: 1 },
          { type: 'GAIN_ENERGY', value: 1 },
        ],
        condition: 'OWN_DAMAGED_SECTIONS',
        goAgain: true,
        targeting: { type: 'NONE' },
      },
    ],

  },
  {
    id: 'CARD019',
    baseCardId: 'CARD019',
    name: 'Reposition',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 5,
    momentumCost: 1,
    image: '/DroneWars/cards/Reposition.png',
    description: 'Select a lane. Move up to 3 friendly drones from that lane to another. The moved drones are not exhausted.',
    effects: [
      { type: 'MULTI_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'SAME_LANE', maxTargets: 3, restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
    ],
  },
  {
    id: 'CARD023',
    baseCardId: 'CARD023',
    name: 'Maneuver',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/Maneuver.png',
    description: 'Move a friendly drone to an adjacent lane. The drone is not exhausted by this move.',
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'] },
    ],
  },
  {
    id: 'CARD023_ENHANCED',
    baseCardId: 'CARD023',
    name: 'Maneuver+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 4,
    image: '/DroneWars/cards/Maneuver.png',
    description: 'Move a friendly drone to an adjacent lane. The drone is not exhausted by this move. Go again.',
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'], goAgain: true },
    ],
  },
  {
    id: 'CARD025',
    baseCardId: 'CARD025',
    name: 'Strategic Planning',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/StrategicPlanning.png',
    description: 'Look at the top 5 cards of your deck and draw 1. Shuffle your deck.',
    effects: [{ type: 'SEARCH_AND_DRAW', searchCount: 5, drawCount: 1, shuffleAfter: true, targeting: { type: 'NONE' } }],
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
    effects: [{ type: 'SEARCH_AND_DRAW', searchCount: 999, drawCount: 1, shuffleAfter: true, filter: { type: 'Upgrade' }, targeting: { type: 'NONE' } }],
  },
  {
    id: 'CARD037',
    baseCardId: 'CARD037',
    name: 'Shield Boost',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldBoost.png',
    description: 'Restore up to 2 shields to a friendly ship section. Go again.',
    effects: [
      { type: 'RESTORE_SECTION_SHIELDS', value: 2, goAgain: true, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'CARD037_ENHANCED',
    baseCardId: 'CARD037',
    name: 'Shield Boost+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/ShieldBoost.png',
    description: 'Restore up to 3 shields to a friendly ship section. Go again.',
    effects: [
      { type: 'RESTORE_SECTION_SHIELDS', value: 3, goAgain: true, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'CARD060',
    baseCardId: 'CARD060',
    name: 'Swift Maneuver',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/SwiftManeuver.png',
    description: 'Move a friendly drone to an adjacent lane. If its speed is 5 or higher, go again.',
    effects: [
      {
        type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'],
        conditionals: [
          { id: 'fast-goagain', timing: 'POST', condition: { type: 'TARGET_STAT_GTE', stat: 'speed', value: 5 }, grantedEffect: { type: 'GO_AGAIN' } },
        ],
      },
    ],
  },
  {
    id: 'CARD061',
    baseCardId: 'CARD061',
    name: 'Tactical Shift',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/TacticalShift.png',
    description: 'Move a friendly ready drone to an adjacent lane without exhausting it. If the opponent has more drones in that lane, draw a card.',
    effects: [
      {
        type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'],
        conditionals: [
          { id: 'contested-draw', timing: 'POST', condition: { type: 'OPPONENT_HAS_MORE_IN_LANE', lane: 'DESTINATION', count: 'TOTAL' }, grantedEffect: { type: 'DRAW', value: 1 } },
        ],
      },
    ],
  },
  {
    id: 'CARD062',
    baseCardId: 'CARD062',
    name: 'Assault Reposition',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/AssaultReposition.png',
    description: 'Move a friendly drone to an adjacent lane without exhausting it. If its attack is less than 4, give it +1 attack.',
    effects: [
      {
        type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'],
        conditionals: [
          { id: 'attack-buff', timing: 'POST', condition: { type: 'TARGET_STAT_LTE', stat: 'attack', value: 3 }, grantedEffect: { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1 } } },
        ],
      },
    ],
  },
  {
    id: 'Deploy_Rally_Beacon',
    baseCardId: 'Deploy_Rally_Beacon',
    name: 'Deploy Rally Beacon',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/RallyBeacon.png',
    description: 'Create a Rally Beacon token in a friendly lane. (Rally Beacon: 0/1, Speed 1. When a friendly drone moves into this lane, go again.)',
    effects: [
      { type: 'CREATE_TOKENS', tokenName: 'Rally Beacon', ignoresCPULimit: true, targeting: { type: 'LANE', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'LANE_CONTROL_DRAW',
    baseCardId: 'LANE_CONTROL_DRAW',
    name: 'Tactical Advantage',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 1,
    image: '/DroneWars/cards/TacticalAdvantage.png',
    description: 'Draw a card for each lane you control.',
    effects: [
      { type: 'REPEATING_EFFECT', effects: [ { type: 'DRAW', value: 1 }, ], condition: 'LANES_CONTROLLED', targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'LANE_CONTROL_ENERGY',
    baseCardId: 'LANE_CONTROL_ENERGY',
    name: 'Strategic Dominance',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 0,
    image: '/DroneWars/cards/StrategicDominance.png',
    description: 'Gain 1 energy for each lane you control.',
    effects: [
      { type: 'REPEATING_EFFECT', effects: [ { type: 'GAIN_ENERGY', value: 1 }, ], condition: 'LANES_CONTROLLED', targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'LANE_CONTROL_READY',
    baseCardId: 'LANE_CONTROL_READY',
    name: 'Rallying Cry',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 3,
    image: '/DroneWars/cards/RallyingCry.png',
    description: 'Ready an exhausted friendly drone in a lane you do NOT control.',
    effects: [
      { type: 'READY_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'FRIENDLY',
          location: 'ANY_LANE',
          restrictions: [
            'EXHAUSTED',
            { type: 'IN_LANE_NOT_CONTROLLED_BY', controller: 'ACTING_PLAYER' },
          ],
        },
      },
    ],


  },
  {
    id: 'Rally',
    baseCardId: 'Rally',
    name: 'Rally',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Support',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/Rally.png',
    description: 'Ready an exhausted friendly drone.',
    effects: [
      { type: 'READY_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'Superior_Intel',
    baseCardId: 'Superior_Intel',
    name: 'Superior Intel',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/SuperiorIntel.png',
    description: 'Draw 4 cards from your deck.',
    effects: [
      { type: 'DRAW', value: 4, targeting: { type: 'NONE' } },
    ],

  },

  // --- Tactic Cards ---

  {
    id: 'CARD_STATUS_1',
    baseCardId: 'CARD_STATUS_1',
    name: 'Thruster Malfunction',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SystemLock.png',
    description: 'Target drone gains Snared. (Cancel its next move to remove this status.)',
    effects: [
      { type: 'APPLY_SNARED', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_STATUS_1_ENHANCED',
    baseCardId: 'CARD_STATUS_1',
    name: 'Thruster Malfunction+',
    maxInDeck: 2,
    rarity: 'Rare',
    type: 'Tactic',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/SystemLock.png',
    description: 'Target drone gains Immobile. (It cannot optionally Move.)',
    effects: [
      { type: 'APPLY_CANNOT_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_STATUS_2',
    baseCardId: 'CARD_STATUS_2',
    name: 'Weapon Malfunction',
    maxInDeck: 4,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/WeaponMalfunction.png',
    description: 'Target drone gains Suppressed. (Cancel its next attack to remove this status.)',
    effects: [
      { type: 'APPLY_SUPPRESSED', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_STATUS_2_ENHANCED',
    baseCardId: 'CARD_STATUS_2',
    name: 'Weapon Malfunction+',
    maxInDeck: 2,
    rarity: 'Rare',
    type: 'Tactic',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/WeaponMalfunction.png',
    description: 'Target drone gains Disarmed. (It cannot optionally Attack.)',
    effects: [
      { type: 'APPLY_CANNOT_ATTACK', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_STATUS_3',
    baseCardId: 'CARD_STATUS_3',
    name: 'Sensor Malfunction',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SensorJam.png',
    description: 'Target drone gains Blinded. (It cannot optionally Intercept.)',
    effects: [
      { type: 'APPLY_CANNOT_INTERCEPT', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_STATUS_4',
    baseCardId: 'CARD_STATUS_4',
    name: 'Stasis Field',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StasisField.png',
    description: 'Target drone does not ready during the next ready phase.',
    effects: [
      { type: 'APPLY_DOES_NOT_READY', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'CARD_TACTICS_1',
    baseCardId: 'CARD_TACTICS_1',
    name: 'Tactical Repositioning',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/TacticalRepositioning.png',
    description: 'Move target class 2 or less ready enemy drone  to an adjacent lane.',
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: [{ stat: 'class', comparison: 'LTE', value: 2 }, 'NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'] },
    ],
  },
  {
    id: 'CARD_TACTICS_2',
    baseCardId: 'CARD_TACTICS_2',
    name: 'Memory Leak',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/MentalDisruption.png',
    description: 'Target opponent discards 2 cards at random.',
    effects: [
      { type: 'DISCARD', count: 2, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'CARD_TACTICS_3',
    baseCardId: 'CARD_TACTICS_3',
    name: 'Power Drain',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/PowerDrain.png',
    description: 'Target opponent loses 3 energy.',
    effects: [
      { type: 'DRAIN_ENERGY', amount: 3, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'CARD_TACTICS_4',
    baseCardId: 'CARD_TACTICS_4',
    name: 'EMP Burst',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 4,
    image: '/DroneWars/cards/EMPBurst.png',
    description: 'Exhaust target drone (class 2 or less).',
    effects: [
      { type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'ANY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'class', comparison: 'LTE', value: 2 },
          ],
        },
      },
    ],


  },
  {
    id: 'CARD_TACTICS_5',
    baseCardId: 'CARD_TACTICS_5',
    name: 'Temporal Dampener',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/TemporalDampener.png',
    description: 'Target drone gets -2 speed until end of turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'speed', value: -2, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD016',
    baseCardId: 'CARD016',
    name: 'Weapon Overload',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StaticField.png',
    description: 'Give an enemy drone -2 attack until the end of the turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: -2, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      },
    ],


  },
  {
    id: 'CARD022',
    baseCardId: 'CARD022',
    name: 'System Sabotage',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SystemSabotage.png',
    description: 'Destroy a single applied Upgrade on an enemy drone type.',
    effects: [{ type: 'DESTROY_UPGRADE', targeting: { type: 'NONE' } }],
  },
  {
    id: 'CARD030',
    baseCardId: 'CARD030',
    name: 'Deploy Jammers',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 5,
    image: '/DroneWars/cards/DeployJammers.png',
    description: 'Create a Jammer drone token in each of your lanes. (Jammer: 0/1, Speed 1. Opponent card effects can only target Jammer drones.)',
    effects: [
      { type: 'CREATE_TOKENS', tokenName: 'Jammer', locations: ['lane1', 'lane2', 'lane3'], ignoresCPULimit: true, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'Deploy_Thruster_Inhibitor',
    baseCardId: 'Deploy_Thruster_Inhibitor',
    name: 'Deploy Thruster Inhibitor',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/ThrusterInhibitor.png',
    description: 'Create a Thruster Inhibitor token in an enemy lane. (Thruster Inhibitor: 0/1, Speed 1. Enemy drones cannot move out of this lane. Pay 2 Energy: Destroy this token.)',
    effects: [
      {
        type: 'CREATE_TOKENS',
        tokenName: 'Thruster Inhibitor',
        targetOwner: 'OPPONENT',
        ignoresCPULimit: true,
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'Exhaust',
    baseCardId: 'Exhaust',
    name: 'Exhaust',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    momentumCost: 1,
    image: '/DroneWars/cards/Exhaust.png',
    description: 'Exhaust target drone.',
    effects: [
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],


  },
  {
    id: 'EXHAUST_TO_DISABLE',
    baseCardId: 'EXHAUST_TO_DISABLE',
    name: 'Feint',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/ExhaustingStrike.png',
    description: 'Exhaust a friendly drone. Then exhaust an enemy drone with lower speed in the same lane.',
    visualEffect: { type: 'DISRUPTION' },
    effects: [
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' }, restrictions: [{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT', reference: { ref: 0, field: 'target' }, referenceStat: 'speed' }] } },
    ],
  },
  {
    id: 'FORCED_REPOSITION',
    baseCardId: 'FORCED_REPOSITION',
    name: 'Forced Repositioning',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/ForcedRepositioning.png',
    description: 'Move a friendly drone to an adjacent lane, then move an enemy drone from the original lane with higher attack.',
    visualEffect: { type: 'MOVEMENT' },
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'], prompt: 'Move a friendly drone' },
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' }, restrictions: [{ type: 'STAT_COMPARISON', stat: 'attack', comparison: 'GT', reference: { ref: 0, field: 'target' }, referenceStat: 'attack' }, 'NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } }, properties: ['DO_NOT_EXHAUST'] },
    ],
  },
  {
    id: 'Mainframe_Breach',
    baseCardId: 'Mainframe_Breach',
    name: 'Mainframe Breach',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/MainframeBreach.png',
    description: 'Target opponent discards 2 cards at random and loses 4 energy.',
    effects: [
      { type: 'DISCARD', count: 2, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
      { type: 'DRAIN_ENERGY', amount: 4, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'Raise_the_Alarm',
    baseCardId: 'Raise_the_Alarm',
    name: 'Raise the Alarm',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    momentumCost: 1,
    aiOnly: true,
    image: '/DroneWars/cards/RaiseTheAlarm.png',
    description: 'Immediately increase player threat by 10.',
    effects: [
      { type: 'INCREASE_THREAT', value: 10, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'SACRIFICE_FOR_POWER',
    baseCardId: 'SACRIFICE_FOR_POWER',
    name: 'Sacrifice for Power',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/SacrificeforPower.png',
    description: 'Discard a card from your hand to give a friendly drone +X attack until end of turn, where X is the discarded card\'s energy cost.',
    visualEffect: { type: 'BUFF' },
    effects: [
      { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' }, prompt: 'Discard a card from your hand' },
      { type: 'MODIFY_STAT', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' }, mod: { stat: 'attack', value: { ref: 0, field: 'cardCost' }, type: 'temporary' }, prompt: 'Select a drone to receive the power boost' },
    ],
  },
  {
    id: 'Transmit_Threat',
    baseCardId: 'Transmit_Threat',
    name: 'Transmit Threat',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    aiOnly: true,
    image: '/DroneWars/cards/TransmitThreat.png',
    description: 'Immediately trigger the Round Start ability of every Signal Beacon drone currently on the board.',
    effects: [
      { type: 'INCREASE_THREAT', value: 2, perDrone: 'Signal Beacon', targeting: { type: 'NONE' } },
    ],

  },

  // --- Upgrade Cards ---

  {
    id: 'CARD020',
    baseCardId: 'CARD020',
    name: 'Slimline Bodywork',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Upgrade',
    cost: 3,
    image: '/DroneWars/cards/SlimlineBodywork.png',
    description: 'Permanently increase the deployment limit of a target drone type by 1.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'limit', value: 1 }, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 1,
  },
  {
    id: 'CARD020_ENHANCED',
    baseCardId: 'CARD020',
    name: 'Slimline Bodywork+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 3,
    image: '/DroneWars/cards/SlimlineBodywork.png',
    description: 'Permanently increase the deployment limit of a target drone type by 1. Go again.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'limit', value: 1 }, goAgain: true, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 1,
  },
  {
    id: 'CARD021',
    baseCardId: 'CARD021',
    name: 'Overclocked Thrusters',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Upgrade',
    cost: 3,
    image: '/DroneWars/cards/OverclockedThrusters.png',
    description: 'Permanently grant all drones of a target type +1 Speed.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'speed', value: 1 }, targeting: { type: 'NONE' } }],
    slots: 2,
    maxApplications: 2,
  },
  {
    id: 'CARD021_ENHANCED',
    baseCardId: 'CARD021',
    name: 'Overclocked Thrusters+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 3,
    image: '/DroneWars/cards/OverclockedThrusters.png',
    description: 'Permanently grant all drones of a target type +1 Speed.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'speed', value: 1 }, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 2,
  },
  {
    id: 'CARD024',
    baseCardId: 'CARD024',
    name: 'Piercing Rounds',
    maxInDeck: 1,
    rarity: 'Rare',
    type: 'Upgrade',
    cost: 6,
    image: '/DroneWars/cards/PiercingRounds.png',
    description: 'Permanently grant all drones of a target type the Piercing keyword.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'ability', abilityToAdd: { name: 'Piercing', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'PIERCING' } } }, targeting: { type: 'NONE' } }],
    slots: 2,
    maxApplications: 1,
  },
  {
    id: 'CARD027',
    baseCardId: 'CARD027',
    name: 'Efficiency Module',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 4,
    image: '/DroneWars/cards/EfficiencyModule.png',
    description: 'Permanently reduce the deployment cost of all drones of a target type by 1.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'cost', value: -1 }, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 1,
  },
  {
    id: 'CARD028',
    baseCardId: 'CARD028',
    name: 'Combat Enhancement',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Upgrade',
    cost: 5,
    image: '/DroneWars/cards/CombatEnhancement.png',
    description: 'Permanently increase the attack of all drones of a target type by 1.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'attack', value: 1 }, targeting: { type: 'NONE' } }],
    slots: 2,
    maxApplications: 2,
  },
  {
    id: 'CARD028_ENHANCED',
    baseCardId: 'CARD028',
    name: 'Combat Enhancement+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 5,
    image: '/DroneWars/cards/CombatEnhancement.png',
    description: 'Permanently increase the attack of all drones of a target type by 1.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'attack', value: 1 }, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 2,
  },
  {
    id: 'CARD029',
    baseCardId: 'CARD029',
    name: 'Shield Amplifier',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Upgrade',
    cost: 2,
    image: '/DroneWars/cards/ShieldAmplifier.png',
    description: 'Permanently increase the shields of all drones of a target type by 1.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'shields', value: 1 }, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 2,
  },
  {
    id: 'CARD029_ENHANCED',
    baseCardId: 'CARD029',
    name: 'Shield Amplifier+',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Upgrade',
    cost: 3,
    image: '/DroneWars/cards/ShieldAmplifier.png',
    description: 'Permanently increase the shields of all drones of a target type by 2.',
    effects: [{ type: 'MODIFY_DRONE_BASE', mod: { stat: 'shields', value: 2 }, targeting: { type: 'NONE' } }],
    slots: 1,
    maxApplications: 2,
  },
];

export default enrichCardsWithEffects(fullCardCollection);
