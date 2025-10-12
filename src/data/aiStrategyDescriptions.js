/**
 * aiStrategyDescriptions.js
 *
 * Human-written descriptions of AI decision-making logic.
 * Documents all scoring factors, formulas, and strategic principles.
 *
 * PURPOSE: Help players understand AI behavior and decision-making.
 */

// ========================================
// OVERVIEW & PRINCIPLES
// ========================================

export const aiOverview = {
  title: "AI Decision-Making Framework",
  description: `The AI evaluates all possible actions and selects the highest-scoring option.
    Scoring combines multiple factors: base value, strategic bonuses, and contextual penalties.
    The AI uses a two-pass system: first calculates base scores, then applies special adjustments
    for Jammers and interception dynamics.`,

  decisionFlow: [
    "1. Generate all possible actions (deploy, attack, move, play card)",
    "2. Calculate base score for each action",
    "3. Apply Jammer blocking adjustments",
    "4. Apply interception awareness adjustments",
    "5. Select action with highest score (with randomization for top choices)",
    "6. Pass if no action scores above threshold"
  ],

  passingThresholds: {
    deployment: "Score must be >= 5 to deploy (otherwise passes)",
    action: "Score must be > 0 to act (otherwise passes)"
  },

  randomization: "When multiple actions score within 20 points of the top score, AI randomly selects from this pool to add variety and unpredictability."
};

// ========================================
// EMOJI LEGEND
// ========================================

export const emojiLegend = {
  "✅": {
    name: "Positive Factor",
    description: "Indicates a bonus that increases action score",
    examples: ["Target Value", "Favorable Trade", "Lane Impact"]
  },
  "⚠️": {
    name: "Negative Factor / Warning",
    description: "Indicates a penalty that decreases action score, or a low-priority action",
    examples: ["Cost", "Interception Risk", "Anti-Ship Drone"]
  },
  "📊": {
    name: "Analysis / Calculation",
    description: "Shows calculated values or analysis results",
    examples: ["Lane Impact", "Projected Energy", "Available Lanes"]
  },
  "🔄": {
    name: "Lane Flip",
    description: "Bonus for turning a losing lane into a winning lane",
    examples: ["Lane Flip: +50"]
  },
  "🛡️": {
    name: "Defensive / Interceptor",
    description: "Related to defense, interception, or protective actions",
    examples: ["Defensive Move", "Defensive Asset"]
  },
  "🎯": {
    name: "Strategic Target",
    description: "High-value strategic targeting",
    examples: ["Interceptor Removal"]
  },
  "❌": {
    name: "Blocked / Invalid",
    description: "Action is blocked or invalid",
    examples: ["BLOCKED BY JAMMER", "No available lanes"]
  }
};

// ========================================
// DEPLOYMENT SCORING
// ========================================

export const deploymentScoring = {
  overview: "AI evaluates where to deploy drones by projecting lane scores and calculating strategic value.",

  factors: {
    laneImpact: {
      name: "Lane Impact",
      formula: "projectedScore - currentScore",
      description: "How much the drone improves the lane's power balance. Calculated by simulating the deployment and measuring the score change.",
      range: "Typically -50 to +100"
    },

    strategicBonus: {
      name: "Strategic Bonus",
      description: "Context-aware bonus based on current lane situation",
      conditions: [
        {
          condition: "Lane is losing (score < -15)",
          bonuses: [
            "Fast drone (speed >= 4): +15",
            "Defensive keywords (ALWAYS_INTERCEPTS, GUARDIAN): +20"
          ]
        },
        {
          condition: "Lane is winning (score > 15)",
          bonuses: [
            "High attack (attack >= 4): +15",
            "Anti-ship ability: +20"
          ]
        },
        {
          condition: "Lane is contested (-15 to 15)",
          bonuses: [
            "Cheap drone (class <= 1): +10"
          ]
        }
      ]
    },

    stabilizationBonus: {
      name: "Stabilization Bonus",
      formula: "Random(10, 30)",
      description: "Bonus for turning a losing lane (score < 0) into a winning lane (score >= 0)",
      trigger: "currentScore < 0 AND projectedScore >= 0"
    },

    dominanceBonus: {
      name: "Dominance Bonus",
      formula: "Random(10, 30)",
      description: "Bonus for achieving strong lane control",
      trigger: "projectedScore > 20 AND currentScore <= 20"
    },

    overkillPenalty: {
      name: "Overkill Penalty",
      value: "-150",
      description: "Severe penalty for deploying to lanes where enemy ship section is already damaged/critical and lane is already winning",
      trigger: "Enemy section damaged/critical AND currentScore > 5"
    },

    maxPerLane: {
      name: "Max Per Lane Restriction",
      value: "-999 (blocks deployment)",
      description: "Some drones have maxPerLane limits. If reached, deployment to that lane is blocked."
    }
  },

  energyManagement: "AI reserves energy equal to the most expensive card in hand, preventing deployment if it would drop below this threshold."
};

