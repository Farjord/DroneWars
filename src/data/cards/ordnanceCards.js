// Description Formatting (rendered by formatCardText):
//   *text*       → italic
//   **text**     → bold
//   ***text***   → keyword (bold + purple)
//   \n           → line break

// --- Ordnance Cards ---

export const ordnanceCards = [
  {
    id: 'ISOLATION_STRIKE',
    baseCardId: 'ISOLATION_STRIKE',
    faction: 'NEUTRAL_1',
    name: 'Isolation Strike',
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/IsolationStrike.png',
    description: 'Deal 2 damage to target drone. +1 if target is exposed (fewer than 2 adjacent drones).',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, exposedBonus: 1, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],
  },
  {
    id: 'ISOLATION_STRIKE_ENHANCED',
    baseCardId: 'ISOLATION_STRIKE',
    faction: 'NEUTRAL_1',
    name: 'Isolation Strike+',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/IsolationStrike.png',
    description: 'Deal 3 damage to target drone. +1 if target is exposed (fewer than 2 adjacent drones).',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 3, exposedBonus: 1, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],
  },
  {
    id: 'ION_PULSE',
    baseCardId: 'ION_PULSE',
    faction: 'NEUTRAL_1',
    name: 'Ion Pulse',
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
    id: 'ION_PULSE_ENHANCED',
    baseCardId: 'ION_PULSE',
    faction: 'NEUTRAL_1',
    name: 'Ion Pulse+',
    type: 'Ordnance',
    cost: 1,
    image: '/DroneWars/cards/IonPulse.png',
    description: 'Deal 4 ion damage to target drone. Ion damage only affects shields.',
    visualEffect: { type: 'ION_BURST' },
    effects: [
      { type: 'DAMAGE', value: 4, damageType: 'ION', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'KINETIC_SLUG',
    baseCardId: 'KINETIC_SLUG',
    faction: 'NEUTRAL_1',
    name: 'Kinetic Slug',
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
    id: 'KINETIC_SLUG_ENHANCED',
    baseCardId: 'KINETIC_SLUG',
    faction: 'NEUTRAL_1',
    name: 'Kinetic Slug+',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/KineticSlug.png',
    description: 'Deal 4 kinetic damage to target drone. (Kinetic damage only affects hull. It is blocked by shields.)',
    visualEffect: { type: 'KINETIC_IMPACT' },
    effects: [
      { type: 'DAMAGE', value: 4, damageType: 'KINETIC', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'NULLWAVE_CANNON',
    baseCardId: 'NULLWAVE_CANNON',
    faction: 'NEUTRAL_1',
    name: 'Nullwave Cannon',
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
    id: 'NULLWAVE_CANNON_ENHANCED',
    baseCardId: 'NULLWAVE_CANNON',
    faction: 'NEUTRAL_1',
    name: 'Nullwave Cannon+',
    type: 'Ordnance',
    cost: 2,
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
    faction: 'MARK',
    name: 'Convergence Beam',
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
    faction: 'MARK',
    name: 'Convergence Beam+',
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
    faction: 'MARK',
    name: 'Target Lock',
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
    id: 'TARGET_LOCK_ENHANCED',
    baseCardId: 'TARGET_LOCK',
    faction: 'MARK',
    name: 'Target Lock+',
    type: 'Ordnance',
    cost: 1,
    image: '/DroneWars/cards/TargetLock.png',
    description: 'Destroy target marked enemy drone.',
    effects: [
      { type: 'DESTROY', scope: 'SINGLE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: ['MARKED'], } },
    ],

  },
  {
    id: 'SHRIEKER_MISSILES',
    baseCardId: 'SHRIEKER_MISSILES',
    faction: 'NEUTRAL_1',
    name: 'Shrieker Missiles',
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
    faction: 'NEUTRAL_1',
    name: 'Shrieker Missiles+',
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
    faction: 'NEUTRAL_1',
    name: 'Nuke',
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
    id: 'NUKE_ENHANCED',
    baseCardId: 'NUKE',
    faction: 'NEUTRAL_1',
    name: 'Nuke+',
    type: 'Ordnance',
    cost: 7,
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
    faction: 'MARK',
    name: 'Piercing Shot',
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
    faction: 'MARK',
    name: 'Piercing Shot+',
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
    faction: 'NEUTRAL_1',
    name: 'Sidewinder Missiles',
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
    id: 'SIDEWINDER_MISSILES_ENHANCED',
    baseCardId: 'SIDEWINDER_MISSILES',
    faction: 'NEUTRAL_1',
    name: 'Sidewinder Missiles+',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/SidewinderMissiles.png',
    description: 'Deal 3 damage to all enemy drones with a speed of 4 or Less in a selected lane.',
    visualEffect: { type: 'ENERGY_WAVE' },
    effects: [
      { type: 'DAMAGE', value: 3,
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
    faction: 'MARK',
    name: 'Railgun Strike',
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
    id: 'RAILGUN_STRIKE_ENHANCED',
    baseCardId: 'RAILGUN_STRIKE',
    faction: 'MARK',
    name: 'Railgun Strike+',
    type: 'Ordnance',
    cost: 4,
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
    faction: 'NEUTRAL_1',
    name: 'Barrage',
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
    faction: 'NEUTRAL_1',
    name: 'Barrage+',
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
    faction: 'NEUTRAL_1',
    name: 'Finishing Volley',
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
    faction: 'NEUTRAL_1',
    name: 'Finishing Volley+',
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
    faction: 'NEUTRAL_1',
    name: 'Strafing Run',
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
    id: 'STRAFING_RUN_ENHANCED',
    baseCardId: 'STRAFING_RUN',
    faction: 'NEUTRAL_1',
    name: 'Strafing Run+',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/StrafeRun.png',
    description: 'Deal 2 damage to the first 3 enemy drones in target lane (left to right).',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      {
        type: 'DAMAGE',
        value: 2,
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
    faction: 'NEUTRAL_1',
    name: 'Overwhelming Force',
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
    id: 'OVERWHELMING_FORCE_ENHANCED',
    baseCardId: 'OVERWHELMING_FORCE',
    faction: 'NEUTRAL_1',
    name: 'Overwhelming Force+',
    type: 'Ordnance',
    cost: 1,
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
    faction: 'MARK',
    name: 'Purge Protocol',
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
    id: 'PURGE_PROTOCOL_ENHANCED',
    baseCardId: 'PURGE_PROTOCOL',
    faction: 'MARK',
    name: 'Purge Protocol+',
    type: 'Ordnance',
    cost: 6,
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
    faction: 'NEUTRAL_1',
    name: 'Particle Whip',
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
    id: 'PARTICLE_WHIP_ENHANCED',
    baseCardId: 'PARTICLE_WHIP',
    faction: 'NEUTRAL_1',
    name: 'Particle Whip+',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/ParticleWhip.png',
    description: 'Deal 2 damage to target drone. Go Again.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2, goAgain: true, targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'THERMAL_LANCE',
    baseCardId: 'THERMAL_LANCE',
    faction: 'NEUTRAL_1',
    name: 'Thermal Lance',
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
    faction: 'NEUTRAL_1',
    name: 'Thermal Lance+',
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
    faction: 'NEUTRAL_1',
    name: 'Scavenger Shot',
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
    id: 'SCAVENGER_SHOT_ENHANCED',
    baseCardId: 'SCAVENGER_SHOT',
    faction: 'NEUTRAL_1',
    name: 'Scavenger Shot+',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/ScavengerShot.png',
    description: 'Deal 3 damage to target drone. If it is destroyed, draw a card.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 3,
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
    faction: 'NEUTRAL_1',
    name: 'Sundering Beam',
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
    id: 'SUNDERING_BEAM_ENHANCED',
    baseCardId: 'SUNDERING_BEAM',
    faction: 'NEUTRAL_1',
    name: 'Sundering Beam+',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/FinishingBlow.png',
    description: 'Deal 2 damage to target drone. If its current hull is 3 or less, deal 4 damage instead.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'execute-bonus',
            timing: 'PRE',
            condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 3 },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 2 },
          },
        ],
      },
    ],

  },
  {
    id: 'CONDEMNATION_RAY',
    baseCardId: 'CONDEMNATION_RAY',
    faction: 'MARK',
    name: 'Condemnation Ray',
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
    id: 'CONDEMNATION_RAY_ENHANCED',
    baseCardId: 'CONDEMNATION_RAY',
    faction: 'MARK',
    name: 'Condemnation Ray+',
    type: 'Ordnance',
    cost: 3,
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
    faction: 'NEUTRAL_1',
    name: 'Prey on the Weak',
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
    faction: 'NEUTRAL_1',
    name: 'Prey on the Weak+',
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
    faction: 'NEUTRAL_1',
    name: 'Energy Leech',
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
    id: 'ENERGY_LEECH_ENHANCED',
    baseCardId: 'ENERGY_LEECH',
    faction: 'NEUTRAL_1',
    name: 'Energy Leech+',
    type: 'Ordnance',
    cost: 1,
    image: '/DroneWars/cards/EnergyLeech.png',
    description: 'Deal 2 damage to target drone. If hull damage is dealt, gain 3 energy.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 2,
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
    faction: 'NEUTRAL_1',
    name: 'Phase-Charged Laser',
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
    id: 'PHASE_CHARGED_LASER_ENHANCED',
    baseCardId: 'PHASE_CHARGED_LASER',
    faction: 'NEUTRAL_1',
    name: 'Phase-Charged Laser+',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/FollowUpStrike.png',
    description: 'Deal 2 damage to target drone. If this is not your first action this turn, deal 5 instead.',
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
        conditionals: [
          {
            id: 'momentum-bonus',
            timing: 'PRE',
            condition: { type: 'NOT_FIRST_ACTION' },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 3 },
          },
        ],
      },
    ],

  },
  {
    id: 'DEPLOY_INHIBITOR_MINE',
    baseCardId: 'DEPLOY_INHIBITOR_MINE',
    faction: 'NEUTRAL_1',
    name: 'Deploy Inhibitor Mine',
    rarity: 'Uncommon',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 2,
    image: '/DroneWars/cards/InhibitorMine.png',
    description: 'Create an Inhibitor Mine in a friendly lane. \n \n *(Inhibitor Mine: When an enemy drone is deployed here, exhaust it. Then destroy this mine.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Inhibitor Mine',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'DEPLOY_INHIBITOR_MINE_ENHANCED',
    baseCardId: 'DEPLOY_INHIBITOR_MINE',
    faction: 'NEUTRAL_1',
    name: 'Deploy Inhibitor Mine+',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 1,
    image: '/DroneWars/cards/InhibitorMine.png',
    description: 'Create an Inhibitor Mine in a friendly lane. \n \n *(Inhibitor Mine: When an enemy drone is deployed here, exhaust it. Then destroy this mine.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Inhibitor Mine',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'DEPLOY_JITTER_MINE',
    baseCardId: 'DEPLOY_JITTER_MINE',
    faction: 'NEUTRAL_1',
    name: 'Deploy Jitter Mine',
    rarity: 'Uncommon',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 2,
    image: '/DroneWars/cards/JitterMine.png',
    description: 'Create a Jitter Mine in a friendly lane. \n \n *(Jitter Mine: When an enemy drone attacks from this lane, give it -4 attack permanently. Then destroy this mine.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Jitter Mine',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'DEPLOY_JITTER_MINE_ENHANCED',
    baseCardId: 'DEPLOY_JITTER_MINE',
    faction: 'NEUTRAL_1',
    name: 'Deploy Jitter Mine+',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 1,
    image: '/DroneWars/cards/JitterMine.png',
    description: 'Create a Jitter Mine in a friendly lane. \n \n *(Jitter Mine: When an enemy drone attacks from this lane, give it -4 attack permanently. Then destroy this mine.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Jitter Mine',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'DEPLOY_PROXIMITY_MINE',
    baseCardId: 'DEPLOY_PROXIMITY_MINE',
    faction: 'NEUTRAL_1',
    name: 'Deploy Proximity Mine',
    rarity: 'Uncommon',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 2,
    image: '/DroneWars/cards/ProximityMine.png',
    description: 'Create a Proximity Mine in a friendly lane. \n \n *(Proximity Mine: When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Proximity Mine',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'DEPLOY_PROXIMITY_MINE_ENHANCED',
    baseCardId: 'DEPLOY_PROXIMITY_MINE',
    faction: 'NEUTRAL_1',
    name: 'Deploy Proximity Mine+',
    type: 'Ordnance',
    subType: 'Mine',
    cost: 1,
    image: '/DroneWars/cards/ProximityMine.png',
    description: 'Create a Proximity Mine in a friendly lane. \n \n *(Proximity Mine: When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Proximity Mine',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'CROSSFIRE_PATTERN',
    baseCardId: 'CROSSFIRE_PATTERN',
    faction: 'NEUTRAL_1',
    name: 'Crossfire Pattern',
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
        targeting: { type: 'NONE' },
      },
    ],

  },
  {
    id: 'CROSSFIRE_PATTERN_ENHANCED',
    baseCardId: 'CROSSFIRE_PATTERN',
    faction: 'NEUTRAL_1',
    name: 'Crossfire Pattern+',
    type: 'Ordnance',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/CrossfirePattern.png',
    description: 'If you control both flank lanes (left and right), deal 4 kinetic damage to both enemy flank ship sections.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane3'],
          operator: 'ALL',
        },
        damage: 4,
        targets: 'FLANK_SECTIONS',
        damageType: 'KINETIC',
        targeting: { type: 'NONE' },
      },
    ],

  },
  {
    id: 'BREACH_THE_LINE',
    baseCardId: 'BREACH_THE_LINE',
    faction: 'NEUTRAL_1',
    name: 'Breach the Line',
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
    id: 'BREACH_THE_LINE_ENHANCED',
    baseCardId: 'BREACH_THE_LINE',
    faction: 'NEUTRAL_1',
    name: 'Breach the Line+',
    type: 'Ordnance',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/BreachTheLine.png',
    description: 'If you control the middle lane, deal 8 kinetic damage to the enemy middle ship section.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane2'],
          operator: 'ALL',
        },
        damage: 8,
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
    faction: 'NEUTRAL_1',
    name: 'Overrun',
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
    id: 'OVERRUN_ENHANCED',
    baseCardId: 'OVERRUN',
    faction: 'NEUTRAL_1',
    name: 'Overrun+',
    type: 'Ordnance',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/Overrun.png',
    description: 'Target a lane you control. If the enemy has no drones in that lane, deal 4 kinetic damage to the corresponding ship section.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: { type: 'CONTROL_LANE_EMPTY', lane: 'TARGET' },
        damage: 4,
        targets: 'CORRESPONDING_SECTION',
        damageType: 'KINETIC',
        targeting: { type: 'SHIP_SECTION', affinity: 'ENEMY', restrictions: ['REQUIRES_LANE_CONTROL'], },
      },
    ],

  },
  {
    id: 'ENCIRCLEMENT',
    baseCardId: 'ENCIRCLEMENT',
    faction: 'NEUTRAL_1',
    name: 'Encirclement',
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
        targeting: { type: 'NONE' },
      },
    ],

  },
  {
    id: 'ENCIRCLEMENT_ENHANCED',
    baseCardId: 'ENCIRCLEMENT',
    faction: 'NEUTRAL_1',
    name: 'Encirclement+',
    type: 'Ordnance',
    cost: 3,
    momentumCost: 2,
    image: '/DroneWars/cards/Encirclement.png',
    description: 'If you control all three lanes, deal 4 kinetic damage to all enemy ship sections.',
    effects: [
      {
        type: 'CONDITIONAL_SECTION_DAMAGE',
        condition: {
          type: 'CONTROL_LANES',
          lanes: ['lane1', 'lane2', 'lane3'],
          operator: 'ALL',
        },
        damage: 4,
        targets: 'ALL_SECTIONS',
        damageType: 'KINETIC',
        targeting: { type: 'NONE' },
      },
    ],

  },
  {
    id: 'SUPPRESSION_FIRE',
    baseCardId: 'SUPPRESSION_FIRE',
    faction: 'NEUTRAL_1',
    name: 'Suppression Fire',
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
  {
    id: 'SUPPRESSION_FIRE_ENHANCED',
    baseCardId: 'SUPPRESSION_FIRE',
    faction: 'NEUTRAL_1',
    name: 'Suppression Fire+',
    type: 'Ordnance',
    cost: 2,
    image: '/DroneWars/cards/SuppressionFire.png',
    description: 'Deal 4 damage to an enemy drone in a lane you control.',
    visualEffect: { type: 'LASER_BLAST' },
    effects: [
      { type: 'DAMAGE', value: 4,
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

  // --- targetSelection Cards ---

  {
    id: 'SCATTER_SHOT',
    baseCardId: 'SCATTER_SHOT',
    faction: 'NEUTRAL_1',
    name: 'Scatter Shot',
    rarity: 'Common',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/ScatterShot.png',
    description: 'Deal 2 damage to 2 random enemy drones in a selected lane.',
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          targetSelection: { method: 'RANDOM', count: 2 }
        },
      },
    ],
  },
  {
    id: 'SCATTER_SHOT_ENHANCED',
    baseCardId: 'SCATTER_SHOT',
    faction: 'NEUTRAL_1',
    name: 'Scatter Shot+',
    type: 'Ordnance',
    cost: 3,
    image: '/DroneWars/cards/ScatterShot.png',
    description: 'Deal 2 damage to 3 random enemy drones in a selected lane.',
    effects: [
      { type: 'DAMAGE', value: 2,
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          targetSelection: { method: 'RANDOM', count: 3 }
        },
      },
    ],
  },
  {
    id: 'HEADHUNTER_VOLLEY',
    baseCardId: 'HEADHUNTER_VOLLEY',
    faction: 'NEUTRAL_1',
    name: 'Headhunter Volley',
    rarity: 'Uncommon',
    type: 'Ordnance',
    cost: 5,
    image: '/DroneWars/cards/HeadhunterVolley.png',
    description: 'Destroy the enemy drone with the highest attack in a selected lane.',
    effects: [
      { type: 'DESTROY',
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          targetSelection: { method: 'HIGHEST', stat: 'attack', count: 1 }
        },
      },
    ],
  },
  {
    id: 'HEADHUNTER_VOLLEY_ENHANCED',
    baseCardId: 'HEADHUNTER_VOLLEY',
    faction: 'NEUTRAL_1',
    name: 'Headhunter Volley+',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/HeadhunterVolley.png',
    description: 'Destroy the enemy drone with the highest attack in a selected lane.',
    effects: [
      { type: 'DESTROY',
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          targetSelection: { method: 'HIGHEST', stat: 'attack', count: 1 }
        },
      },
    ],
  },
  {
    id: 'CULL_THE_WEAK',
    baseCardId: 'CULL_THE_WEAK',
    faction: 'NEUTRAL_1',
    name: 'Cull the Weak',
    rarity: 'Common',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/CullTheWeak.png',
    description: 'Deal 3 damage to the 2 enemy drones with the lowest class in a selected lane.',
    effects: [
      { type: 'DAMAGE', value: 3,
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          targetSelection: { method: 'LOWEST', stat: 'class', count: 2 }
        },
      },
    ],
  },
  {
    id: 'CULL_THE_WEAK_ENHANCED',
    baseCardId: 'CULL_THE_WEAK',
    faction: 'NEUTRAL_1',
    name: 'Cull the Weak+',
    type: 'Ordnance',
    cost: 4,
    image: '/DroneWars/cards/CullTheWeak.png',
    description: 'Deal 3 damage to the 3 enemy drones with the lowest class in a selected lane.',
    effects: [
      { type: 'DAMAGE', value: 3,
        targeting: {
          type: 'LANE', affinity: 'ENEMY',
          targetSelection: { method: 'LOWEST', stat: 'class', count: 3 }
        },
      },
    ],
  },
];
