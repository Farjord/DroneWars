import { Shield, Bomb, Wrench, ShieldCheck, ChevronUp, Sword, ChevronRight, Target, Skull } from 'lucide-react';


// --- DATA ---
const fullDroneCollection = [
  { name: 'Scout Drone', class: 1, limit: 3, attack: 1, hull: 1, shields: 1, speed: 5, image: '/img/Scout.png', abilities: [],  upgradeSlots: 2 },
  { name: 'Standard Fighter', class: 2, limit: 3, attack: 3, hull: 2, shields: 1, speed: 4, image: '/img/StandardFighter.png', abilities: [],  upgradeSlots: 2 },
  { name: 'Heavy Fighter', class: 3, limit: 2, attack: 4, hull: 4, shields: 1, speed: 3, image: '/img/HeavyFighter.png', abilities: [], upgradeSlots: 2 },
   { 
    name: 'Guardian Drone', 
    class: 3, 
    limit: 2, 
    attack: 1, 
    hull: 5, 
    shields: 1, 
    speed: 1, 
    image: '/img/Guardian.png', 
    abilities: [{
        name: 'Guardian Protocol',
        description: 'The ship section in this lane cannot be targeted by attacks while this drone is active.',
        type: 'PASSIVE',
        icon: Shield,
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
    image: '/img/Bomber.png', 
    abilities: [{ 
        name: 'Tachyon Warhead',
        description: 'Deals +5 damage when attacking an enemy ship section.',
        type: 'PASSIVE',
        icon: Bomb,
        effect: { type: 'BONUS_DAMAGE_VS_SHIP', value: 4 }
        }],
    upgradeSlots: 2 
  },
  { 
    name: 'Repair Drone', 
    class: 1, limit: 2, attack: 0, hull: 1, shields: 3, speed: 2, 
    image: '/img/Repair.png', 
    abilities: [{
        name: 'Hull Repair',
        description: 'Pay 1 Energy and exhaust to restore 3 hull to a damaged friendly drone in the same lane.',
        type: 'ACTIVE',
        icon: Wrench,
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
    class: 3, limit: 3, attack: 1, hull: 4, shields: 0, speed: 2, 
    image: '/img/Interceptor.png',
    abilities: [{
        name: 'Vigilant',
        description: 'Can always intercept attacks in this lane, regardless of speed.',
        type: 'PASSIVE',
        icon: ShieldCheck,
        effect: { type: 'GRANT_KEYWORD', keyword: 'ALWAYS_INTERCEPTS' }
    }, {
        name: 'Defender',
        description: 'Does not exhaust when intercepting.',
        type: 'PASSIVE',
        icon: Shield,
        effect: { type: 'GRANT_KEYWORD', keyword: 'DEFENDER' }
        }],
    upgradeSlots: 2 
  },
  { 
    name: 'Aegis Drone', 
    class: 3, limit: 2, attack: 1, hull: 2, shields: 2, speed: 2, 
    image: '/img/Aegis.png',
    abilities: [{
        name: 'Shield Harmonizer',
        description: 'Other friendly drones in this lane gain +1 max shields.',
        type: 'PASSIVE',
        icon: Shield,
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
  speed: 3, 
  image: '/img/Kamikaze.png', 
  abilities: [{
      name: 'Self-Destruct',
      description: 'This drone is destroyed after it attacks.',
      type: 'PASSIVE',
      icon: Skull,
      effect: { type: 'AFTER_ATTACK', subEffect: { type: 'DESTROY_SELF' } }
      }],
  upgradeSlots: 2 
},
  { name: 'Swarm Drone', class: 0, limit: 3, attack: 1, hull: 1, shields: 0, speed: 3, image: '/img/Swarm.png', abilities: [], upgradeSlots: 3 },
  { 
    name: 'Sniper Drone', 
    class: 4, limit: 2, attack: 1, hull: 1, shields: 0, speed: 2, 
    image: '/img/Sniper.png', 
    abilities: [{
        name: 'Long-Range Shot',
        description: 'Pay 1 Energy and exhaust to deal 4 damage to an enemy drone in any lane.',
        type: 'ACTIVE',
        icon: Target,
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
    image: '/img/Sabot.png', 
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
    image: '/img/Avenger.png', 
    abilities: [{
        name: 'Vengeance Protocol',
        description: 'Gains +3 attack if the friendly ship section in this lane has taken hull damage.',
        type: 'PASSIVE',
        icon: Sword,
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
    image: '/img/Gladiator.png', 
    abilities: [{
        name: 'Veteran Instincts',
        description: 'Gains +1 attack permanently after it attacks.',
        type: 'PASSIVE',
        icon: ChevronUp,
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
    image: '/img/Vindicator.png',
    abilities: [{
        name: 'Retribution',
        description: 'Gains +1 attack for each of your damaged or critical ship sections.',
        type: 'PASSIVE',
        icon: Sword,
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
    image: '/img/Skirmisher.png',
    abilities: [{
        name: 'Flanking',
        description: 'Gains +1 attack and +2 speed while in an outer lane (Lane 1 or Lane 3).',
        type: 'PASSIVE',
        icon: ChevronRight,
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
    image: '/img/PhaseJumper.png', 
    abilities: [{
        name: 'Phase Shift',
        description: 'After this drone moves, permanently gain +1 Attack and +1 Speed.',
        type: 'TRIGGERED',
        trigger: 'ON_MOVE',
        icon: ChevronRight,
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
    image: '/img/NanoRepair.png', 
    abilities: [{
        name: 'Nano Repair Swarm',
        description: 'Pay 1 Energy and exhaust to restore 1 hull to all damaged friendly drones in the same lane.',
        type: 'ACTIVE',
        icon: Wrench,
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
  
];

export default fullDroneCollection;