// ========================================
// ATTACK SCORING
// ========================================

export const attackScoring = {
  overview: "AI evaluates attacks by considering target value, trade efficiency, and lane impact.",

  droneAttacks: {
    baseValue: {
      name: "Target Class Value",
      formula: "targetClass × 10",
      description: "Base value of destroying the target drone",
      range: "10 to 50 (for class 1-5 drones)"
    },

    favorableTrade: {
      name: "Favorable Trade",
      value: "+20",
      trigger: "Attacker class < target class",
      description: "Bonus for trading up (low-value drone attacking high-value target)"
    },

    readyTarget: {
      name: "Ready Target",
      value: "+10",
      trigger: "Target is not exhausted",
      description: "Bonus for removing an active threat"
    },

    antiShipPenalty: {
      name: "Anti-Ship Drone Penalty",
      value: "-40",
      trigger: "Attacker has BONUS_DAMAGE_VS_SHIP ability",
      description: "Penalty to discourage using bombers against drones instead of ships"
    },

    piercingBonus: {
      name: "Piercing Damage Bonus",
      formula: "targetShields × 8",
      trigger: "Attacker has PIERCING damage",
      description: "Bonus for bypassing shields with piercing damage"
    },

    laneImpact: {
      name: "Lane Impact",
      formula: "laneImpact × 0.5",
      description: "Half-weight bonus based on how killing this drone improves lane control",
      trigger: "Lane score improves after simulating target removal"
    },

    laneFlip: {
      name: "Lane Flip Bonus",
      value: "+50",
      trigger: "currentScore < 0 AND projectedScore >= 0",
      description: "Large bonus for turning a losing lane into a winning lane"
    }
  },

  shipAttacks: {
    baseValue: {
      name: "Attack Value",
      formula: "effectiveAttack × 8",
      description: "Base value of dealing damage to ship section",
      range: "0 to 40 (for 0-5 attack)"
    },

    damagedSection: {
      name: "Damaged Section",
      value: "+15",
      trigger: "Section status is 'damaged'",
      description: "Bonus for attacking weakened sections"
    },

    criticalSection: {
      name: "Critical Section",
      value: "+30",
      trigger: "Section status is 'critical'",
      description: "Large bonus for finishing off critical sections"
    },

    noShields: {
      name: "No Shields",
      value: "+40",
      trigger: "Section has 0 allocated shields",
      description: "Bonus for attacking unprotected sections"
    },

    shieldBreak: {
      name: "Shield Break",
      value: "+35",
      trigger: "Attack >= allocated shields (but shields > 0)",
      description: "Bonus for attacks that will break through shields"
    },

    highAttack: {
      name: "High Attack",
      value: "+10",
      trigger: "Attack >= 3",
      description: "Bonus for high-damage attacks"
    },

    piercingBonus: {
      name: "Piercing Damage Bonus",
      formula: "allocatedShields × 10",
      trigger: "Attacker has PIERCING damage",
      description: "Bonus for bypassing shields completely"
    }
  }
};

// ========================================
// CARD SCORING
// ========================================

