import { enrichCardsWithEffects } from '../logic/cards/effectsAdapter';

const fullCardCollection = [

  // --- Ordnance Cards ---

  {
    id: 'ION_PULSE',
    baseCardId: 'ION_PULSE',
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
    id: 'KINETIC_SLUG',
    baseCardId: 'KINETIC_SLUG',
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
    id: 'NULLWAVE_CANNON',
    baseCardId: 'NULLWAVE_CANNON',
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
    id: 'CONVERGENCE_BEAM',
    baseCardId: 'CONVERGENCE_BEAM',
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
    id: 'CONVERGENCE_BEAM_ENHANCED',
    baseCardId: 'CONVERGENCE_BEAM',
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
    id: 'TARGET_LOCK',
    baseCardId: 'TARGET_LOCK',
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
    id: 'SHRIEKER_MISSILES',
    baseCardId: 'SHRIEKER_MISSILES',
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
    id: 'SHRIEKER_MISSILES_ENHANCED',
    baseCardId: 'SHRIEKER_MISSILES',
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
    id: 'NUKE',
    baseCardId: 'NUKE',
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
    id: 'PIERCING_SHOT',
    baseCardId: 'PIERCING_SHOT',
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
    id: 'PIERCING_SHOT_ENHANCED',
    baseCardId: 'PIERCING_SHOT',
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
    id: 'SIDEWINDER_MISSILES',
    baseCardId: 'SIDEWINDER_MISSILES',
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
    id: 'RAILGUN_STRIKE',
    baseCardId: 'RAILGUN_STRIKE',
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
    id: 'BARRAGE',
    baseCardId: 'BARRAGE',
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
    id: 'BARRAGE_ENHANCED',
    baseCardId: 'BARRAGE',
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
    id: 'FINISHING_VOLLEY',
    baseCardId: 'FINISHING_VOLLEY',
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
    id: 'FINISHING_VOLLEY_ENHANCED',
    baseCardId: 'FINISHING_VOLLEY',
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
    id: 'STRAFING_RUN',
    baseCardId: 'STRAFING_RUN',
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
    id: 'OVERWHELMING_FORCE',
    baseCardId: 'OVERWHELMING_FORCE',
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
    id: 'PURGE_PROTOCOL',
    baseCardId: 'PURGE_PROTOCOL',
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
    id: 'PARTICLE_WHIP',
    baseCardId: 'PARTICLE_WHIP',
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
    id: 'THERMAL_LANCE',
    baseCardId: 'THERMAL_LANCE',
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
    id: 'THERMAL_LANCE_ENHANCED',
    baseCardId: 'THERMAL_LANCE',
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
    id: 'SCAVENGER_SHOT',
    baseCardId: 'SCAVENGER_SHOT',
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
    id: 'SUNDERING_BEAM',
    baseCardId: 'SUNDERING_BEAM',
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
    id: 'CONDEMNATION_RAY',
    baseCardId: 'CONDEMNATION_RAY',
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
    id: 'PREY_ON_THE_WEAK',
    baseCardId: 'PREY_ON_THE_WEAK',
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
    id: 'PREY_ON_THE_WEAK_ENHANCED',
    baseCardId: 'PREY_ON_THE_WEAK',
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
    id: 'ENERGY_LEECH',
    baseCardId: 'ENERGY_LEECH',
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
    id: 'PHASE_CHARGED_LASER',
    baseCardId: 'PHASE_CHARGED_LASER',
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
    id: 'DEPLOY_INHIBITOR_MINE',
    baseCardId: 'DEPLOY_INHIBITOR_MINE',
    name: 'Deploy Inhibitor Mine',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 2,
    image: '/DroneWars/cards/InhibitorMine.png',
    description: 'Create an Inhibitor Mine in an enemy lane. (Inhibitor Mine: When an enemy drone is deployed here, exhaust it. Then destroy this mine.)',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Inhibitor Mine',
        targetOwner: 'OPPONENT',
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'DEPLOY_JITTER_MINE',
    baseCardId: 'DEPLOY_JITTER_MINE',
    name: 'Deploy Jitter Mine',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 2,
    image: '/DroneWars/cards/JitterMine.png',
    description: 'Create a Jitter Mine in an enemy lane. (Jitter Mine: When an enemy drone attacks from this lane, give it -4 attack permanently. Then destroy this mine.)',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Jitter Mine',
        targetOwner: 'OPPONENT',
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'DEPLOY_PROXIMITY_MINE',
    baseCardId: 'DEPLOY_PROXIMITY_MINE',
    name: 'Deploy Proximity Mine',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 2,
    image: '/DroneWars/cards/ProximityMine.png',
    description: 'Create a Proximity Mine in an enemy lane. (Proximity Mine: When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.)',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Proximity Mine',
        targetOwner: 'OPPONENT',
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'CROSSFIRE_PATTERN',
    baseCardId: 'CROSSFIRE_PATTERN',
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
    id: 'BREACH_THE_LINE',
    baseCardId: 'BREACH_THE_LINE',
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
    id: 'OVERRUN',
    baseCardId: 'OVERRUN',
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
    id: 'ENCIRCLEMENT',
    baseCardId: 'ENCIRCLEMENT',
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
    id: 'SUPPRESSION_FIRE',
    baseCardId: 'SUPPRESSION_FIRE',
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
    id: 'SYSTEM_RESTORE',
    baseCardId: 'SYSTEM_RESTORE',
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
    id: 'SYSTEM_REBOOT',
    baseCardId: 'SYSTEM_REBOOT',
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
    id: 'SYSTEM_REBOOT_ENHANCED',
    baseCardId: 'SYSTEM_REBOOT',
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
    id: 'OUT_THINK',
    baseCardId: 'OUT_THINK',
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
    id: 'ENERGY_SURGE',
    baseCardId: 'ENERGY_SURGE',
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
    id: 'ENERGY_SURGE_ENHANCED',
    baseCardId: 'ENERGY_SURGE',
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
    id: 'REACTIVATION_PROTOCOL',
    baseCardId: 'REACTIVATION_PROTOCOL',
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
    id: 'REACTIVATION_PROTOCOL_ENHANCED',
    baseCardId: 'REACTIVATION_PROTOCOL',
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
    id: 'NANOBOT_REPAIR',
    baseCardId: 'NANOBOT_REPAIR',
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
    id: 'EMERGENCY_PATCH',
    baseCardId: 'EMERGENCY_PATCH',
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
    id: 'EMERGENCY_PATCH_ENHANCED',
    baseCardId: 'EMERGENCY_PATCH',
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
    id: 'SHIELD_RECHARGE',
    baseCardId: 'SHIELD_RECHARGE',
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
    id: 'OVERCHARGE',
    baseCardId: 'OVERCHARGE',
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
    id: 'STREAMLINE',
    baseCardId: 'STREAMLINE',
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
    id: 'BOOSTERS',
    baseCardId: 'BOOSTERS',
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
    id: 'DESPERATE_MEASURES',
    baseCardId: 'DESPERATE_MEASURES',
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
    id: 'REPOSITION',
    baseCardId: 'REPOSITION',
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
    id: 'MANEUVER',
    baseCardId: 'MANEUVER',
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
    id: 'MANEUVER_ENHANCED',
    baseCardId: 'MANEUVER',
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
    id: 'STRATEGIC_PLANNING',
    baseCardId: 'STRATEGIC_PLANNING',
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
    id: 'EQUIPMENT_CACHE',
    baseCardId: 'EQUIPMENT_CACHE',
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
    id: 'SHIELD_BOOST',
    baseCardId: 'SHIELD_BOOST',
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
    id: 'SHIELD_BOOST_ENHANCED',
    baseCardId: 'SHIELD_BOOST',
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
    id: 'SWIFT_MANEUVER',
    baseCardId: 'SWIFT_MANEUVER',
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
    id: 'TACTICAL_SHIFT',
    baseCardId: 'TACTICAL_SHIFT',
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
    id: 'ASSAULT_REPOSITION',
    baseCardId: 'ASSAULT_REPOSITION',
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
    id: 'DEPLOY_RALLY_BEACON',
    baseCardId: 'DEPLOY_RALLY_BEACON',
    name: 'Deploy Rally Beacon',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Support',
    cost: 2,
    image: '/DroneWars/cards/RallyBeacon.png',
    description: 'Create a Rally Beacon in a friendly lane. (Rally Beacon: When a friendly drone moves into this lane, go again.)',
    effects: [
      { type: 'CREATE_TECH', tokenName: 'Rally Beacon', targeting: { type: 'LANE', affinity: 'FRIENDLY' } },
    ],


  },
  {
    id: 'TACTICAL_ADVANTAGE',
    baseCardId: 'TACTICAL_ADVANTAGE',
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
    id: 'STRATEGIC_DOMINANCE',
    baseCardId: 'STRATEGIC_DOMINANCE',
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
    id: 'RALLYING_CRY',
    baseCardId: 'RALLYING_CRY',
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
    id: 'RALLY',
    baseCardId: 'RALLY',
    name: 'RALLY',
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
    id: 'SUPERIOR_INTEL',
    baseCardId: 'SUPERIOR_INTEL',
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
    id: 'THRUSTER_MALFUNCTION',
    baseCardId: 'THRUSTER_MALFUNCTION',
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
    id: 'THRUSTER_MALFUNCTION_ENHANCED',
    baseCardId: 'THRUSTER_MALFUNCTION',
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
    id: 'WEAPON_MALFUNCTION',
    baseCardId: 'WEAPON_MALFUNCTION',
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
    id: 'WEAPON_MALFUNCTION_ENHANCED',
    baseCardId: 'WEAPON_MALFUNCTION',
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
    id: 'SENSOR_MALFUNCTION',
    baseCardId: 'SENSOR_MALFUNCTION',
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
    id: 'STASIS_FIELD',
    baseCardId: 'STASIS_FIELD',
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
    id: 'TACTICAL_REPOSITIONING',
    baseCardId: 'TACTICAL_REPOSITIONING',
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
    id: 'MEMORY_LEAK',
    baseCardId: 'MEMORY_LEAK',
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
    id: 'POWER_DRAIN',
    baseCardId: 'POWER_DRAIN',
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
    id: 'EMP_BURST',
    baseCardId: 'EMP_BURST',
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
    id: 'TEMPORAL_DAMPENER',
    baseCardId: 'TEMPORAL_DAMPENER',
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
    id: 'WEAPON_OVERLOAD',
    baseCardId: 'WEAPON_OVERLOAD',
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
    id: 'SYSTEM_SABOTAGE',
    baseCardId: 'SYSTEM_SABOTAGE',
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
    id: 'DEPLOY_JAMMERS',
    baseCardId: 'DEPLOY_JAMMERS',
    name: 'Deploy Jammers',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 5,
    image: '/DroneWars/cards/DeployJammers.png',
    description: 'Create a Jammer in each of your lanes. (Jammer: Opponent card effects targeting drones in this lane can only target this Jammer.)',
    effects: [
      { type: 'CREATE_TECH', tokenName: 'Jammer', locations: ['lane1', 'lane2', 'lane3'], targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'DEPLOY_THRUSTER_INHIBITOR',
    baseCardId: 'DEPLOY_THRUSTER_INHIBITOR',
    name: 'Deploy Thruster Inhibitor',
    maxInDeck: 2,
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/ThrusterInhibitor.png',
    description: 'Create a Thruster Inhibitor in an enemy lane. (Enemy drones cannot move out of this lane. Destroyed at the start of the next round.)',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Thruster Inhibitor',
        targetOwner: 'OPPONENT',
        targeting: { type: 'LANE', affinity: 'ENEMY' },
      },
    ],


  },
  {
    id: 'EXHAUST',
    baseCardId: 'EXHAUST',
    name: 'EXHAUST',
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
    id: 'FEINT',
    baseCardId: 'FEINT',
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
    id: 'FORCED_REPOSITIONING',
    baseCardId: 'FORCED_REPOSITIONING',
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
    id: 'MAINFRAME_BREACH',
    baseCardId: 'MAINFRAME_BREACH',
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
    id: 'RAISE_THE_ALARM',
    baseCardId: 'RAISE_THE_ALARM',
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
    id: 'TRANSMIT_THREAT',
    baseCardId: 'TRANSMIT_THREAT',
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
    id: 'SLIMLINE_BODYWORK',
    baseCardId: 'SLIMLINE_BODYWORK',
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
    id: 'SLIMLINE_BODYWORK_ENHANCED',
    baseCardId: 'SLIMLINE_BODYWORK',
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
    id: 'OVERCLOCKED_THRUSTERS',
    baseCardId: 'OVERCLOCKED_THRUSTERS',
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
    id: 'OVERCLOCKED_THRUSTERS_ENHANCED',
    baseCardId: 'OVERCLOCKED_THRUSTERS',
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
    id: 'PIERCING_ROUNDS',
    baseCardId: 'PIERCING_ROUNDS',
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
    id: 'EFFICIENCY_MODULE',
    baseCardId: 'EFFICIENCY_MODULE',
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
    id: 'COMBAT_ENHANCEMENT',
    baseCardId: 'COMBAT_ENHANCEMENT',
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
    id: 'COMBAT_ENHANCEMENT_ENHANCED',
    baseCardId: 'COMBAT_ENHANCEMENT',
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
    id: 'SHIELD_AMPLIFIER',
    baseCardId: 'SHIELD_AMPLIFIER',
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
    id: 'SHIELD_AMPLIFIER_ENHANCED',
    baseCardId: 'SHIELD_AMPLIFIER',
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

  // --- Exposed Condition Cards ---

  {
    id: 'COMMAND_OVERRIDE',
    baseCardId: 'COMMAND_OVERRIDE',
    name: 'Command Override',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/CommandOverride.png',
    description: 'Opponent discards 1 card at random. Exposed Bridge: discards 3 instead.',
    effects: [{
      type: 'DISCARD', count: 1, targetPlayer: 'opponent',
      targeting: { type: 'NONE' },
      conditionals: [{
        id: 'bridge-exposed-bonus', timing: 'PRE',
        condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
        grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
      }]
    }]
  },
  {
    id: 'SIGNAL_HIJACK',
    baseCardId: 'SIGNAL_HIJACK',
    name: 'Signal Hijack',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SignalHijack.png',
    description: 'Exhaust an enemy drone (class 1 or less). Exposed DCH: class 4 or less.',
    effects: [{
      type: 'EXHAUST_DRONE',
      targeting: {
        type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE',
        restrictions: [{ stat: 'class', comparison: 'LTE', value: 1 }]
      },
      conditionals: [{
        id: 'dch-exposed-targeting', timing: 'PRE_TARGETING',
        condition: { type: 'SECTION_EXPOSED', section: 'droneControlHub' },
        targetingOverride: { restrictions: [{ stat: 'class', comparison: 'LTE', value: 4 }] }
      }]
    }]
  },
  {
    id: 'ENERGY_SIPHON',
    baseCardId: 'ENERGY_SIPHON',
    name: 'Energy Siphon',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/EnergySiphon.png',
    description: 'Steal 1 energy from opponent. Exposed Power Cell: steal 3 instead.',
    effects: [{
      type: 'STEAL_ENERGY', amount: 1, targetPlayer: 'opponent',
      targeting: { type: 'NONE' },
      conditionals: [{
        id: 'powercell-exposed-bonus', timing: 'PRE',
        condition: { type: 'SECTION_EXPOSED', section: 'powerCell' },
        grantedEffect: { type: 'OVERRIDE_VALUE', property: 'amount', value: 3 }
      }]
    }]
  },

  // --- Tech Removal Cards ---

  {
    id: 'SYSTEM_PURGE',
    baseCardId: 'SYSTEM_PURGE',
    name: 'System Purge',
    maxInDeck: 2,
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SystemPurge.png',
    description: 'Destroy target tech.',
    effects: [
      { type: 'DESTROY_TECH', targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' } },
    ],
  },
];

export default enrichCardsWithEffects(fullCardCollection);
