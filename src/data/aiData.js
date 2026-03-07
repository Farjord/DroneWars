const aiPersonalities = [
  {
    name: 'TEST AI',
    description: 'Used for test scenarios.',
    difficulty: 'Easy',
    reputationMultiplier: 0.5,
    modes: ['vs'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/TEST.png',
    dronePool: [
      'Mammoth',
      'Talon',
      'Firefly',
      'Devastator',
      'Locust'
    ],
    shipComponents: {
      'POWERCELL_001': 'l',
      'BRIDGE_001': 'm',
      'DRONECONTROL_001': 'r'
    },
    decklist: [
      { id: 'CONVERGENCE_BEAM_ENHANCED', quantity: 40 }
    ]
  },
  {
    name: 'Manticore - Class II Gunship',
    description: 'Focuses on overwhelming firepower and direct damage to drones and ship sections.',
    difficulty: 'Normal',
    reputationMultiplier: 1.0,
    modes: ['vs'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Manticore.png',
    dronePool: [
      'Avenger',
      'Devastator',
      'Mammoth',
      'Gladiator',
      'Dart',
      'Skirmisher',
      'Behemoth',
      'Vindicator',
      'Sabot',
      'Tempest'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'DRONECONTROL_001': 'm',
      'POWERCELL_001': 'r'
    },
    decklist: [
      { id: 'NUKE', quantity: 2 },
      { id: 'SHRIEKER_MISSILES_ENHANCED', quantity: 2 },
      { id: 'DEPLOY_JAMMERS', quantity: 2 },
      { id: 'WEAPON_OVERLOAD', quantity: 2 },
      { id: 'DESPERATE_MEASURES', quantity: 2 },
      { id: 'MANEUVER_ENHANCED', quantity: 2 },
      { id: 'ENERGY_SURGE_ENHANCED', quantity: 2 },
      { id: 'SYSTEM_REBOOT_ENHANCED', quantity: 2 },
      { id: 'SUNDERING_BEAM', quantity: 4 },
      { id: 'PIERCING_SHOT_ENHANCED', quantity: 2 },
      { id: 'SCAVENGER_SHOT', quantity: 4 },
      { id: 'FINISHING_VOLLEY_ENHANCED', quantity: 4 },
      { id: 'TACTICAL_REPOSITIONING', quantity: 4 },
      { id: 'STASIS_FIELD', quantity: 4 },
      { id: 'EMP_BURST', quantity: 4 },
      { id: 'REACTIVATION_PROTOCOL', quantity: 4 },
      { id: 'EMERGENCY_PATCH_ENHANCED', quantity: 4 },
      { id: 'COMBAT_ENHANCEMENT', quantity: 2 },
      { id: 'PIERCING_ROUNDS', quantity: 2 },
      { id: 'SHIELD_AMPLIFIER', quantity: 2 },
      { id: 'OVERRUN', quantity: 2 },
      { id: 'BREACH_THE_LINE', quantity: 2 }
    ]
  },
  {
    name: 'Rogue Scout Pattern',
    description: 'Defensive scout with minimal aggression',
    difficulty: 'Easy',
    reputationMultiplier: 0.5,
    modes: ['extraction'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Scout.png',
    escapeDamage: { min: 1, max: 2 },
    dronePool: [
      'Dart',
      'Threat Transmitter',
      'Talon',
      'Ion Drone',
      'Signal Beacon'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    },
    decklist: [
      { id: 'THERMAL_LANCE', quantity: 3 },
      { id: 'SYSTEM_REBOOT', quantity: 4 },
      { id: 'OUT_THINK', quantity: 4 },
      { id: 'ENERGY_SURGE', quantity: 4 },
      { id: 'REACTIVATION_PROTOCOL', quantity: 3 },
      { id: 'EMERGENCY_PATCH', quantity: 4 },
      { id: 'SHIELD_RECHARGE', quantity: 3 },
      { id: 'FINISHING_VOLLEY', quantity: 2 },
      { id: 'STREAMLINE', quantity: 3 },
      { id: 'WEAPON_OVERLOAD', quantity: 4 },
      { id: 'DESPERATE_MEASURES', quantity: 4 },
      { id: 'REPOSITION', quantity: 2 },
      { id: 'RAISE_THE_ALARM', quantity: 2 },
      { id: 'TRANSMIT_THREAT', quantity: 4 }
    ]
  },
  {
    name: 'Specialized Hunter Group',
    description: 'Fast and aggressive interceptor',
    difficulty: 'Medium',
    reputationMultiplier: 1.0,
    modes: ['extraction'],
    shipId: 'SHIP_003',
    imagePath: '/DroneWars/AI/Hunter.png',
    escapeDamage: { min: 2, max: 3 },
    dronePool: [
      'Signal Beacon',
      'Threat Transmitter',
      'Avenger',
      'Talon',
      'Mammoth'
    ],
    shipComponents: {
      'POWERCELL_001': 'l',
      'BRIDGE_001': 'm',
      'DRONECONTROL_001': 'r'
    },
    decklist: [
      { id: 'THERMAL_LANCE_ENHANCED', quantity: 4 },
      { id: 'SYSTEM_REBOOT', quantity: 4 },
      { id: 'OUT_THINK', quantity: 3 },
      { id: 'ENERGY_SURGE', quantity: 3 },
      { id: 'REACTIVATION_PROTOCOL', quantity: 4 },
      { id: 'NANOBOT_REPAIR', quantity: 2 },
      { id: 'EMERGENCY_PATCH', quantity: 3 },
      { id: 'TARGET_LOCK', quantity: 4 },
      { id: 'PIERCING_SHOT', quantity: 3 },
      { id: 'STREAMLINE', quantity: 4 },
      { id: 'WEAPON_OVERLOAD', quantity: 3 },
      { id: 'REPOSITION', quantity: 3 },
      { id: 'RAISE_THE_ALARM', quantity: 2 },
      { id: 'TRANSMIT_THREAT', quantity: 4 }
    ]
  },
  {
    name: 'Capital-Class Blockade Fleet',
    description: 'Overwhelming force, heavy defenses',
    difficulty: 'Hard',
    reputationMultiplier: 1.5,
    modes: ['extraction'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Blockade.png',
    escapeDamage: { min: 3, max: 5 },
    dronePool: [
      'Firefly',
      'Mammoth',
      'Talon',
      'Devastator',
      'Dart'
    ],
    shipComponents: {
      'BRIDGE_001': 'l',
      'DRONECONTROL_001': 'm',
      'POWERCELL_001': 'r'
    },
    decklist: [
      { id: 'THERMAL_LANCE_ENHANCED', quantity: 4 },
      { id: 'SYSTEM_REBOOT', quantity: 4 },
      { id: 'OUT_THINK', quantity: 2 },
      { id: 'ENERGY_SURGE', quantity: 3 },
      { id: 'REACTIVATION_PROTOCOL', quantity: 4 },
      { id: 'NANOBOT_REPAIR', quantity: 4 },
      { id: 'EMERGENCY_PATCH', quantity: 3 },
      { id: 'SHIELD_RECHARGE', quantity: 4 },
      { id: 'PREY_ON_THE_WEAK_ENHANCED', quantity: 3 },
      { id: 'PIERCING_SHOT', quantity: 4 },
      { id: 'SIDEWINDER_MISSILES', quantity: 2 },
      { id: 'WEAPON_OVERLOAD', quantity: 3 }
    ]
  },
  {
    bossId: 'BOSS_T1_NEMESIS',
    name: 'Nemesis-Class Dreadnought',
    description: 'The infamous commander of the Eremos blockade. A formidable opponent with advanced combat protocols and overwhelming firepower.',
    difficulty: 'Hard',
    reputationMultiplier: 0,
    modes: ['boss'],
    shipId: 'SHIP_001',
    imagePath: '/DroneWars/AI/Boss_Nemesis.png',
    dronePool: [
      'Mammoth',
      'Devastator',
      'Avenger',
      'Bastion',
      'Aegis'
    ],
    shipComponents: {
      'DRONECONTROL_001': 'l',
      'BRIDGE_001': 'm',
      'POWERCELL_001': 'r'
    },
    decklist: [
      { id: 'THERMAL_LANCE_ENHANCED', quantity: 4 },
      { id: 'SYSTEM_REBOOT_ENHANCED', quantity: 3 },
      { id: 'ENERGY_SURGE_ENHANCED', quantity: 4 },
      { id: 'NANOBOT_REPAIR', quantity: 4 },
      { id: 'EMERGENCY_PATCH_ENHANCED', quantity: 4 },
      { id: 'SHIELD_RECHARGE', quantity: 4 },
      { id: 'PREY_ON_THE_WEAK_ENHANCED', quantity: 3 },
      { id: 'PIERCING_SHOT_ENHANCED', quantity: 4 },
      { id: 'SIDEWINDER_MISSILES', quantity: 3 },
      { id: 'WEAPON_OVERLOAD', quantity: 4 }
    ],
    bossConfig: {
      displayName: 'THE NEMESIS',
      subtitle: 'Commander of the Eremos Blockade',
      description: 'A legendary dreadnought that has claimed countless ships. Defeating it will prove your supremacy in the Shallows.',
      firstTimeReward: {
        credits: 5000,
        aiCores: 3,
        reputation: 500,
        blueprintId: null
      },
      repeatReward: {
        credits: 1000,
        aiCores: 1,
        reputation: 100
      }
    }
  }
];

export default aiPersonalities;