export const cardScoring = {
  overview: "AI evaluates cards by their effect impact minus energy cost. Different card types use different formulas.",

  universalFactor: {
    costPenalty: {
      name: "Cost Penalty",
      formula: "card.cost × 4",
      description: "Applied to most offensive/utility cards. Represents opportunity cost of spending energy.",
      range: "-4 to -20 (for costs 1-5)"
    }
  },

  cardTypes: {
    DESTROY_single: {
      name: "Destroy (Single Target)",
      formula: "(hull + shields) × 8 - costPenalty",
      description: "Values target's total resources multiplied by 8",
      example: "Destroying a 3-hull, 2-shield drone: (3+2)×8 - 12 = 28 score"
    },

    DESTROY_filtered: {
      name: "Destroy (Filtered)",
      formula: "sum[(hull + shields + class×5)×8] - costPenalty",
      description: "Values all matching targets with class multiplier",
      example: "Hitting 2 drones (5 resources each): 10×8 - cost"
    },

    DESTROY_lane: {
      name: "Destroy (Lane)",
      formula: "(enemyValue - friendlyValue) × 4 - costPenalty",
      description: "Net lane value with 1.5× multiplier for ready drones",
      weighting: "Ready drones count as 1.5× their base value"
    },

    DAMAGE_filtered: {
      name: "Damage (Filtered)",
      formula: "totalDamage × 10 + multiHitBonus - costPenalty",
      multiHitBonus: "targetsHit × 15 (if multiple targets)",
      description: "High value for multi-target damage"
    },

    DAMAGE_single: {
      name: "Damage (Single Target)",
      formula: "damage × 8 + lethalBonus - costPenalty",
      lethalBonus: "targetClass × 15 + 50 (if damage >= target hull)",
      piercingNote: "Piercing damage noted but doesn't change base score"
    },

    READY_DRONE: {
      name: "Ready Drone",
      formula: "targetClass × 12",
      description: "No cost penalty. Values unexhausting high-class drones.",
      noCostPenalty: true
    },

    GAIN_ENERGY: {
      name: "Gain Energy",
      formula: "60 + enabledCardCost × 5 (if enables card play)",
      lowPriority: "Score: 1 (if doesn't enable new card plays)",
      description: "High value if it enables playing an expensive card"
    },

    DRAW: {
      name: "Draw Cards",
      formula: "10 + energyAfterPlay × 2",
      lowPriority: "Score: 1 (if no energy left after)",
      description: "Values based on remaining energy to use drawn cards"
    },

    SEARCH_AND_DRAW: {
      name: "Search and Draw",
      formula: "drawCount × 12 + searchCount × 2 + energyAfterPlay × 2",
      lowPriority: "Score: 2 (if no energy left after)",
      description: "High value for card selection and draw power"
    },

    HEAL_SHIELDS: {
      name: "Heal Shields",
      formula: "shieldsHealed × 5",
      description: "Values each shield point restored",
      targeting: "Only targets drones below max shields"
    },

    HEAL_HULL_section: {
      name: "Heal Ship Section",
      value: "80",
      description: "Fixed high value for ship repairs"
    },

    REPEATING_EFFECT: {
      name: "Repeating Effect",
      formula: "repeatCount × 25 - costPenalty",
      description: "Scales with number of repeats (e.g., damaged sections)",
      example: "3 damaged sections: 3×25 - cost = 75 - cost"
    },

    CREATE_TOKENS: {
      name: "Create Tokens (Deploy Jammers)",
      formula: "(30 + cpuValue×5 + highValueCount×15 - costPenalty) × availableLanes/3",
      scaling: "Scales down if lanes already have Jammers",
      blocked: "Score: -999 if all lanes have Jammers",
      description: "Values protecting high-class drones with Jammer tokens"
    },

    MODIFY_STAT: {
      name: "Modify Stat",
      description: "Complex scoring based on stat type and target",
      variants: [
        {
          type: "Lane-wide buff",
          formula: "laneImpact × 1.5 + activeDroneCount × 10",
          description: "Simulates buff and measures lane score change"
        },
        {
          type: "Attack buff (single)",
          formula: "targetClass × 10 + buffValue × 8 - costPenalty",
          description: "Values based on target quality"
        },
        {
          type: "Attack debuff (enemy)",
          formula: "enemyAttack × 8 - costPenalty",
          description: "Values based on threat reduction"
        },
        {
          type: "Speed buff",
          formula: "60 (if overcomes interceptor) OR 20 (generic)",
          description: "High value if it makes drone unchecked"
        },
        {
          type: "Other stats",
          formula: "10 - costPenalty",
          description: "Generic value for other modifications"
        }
      ],
      modifiers: {
        permanent: "×1.5 multiplier to final score",
        goAgain: "+40 bonus if card has goAgain"
      }
    }
  }
};

// ========================================
// MOVEMENT SCORING
// ========================================

