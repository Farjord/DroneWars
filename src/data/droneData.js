// Description Formatting (rendered by formatCardText):
//   *text*       → italic
//   **text**     → bold
//   ***text***   → keyword (bold + purple)
//   \n           → line break

// --- DATA ---
// rebuildRate: Units rebuilt per round (see drone_availability_rebuild_system_prd.md)
// - Core Defense/Interceptor (limit 3): 2.0 (fast recovery)
// - Attrition/Bombardment (limit 3-4): 1.0 (standard)
// - Lane Control/Guardian (limit 2): 1.0 (standard)
// - Investment/Scaling (limit 2-3): 1.0 (standard)
// - Mythic/Siege (limit 1): 0.5 (slow recovery)
// - Recovery rate of 0 (cannot recover — needs cards to do so) is a potential future class trait

const fullDroneCollection = [
  { name: 'Dart', class: 1, limit: 3, rebuildRate: 2.0, rarity: 'Common', attack: 1, hull: 1, shields: 1, speed: 6, image: '/DroneWars/img/Scout.png', abilities: [],  upgradeSlots: 2 },
  { name: 'Talon', class: 2, limit: 3, rebuildRate: 1.0, rarity: 'Common', attack: 3, hull: 2, shields: 1, speed: 4, image: '/DroneWars/img/StandardFighter.png', abilities: [],  upgradeSlots: 3 },
  { name: 'Mammoth', class: 3, limit: 1, rebuildRate: 0.5, rarity: 'Common', attack: 4, hull: 4, shields: 2, speed: 3, image: '/DroneWars/img/HeavyFighter.png', abilities: [], upgradeSlots: 1 },
   {
    name: 'Bastion',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Uncommon',
    attack: 1,
    hull: 4,
    shields: 0,
    speed: 1,
    image: '/DroneWars/img/Guardian.png',
    abilities: [{
        name: 'Guardian Protocol',
        description: 'The ship section in this lane cannot be targeted by attacks while this drone is active.',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'GUARDIAN' },
    }],
    upgradeSlots: 1 
  },
    {
    name: 'Devastator',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Common',
    attack: 1,
    hull: 3,
    shields: 2,
    speed: 1,
    image: '/DroneWars/img/Bomber.png', 
    abilities: [{
        name: 'Tachyon Warhead',
        description: 'Deals +5 damage when attacking an enemy ship section.',
        type: 'PASSIVE',
        effect: { type: 'BONUS_DAMAGE_VS_SHIP', value: 5 }
        }],
    upgradeSlots: 2 
  },
  {
    name: 'Seraph',
    class: 1, limit: 2, rebuildRate: 1.0, rarity: 'Common', attack: 0, hull: 1, shields: 3, speed: 2,
    image: '/DroneWars/img/Repair.png', 
    abilities: [{
        name: 'Hull Repair',
        description: 'Pay 1 Energy and exhaust to restore 3 hull to a damaged friendly drone in the same lane.',
        type: 'ACTIVE',
        targeting: {
            type: 'DRONE',
            affinity: 'FRIENDLY',
            location: 'SAME_LANE',
            restrictions: ['DAMAGED_HULL']
        },
        effect: { type: 'HEAL', value: 3 },
        cost: { energy: 1, exhausts: true }
         }],
    upgradeSlots: 2 
  },
{
    name: 'Harrier',
    class: 3, limit: 2, rebuildRate: 1, rarity: 'Uncommon', attack: 1, hull: 2, shields: 3, speed: 5,
    image: '/DroneWars/img/Interceptor.png',
    abilities: [],
    upgradeSlots: 2
  },
  {
    name: 'Aegis',
    class: 3, limit: 2, rebuildRate: 0.5, rarity: 'Rare', attack: 1, hull: 2, shields: 3, speed: 2,
    image: '/DroneWars/img/Aegis.png',
    abilities: [{
        name: 'Shield Harmonizer',
        description: 'Adjacent friendly drones in this lane gain +2 max shields.',
        type: 'PASSIVE',
        scope: 'FRIENDLY_ADJACENT',
        effect: { type: 'MODIFY_STAT', stat: 'shields', value: 2 }
        }],
    upgradeSlots: 2 
  },
{
  name: 'Firefly',
  class: 1,
  limit: 4,
  rebuildRate: 2.0,
  rarity: 'Common',
  attack: 3,
  hull: 1,
  shields: 0,
  speed: 2,
  image: '/DroneWars/img/Kamikaze.png', 
  abilities: [{
      name: 'Self-Destruct',
      description: 'This drone is destroyed after it attacks.',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACK',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'DESTROY', scope: 'SELF', effectTarget: 'TRIGGER_OWNER' }]
      }],
  upgradeSlots: 2 
},
  {
    name: 'Manticore',
    class: 1,
    limit: 3,
    rebuildRate: 2.0,
    rarity: 'Common',
    attack: 1,
    hull: 1,
    shields: 0,
    speed: 3,
    image: '/DroneWars/img/Manticore.png',
    abilities: [{
      name: 'Stinger Missile',
      description: 'End of round: Deal 2 damage to a random enemy drone in this lane.',
      type: 'TRIGGERED',
      trigger: 'ON_ROUND_END',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'DAMAGE', value: 2, targetSelection: { method: 'RANDOM', count: 1 }, scope: 'SAME_LANE', affinity: 'ENEMY', effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 1
  },
  { name: 'Locust', class: 0, limit: 3, rebuildRate: 2.0, rarity: 'Common', attack: 1, hull: 1, shields: 0, speed: 3, image: '/DroneWars/img/Swarm.png', abilities: [], upgradeSlots: 3 },
  {
    name: 'Basilisk',
    class: 3, limit: 2, rebuildRate: 0.5, rarity: 'Uncommon', attack: 1, hull: 2, shields: 1, speed: 2,
    image: '/DroneWars/img/Sniper.png',
    abilities: [{
        name: 'Long-Range Shot',
        description: 'Pay 1 Energy and exhaust to deal 2 damage to an enemy drone in another lane.',
        type: 'ACTIVE',
        targeting: {
            type: 'DRONE',
            affinity: 'ENEMY',
            location: 'OTHER_LANES'
        },
        effect: { type: 'DAMAGE', value: 2 },
        cost: { energy: 1, exhausts: true },
        activationLimit: 1  
        }],
    upgradeSlots: 2
  },
  {
    name: 'Sabot',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Rare',
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
    name: 'Avenger',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Common',
    attack: 1,
    hull: 1,
    shields: 2,
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
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 1,
    hull: 2,
    shields: 2,
    speed: 3,
    image: '/DroneWars/img/Gladiator.png', 
    abilities: [{
        name: 'Veteran Instincts',
        description: 'Gains +1 attack permanently after it attacks.',
        type: 'TRIGGERED',
        trigger: 'ON_ATTACK',
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' }]
        }],
    upgradeSlots: 2
  },
  {
    name: 'Vindicator',
    class: 1,
    limit: 3,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 4,
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
    name: 'Skirmisher',
    class: 1,
    limit: 3,
    rebuildRate: 2.0,
    rarity: 'Uncommon',
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
    name: 'Specter',
    class: 1,
    limit: 3,
    rebuildRate: 1.0,
    rarity: 'Common',
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
        triggerTiming: 'ANY_TURN',
        effects: [
            { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' },
            { type: 'MODIFY_STAT', mod: { stat: 'speed', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' }
        ]
     }],
    upgradeSlots: 2 
  },
    {
    name: 'Osiris',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Common',
    attack: 0,
    hull: 4,
    shields: 1,
    speed: 5,
    image: '/DroneWars/img/Osiris.png', 
    abilities: [{
        name: 'Regeneration Protocol',
        description: 'After this drone moves, heal 4 hull.',
        type: 'TRIGGERED',
        trigger: 'ON_MOVE',
        triggerTiming: 'ANY_TURN',
        effects: [
            { type: 'HEAL_HULL', value: 4, scope: 'SELF', effectTarget: 'TRIGGER_OWNER' }
        ]
     }],
    upgradeSlots: 1 
  },
  {
    name: 'Elixir',
    class: 1, limit: 2, rebuildRate: 1.0, rarity: 'Common', attack: 0, hull: 1, shields: 3, speed: 2,
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
  // Jammer moved to techData.js (Tech Slots feature)
  {
    name: 'Scanner',
    class: 1,
    limit: 3,
    rebuildRate: 2.0,
    rarity: 'Common',
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
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'MARK_DRONE', scope: 'SAME_LANE', affinity: 'ENEMY', filter: 'NOT_MARKED',
            targetSelection: { method: 'RANDOM', count: 1 }, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  {
    name: 'Hunter',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
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
  {
    name: 'Blitz',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 3,
    image: '/DroneWars/img/Blitz.png',
    abilities: [{
      name: 'Rapid Response',
      description: 'First move each round does not exhaust this drone.',
      type: 'TRIGGERED',
      trigger: 'ON_MOVE',
      triggerTiming: 'ANY_TURN',
      usesPerRound: 1,
      keywordIcon: 'RAPID',
      effects: [{ type: 'DOES_NOT_EXHAUST', effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  {
    name: 'Striker',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Uncommon',
    attack: 2,
    hull: 2,
    shields: 3,
    speed: 3,
    image: '/DroneWars/img/Striker.png',
    abilities: [{
      name: 'Assault Protocol',
      description: 'First attack each round does not exhaust this drone.',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACK',
      triggerTiming: 'ANY_TURN',
      usesPerRound: 1,
      keywordIcon: 'ASSAULT',
      effects: [{ type: 'DOES_NOT_EXHAUST', effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  {
    name: 'Tempest',
    class: 4,
    limit: 1,
    rebuildRate: 0,
    rarity: 'Mythic',
    attack: 3,
    hull: 4,
    shields: 4,
    speed: 2,
    image: '/DroneWars/img/Tempest.png',
    abilities: [
      {
        name: 'Rapid Response',
        description: 'First move each round does not exhaust this drone.',
        type: 'TRIGGERED',
        trigger: 'ON_MOVE',
        triggerTiming: 'ANY_TURN',
        usesPerRound: 1,
        keywordIcon: 'RAPID',
        effects: [{ type: 'DOES_NOT_EXHAUST', effectTarget: 'TRIGGER_OWNER' }]
      },
      {
        name: 'Assault Protocol',
        description: 'First attack each round does not exhaust this drone.',
        type: 'TRIGGERED',
        trigger: 'ON_ATTACK',
        triggerTiming: 'ANY_TURN',
        usesPerRound: 1,
        keywordIcon: 'ASSAULT',
        effects: [{ type: 'DOES_NOT_EXHAUST', effectTarget: 'TRIGGER_OWNER' }]
      }
    ],
    upgradeSlots: 1
  },
  {
    name: 'Viper',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 5,
    image: '/DroneWars/img/Viper.png',
    abilities: [{
      name: 'Dogfight',
      description: 'When this drone intercepts, deals its attack damage to the attacker.',
      type: 'TRIGGERED',
      trigger: 'ON_INTERCEPT',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'COUNTER_DAMAGE', scope: 'ATTACKER', damageType: 'DOGFIGHT', effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  {
    name: 'Thornback',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 2,
    hull: 3,
    shields: 1,
    speed: 2,
    image: '/DroneWars/img/Thornback.png',
    abilities: [{
      name: 'Retaliate',
      description: 'When this drone is attacked and survives, deals its attack damage to the attacker.',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACKED',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'COUNTER_DAMAGE', scope: 'ATTACKER', damageType: 'RETALIATE', effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  {
    name: 'Scorpion',
    class: 3,
    limit: 1,
    rebuildRate: 0.5,
    rarity: 'Mythic',
    attack: 2,
    hull: 3,
    shields: 2,
    speed: 4,
    image: '/DroneWars/img/Scorpion.png',
    abilities: [
      {
        name: 'Dogfight',
        description: 'On intercept - deal damage to attacker.',
        type: 'TRIGGERED',
        trigger: 'ON_INTERCEPT',
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'COUNTER_DAMAGE', scope: 'ATTACKER', damageType: 'DOGFIGHT', effectTarget: 'TRIGGER_OWNER' }]
      },
      {
        name: 'Retaliate',
        description: 'On defence - deal damage to the attacker.',
        type: 'TRIGGERED',
        trigger: 'ON_ATTACKED',
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'COUNTER_DAMAGE', scope: 'ATTACKER', damageType: 'RETALIATE', effectTarget: 'TRIGGER_OWNER' }]
      }
    ],
    upgradeSlots: 1
  },
  {
    name: 'Jackal',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 3,
    image: '/DroneWars/img/Jackal.png',
    abilities: [{
      name: 'Opportunist',
      description: 'Gains +2 attack if you have already taken an action this turn.',
      type: 'PASSIVE',
      effect: {
        type: 'CONDITIONAL_MODIFY_STAT',
        mod: { stat: 'attack', value: 2 },
        condition: { type: 'NOT_FIRST_ACTION' }
      }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Mongoose',
    class: 1,
    limit: 3,
    rebuildRate: 2.0,
    rarity: 'Uncommon',
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 3,
    image: '/DroneWars/img/Mongoose.png',
    abilities: [{
      name: 'Quick Reflexes',
      description: 'Gains +2 speed if you have already taken an action this turn.',
      type: 'PASSIVE',
      effect: {
        type: 'CONDITIONAL_MODIFY_STAT',
        mod: { stat: 'speed', value: 2 },
        condition: { type: 'NOT_FIRST_ACTION' }
      }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Disruptor',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 3,
    damageType: 'SHIELD_BREAKER',
    image: '/DroneWars/img/Disruptor.png',
    abilities: [{
      name: 'Shield Disruptor',
      description: 'Attacks deal shield-breaker damage (each point removes 2 shields).',
      type: 'PASSIVE',
      effect: { type: 'GRANT_DAMAGE_TYPE', damageType: 'SHIELD_BREAKER' }
    }],
    upgradeSlots: 2
  },
    {
    name: 'Ion Drone',
    class: 1,
    limit: 3,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 3,
    hull: 1,
    shields: 1,
    speed: 4,
    damageType: 'ION',
    image: '/DroneWars/img/IonDrone.png',
    abilities: [{
      name: 'Ion Emitter',
      description: 'Attacks deal ion damage (only affects shields).',
      type: 'PASSIVE',
      effect: { type: 'GRANT_DAMAGE_TYPE', damageType: 'ION' }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Impactor',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Uncommon',
    attack: 4,
    hull: 3,
    shields: 0,
    speed: 2,
    damageType: 'KINETIC',
    image: '/DroneWars/img/Impactor.png',
    abilities: [{
      name: 'Kinetic Rounds',
      description: 'Attacks deal kinetic damage (hull only, blocked by shields).',
      type: 'PASSIVE',
      effect: { type: 'GRANT_DAMAGE_TYPE', damageType: 'KINETIC' }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Shark',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Common',
    attack: 2,
    hull: 2,
    shields: 2,
    speed: 3,
    image: '/DroneWars/img/Shark.png',
    abilities: [{
        name: 'Predator',
        description: 'Gains +2 damage against marked targets.',
        type: 'PASSIVE',
        effect: {
            type: 'CONDITIONAL_ATTACK_BONUS',
            value: 2,
            condition: { type: 'TARGET_IS_MARKED' }
        }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Dominator',
    class: 2,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Common',
    attack: 1,
    hull: 2,
    shields: 2,
    speed: 3,
    image: '/DroneWars/img/Dominator.png',
    abilities: [{
      name: 'Territorial',
      description: 'Gains +2 attack while in a lane you control.',
      type: 'PASSIVE',
      effect: {
        type: 'CONDITIONAL_MODIFY_STAT',
        mod: { stat: 'attack', value: 2 },
        condition: { type: 'IN_CONTROLLED_LANE' }
      }
    }],
    upgradeSlots: 1
  },
  {
    name: 'Infiltrator',
    class: 1,
    limit: 3,
    rebuildRate: 1.0,
    rarity: 'Common',
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 4,
    image: '/DroneWars/img/Infiltrator.png',
    abilities: [{
      name: 'Infiltration Protocol',
      description: 'Does not exhaust when moving into a lane you currently do not control.',
      type: 'TRIGGERED',
      trigger: 'ON_MOVE',
      triggerTiming: 'ANY_TURN',
      keywordIcon: 'INFILTRATE',
      triggerFilter: { laneControl: 'NOT_CONTROLLED_BY_ACTOR' },
      effects: [{ type: 'DOES_NOT_EXHAUST', effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 1
  },
  {
    name: 'Signal Beacon',
    class: 1,
    limit: 3,
    rebuildRate: 2.0,
    rarity: 'Uncommon',
    attack: 1,
    hull: 2,
    shields: 1,
    speed: 2,
    image: '/DroneWars/img/SignalBeacon.png',
    selectable: false,
    abilities: [{
      name: 'Threat Signal',
      description: 'Start of Round: Increase player threat by 2.',
      type: 'TRIGGERED',
      trigger: 'ON_ROUND_END',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'INCREASE_THREAT', value: 2, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 0
  },
  {
    name: 'Threat Transmitter',
    class: 2,
    limit: 2,
    rebuildRate: 1.0,
    rarity: 'Rare',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 4,
    image: '/DroneWars/img/ThreatTransmitter.png',
    selectable: false,
    abilities: [{
      name: 'Alert Broadcast',
      description: 'When this drone deals hull damage to a ship section, increase player threat by 4.',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACK',
      triggerTiming: 'ANY_TURN',
      conditionalEffects: [{
        timing: 'POST',
        condition: { type: 'ON_SHIP_SECTION_HULL_DAMAGE' },
        grantedEffect: { type: 'INCREASE_THREAT', value: 4, effectTarget: 'TRIGGER_OWNER' }
      }]
    }],
    upgradeSlots: 1
  },
  {
    name: 'War Machine',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Uncommon',
    attack: 2,
    hull: 4,
    shields: 1,
    speed: 2,
    image: '/DroneWars/img/WarMachine.png',
    abilities: [{
      name: 'Combat Escalation',
      description: 'Start of Round: Gain +1 attack permanently.',
      type: 'TRIGGERED',
      trigger: 'ON_ROUND_END',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  // Rally Beacon, Thruster Inhibitor, Proximity Mine, Inhibitor Mine, Jitter Mine
  // moved to techData.js (Tech Slots feature)
  // Thruster Inhibitor moved to techData.js (Tech Slots feature)
  { name: 'Behemoth', class: 4, limit: 1, rebuildRate: 0, rarity: 'Common', attack: 3, hull: 6, shields: 2, speed: 2, image: '/DroneWars/img/Behemoth.png', abilities: [], upgradeSlots: 4 },
  {
    name: 'Odin',
    class: 4,
    limit: 1,
    rebuildRate: 0.33,
    rarity: 'Common',
    attack: 1,
    hull: 3,
    shields: 3,
    speed: 2,
    image: '/DroneWars/img/Odin.png',
    abilities: [{
      name: 'All-Seeing Eye',
      description: 'Each time you draw cards during the action phase, permanently gain +1 attack per card drawn.',
      type: 'TRIGGERED',
      trigger: 'ON_CARD_DRAWN',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 1
  },
  {
    name: 'Thor',
    class: 3,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Common',
    attack: 1,
    hull: 1,
    shields: 3,
    speed: 4,
    image: '/DroneWars/img/Thor.png',
    abilities: [{
      name: 'Storm Surge',
      description: 'Each time you gain energy during the action phase, permanently gain +1 attack per 2 energy gained (rounded down).',
      type: 'TRIGGERED',
      trigger: 'ON_ENERGY_GAINED',
      triggerTiming: 'ANY_TURN',
      scalingDivisor: 2,
      effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 1
  },
  {
    name: 'Shrike',
    class: 2,
    limit: 1,
    rebuildRate: 1.0,
    rarity: 'Rare',
    attack: 1,
    hull: 2,
    shields: 2,
    speed: 2,
    image: '/DroneWars/img/Shrike.png',
    abilities: [{
      name: 'Web Sensor',
      description: 'When you play a Mine card in this lane, draw a card.',
      type: 'TRIGGERED',
      trigger: 'ON_CARD_PLAY',
      triggerOwner: 'CONTROLLER',
      triggerScope: 'SAME_LANE',
      triggerTiming: 'ANY_TURN',
      triggerFilter: { cardSubType: 'Mine' },
      effects: [{ type: 'DRAW', value: 1, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 2
  },
  {
    name: 'Phalanx',
    class: 2,
    limit: 2,
    rebuildRate: 0.5,
    rarity: 'Uncommon',
    attack: 1,
    hull: 2,
    shields: 2,
    speed: 3,
    image: '/DroneWars/img/Phalanx.png',
    abilities: [{
      name: 'Formation Strike',
      description: 'Gains +1 attack for each adjacent friendly drone.',
      type: 'PASSIVE',
      effect: {
        type: 'CONDITIONAL_MODIFY_STAT_SCALING',
        condition: { type: 'ADJACENT_FRIENDLY_COUNT' },
        mod: { stat: 'attack', value: 1 }
      }
    }],
    upgradeSlots: 2
  },
  {
    name: 'Disruption Drone',
    class: 1, limit: 2, rebuildRate: 1.0, rarity: 'Uncommon',
    attack: 1, hull: 1, shields: 0, speed: 1,
    image: '/DroneWars/img/DisruptionDrone.png',
    abilities: [{
      name: 'Energy Disruption',
      description: "When an enemy drone moves into this lane, your opponent loses 1 energy.",
      type: 'TRIGGERED',
      trigger: 'ON_LANE_MOVEMENT_IN',
      triggerOwner: 'LANE_ENEMY',
      triggerTiming: 'ANY_TURN',
      effects: [{ type: 'DRAIN_ENERGY', amount: 1, effectTarget: 'TRIGGER_OWNER' }]
    }],
    upgradeSlots: 1
  },
];

// Apply default faction to all drones, then override specific assignments
const DRONE_FACTION_ASSIGNMENTS = {
  // MOVEMENT faction — speed/mobility themed drones
  'Harrier': 'MOVEMENT',
  'Blitz': 'MOVEMENT',
  'Specter': 'MOVEMENT',
  // MARK faction — targeting/detection themed drones
  'Scanner': 'MARK',
  'Hunter': 'MARK',
  'Shrike': 'MARK',
};

const dronesWithFactions = fullDroneCollection.map(drone => ({
  ...drone,
  faction: DRONE_FACTION_ASSIGNMENTS[drone.name] || 'NEUTRAL_1',
}));

export default dronesWithFactions;