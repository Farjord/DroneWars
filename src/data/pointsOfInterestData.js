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
    id: 'POI_COMMAND',
    name: 'Fleet Command Relay',
    description: 'Abandoned command center',
    encounterChance: 10,
    threatIncrease: 25,
    rewardType: 'BLUEPRINT_GUARANTEED',
    image: '/DroneWars/poi/fleet_command.jpg',
    color: '#ff44aa',
    isBoss: true,
    flavourText: 'Capital-class systems detected. Strategic data vault sealed but breachable.',
  },

  {
    id: 'POI_FINANCIAL',
    name: 'Sector Financial Ledger',
    description: 'Banking network terminal',
    encounterChance: 5,
    threatIncrease: 5,
    rewardType: 'CREDITS',
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
    rewardType: 'TOKEN_CHANCE',
    image: '/DroneWars/poi/contraband_cache.jpg',
    color: '#ffff44',
    flavourText: 'Encrypted cargo manifest. Security bypass codes may be recoverable.',
  }
];

export default poiTypes;