export const movementScoring = {
  overview: "AI evaluates moves by simulating the movement and measuring lane score changes in both lanes.",

  factors: {
    toLaneImpact: {
      name: "Destination Lane Impact",
      formula: "projectedToScore - currentToScore",
      description: "How much the drone improves the destination lane",
      range: "Typically -30 to +50"
    },

    fromLaneImpact: {
      name: "Source Lane Impact",
      formula: "projectedFromScore - currentFromScore",
      description: "How much removing the drone affects the source lane (usually negative)",
      range: "Typically -50 to +10"
    },

    moveCost: {
      name: "Move Cost",
      value: "-10",
      description: "Base cost of movement to prevent unnecessary repositioning"
    },

    defensiveMove: {
      name: "Defensive Move",
      value: "+25",
      trigger: "Moving to protect damaged/critical own section AND toLane is losing",
      description: "Bonus for defensive repositioning"
    },

    offensiveMove: {
      name: "Offensive Move",
      value: "+20",
      trigger: "Moving to attack damaged enemy section AND toLane is winning",
      description: "Bonus for pressing advantage"
    },

    overkill: {
      name: "Overkill",
      value: "-150",
      trigger: "Moving to lane with critical enemy section AND toLane already winning",
      description: "Severe penalty for wasting moves on finished lanes"
    },

    onMoveAbility: {
      name: "On-Move Ability",
      formula: "attackGain × 15 + speedGain × 10",
      trigger: "Drone has TRIGGERED ability with ON_MOVE trigger",
      description: "Bonus for drones that gain stats when moving"
    },

    maxPerLane: {
      name: "Max Per Lane Restriction",
      description: "Move is silently skipped if it would violate maxPerLane limit",
      blocking: true
    }
  }
};

// ========================================
// SPECIAL SYSTEMS
// ========================================

export const specialSystems = {
  jammerSystem: {
    name: "Jammer Blocking System",
    description: `Two-pass scoring system that handles Jammer keyword effects.
      Pass 1 identifies and blocks invalid card plays.
      Pass 2 rewards Jammer removal with unblocked value.`,

    blocking: {
      trigger: "Card targets non-Jammer drone in lane with Jammer",
      effect: "Action score set to -999 (blocked)",
      logic: "❌ BLOCKED BY JAMMER"
    },

    removalBonus: {
      name: "Jammer Removal",
      formula: "Sum of blocked card scores in that lane",
      description: "Attacking a Jammer adds value of all cards it's blocking",
      additionalBonus: "+30 if using low-attack drone (attack <= 2) for efficiency"
    }
  },

  interceptionSystem: {
    name: "Interception Awareness System",
    description: `Two-pass scoring system analyzing speed-based interception dynamics.
      Pass 1 analyzes all lanes for interceptors and threats.
      Pass 2 applies bonuses/penalties based on analysis.`,

    analysis: {
      aiSlowAttackers: "AI drones that can be intercepted (speed <= enemy max speed)",
      aiUncheckedThreats: "AI drones too fast to intercept (speed > enemy max speed)",
      aiDefensiveInterceptors: "AI drones that can intercept enemy attacks (speed > at least one enemy)",
      enemyInterceptors: "Enemy drones that can intercept AI attacks (speed > AI max speed)"
    },

    adjustments: {
      interceptionRisk: {
        name: "Interception Risk",
        value: "-80",
        trigger: "Ship attack by slow attacker (can be intercepted)",
        description: "Penalty for risky ship attacks that can be blocked"
      },

      uncheckedThreat: {
        name: "Unchecked Threat",
        value: "+100",
        trigger: "Ship attack by fast attacker (too fast to intercept)",
        description: "Bonus for guaranteed ship damage"
      },

      defensiveAsset: {
        name: "Defensive Asset (Threat-Scaled)",
        values: {
          "1 ATK threat": "0 (no penalty)",
          "2 ATK threat": "-10",
          "3 ATK threat": "-40",
          "4+ ATK threat": "-120"
        },
        trigger: "Using defensive interceptor offensively",
        description: "Penalty scaled by the threat level being defended against. Prevents wasting interceptors on weak targets while allowing them to attack trivial threats.",
        calculation: "Finds max attack among enemies this interceptor can defend against (where interceptor speed > enemy speed)"
      },

      interceptorRemoval: {
        name: "Interceptor Removal",
        formula: "Sum of unblocked ship attack values",
        trigger: "Attacking enemy interceptor",
        description: "Bonus equal to value of ship attacks that would be freed up"
      }
    }
  },

  laneScoring: {
    name: "Lane Score Calculation",
    description: "Core evaluation function comparing AI vs human power in a lane",

    components: {
      power: {
        name: "Lane Power",
        formula: "sum[attack + potentialShipDamage + hull + shields]",
        description: "Total combat value of all drones in lane",
        note: "Uses effective stats (includes buffs/debuffs)"
      },

      speed: {
        name: "Speed Advantage",
        formula: "(aiMaxSpeed - humanMaxSpeed) × 5",
        description: "Bonus for speed superiority"
      },

      sectionHealth: {
        name: "Section Health Modifier",
        ownSection: {
          damaged: "-20",
          critical: "-40",
          description: "Penalty if AI's section in that lane is damaged"
        },
        enemySection: {
          damaged: "+15",
          critical: "+30",
          description: "Bonus if enemy's section in that lane is damaged"
        }
      }
    },

    finalScore: "power + speed + sectionHealth",
    usage: "Used throughout AI logic for deployment, attack, and movement decisions"
  }
};

