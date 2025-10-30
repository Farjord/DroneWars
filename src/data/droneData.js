// --- DATA ---
const fullDroneCollection = [
  { name: 'Scout Drone', class: 1, limit: 3, attack: 1, hull: 1, shields: 1, speed: 6, image: '/DroneWars/img/Scout.png', abilities: [],  upgradeSlots: 2 },
  { name: 'Standard Fighter', class: 2, limit: 3, attack: 3, hull: 2, shields: 1, speed: 4, image: '/DroneWars/img/StandardFighter.png', abilities: [],  upgradeSlots: 2 },
  { name: 'Heavy Fighter', class: 3, limit: 2, attack: 4, hull: 4, shields: 1, speed: 3, image: '/DroneWars/img/HeavyFighter.png', abilities: [], upgradeSlots: 2 },
   { 
    name: 'Guardian Drone', 
    class: 3, 
    limit: 2, 
    attack: 1, 
    hull: 5, 
    shields: 1, 
    speed: 1, 
    image: '/DroneWars/img/Guardian.png', 
    abilities: [{
        name: 'Guardian Protocol',
        description: 'The ship section in this lane cannot be targeted by attacks while this drone is active.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'GUARDIAN' },
    }],
    upgradeSlots: 2 
  },
    { 
    name: 'Bomber', 
    class: 3, 
    limit: 3, 
    attack: 1,
    hull: 2, 
    shields: 1, 
    speed: 1, 
    image: '/DroneWars/img/Bomber.png', 
    abilities: [{
        name: 'Tachyon Warhead',
        description: 'Deals +5 damage when attacking an enemy ship section.',
        type: 'PASSIVE',
        effect: { type: 'BONUS_DAMAGE_VS_SHIP', value: 4 }
        }],
    upgradeSlots: 2 
  },
  { 
    name: 'Repair Drone', 
    class: 1, limit: 2, attack: 0, hull: 1, shields: 3, speed: 2, 
    image: '/DroneWars/img/Repair.png', 
    abilities: [{
        name: 'Hull Repair',
        description: 'Pay 1 Energy and exhaust to restore 3 hull to a damaged friendly drone in the same lane.',
        type: 'ACTIVE',
        targeting: {
            type: 'DRONE',
            affinity: 'FRIENDLY',
            location: 'SAME_LANE',
            custom: ['DAMAGED_HULL']
        },
        effect: { type: 'HEAL', value: 3 },
        cost: { energy: 1, exhausts: true }
         }],
    upgradeSlots: 2 
  },
{ 
    name: 'Interceptor', 
    class: 3, limit: 3, attack: 1, hull: 4, shields: 0, speed: 5, 
    image: '/DroneWars/img/Interceptor.png',
    abilities: [{
        name: 'Defender',
        description: 'Does not exhaust when intercepting.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'DEFENDER' }
        }],
    upgradeSlots: 2 
  },
  { 
    name: 'Aegis Drone', 
    class: 3, limit: 2, attack: 1, hull: 2, shields: 2, speed: 2, 
    image: '/DroneWars/img/Aegis.png',
    abilities: [{
        name: 'Shield Harmonizer',
        description: 'Other friendly drones in this lane gain +1 max shields.',
        type: 'PASSIVE',
        scope: 'FRIENDLY_IN_LANE',
        effect: { type: 'MODIFY_STAT', stat: 'shields', value: 1 }
        }],
    upgradeSlots: 2 
  },
{ 
  name: 'Kamikaze Drone', 
  class: 1, 
  limit: 4, 
  attack: 3, 
  hull: 1, 
  shields: 0, 
  speed: 2, 
  image: '/DroneWars/img/Kamikaze.png', 
  abilities: [{
      name: 'Self-Destruct',
      description: 'This drone is destroyed after it attacks.',
      type: 'PASSIVE',
      effect: { type: 'AFTER_ATTACK', subEffect: { type: 'DESTROY_SELF' } }
      }],
  upgradeSlots: 2 
},
  { name: 'Swarm Drone', class: 0, limit: 3, attack: 1, hull: 1, shields: 0, speed: 3, image: '/DroneWars/img/Swarm.png', abilities: [], upgradeSlots: 3 },
  { 
    name: 'Sniper Drone', 
    class: 4, limit: 2, attack: 1, hull: 1, shields: 0, speed: 2, 
    image: '/DroneWars/img/Sniper.png', 
    abilities: [{
        name: 'Long-Range Shot',
        description: 'Pay 1 Energy and exhaust to deal 4 damage to an enemy drone in any lane.',
        type: 'ACTIVE',
        targeting: {
            type: 'DRONE',
            affinity: 'ENEMY',
            location: 'ANY_LANE'
        },
        effect: { type: 'DAMAGE', value: 4 },
        cost: { energy: 1, exhausts: true }
        }],
    upgradeSlots: 2 
  },
  { 
    name: 'Sabot Drone', 
    class: 3, 
    limit: 2, 
    attack: 2, 
    hull: 3, 
    shields: 1, 
    speed: 2, 
    image: '/DroneWars/img/Sabot.png', 
    abilities: [{
    name: 'Piercing',
    description: 'Damage ignores enemy shields.',
    type: 'PASSIVE',
    effect: { type: 'GRANT_KEYWORD', keyword: 'PIERCING' }
    }],
    upgradeSlots: 2 
  },
  { 
    name: 'Avenger Drone', 
    class: 1, 
    limit: 2, 
    attack: 1, 
    hull: 1, 
    shields: 1, 
    speed: 3, 
    image: '/DroneWars/img/Avenger.png', 
    abilities: [{
        name: 'Vengeance Protocol',
        description: 'Gains +3 attack if the friendly ship section in this lane has taken hull damage.',
        type: 'PASSIVE',
        effect: {
            type: 'CONDITIONAL_MODIFY_STAT',
            mod: { stat: 'attack', value: 3 },
            condition: {
                type: 'SHIP_SECTION_HULL_DAMAGED',
                location: 'SAME_LANE'
            }
        }
      }],
    upgradeSlots: 2 
  },
   { 
    name: 'Gladiator', 
    class: 2, 
    limit: 2, 
    attack: 2, 
    hull: 2, 
    shields: 2, 
    speed: 3, 
    image: '/DroneWars/img/Gladiator.png', 
    abilities: [{
        name: 'Veteran Instincts',
        description: 'Gains +1 attack permanently after it attacks.',
        type: 'PASSIVE',
        effect: { type: 'AFTER_ATTACK', subEffect: { type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } } }
        }],
    upgradeSlots: 2 
  },
  {
    name: 'Vindicator Drone',
    class: 1,
    limit: 3,
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 3,
    image: '/DroneWars/img/Vindicator.png',
    abilities: [{
        name: 'Retribution',
        description: 'Gains +1 attack for each of your damaged or critical ship sections.',
        type: 'PASSIVE',
        effect: {
            type: 'CONDITIONAL_MODIFY_STAT_SCALING',
            mod: { stat: 'attack', value: 1 },
            condition: {
                type: 'OWN_DAMAGED_SECTIONS',
            }
        }
     }],
    upgradeSlots: 2 
  },
    {
    name: 'Skirmisher Drone',
    class: 1,
    limit: 3,
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 1,
    image: '/DroneWars/img/Skirmisher.png',
    abilities: [{
        name: 'Flanking',
        description: 'Gains +1 attack and +2 speed while in an outer lane (Lane 1 or Lane 3).',
        type: 'PASSIVE',
        effect: {
            type: 'FLANKING_BONUS',
            mods: [
                { stat: 'attack', value: 1 },
                { stat: 'speed', value: 2 }
            ]
        }
      }],
    upgradeSlots: 2 
  },
  {
    name: 'Phase Jumper',
    class: 1,
    limit: 3,
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 1,
    image: '/DroneWars/img/PhaseJumper.png', 
    abilities: [{
        name: 'Phase Shift',
        description: 'After this drone moves, permanently gain +1 Attack and +1 Speed.',
        type: 'TRIGGERED',
        trigger: 'ON_MOVE',
        effects: [
            { type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } },
            { type: 'PERMANENT_STAT_MOD', mod: { stat: 'speed', value: 1, type: 'permanent' } }
        ]
     }],
    upgradeSlots: 2 
  },
  {
    name: 'Nano Repair Drone',
    class: 1, limit: 2, attack: 0, hull: 1, shields: 3, speed: 2,
    image: '/DroneWars/img/NanoRepair.png',
    abilities: [{
        name: 'Nano Repair Swarm',
        description: 'Pay 1 Energy and exhaust to restore 1 hull to all damaged friendly drones in the same lane.',
        type: 'ACTIVE',
        targeting: {
            type: 'LANE',
            affinity: 'FRIENDLY',
            location: 'SAME_LANE'
        },
        effect: { type: 'HEAL', value: 1, scope: 'LANE' },
        cost: { energy: 1, exhausts: true }
         }],
    upgradeSlots: 2
  },
  {
    name: 'Jammer',
    class: 0,
    limit: 999, // Not selectable, so limit doesn't matter
    attack: 0,
    hull: 1,
    shields: 0,
    speed: 1,
    image: '/DroneWars/img/Jammer.png',
    selectable: false, // Cannot be selected in deck builder or drone selection
    maxPerLane: 1, // Only one Jammer allowed per lane
    abilities: [{
        name: 'Jammer',
        description: 'While this drone is ready in a lane, opponent card effects can only target this drone.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'JAMMER' }
    }],
    upgradeSlots: 0
  },
  {
    name: 'Scanner',
    class: 1,
    limit: 3,
    attack: 1,
    hull: 1,
    shields: 0,
    speed: 4,
    image: '/DroneWars/img/Scanner.png',
    abilities: [{
        name: 'Target Scanner',
        description: 'On deploy, mark a random enemy drone in the same lane.',
        type: 'TRIGGERED',
        trigger: 'ON_DEPLOY',
        effect: { type: 'MARK_RANDOM_ENEMY', scope: 'SAME_LANE', filter: 'NOT_MARKED' }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Hunter',
    class: 2,
    limit: 3,
    attack: 2,
    hull: 1,
    shields: 2,
    speed: 3,
    image: '/DroneWars/img/Hunter.png',
    abilities: [{
        name: 'Hunter Protocol',
        description: 'Gains Piercing when attacking marked targets.',
        type: 'PASSIVE',
        effect: {
            type: 'CONDITIONAL_KEYWORD',
            keyword: 'PIERCING',
            condition: { type: 'TARGET_IS_MARKED' }
        }
    }],
    upgradeSlots: 2
  },

];

export default fullDroneCollection;