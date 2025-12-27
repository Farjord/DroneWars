/**
 * Points of Interest Data
 * Defines encounter locations on tactical maps
 * Each PoI type grants specific reward types when looted
 */

export const poiTypes = [
  {
    id: 'POI_MUNITIONS',
    name: 'Munitions Storage Depot',
    description: 'Abandoned ordnance cache',

    // Encounter & Threat (separate values for design flexibility)
    encounterChance: 20,  // % chance of encounter when entering
    threatIncrease: 8,    // % threat added when looting

    // Rewards
    rewardType: 'ORDNANCE_PACK',

    // Visuals
    image: '/DroneWars/poi/munitions_depot.jpg',
    color: '#ff4444',

    // Flavour (physical fittings/AI data theme)
    flavourText: 'Structural scans detect intact weapon storage cells. Automated defense protocols dormant.',
  },

  {
    id: 'POI_AUXILIARY',
    name: 'Auxiliary Energy Hub',
    description: 'Derelict power distribution node',
    encounterChance: 10,
    threatIncrease: 8,
    rewardType: 'SUPPORT_PACK',
    image: '/DroneWars/poi/energy_hub.jpg',
    color: '#44aaff',
    flavourText: 'Emergency power reserves online. Fusion containment stable. Data cores accessible.',
  },

  {
    id: 'POI_NAVIGATION',
    name: 'Navigation Data Wreck',
    description: 'Crashed reconnaissance vessel',
    encounterChance: 12,
    threatIncrease: 10,
    rewardType: 'TACTICAL_PACK',
    image: '/DroneWars/poi/navigation_wreck.jpg',
    color: '#ffaa44',
    flavourText: 'Flight recorder intact. Tactical subroutines preserved in secondary memory.',
  },

  {
    id: 'POI_FABRICATION',
    name: 'Industrial Fabrication Unit',
    description: 'Automated manufacturing station',
    encounterChance: 15,
    threatIncrease: 12,
    rewardType: 'UPGRADE_PACK',
    image: '/DroneWars/poi/fabrication_unit.jpg',
    color: '#aa44ff',
    flavourText: 'Assembly arrays idle. Component blueprints stored in manufacturing AI database.',
  },

  {
    id: 'POI_FINANCIAL',
    name: 'Sector Financial Ledger',
    description: 'Banking network terminal',
    encounterChance: 5,
    threatIncrease: 5,
    rewardType: 'CREDITS_PACK',
    image: '/DroneWars/poi/financial_ledger.jpg',
    color: '#44ff88',
    flavourText: 'Transaction logs corrupted. Credit vouchers extractable from backup nodes.',
  },

  {
    id: 'POI_CONTRABAND',
    name: 'Contraband Intercept Point',
    description: 'Smuggler cache',
    encounterChance: 18,
    threatIncrease: 15,
    rewardType: 'TOKEN_REWARD',
    image: '/DroneWars/poi/contraband_cache.jpg',
    color: '#ffff44',
    flavourText: 'Encrypted cargo manifest. Security bypass codes may be recoverable.',
  },

  // Drone Blueprint PoIs - Guaranteed combat, core zone only, rare spawn
  {
    id: 'POI_DRONE_LIGHT',
    name: 'Drone Reconnaissance Outpost',
    description: 'Scout drone production facility',
    encounterChance: 100,  // Guaranteed combat
    threatIncrease: 15,
    rewardType: 'DRONE_BLUEPRINT_LIGHT',
    image: '/DroneWars/poi/drone_light.png',
    color: '#4ade80',
    flavourText: 'Automated scout drone assembly detected. Facility defenses active.',
    coreOnly: true,    // Only spawns in core zone
    weight: 0.1,       // Rare spawn (10% of normal)
    baseDetectionIncrease: 10,  // +10% starting detection when this PoI is on map
    requiresToken: true,  // Map entry requires security token
    requiresEncounterConfirmation: true,  // Show modal before combat
    disableSalvage: true,  // No salvage operations allowed
    threatIncreaseOnVictoryOnly: true,  // Only apply threat increase on combat victory
    tierAIMapping: {
      1: 'Rogue Scout Pattern',  // Tier 1: Easy difficulty
      2: 'Rogue Scout Pattern',  // Tier 2: TBD (placeholder)
      3: 'Rogue Scout Pattern'   // Tier 3: TBD (placeholder)
    }
  },

  {
    id: 'POI_DRONE_MEDIUM',
    name: 'Drone Combat Bay',
    description: 'Fighter drone manufacturing complex',
    encounterChance: 100,
    threatIncrease: 18,
    rewardType: 'DRONE_BLUEPRINT_MEDIUM',
    image: '/DroneWars/poi/drone_fighter.png',
    color: '#f97316',
    flavourText: 'Combat drone schematics stored in central database. Heavy resistance expected.',
    coreOnly: true,
    weight: 0.1,
    baseDetectionIncrease: 12,  // +12% starting detection when this PoI is on map
    requiresToken: true,  // Map entry requires security token
    requiresEncounterConfirmation: true,  // Show modal before combat
    disableSalvage: true,  // No salvage operations allowed
    threatIncreaseOnVictoryOnly: true,  // Only apply threat increase on combat victory
    tierAIMapping: {
      1: 'Specialized Hunter Group',  // Tier 1: Medium difficulty
      2: 'Specialized Hunter Group',  // Tier 2: TBD (placeholder)
      3: 'Specialized Hunter Group'   // Tier 3: TBD (placeholder)
    }
  },

  {
    id: 'POI_DRONE_HEAVY',
    name: 'Drone Weapons Foundry',
    description: 'Heavy drone forge facility',
    encounterChance: 100,
    threatIncrease: 22,
    rewardType: 'DRONE_BLUEPRINT_HEAVY',
    image: '/DroneWars/poi/drone_heavy.png',
    color: '#ef4444',
    flavourText: 'Advanced weapons manufacturing. High-value blueprints. Maximum security protocols.',
    coreOnly: true,
    weight: 0.1,
    baseDetectionIncrease: 15,  // +15% starting detection when this PoI is on map
    requiresToken: true,  // Map entry requires security token
    requiresEncounterConfirmation: true,  // Show modal before combat
    disableSalvage: true,  // No salvage operations allowed
    threatIncreaseOnVictoryOnly: true,  // Only apply threat increase on combat victory
    tierAIMapping: {  // Tier-specific AI assignments
      1: 'Capital-Class Blockade Fleet',  // Tier 1: Hard difficulty
      2: 'Capital-Class Blockade Fleet',  // Tier 2: TBD (placeholder)
      3: 'Capital-Class Blockade Fleet'   // Tier 3: TBD (placeholder)
    }
  }
];

export default poiTypes;
