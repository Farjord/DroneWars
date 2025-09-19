// src/data/shipData.js

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
      image: '/img/Bridge.png'
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
      image: '/img/Power_Cell.png'
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
      image: '/img/Drone_Control_Hub.png'
    }
  };

export default shipSections;