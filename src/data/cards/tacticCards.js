// Description Formatting (rendered by formatCardText):
//   *text*       → italic
//   **text**     → bold
//   ***text***   → keyword (bold + purple)
//   \n           → line break

// --- Tactic Cards ---

export const tacticCards = [
  {
    id: 'THRUSTER_MALFUNCTION',
    baseCardId: 'THRUSTER_MALFUNCTION',
    faction: 'NEUTRAL_1',
    name: 'Thruster Malfunction',
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SystemLock.png',
    description: 'Target drone gains Snared. \n \n *(Cancel its next move to remove this status.)*',
    effects: [
      { type: 'APPLY_SNARED', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'THRUSTER_MALFUNCTION_ENHANCED',
    baseCardId: 'THRUSTER_MALFUNCTION',
    faction: 'NEUTRAL_1',
    name: 'Thruster Malfunction+',
    type: 'Tactic',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/SystemLock.png',
    description: 'Target drone gains Immobile. \n \n *(It cannot optionally Move.)*',
    effects: [
      { type: 'APPLY_CANNOT_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'WEAPON_MALFUNCTION',
    baseCardId: 'WEAPON_MALFUNCTION',
    faction: 'NEUTRAL_1',
    name: 'Weapon Malfunction',
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/WeaponMalfunction.png',
    description: 'Target drone gains Suppressed. \n \n *(Cancel its next attack to remove this status.)*',
    effects: [
      { type: 'APPLY_SUPPRESSED', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'WEAPON_MALFUNCTION_ENHANCED',
    baseCardId: 'WEAPON_MALFUNCTION',
    faction: 'NEUTRAL_1',
    name: 'Weapon Malfunction+',
    type: 'Tactic',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/WeaponMalfunction.png',
    description: 'Target drone gains Disarmed. \n \n *(It cannot optionally Attack.)*',
    effects: [
      { type: 'APPLY_CANNOT_ATTACK', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'SENSOR_MALFUNCTION',
    baseCardId: 'SENSOR_MALFUNCTION',
    faction: 'NEUTRAL_1',
    name: 'Sensor Malfunction',
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SensorJam.png',
    description: 'Target drone gains Blinded. \n \n *(It cannot optionally Intercept.)*',
    effects: [
      { type: 'APPLY_CANNOT_INTERCEPT', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'SENSOR_MALFUNCTION_ENHANCED',
    baseCardId: 'SENSOR_MALFUNCTION',
    faction: 'NEUTRAL_1',
    name: 'Sensor Malfunction+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SensorJam.png',
    description: 'Target drone gains Blinded. \n \n *(It cannot optionally Intercept.)* \n \n Go again.',
    effects: [
      { type: 'APPLY_CANNOT_INTERCEPT', goAgain: true, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],
  },
  {
    id: 'STASIS_FIELD',
    baseCardId: 'STASIS_FIELD',
    faction: 'NEUTRAL_1',
    name: 'Stasis Field',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StasisField.png',
    description: 'Target drone does not ready during the next ready phase.',
    effects: [
      { type: 'APPLY_DOES_NOT_READY', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'STASIS_FIELD_ENHANCED',
    baseCardId: 'STASIS_FIELD',
    faction: 'NEUTRAL_1',
    name: 'Stasis Field+',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StasisField.png',
    description: 'Target drone does not ready during the next ready phase. \n \n Go again.',
    effects: [
      { type: 'APPLY_DOES_NOT_READY', goAgain: true, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],
  },
  {
    id: 'TACTICAL_REPOSITIONING',
    baseCardId: 'TACTICAL_REPOSITIONING',
    faction: 'NEUTRAL_1',
    name: 'Tactical Repositioning',
    rarity: 'Common',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/TacticalRepositioning.png',
    description: 'Move target class 2 or less ready enemy drone to an adjacent lane. It does not exhaust.',
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: [{ stat: 'class', comparison: 'LTE', value: 2 }, 'NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'] },
    ],
  },
  {
    id: 'TACTICAL_REPOSITIONING_ENHANCED',
    baseCardId: 'TACTICAL_REPOSITIONING',
    faction: 'NEUTRAL_1',
    name: 'Tactical Repositioning+',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/TacticalRepositioning.png',
    description: 'Move target class 3 or less ready enemy drone to an adjacent lane. It does not exhaust.',
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: [{ stat: 'class', comparison: 'LTE', value: 3 }, 'NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'] },
    ],
  },
  {
    id: 'MEMORY_LEAK',
    baseCardId: 'MEMORY_LEAK',
    faction: 'NEUTRAL_1',
    name: 'Memory Leak',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/MentalDisruption.png',
    description: 'Target opponent discards 2 cards at random.',
    effects: [
      { type: 'DISCARD', count: 2, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'MEMORY_LEAK_ENHANCED',
    baseCardId: 'MEMORY_LEAK',
    faction: 'NEUTRAL_1',
    name: 'Memory Leak+',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/MentalDisruption.png',
    description: 'Target opponent discards 3 cards at random.',
    effects: [
      { type: 'DISCARD', count: 3, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'POWER_DRAIN',
    baseCardId: 'POWER_DRAIN',
    faction: 'NEUTRAL_1',
    name: 'Power Drain',
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/PowerDrain.png',
    description: 'Target opponent loses 3 energy.',
    effects: [
      { type: 'DRAIN_ENERGY', amount: 3, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'POWER_DRAIN_ENHANCED',
    baseCardId: 'POWER_DRAIN',
    faction: 'NEUTRAL_1',
    name: 'Power Drain+',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/PowerDrain.png',
    description: 'Target opponent loses 4 energy.',
    effects: [
      { type: 'DRAIN_ENERGY', amount: 4, targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'EMP_BURST',
    baseCardId: 'EMP_BURST',
    faction: 'NEUTRAL_1',
    name: 'EMP Burst',
    rarity: 'Common',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/EMPBurst.png',
    description: 'Exhaust target Class 2 or less Drone.',
    effects: [
      { type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'ANY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'class', comparison: 'LTE', value: 2 },
          ],
        },
      },
    ],

  },
  {
    id: 'EMP_BURST_ENHANCED',
    baseCardId: 'EMP_BURST',
    faction: 'NEUTRAL_1',
    name: 'EMP Burst+',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/EMPBurst.png',
    description: 'Exhaust target Class 2 or less Drone.',
    effects: [
      { type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'ANY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'class', comparison: 'LTE', value: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'SHORT_CIRCUIT',
    baseCardId: 'SHORT_CIRCUIT',
    faction: 'NEUTRAL_1',
    name: 'Short Circuit',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 4,
    image: '/DroneWars/cards/ShortCircuit.png',
    description: 'Exhaust target Class 3 or less Drone.',
    effects: [
      { type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'ANY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'class', comparison: 'LTE', value: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'SHORT_CIRCUIT_ENHANCED',
    baseCardId: 'SHORT_CIRCUIT',
    faction: 'NEUTRAL_1',
    name: 'Short Circuit+',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/ShortCircuit.png',
    description: 'Exhaust target Class 3 or less Drone.',
    effects: [
      { type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE',
          affinity: 'ANY',
          location: 'ANY_LANE',
          restrictions: [
            { stat: 'class', comparison: 'LTE', value: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'TEMPORAL_DAMPENER',
    baseCardId: 'TEMPORAL_DAMPENER',
    faction: 'NEUTRAL_1',
    name: 'Temporal Dampener',
    rarity: 'Common',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/TemporalDampener.png',
    description: 'Target drone gets -2 speed until end of turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'speed', value: -2, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' },
      },
    ],

  },
  {
    id: 'TEMPORAL_DAMPENER_ENHANCED',
    baseCardId: 'TEMPORAL_DAMPENER',
    faction: 'NEUTRAL_1',
    name: 'Temporal Dampener+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/TemporalDampener.png',
    description: 'Target drone gets -3 speed until end of turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'speed', value: -3, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' },
      },
    ],
  },
  {
    id: 'WEAPON_OVERLOAD',
    baseCardId: 'WEAPON_OVERLOAD',
    faction: 'NEUTRAL_1',
    name: 'Weapon Overload',
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StaticField.png',
    description: 'Target enemy drone gets -2 attack until the end of the turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: -2, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      },
    ],

  },
  {
    id: 'WEAPON_OVERLOAD_ENHANCED',
    baseCardId: 'WEAPON_OVERLOAD',
    faction: 'NEUTRAL_1',
    name: 'Weapon Overload+',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/StaticField.png',
    description: 'Target enemy drone gets -3 attack until the end of the turn.',
    effects: [
      {
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: -3, type: 'temporary' },
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      },
    ],
  },
  {
    id: 'SYSTEM_SABOTAGE',
    baseCardId: 'SYSTEM_SABOTAGE',
    faction: 'NEUTRAL_1',
    name: 'System Sabotage',
    rarity: 'Common',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SystemSabotage.png',
    description: 'Destroy a single applied Upgrade on an enemy drone type.',
    effects: [{ type: 'DESTROY_UPGRADE', targeting: { type: 'NONE' } }],
  },
  {
    id: 'SYSTEM_SABOTAGE_ENHANCED',
    baseCardId: 'SYSTEM_SABOTAGE',
    faction: 'NEUTRAL_1',
    name: 'System Sabotage+',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/SystemSabotage.png',
    description: 'Destroy a single applied Upgrade on an enemy drone type.',
    effects: [{ type: 'DESTROY_UPGRADE', targeting: { type: 'NONE' } }],
  },
  {
    id: 'DEPLOY_JAMMERS',
    baseCardId: 'DEPLOY_JAMMERS',
    faction: 'NEUTRAL_1',
    name: 'Deploy Jammer',
    rarity: 'Common',
    type: 'Tactic',
    cost: 3,
    image: '/DroneWars/cards/DeployJammers.png',
    description: 'Create a Jammer in one of your lanes. \n \n *(Jammer: Opponent card effects cannot target drones in this lane. End of Round: Self Destruct.)*',
    effects: [
      { type: 'CREATE_TECH', tokenName: 'Jammer', targeting: { type: 'LANE', affinity: 'FRIENDLY' } },
    ],

  },
  {
    id: 'DEPLOY_JAMMERS_ENHANCED',
    baseCardId: 'DEPLOY_JAMMERS',
    faction: 'NEUTRAL_1',
    name: 'Deploy Jammer+',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/DeployJammers.png',
    description: 'Create a Jammer in one of your lanes. \n \n *(Jammer: Opponent card effects cannot target drones in this lane. End of Round: Self Destruct.)*',
    effects: [
      { type: 'CREATE_TECH', tokenName: 'Jammer', targeting: { type: 'LANE', affinity: 'FRIENDLY' } },
    ],
  },
  {
    id: 'DEPLOY_THRUSTER_INHIBITOR',
    baseCardId: 'DEPLOY_THRUSTER_INHIBITOR',
    faction: 'NEUTRAL_1',
    name: 'Deploy Thruster Inhibitor',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/ThrusterInhibitor.png',
    description: 'Create a Thruster Inhibitor in a friendly lane. \n \n *(Enemy drones cannot move out of this lane. Removed at the start of the next round.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Thruster Inhibitor',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],

  },
  {
    id: 'DEPLOY_THRUSTER_INHIBITOR_ENHANCED',
    baseCardId: 'DEPLOY_THRUSTER_INHIBITOR',
    faction: 'NEUTRAL_1',
    name: 'Deploy Thruster Inhibitor+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/ThrusterInhibitor.png',
    description: 'Create a Thruster Inhibitor in a friendly lane. \n \n *(Enemy drones cannot move out of this lane. Removed at the start of the next round.)*',
    effects: [
      {
        type: 'CREATE_TECH',
        tokenName: 'Thruster Inhibitor',
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      },
    ],
  },
  {
    id: 'EXHAUST',
    baseCardId: 'EXHAUST',
    faction: 'NEUTRAL_1',
    name: 'EXHAUST',
    rarity: 'Rare',
    type: 'Tactic',
    cost: 3,
    momentumCost: 1,
    image: '/DroneWars/cards/Exhaust.png',
    description: 'Exhaust target drone.',
    effects: [
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'EXHAUST_ENHANCED',
    baseCardId: 'EXHAUST',
    faction: 'NEUTRAL_1',
    name: 'EXHAUST+',
    type: 'Tactic',
    cost: 2,
    momentumCost: 1,
    image: '/DroneWars/cards/Exhaust.png',
    description: 'Exhaust target drone.',
    effects: [
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' } },
    ],
  },
  {
    id: 'FEINT',
    baseCardId: 'FEINT',
    faction: 'NEUTRAL_1',
    name: 'Feint',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/ExhaustingStrike.png',
    description: 'Exhaust a friendly drone. \n \n Then exhaust an enemy Drone with lower Speed in the same lane.',
    visualEffect: { type: 'DISRUPTION' },
    effects: [
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' }, restrictions: [{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT', reference: { ref: 0, field: 'target' }, referenceStat: 'speed' }] } },
    ],
  },
  {
    id: 'FEINT_ENHANCED',
    baseCardId: 'FEINT',
    faction: 'NEUTRAL_1',
    name: 'Feint+',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/ExhaustingStrike.png',
    description: 'Exhaust a friendly drone. \n \n Then exhaust an enemy drone with equal or lower speed in the same lane.',
    visualEffect: { type: 'DISRUPTION' },
    effects: [
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
      { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' }, restrictions: [{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LTE', reference: { ref: 0, field: 'target' }, referenceStat: 'speed' }] } },
    ],
  },
  {
    id: 'FORCED_REPOSITIONING',
    baseCardId: 'FORCED_REPOSITIONING',
    faction: 'MOVEMENT',
    name: 'Forced Repositioning',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/ForcedRepositioning.png',
    description: 'Move a friendly ready Drone to an adjacent lane. It does not exhaust. \n \n Then move a ready enemy drone from the original lane with higher attack. It does not exhaust.',
    visualEffect: { type: 'MOVEMENT' },
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'], prompt: 'Move a friendly drone' },
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' }, restrictions: [{ type: 'STAT_COMPARISON', stat: 'attack', comparison: 'GT', reference: { ref: 0, field: 'target' }, referenceStat: 'attack' }, 'NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } }, properties: ['DO_NOT_EXHAUST'], mandatory: true },
    ],
  },
  {
    id: 'FORCED_REPOSITIONING_ENHANCED',
    baseCardId: 'FORCED_REPOSITIONING',
    faction: 'MOVEMENT',
    name: 'Forced Repositioning+',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/ForcedRepositioning.png',
    description: 'Move a friendly ready drone to an adjacent lane. \n \n Then move a ready enemy drone from the original lane with higher attack.',
    visualEffect: { type: 'MOVEMENT' },
    effects: [
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }, properties: ['DO_NOT_EXHAUST'], prompt: 'Move a friendly drone' },
      { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' }, restrictions: [{ type: 'STAT_COMPARISON', stat: 'attack', comparison: 'GT', reference: { ref: 0, field: 'target' }, referenceStat: 'attack' }, 'NOT_EXHAUSTED'] }, destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } }, properties: ['DO_NOT_EXHAUST'], mandatory: true },
    ],
  },
  {
    id: 'MAINFRAME_BREACH',
    baseCardId: 'MAINFRAME_BREACH',
    faction: 'NEUTRAL_1',
    name: 'Mainframe Breach',
    rarity: 'Rare',
    type: 'Tactic',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/MainframeBreach.png',
    description: 'Target opponent discards 2 cards at random. \n \n Then they lose 4 energy.',
    effects: [
      { type: 'DISCARD', count: 2, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
      { type: 'DRAIN_ENERGY', amount: 4, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'MAINFRAME_BREACH_ENHANCED',
    baseCardId: 'MAINFRAME_BREACH',
    faction: 'NEUTRAL_1',
    name: 'Mainframe Breach+',
    type: 'Tactic',
    cost: 4,
    momentumCost: 1,
    image: '/DroneWars/cards/MainframeBreach.png',
    description: 'Target opponent discards 3 cards at random. \n \n Then they lose 4 energy.',
    effects: [
      { type: 'DISCARD', count: 3, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
      { type: 'DRAIN_ENERGY', amount: 4, targetPlayer: 'opponent', targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'RAISE_THE_ALARM',
    baseCardId: 'RAISE_THE_ALARM',
    faction: 'NEUTRAL_1',
    name: 'Raise the Alarm',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 3,
    momentumCost: 1,
    aiOnly: true,
    image: '/DroneWars/cards/RaiseTheAlarm.png',
    description: 'Immediately increase player threat by 10.',
    effects: [
      { type: 'INCREASE_THREAT', value: 10, targeting: { type: 'NONE' } },
    ],

  },
  {
    id: 'RAISE_THE_ALARM_ENHANCED',
    baseCardId: 'RAISE_THE_ALARM',
    faction: 'NEUTRAL_1',
    name: 'Raise the Alarm+',
    type: 'Tactic',
    cost: 2,
    momentumCost: 1,
    aiOnly: true,
    image: '/DroneWars/cards/RaiseTheAlarm.png',
    description: 'Immediately increase player threat by 10.',
    effects: [
      { type: 'INCREASE_THREAT', value: 10, targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'SACRIFICE_FOR_POWER',
    baseCardId: 'SACRIFICE_FOR_POWER',
    faction: 'NEUTRAL_1',
    name: 'Sacrifice for Power',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/SacrificeforPower.png',
    description: 'Discard a card from your hand. \n \n Then give a friendly drone +X attack until end of turn, where X is the discarded card\'s energy cost.',
    visualEffect: { type: 'BUFF' },
    effects: [
      { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' }, prompt: 'Discard a card from your hand' },
      { type: 'MODIFY_STAT', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' }, mod: { stat: 'attack', value: { ref: 0, field: 'cardCost' }, type: 'temporary' }, prompt: 'Select a drone to receive the power boost' },
    ],
  },
  {
    id: 'SACRIFICE_FOR_POWER_ENHANCED',
    baseCardId: 'SACRIFICE_FOR_POWER',
    faction: 'NEUTRAL_1',
    name: 'Sacrifice for Power+',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/SacrificeforPower.png',
    description: 'Discard a card from your hand. \n \n Then give a friendly drone +X attack until end of turn, where X is the discarded card\'s energy cost. \n \n Go again.',
    visualEffect: { type: 'BUFF' },
    effects: [
      { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' }, prompt: 'Discard a card from your hand' },
      { type: 'MODIFY_STAT', goAgain: true, targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' }, mod: { stat: 'attack', value: { ref: 0, field: 'cardCost' }, type: 'temporary' }, prompt: 'Select a drone to receive the power boost' },
    ],
  },
  {
    id: 'TRANSMIT_THREAT',
    baseCardId: 'TRANSMIT_THREAT',
    faction: 'NEUTRAL_1',
    name: 'Transmit Threat',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    aiOnly: true,
    image: '/DroneWars/cards/TransmitThreat.png',
    description: 'Immediately trigger the ***End of Round*** ability of every Signal Beacon drone currently on the board.',
    effects: [
      { type: 'INCREASE_THREAT', value: 2, perDrone: 'Signal Beacon', targeting: { type: 'NONE' } },
    ],
  },
  {
    id: 'TRANSMIT_THREAT_ENHANCED',
    baseCardId: 'TRANSMIT_THREAT',
    faction: 'NEUTRAL_1',
    name: 'Transmit Threat+',
    type: 'Tactic',
    cost: 1,
    aiOnly: true,
    image: '/DroneWars/cards/TransmitThreat.png',
    description: 'Immediately trigger the ***End of Round*** ability of every Signal Beacon drone currently on the board.',
    effects: [
      { type: 'INCREASE_THREAT', value: 2, perDrone: 'Signal Beacon', targeting: { type: 'NONE' } },
    ],
  },

  {
    id: 'MARK_ENEMY',
    baseCardId: 'MARK_ENEMY',
    faction: 'MARK',
    name: 'Mark Enemy',
    rarity: 'Common',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/MarkEnemy.png',
    description: 'Mark an enemy drone.',
    effects: [
     { type: 'MARK_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],

  },
  {
    id: 'MARK_ENEMY_ENHANCED',
    baseCardId: 'MARK_ENEMY',
    faction: 'MARK',
    name: 'Mark Enemy+',
    type: 'Tactic',
    cost: 0,
    image: '/DroneWars/cards/MarkEnemy.png',
    description: 'Mark an enemy drone. \n \n Go again.',
    effects: [
     { type: 'MARK_DRONE', goAgain: true, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
    ],
  },

  {
    id: 'TARGET_ACQUISITION',
    baseCardId: 'TARGET_ACQUISITION',
    faction: 'MARK',
    name: 'Target Acquisition',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/TargetAcquisition.png',
    description: 'Mark 3 random enemy drones.',
    effects: [
      {
        type: 'MARK_DRONE',
        scope: 'ALL',
        targeting: { type: 'NONE', affinity: 'ENEMY' },
        targetSelection: { method: 'RANDOM', count: 3 },
      },
    ],
  },
  {
    id: 'TARGET_ACQUISITION_ENHANCED',
    baseCardId: 'TARGET_ACQUISITION',
    faction: 'MARK',
    name: 'Target Acquisition+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/TargetAcquisition.png',
    description: 'Mark 4 random enemy drones.',
    effects: [
      {
        type: 'MARK_DRONE',
        scope: 'ALL',
        targeting: { type: 'NONE', affinity: 'ENEMY' },
        targetSelection: { method: 'RANDOM', count: 4 },
      },
    ],
  },

  // --- Exposed Condition Cards ---

  {
    id: 'COMMAND_OVERRIDE',
    baseCardId: 'COMMAND_OVERRIDE',
    faction: 'NEUTRAL_1',
    name: 'Command Override',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/CommandOverride.png',
    description: 'Opponent discards 1 card at random. \n \n ***Exposed Bridge:*** Discard 3 cards instead.',
    effects: [{
      type: 'DISCARD', count: 1, targetPlayer: 'opponent',
      targeting: { type: 'NONE' },
      conditionals: [{
        id: 'bridge-exposed-bonus', timing: 'PRE',
        condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
        grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
      }]
    }]
  },
  {
    id: 'COMMAND_OVERRIDE_ENHANCED',
    baseCardId: 'COMMAND_OVERRIDE',
    faction: 'NEUTRAL_1',
    name: 'Command Override+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/CommandOverride.png',
    description: 'Opponent discards 1 card at random. \n \n ***Exposed Bridge:*** Discard 3 cards instead.',
    effects: [{
      type: 'DISCARD', count: 1, targetPlayer: 'opponent',
      targeting: { type: 'NONE' },
      conditionals: [{
        id: 'bridge-exposed-bonus', timing: 'PRE',
        condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
        grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
      }]
    }]
  },
  {
    id: 'SIGNAL_HIJACK',
    baseCardId: 'SIGNAL_HIJACK',
    faction: 'NEUTRAL_1',
    name: 'Signal Hijack',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SignalHijack.png',
    description: 'Exhaust target Class 1 or less enemy drone. \n \n ***Exposed Control Hub:*** Class 4 or less instead.',
    effects: [{
      type: 'EXHAUST_DRONE',
      targeting: {
        type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE',
        restrictions: [{ stat: 'class', comparison: 'LTE', value: 1 }]
      },
      conditionals: [{
        id: 'dch-exposed-targeting', timing: 'PRE_TARGETING',
        condition: { type: 'SECTION_EXPOSED', section: 'droneControlHub' },
        targetingOverride: { restrictions: [{ stat: 'class', comparison: 'LTE', value: 4 }] }
      }]
    }]
  },
  {
    id: 'SIGNAL_HIJACK_ENHANCED',
    baseCardId: 'SIGNAL_HIJACK',
    faction: 'NEUTRAL_1',
    name: 'Signal Hijack+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SignalHijack.png',
    description: 'Exhaust target Class 1 or less enemy drone. \n \n ***Exposed Control Hub:*** Class 4 or less instead.',
    effects: [{
      type: 'EXHAUST_DRONE',
      targeting: {
        type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE',
        restrictions: [{ stat: 'class', comparison: 'LTE', value: 2 }]
      },
      conditionals: [{
        id: 'dch-exposed-targeting', timing: 'PRE_TARGETING',
        condition: { type: 'SECTION_EXPOSED', section: 'droneControlHub' },
        targetingOverride: { restrictions: [{ stat: 'class', comparison: 'LTE', value: 4 }] }
      }]
    }]
  },
  {
    id: 'ENERGY_SIPHON',
    baseCardId: 'ENERGY_SIPHON',
    faction: 'NEUTRAL_1',
    name: 'Energy Siphon',
    rarity: 'Uncommon',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/EnergySiphon.png',
    description: 'Steal 1 energy from opponent. \n \n ***Exposed Power Cell:*** Steal 3 instead.',
    effects: [{
      type: 'STEAL_ENERGY', amount: 1, targetPlayer: 'opponent',
      targeting: { type: 'NONE' },
      conditionals: [{
        id: 'powercell-exposed-bonus', timing: 'PRE',
        condition: { type: 'SECTION_EXPOSED', section: 'powerCell' },
        grantedEffect: { type: 'OVERRIDE_VALUE', property: 'amount', value: 3 }
      }]
    }]
  },
  {
    id: 'ENERGY_SIPHON_ENHANCED',
    baseCardId: 'ENERGY_SIPHON',
    faction: 'NEUTRAL_1',
    name: 'Energy Siphon+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/EnergySiphon.png',
    description: 'Steal 2 energy from opponent. \n \n ***Exposed Power Cell:*** Steal 4 instead.',
    effects: [{
      type: 'STEAL_ENERGY', amount: 2, targetPlayer: 'opponent',
      targeting: { type: 'NONE' },
      conditionals: [{
        id: 'powercell-exposed-bonus', timing: 'PRE',
        condition: { type: 'SECTION_EXPOSED', section: 'powerCell' },
        grantedEffect: { type: 'OVERRIDE_VALUE', property: 'amount', value: 4 }
      }]
    }]
  },

  // --- Tech Removal Cards ---

  {
    id: 'SYSTEM_PURGE',
    baseCardId: 'SYSTEM_PURGE',
    faction: 'NEUTRAL_1',
    name: 'System Purge',
    rarity: 'Common',
    type: 'Tactic',
    cost: 2,
    image: '/DroneWars/cards/SystemPurge.png',
    description: 'Destroy target tech.',
    effects: [
      { type: 'DESTROY_TECH', targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' } },
    ],
  },
  {
    id: 'SYSTEM_PURGE_ENHANCED',
    baseCardId: 'SYSTEM_PURGE',
    faction: 'NEUTRAL_1',
    name: 'System Purge+',
    type: 'Tactic',
    cost: 1,
    image: '/DroneWars/cards/SystemPurge.png',
    description: 'Destroy target tech.',
    effects: [
      { type: 'DESTROY_TECH', targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' } },
    ],
  },
];
