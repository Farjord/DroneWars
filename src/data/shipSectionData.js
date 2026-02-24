// ========================================
// SHIP SECTION DATA
// ========================================
// Ship sections provide modifiers to the Ship Card's baseline values.
// Final values are computed as: Ship.base + Section.modifier
//
// The hull, maxHull, shields, thresholds values below are DEPRECATED
// and kept only for backward compatibility during transition.
// New code should use the modifier fields with Ship Card baselines.

const shipComponentCollection = [
  {
    id: 'BRIDGE_001',
    type: 'Bridge',
    name: 'Standard Command Bridge',
    key: 'bridge', // Legacy key for backward compatibility
    rarity: 'Common',

    // Modifier fields (applied to Ship Card baselines)
    hullModifier: 0,
    shieldsModifier: 0,
    thresholdModifiers: { damaged: 0, critical: 0 },

    // DEPRECATED: Absolute values (kept for backward compatibility)
    hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
    description: 'The command center of your ship.',
    thresholds: { damaged: 5, critical: 0 },
    stats: {
      healthy: { 'Draw': 5, 'Discard': 4 },
      damaged: { 'Draw': 5, 'Discard': 2 },
      critical: { 'Draw': 3, 'Discard': 1 },
    },
    middleLaneBonus: { 'Draw': 1, 'Discard': 0 },
    image: '/DroneWars/img/Bridge.png',
    ability: {
      id: 'ABILITY_SHIP_01',
      name: 'Recalculate',
      description: 'Draw a card, then discard a card.',
      cost: { energy: 1 },
      targeting: null,
      effect: { type: 'DRAW_THEN_DISCARD', value: { draw: 1, discard: 1 } },
      activationLimit: 1  // Can only be used once per round
    }
  },

  {
    id: 'BRIDGE_HEAVY',
    type: 'Bridge',
    name: 'Armored Command Bridge',
    key: 'armoredBridge',
    rarity: 'Rare',

    // Modifier fields (applied to Ship Card baselines)
    hullModifier: 2,  // +2 hull to the lane
    shieldsModifier: 0,
    thresholdModifiers: { damaged: 0, critical: 0 },

    // DEPRECATED: Absolute values (kept for backward compatibility)
    hull: 12, maxHull: 12, shields: 3, allocatedShields: 3,
    description: 'Reinforced command center with additional armor plating.',
    thresholds: { damaged: 6, critical: 0 },
    stats: {
      healthy: { 'Draw': 5, 'Discard': 4 },
      damaged: { 'Draw': 5, 'Discard': 2 },
      critical: { 'Draw': 3, 'Discard': 1 },
    },
    middleLaneBonus: { 'Draw': 1, 'Discard': 0 },
    image: '/DroneWars/img/Bridge.png',
    ability: {
      id: 'ABILITY_SHIP_01',
      name: 'Recalculate',
      description: 'Draw a card, then discard a card.',
      cost: { energy: 1 },
      targeting: null,
      effect: { type: 'DRAW_THEN_DISCARD', value: { draw: 1, discard: 1 } },
      activationLimit: 1  // Can only be used once per round
    }
  },

  {
    id: 'BRIDGE_002',
    type: 'Bridge',
    name: 'Tactical Command Bridge',
    key: 'tacticalBridge',
    rarity: 'Uncommon',

    // Modifier fields (applied to Ship Card baselines)
    hullModifier: 0,
    shieldsModifier: 0,
    thresholdModifiers: { damaged: 0, critical: 0 },

    // DEPRECATED: Absolute values (kept for backward compatibility)
    hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
    description: 'Advanced command center with targeting capabilities.',
    thresholds: { damaged: 5, critical: 0 },
    stats: {
      healthy: { 'Draw': 5, 'Discard': 4 },
      damaged: { 'Draw': 5, 'Discard': 2 },
      critical: { 'Draw': 3, 'Discard': 1 },
    },
    middleLaneBonus: { 'Draw': 1, 'Discard': 0 },
    image: '/DroneWars/img/Bridge.png',
    ability: {
      id: 'ABILITY_SHIP_04',
      name: 'Target Lock',
      description: 'Mark target enemy drone.',
      cost: { energy: 1 },
      targeting: {
        type: 'DRONE',
        affinity: 'ENEMY',
        location: 'ANY_LANE',
        custom: ['NOT_MARKED']
      },
      effect: { type: 'MARK_DRONE' },
      activationLimit: 1  // Can only be used once per round
    }
  },

  {
    id: 'POWERCELL_001',
    type: 'Power Cell',
    name: 'Standard Power Cell',
    key: 'powerCell', // Legacy key for backward compatibility
    rarity: 'Common',

    // Modifier fields (applied to Ship Card baselines)
    hullModifier: 0,
    shieldsModifier: 0,
    thresholdModifiers: { damaged: 0, critical: 0 },

    // DEPRECATED: Absolute values (kept for backward compatibility)
    hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
    description: 'Generates energy to power your abilities.',
    thresholds: { damaged: 5, critical: 0 },
    stats: {
      healthy: { 'Energy Per Turn': 10, 'Max Energy': 10, 'Shields Per Turn': 3 },
      damaged: { 'Energy Per Turn': 10, 'Max Energy': 10, 'Shields Per Turn': 1 },
      critical: { 'Energy Per Turn': 8, 'Max Energy': 8, 'Shields Per Turn': 1 },
    },
    middleLaneBonus: { 'Energy Per Turn': 2, 'Max Energy': 2, 'Shields Per Turn': 0 },
    image: '/DroneWars/img/Power_Cell.png',
    ability: {
      id: 'ABILITY_SHIP_02',
      name: 'Reallocate Shields',
      description: 'Take up to 2 shields from your ship sections and redeploy them elsewhere.',
      cost: { energy: 1 },
      targeting: null,
      effect: { type: 'REALLOCATE_SHIELDS', value: { maxShields: 2 } },
      activationLimit: 1  // Can only be used once per round
    }
  },

  {
    id: 'DRONECONTROL_001',
    type: 'Drone Control Hub',
    name: 'Standard Drone Control Hub',
    key: 'droneControlHub', // Legacy key for backward compatibility
    rarity: 'Common',

    // Modifier fields (applied to Ship Card baselines)
    hullModifier: 0,
    shieldsModifier: 0,
    thresholdModifiers: { damaged: 0, critical: 0 },

    // DEPRECATED: Absolute values (kept for backward compatibility)
    hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
    description: 'Controls your drone fleet.',
    thresholds: { damaged: 5, critical: 0 },
    stats: {
      healthy: { 'Initial Deployment': 10, 'CPU Control Value': 8, 'Deployment Budget': 4 },
      damaged: { 'Initial Deployment': 10, 'CPU Control Value': 8, 'Deployment Budget': 2 },
      critical: { 'Initial Deployment': 10, 'CPU Control Value': 8, 'Deployment Budget': 2 },
    },
    middleLaneBonus: {'Initial Deployment': 4, 'Deployment Budget': 4, 'CPU Control Value': 0 },
    image: '/DroneWars/img/Drone_Control_Hub.png',
    ability: {
      id: 'ABILITY_SHIP_03',
      name: 'Recall',
      description: 'Return a friendly drone from any lane to your active pool.',
      cost: { energy: 1 },
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
      effect: { type: 'RECALL_DRONE', value: 1 },
      activationLimit: 1  // Can only be used once per round
    }
  }
];

export { shipComponentCollection };