// ========================================
// DECISION EXAMPLES
// ========================================

export const decisionExamples = [
  {
    category: "Deployment",
    scenario: "Lane 1 is losing (-25), Lane 2 is winning (+30), Lane 3 is contested (+5)",
    options: [
      {
        choice: "Deploy Guardian (class 3) to Lane 1",
        calculation: "Impact: +40, Strategic (defensive keyword): +20, Stabilization: +15, Total: +75"
      },
      {
        choice: "Deploy Bomber (class 4) to Lane 2",
        calculation: "Impact: +20, Strategic (anti-ship): +20, Overkill: -150, Total: -110"
      },
      {
        choice: "Deploy Scout (class 1) to Lane 3",
        calculation: "Impact: +15, Strategic (cheap in contested): +10, Total: +25"
      }
    ],
    decision: "Deploys Guardian to Lane 1 (highest score: +75)",
    lesson: "AI prioritizes stabilizing losing lanes over reinforcing already-winning lanes"
  },
  {
    category: "Attack",
    scenario: "AI Interceptor (class 2, speed 5) can attack enemy Heavy Bomber (class 4, speed 3) or enemy ship section",
    options: [
      {
        choice: "Attack Heavy Bomber",
        calculation: "Class: +40, Favorable Trade: +20, Ready: +10, Defensive Asset (vs 4 ATK): -120, Total: -50"
      },
      {
        choice: "Attack Ship Section",
        calculation: "Attack×8: +16, No Shields: +40, Interception Risk: -80, Defensive Asset (vs 4 ATK): 0, Total: -24"
      }
    ],
    decision: "Likely passes or chooses different attacker",
    lesson: "Threat-scaled defensive penalty preserves interceptors against high-threat enemies, even when trades look favorable"
  },
  {
    category: "Cards",
    scenario: "AI has 12 energy, Deploy Jammers (4 cost) in hand, 3 high-value drones on board, 2 lanes available",
    options: [
      {
        choice: "Play Deploy Jammers",
        calculation: "Base: +30, CPU Value (18×5): +90, High-Value (3×15): +45, Cost: -16, Scaling (2/3): ×0.67, Total: ~100"
      }
    ],
    decision: "Plays Deploy Jammers (score: ~100)",
    lesson: "AI highly values Jammer protection when it has expensive drones to protect"
  }
];

// ========================================
// TIPS FOR PLAYERS
// ========================================

export const playerTips = [
  {
    tip: "Use Jammers strategically",
    explanation: "Jammers block AI's removal cards. AI will prioritize killing Jammers if it has valuable cards blocked."
  },
  {
    tip: "Deploy interceptors carefully",
    explanation: "Fast drones can block AI attacks. AI recognizes this and may target interceptors or use unchecked threats."
  },
  {
    tip: "Protect damaged sections",
    explanation: "AI gets large bonuses for attacking damaged/critical sections. Use Guardians or interceptors to protect them."
  },
  {
    tip: "Bait anti-ship drones",
    explanation: "AI gets penalties for using bombers against drones. You can bait them into suboptimal trades."
  },
  {
    tip: "Understand threat scaling",
    explanation: "AI won't waste high-speed interceptors on weak attackers, but will readily use them against trivial threats (1 ATK)."
  },
  {
    tip: "Lane control matters",
    explanation: "AI heavily weights lane scores. Flipping a lane from losing to winning triggers large bonuses."
  },
  {
    tip: "Energy denial works",
    explanation: "AI reserves energy for its most expensive card. If you can make it spend energy, it may be forced to deploy less."
  },
  {
    tip: "Position matters for AI",
    explanation: "AI won't overkill lanes with critical sections. You can sometimes safely leave a critical section if the lane is already lost."
  }
];
