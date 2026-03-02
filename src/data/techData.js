// ========================================
// TECH DATA
// ========================================
// Definitions for Tech drones — non-combat deployables that live in techSlots.
// Moved from droneData.js to separate data concerns.
// Tech drones are inert (cannot move, attack, be healed) with fixed 0/1/0/0 stats.
// They are deployed via CREATE_TECH card effects, never during deployment phase.

const fullTechCollection = [
  {
    name: 'Proximity Mine',
    class: 0,
    limit: 999,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 0,
    hull: 1,
    shields: 0,
    speed: 0,
    image: '/DroneWars/img/ProximityMine.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Proximity Detonation',
        description: 'When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        destroyAfterTrigger: true,
        effects: [{ type: 'DAMAGE', value: 4, scope: 'TRIGGERING_DRONE' }]
      },
      {
        name: 'Inert',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INERT' }
      },
      {
        name: 'Passive',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'PASSIVE' }
      }
    ],
    upgradeSlots: 0
  },
  {
    name: 'Inhibitor Mine',
    class: 0,
    limit: 999,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 0,
    hull: 1,
    shields: 0,
    speed: 0,
    image: '/DroneWars/img/ThrusterInhibitor.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Inhibitor Detonation',
        description: 'When an enemy drone is deployed into this lane, exhaust it. Then destroy this mine.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_DEPLOYMENT',
        triggerOwner: 'LANE_OWNER',
        destroyAfterTrigger: true,
        effects: [{ type: 'EXHAUST_DRONE', scope: 'TRIGGERING_DRONE' }]
      },
      {
        name: 'Inert',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INERT' }
      },
      {
        name: 'Passive',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'PASSIVE' }
      }
    ],
    upgradeSlots: 0
  },
  {
    name: 'Jitter Mine',
    class: 0,
    limit: 999,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 0,
    hull: 1,
    shields: 0,
    speed: 0,
    image: '/DroneWars/img/ThrusterInhibitor.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Jitter Detonation',
        description: 'When an enemy drone attacks from this lane, give it -4 attack permanently. Then destroy this mine.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_ATTACK',
        triggerOwner: 'LANE_OWNER',
        destroyAfterTrigger: true,
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: -4, type: 'permanent' }, scope: 'TRIGGERING_DRONE' }]
      },
      {
        name: 'Inert',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INERT' }
      },
      {
        name: 'Passive',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'PASSIVE' }
      }
    ],
    upgradeSlots: 0
  },
  {
    name: 'Rally Beacon',
    class: 0,
    limit: 999,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 0,
    hull: 1,
    shields: 0,
    speed: 0,
    image: '/DroneWars/img/RallyBeacon.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Rally Point',
        description: 'When a friendly drone moves into this lane, go again.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'GO_AGAIN' }]
      },
      {
        name: 'Inert',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INERT' }
      },
      {
        name: 'Passive',
        description: '',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'PASSIVE' }
      }
    ],
    upgradeSlots: 0
  },
  {
    name: 'Jammer',
    class: 0,
    limit: 999,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 0,
    hull: 1,
    shields: 0,
    speed: 0,
    image: '/DroneWars/img/Jammer.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Jammer',
        description: 'While this drone is ready in a lane, opponent card effects can only target this drone.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'JAMMER' }
      },
      {
        name: 'Inert',
        description: 'Inert.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INERT' }
      },
      {
        name: 'Passive',
        description: 'Passive.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'PASSIVE' }
      }
    ],
    upgradeSlots: 0
  },
];

export default fullTechCollection;
