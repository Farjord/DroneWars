/**
 * codePatterns.js
 *
 * Documentation of valid parameters, subEffects, and patterns
 * extracted from actual game code (gameLogic.js, statsCalculator.js).
 *
 * This file is manually maintained based on code analysis.
 * Update this when adding new effect handlers or parameters.
 *
 * PURPOSE: Provide technically accurate information about what
 * the game code actually accepts and handles.
 */

// ========================================
// EFFECT TYPE PATTERNS
// ========================================

export const effectPatterns = {
  'ON_ATTACK': {
    validEffects: ['DESTROY (scope: SELF)', 'PERMANENT_STAT_MOD'],
    dataFormat: '{ type: "TRIGGERED", trigger: "ON_ATTACK", effects: [...] }',
    implementation: 'TriggerProcessor.fireTrigger(ON_ATTACK)',
    notes: 'Self-trigger fired after a drone completes an attack. Effects routed through EffectRouter.'
  },

  'DAMAGE': {
    validParameters: {
      value: 'number (damage amount)',
      damageType: ['PIERCING', 'undefined (normal)']
    },
    requiredParameters: ['value'],
    implementation: 'gameLogic.js:resolveUnifiedDamageEffect',
    notes: 'Can target drones or ship sections. Piercing ignores shields. Filtered via targeting.affectedFilter.'
  },

  'DESTROY': {
    validParameters: {
      scope: ['SINGLE', 'LANE', 'ALL']
    },
    requiredParameters: [],
    implementation: 'gameLogic.js:resolveDestroyEffect',
    notes: 'Lane-scoped filtering uses targeting.affectedFilter instead of effect.filter.'
  },

  'HEAL_HULL': {
    validParameters: {
      value: 'number (amount to heal)',
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['value'],
    implementation: 'gameLogic.js:resolveUnifiedHealEffect',
    notes: 'Cannot exceed maximum hull. Works on drones and ship sections.'
  },

  'HEAL_SHIELDS': {
    validParameters: {
      value: 'number (amount to heal)',
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['value'],
    implementation: 'gameLogic.js:resolveHealShieldsEffect',
    notes: 'Cannot exceed maximum shields. Only affects units with shield capacity.'
  },

  'MODIFY_STAT': {
    validParameters: {
      mod: {
        stat: ['attack', 'speed', 'cost', 'hull', 'shields'],
        value: 'number (positive or negative)',
        type: ['temporary', 'permanent']
      },
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['mod', 'mod.stat', 'mod.value', 'mod.type'],
    implementation: 'gameLogic.js:resolveModifyStatEffect',
    notes: 'Temporary mods last until end of turn. Permanent mods persist.'
  },

  'CONDITIONAL_MODIFY_STAT': {
    validParameters: {
      mod: {
        stat: ['attack', 'speed'],
        value: 'number'
      },
      condition: {
        type: ['SHIP_SECTION_HULL_DAMAGED', 'OWN_DAMAGED_SECTIONS'],
        location: ['SAME_LANE'] // for SHIP_SECTION_HULL_DAMAGED
      }
    },
    requiredParameters: ['mod', 'condition'],
    implementation: 'statsCalculator.js:calculateEffectiveStats',
    notes: 'Checked every time stats are calculated. Bonus applies when condition is true.'
  },

  'CONDITIONAL_MODIFY_STAT_SCALING': {
    validParameters: {
      mod: {
        stat: ['attack', 'speed'],
        value: 'number (per instance)'
      },
      condition: {
        type: ['OWN_DAMAGED_SECTIONS']
      }
    },
    requiredParameters: ['mod', 'condition'],
    implementation: 'statsCalculator.js:calculateEffectiveStats',
    notes: 'Bonus scales by count. E.g., +1 attack per damaged section.'
  },

  'FLANKING_BONUS': {
    validParameters: {
      mods: [
        {
          stat: ['attack', 'speed'],
          value: 'number'
        }
      ]
    },
    requiredParameters: ['mods'],
    implementation: 'statsCalculator.js:calculateEffectiveStats',
    notes: 'Applies bonuses when drone is in Lane 1 or Lane 3.'
  },

  'PERMANENT_STAT_MOD': {
    validParameters: {
      mod: {
        stat: ['attack', 'speed', 'hull', 'shields'],
        value: 'number',
        type: 'string (always "permanent")'
      }
    },
    requiredParameters: ['mod'],
    implementation: 'gameLogic.js:processAfterAttackAbilities',
    notes: 'Adds permanent modification to drone. Persists for entire game.'
  },

  'MODIFY_DRONE_BASE': {
    validParameters: {
      mod: {
        stat: ['attack', 'speed', 'hull', 'shields', 'limit', 'cost'],
        value: 'number (can be negative)',
        abilityToAdd: 'object (for adding new abilities)'
      },
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['mod'],
    implementation: 'gameLogic.js:resolveUpgradeEffect',
    notes: 'Modifies base drone type. Affects all drones of that type.'
  },

  'DRAW': {
    validParameters: {
      value: 'number (cards to draw)',
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['value'],
    implementation: 'gameLogic.js:resolveUnifiedDrawEffect',
    notes: 'Draws from deck. Auto-shuffles discard if deck empty.'
  },

  'GAIN_ENERGY': {
    validParameters: {
      value: 'number (energy to gain)',
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['value'],
    implementation: 'gameLogic.js:resolveEnergyEffect',
    notes: 'Cannot exceed maximum energy from ship sections.'
  },

  'READY_DRONE': {
    validParameters: {
      goAgain: 'boolean (optional)'
    },
    requiredParameters: [],
    implementation: 'gameLogic.js:resolveReadyDroneEffect',
    notes: 'Removes exhaustion. Target must be exhausted.'
  },

  'SEARCH_AND_DRAW': {
    validParameters: {
      searchCount: 'number (cards to view)',
      drawCount: 'number (cards to draw)',
      shuffleAfter: 'boolean',
      filter: {
        type: 'string (card type to filter by)'
      }
    },
    requiredParameters: ['searchCount', 'drawCount', 'shuffleAfter'],
    implementation: 'gameLogic.js:resolveSearchAndDrawEffect',
    notes: 'Returns needsCardSelection for player to choose cards.'
  },

  'SINGLE_MOVE': {
    validParameters: {
      properties: ['DO_NOT_EXHAUST'],
      goAgain: 'boolean (optional)'
    },
    requiredParameters: [],
    implementation: 'gameLogic.js:resolveMovementEffect',
    notes: 'Returns needsCardSelection for player to select drone and destination.'
  },

  'MULTI_MOVE': {
    validParameters: {
      count: 'number (max drones to move)',
      properties: ['DO_NOT_EXHAUST'],
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['count'],
    implementation: 'gameLogic.js:resolveMovementEffect',
    notes: 'Returns needsCardSelection for player to select drones and destination.'
  },

  'CREATE_TOKENS': {
    validParameters: {
      tokenName: 'string (name of drone type)',
      locations: ['array of lane IDs: lane1, lane2, lane3'],
      ignoresCPULimit: 'boolean'
    },
    requiredParameters: ['tokenName', 'locations'],
    implementation: 'gameLogic.js:resolveCreateTokensEffect',
    notes: 'Creates drone tokens without playing from hand. Respects maxPerLane restrictions.'
  },

  'REPEATING_EFFECT': {
    validParameters: {
      effects: 'array of effect objects',
      condition: ['OWN_DAMAGED_SECTIONS'],
      goAgain: 'boolean (optional)'
    },
    requiredParameters: ['effects', 'condition'],
    implementation: 'gameLogic.js:resolveMultiEffect',
    notes: 'Repeats sub-effects based on condition count.'
  },

  'GRANT_KEYWORD': {
    validParameters: {
      keyword: ['PIERCING', 'GUARDIAN', 'JAMMER', 'DOGFIGHT', 'RETALIATE']
    },
    requiredParameters: ['keyword'],
    implementation: 'statsCalculator.js:calculateEffectiveStats',
    notes: 'Adds special keyword ability to drone. Note: DEFENDER removed - all drones can intercept multiple times.'
  },

  'BONUS_DAMAGE_VS_SHIP': {
    validParameters: {
      value: 'number (bonus damage)'
    },
    requiredParameters: ['value'],
    implementation: 'statsCalculator.js:calculateEffectiveStats',
    notes: 'Adds bonus damage when attacking ship sections.'
  },

  'DESTROY_UPGRADE': {
    validParameters: {},
    requiredParameters: [],
    implementation: 'gameLogic.js:resolveDestroyUpgradeEffect',
    notes: 'Removes applied upgrade from target drone type.'
  }
};

// ========================================
// TARGETING PATTERNS
// ========================================

export const targetingPatterns = {
  'DRONE': {
    validParameters: {
      affinity: ['FRIENDLY', 'ENEMY', 'ANY'],
      location: ['ANY_LANE', 'SAME_LANE'],
      custom: ['EXHAUSTED', 'DAMAGED_HULL']
    },
    requiredParameters: ['affinity', 'location'],
    notes: 'Targets single drone. Custom filters for specific states.'
  },

  'LANE': {
    validParameters: {
      affinity: ['FRIENDLY', 'ENEMY', 'ANY'],
      location: ['ANY_LANE']
    },
    requiredParameters: ['affinity'],
    notes: 'Targets all units in a lane.'
  },

  'SHIP_SECTION': {
    validParameters: {
      affinity: ['FRIENDLY', 'ENEMY']
    },
    requiredParameters: ['affinity'],
    notes: 'Targets ship section for healing or damage.'
  },

  'NONE': {
    validParameters: {
      affinity: ['ENEMY', 'FRIENDLY', 'ANY'],
      affectedFilter: 'Array of string or object filters for preview highlighting'
    },
    requiredParameters: [],
    notes: 'No target selection. Used by upgrades, System Sabotage, Purge Protocol.'
  }
};

// ========================================
// FILTER PATTERNS
// ========================================

export const filterPatterns = {
  validComparisons: ['GTE', 'LTE', 'EQ', 'GT', 'LT'],
  filterableStats: ['speed', 'attack', 'hull', 'shields', 'cost'],
  filterableProperties: ['type'], // card type
  structure: {
    stat: 'string (stat name)',
    comparison: 'string (comparison operator)',
    value: 'number or string'
  },
  notes: 'Used in targeting.affectedFilter for lane-targeting cards with per-drone filtering.'
};

// ========================================
// CONDITION PATTERNS
// ========================================

export const conditionPatterns = {
  'SHIP_SECTION_HULL_DAMAGED': {
    validParameters: {
      location: ['SAME_LANE']
    },
    returns: 'boolean',
    notes: 'Checks if ship section is damaged or critical.'
  },

  'OWN_DAMAGED_SECTIONS': {
    validParameters: {},
    returns: 'number (count of damaged sections)',
    notes: 'Counts damaged/critical ship sections for scaling effects.'
  }
};

// ========================================
// KEYWORD PATTERNS
// ========================================

export const keywordPatterns = {
  // Note: DEFENDER removed - all drones can now intercept multiple times without exhausting
  validKeywords: ['PIERCING', 'GUARDIAN', 'JAMMER', 'DOGFIGHT', 'RETALIATE'],
  notes: {
    'PIERCING': 'Checked during damage calculation. Bypasses shields.',
    'GUARDIAN': 'Checked during targeting. Protects ship section.',
    'JAMMER': 'Checked during card effect targeting. Forces target this drone.',
    'DOGFIGHT': 'Checked during interception. Deals damage to attacker.',
    'RETALIATE': 'Checked when attacked. Deals damage back if drone survives.'
  }
};

// ========================================
// SCOPE PATTERNS
// ========================================

export const scopePatterns = {
  validScopes: ['SINGLE', 'LANE', 'ALL'],
  usedWith: ['DESTROY', 'DAMAGE', 'HEAL_SHIELDS'],
  notes: {
    'SINGLE': 'Affects only the targeted unit.',
    'LANE': 'Affects all units in target lane (both sides).',
    'ALL': 'Affects all matching units globally (e.g., Purge Protocol).'
  }
};

// ========================================
// SPECIAL PROPERTIES
// ========================================

export const specialProperties = {
  'DO_NOT_EXHAUST': {
    usedWith: ['SINGLE_MOVE', 'MULTI_MOVE'],
    effect: 'Moved drones do not become exhausted.',
    notes: 'Allows tactical repositioning without penalty.'
  },

  'goAgain': {
    usedWith: 'any effect',
    effect: 'Player does not end turn after playing this card.',
    notes: 'Allows chaining multiple actions in one turn.'
  },

  'ignoresCPULimit': {
    usedWith: ['CREATE_TOKENS'],
    effect: 'Created tokens do not count against CPU limit.',
    notes: 'Allows token creation even when at max drones.'
  }
};
