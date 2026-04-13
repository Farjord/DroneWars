// ========================================
// TECH DATA
// ========================================
// Definitions for Tech — non-combat enchantment-like entities that live in techSlots.
// Moved from droneData.js to separate data concerns.
// Tech is deployed via CREATE_TECH card effects, never during deployment phase.
// Removable only by dedicated DESTROY_TECH effects (e.g., "System Purge" card).

// Description Formatting (rendered by formatCardText):
//   *text*       → italic
//   **text**     → bold
//   ***text***   → keyword (bold + purple)
//   \n           → line break

const fullTechCollection = [
  {
    name: 'Proximity Mine',
    hull: 1,
    image: '/DroneWars/img/ProximityMine.png',
    selectable: false,
    maxPerLane: 999,
    isToken: true,
    isTech: true,
    subType: 'mine',
    abilities: [
      {
        name: 'Proximity Detonation',
        description: 'When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_ENEMY',
        destroyAfterTrigger: true,
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'DAMAGE', value: 4, scope: 'TRIGGERING_DRONE', effectTarget: 'TRIGGER_OWNER' }]
      }
    ]
  },
  {
    name: 'Inhibitor Mine',
    hull: 1,
    image: '/DroneWars/img/ThrusterInhibitor.png',
    selectable: false,
    maxPerLane: 999,
    isToken: true,
    isTech: true,
    subType: 'mine',
    abilities: [
      {
        name: 'Inhibitor Detonation',
        description: 'When an enemy drone is deployed into this lane, exhaust it. Then destroy this mine.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_DEPLOYMENT',
        triggerOwner: 'LANE_ENEMY',
        destroyAfterTrigger: true,
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'EXHAUST_DRONE', scope: 'TRIGGERING_DRONE', effectTarget: 'TRIGGER_OWNER' }]
      }
    ]
  },
  {
    name: 'Jitter Mine',
    hull: 1,
    image: '/DroneWars/img/JitterMine.png',
    selectable: false,
    maxPerLane: 999,
    isToken: true,
    isTech: true,
    subType: 'mine',
    abilities: [
      {
        name: 'Jitter Detonation',
        description: 'When an enemy drone attacks from this lane, give it -4 attack permanently. Then destroy this mine.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_ATTACK',
        triggerOwner: 'LANE_ENEMY',
        destroyAfterTrigger: true,
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: -4, type: 'temporary' }, scope: 'TRIGGERING_DRONE', effectTarget: 'TRIGGER_OWNER' }]
      }
    ]
  },
  {
    name: 'Rally Beacon',
    hull: 1,
    image: '/DroneWars/img/RallyBeacon.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Rally Point',
        description: 'When a friendly drone moves into this lane, go again. (Once per round)',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        triggerTiming: 'OWN_TURN_ONLY',
        usesPerRound: 1,
        effects: [{ type: 'GO_AGAIN', effectTarget: 'TRIGGER_OWNER' }]
      }
    ]
  },
  {
    name: 'Jammer',
    hull: 1,
    image: '/DroneWars/img/Jammer.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Jammer',
        description: 'While this Jammer is active, opponent card effects targeting drones in this lane can only target this Jammer.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'JAMMER' }
      },
      {
        name: 'Auto-Destruct',
        description: 'Destroyed at the start of the next round.',
        type: 'TRIGGERED',
        trigger: 'ON_ROUND_END',
        triggerOwner: 'LANE_OWNER',
        triggerTiming: 'ANY_TURN',
        destroyAfterTrigger: true,
        effects: []
      }
    ]
  },
  {
    name: 'Thruster Inhibitor',
    hull: 1,
    image: '/DroneWars/img/ThrusterInhibitor.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Thruster Lock',
        description: 'Enemy drones in this lane cannot move out.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INHIBIT_MOVEMENT' }
      },
      {
        name: 'Auto-Destruct',
        description: 'Destroyed at the start of the next round.',
        type: 'TRIGGERED',
        trigger: 'ON_ROUND_END',
        triggerOwner: 'LANE_OWNER',
        triggerTiming: 'ANY_TURN',
        destroyAfterTrigger: true,
        effects: []
      }
    ]
  },
  {
    name: 'Repair Relay',
    hull: 1,
    image: '/DroneWars/img/RepairRelay.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Regenerative Field',
        description: 'End of round: If you control this lane, heal 1 hull to the ship section in this lane.',
        type: 'TRIGGERED',
        trigger: 'ON_ROUND_END',
        triggerTiming: 'ANY_TURN',
        triggerFilter: { laneControl: 'CONTROLLED_BY_ACTOR' },
        effects: [{ type: 'HEAL_HULL', value: 1, targetType: 'SHIP_SECTION', effectTarget: 'TRIGGER_OWNER' }]
      }
    ]
  },
  {
    name: 'Shield Array',
    hull: 1,
    image: '/DroneWars/img/ShieldArray.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Shield Amplifier',
        description: 'Other friendly drones in this lane gain +1 max shields.',
        type: 'PASSIVE',
        scope: 'FRIENDLY_IN_LANE',
        effect: { type: 'MODIFY_STAT', stat: 'shields', value: 1 }
      }
    ]
  },
  {
    name: 'Relay Beacon',
    hull: 1,
    image: '/DroneWars/img/RelayBeacon.png',
    selectable: false,
    maxPerLane: 1,
    isToken: true,
    isTech: true,
    abilities: [
      {
        name: 'Signal Relay',
        description: 'When any drone moves into this lane, draw a card.',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'ANY',
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'DRAW', value: 1, effectTarget: 'TRIGGER_OWNER' }]
      }
    ]
  },
];

export default fullTechCollection;
