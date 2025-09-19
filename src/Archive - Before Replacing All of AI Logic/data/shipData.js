  const shipSections = {
    bridge: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'The command center of your ship.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Draw': 5, 'Discard': 3 },
        damaged: { 'Draw': 5, 'Discard': 2 }, 
        critical: { 'Draw': 4, 'Discard': 1 },
      },
      middleLaneBonus: { 'Draw': 1, 'Discard': 1 },
      image: '/img/Bridge.png',
      ability: {
        id: 'ABILITY_SHIP_01',
        name: 'Flak Cannons',
        description: 'Deal 1 damage to any drone.',
        cost: { energy: 2 },
        targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' },
        effect: { type: 'DAMAGE', value: 1, damageType: 'NORMAL' }
      }
    },

    powerCell: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'Generates energy to power your abilities.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Energy Per Turn': 10, 'Max Energy': 10, 'Shields Per Turn': 3 },
        damaged: { 'Energy Per Turn': 10, 'Max Energy': 10, 'Shields Per Turn': 2 },
        critical: { 'Energy Per Turn': 9, 'Max Energy': 9, 'Shields Per Turn': 1 },
      },
      middleLaneBonus: { 'Energy Per Turn': 2, 'Max Energy': 2, 'Shields Per Turn': 1 },
      image: '/img/Power_Cell.png',
      ability: {
        id: 'ABILITY_SHIP_02',
        name: 'Power Cycle',
        description: 'Draw a card, then discard a card.',
        cost: { energy: 1 },
        targeting: null,
        effect: { type: 'DRAW_THEN_DISCARD', value: { draw: 1, discard: 1 } }
      }
    },

    droneControlHub: {
      hull: 10, maxHull: 10, shields: 3, allocatedShields: 3,
      description: 'Controls your drone fleet.',
      thresholds: { damaged: 5, critical: 0 },
      stats: {
        healthy: { 'Initial Deployment': 6, 'CPU Control Value': 10, 'Deployment Budget': 3 },
        damaged: { 'Initial Deployment': 5, 'CPU Control Value': 10, 'Deployment Budget': 2 },
        critical: { 'Initial Deployment': 4, 'CPU Control Value': 8, 'Deployment Budget': 2 },
      },
      middleLaneBonus: { 'Deployment Budget': 1, 'CPU Control Value': 2 },
      image: '/img/Drone_Control_Hub.png',
      ability: {
        id: 'ABILITY_SHIP_03',
        name: 'Recall',
        description: 'Return a friendly drone from any lane to your active pool.',
        cost: { energy: 1 },
        targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
        effect: { type: 'RECALL_DRONE', value: 1 }
      }
    }
  };

export default shipSections;