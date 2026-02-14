// ========================================
// AI CONSTANTS
// ========================================
// Centralized scoring weights, thresholds, and multipliers
// used throughout the AI decision-making system.

// ========================================
// SCORING WEIGHTS
// ========================================
// Used in calculateLaneScore and calculateDroneImpact

export const SCORING_WEIGHTS = {
  // Primary stat multipliers
  ATTACK_MULTIPLIER: 4,
  CLASS_MULTIPLIER: 2,
  DURABILITY_MULTIPLIER: 0.5,

  // Speed advantage in lane scoring
  SPEED_ADVANTAGE_MULTIPLIER: 8,

  // Card cost penalty
  COST_PENALTY_MULTIPLIER: 4,

  // Damage value calculation
  DAMAGE_VALUE_MULTIPLIER: 8,

  // Resource value for destroy calculations
  RESOURCE_VALUE_MULTIPLIER: 8,

  // Piercing damage bonus against shields
  PIERCING_SHIELD_MULTIPLIER: 8,
  PIERCING_SECTION_MULTIPLIER: 10,
};

// ========================================
// LANE THRESHOLDS
// ========================================
// Used to categorize lane advantage/disadvantage

export const LANE_THRESHOLDS = {
  LOSING_BADLY: -15,
  WINNING_STRONGLY: 15,
  DOMINANCE: 20,
};

// ========================================
// DECISION THRESHOLDS
// ========================================
// Minimum scores for taking actions

export const DECISION_THRESHOLDS = {
  MIN_DEPLOY_SCORE: 5,
  MIN_ACTION_SCORE: 0,
  ACTION_POOL_RANGE: 20,
};

// ========================================
// DEPLOYMENT BONUSES
// ========================================
// Strategic bonuses during deployment phase

export const DEPLOYMENT_BONUSES = {
  // When losing badly (lane score < -15)
  FAST_DRONE_DEFENSIVE: 15,       // speed >= 4
  GUARDIAN_DEFENSIVE: 20,          // ALWAYS_INTERCEPTS or GUARDIAN

  // When winning strongly (lane score > 15)
  HIGH_ATTACK_OFFENSIVE: 15,       // attack >= 4
  ANTI_SHIP_OFFENSIVE: 20,         // BONUS_DAMAGE_VS_SHIP

  // When lane is balanced
  CHEAP_DRONE_BALANCED: 10,        // class <= 1

  // Situational bonuses (randomized range)
  STABILIZATION_MIN: 10,
  STABILIZATION_MAX: 30,
  DOMINANCE_MIN: 10,
  DOMINANCE_MAX: 30,

  // ON_DEPLOY ability bonuses
  MARK_ENEMY_VALUE: 15,            // Scanner: marking an enemy
};

// ========================================
// ATTACK BONUSES
// ========================================
// Bonuses when scoring attack actions

export const ATTACK_BONUSES = {
  // Drone attack bonuses
  BASE_CLASS_MULTIPLIER: 10,       // target.class * 10
  FAVORABLE_TRADE: 20,             // attacker class < target class
  READY_TARGET: 10,                // target not exhausted
  LANE_IMPACT_WEIGHT: 0.5,         // lane score improvement weight
  LANE_FLIP_WEIGHT: 0.5,           // lane flip bonus weight
  GROWTH_MULTIPLIER: 8,            // Gladiator: bonus per +1 stat gained

  // Ship section attack bonuses
  DAMAGED_SECTION: 15,
  CRITICAL_SECTION: 30,
  NO_SHIELDS: 40,
  SHIELD_BREAK: 35,
  HIGH_ATTACK: 10,                 // attack >= 3
};

// ========================================
// PENALTIES
// ========================================
// Score penalties for suboptimal actions

export const PENALTIES = {
  OVERKILL: -150,                  // Deploying to already-won lane
  GUARDIAN_ATTACK_RISK: -200,      // Guardian attacking with enemies present
  INTERCEPTION_RISK: -80,          // Slow attacker can be intercepted
  ANTI_SHIP_ATTACKING_DRONE: -100, // Anti-ship drone attacking other drones
  MOVE_COST: 10,                   // Base cost of moving
  INTERCEPTION_COVERAGE_MULTIPLIER: -5, // Per threat point of enemies being blocked
  INTERCEPTION_COVERAGE_MIN: -10,  // Minimum penalty when losing interception coverage

  // Retaliate ability penalties (when attacking a drone with RETALIATE)
  RETALIATE_LETHAL: -50,           // Target would kill attacker on retaliate
  RETALIATE_DAMAGE_MULTIPLIER: -5, // Per point of retaliate damage (if not lethal)
};

// ========================================
// INTERCEPTION CONSTANTS
// ========================================
// Used in interception decision-making

export const INTERCEPTION = {
  // Trade ratio thresholds (interceptor impact / attacker impact)
  EXCELLENT_TRADE_RATIO: 0.3,
  GOOD_TRADE_RATIO: 0.7,

  // Protection value multiplier
  PROTECTION_MULTIPLIER: 1.5,

  // Sacrifice ratio thresholds (protection value / interceptor impact)
  EXCELLENT_SACRIFICE_RATIO: 2.0,
  GOOD_SACRIFICE_RATIO: 1.3,

  // Opportunity cost threshold multiplier
  OPPORTUNITY_COST_MULTIPLIER: 1.5,

  // Score values for different decision outcomes (when interceptor survives)
  // Note: DEFENDER-specific scores removed - all drones can now intercept multiple times
  EXCELLENT_TRADE_SCORE: 90,
  GOOD_TRADE_SCORE: 70,
  PROTECTIVE_SCORE: 50,

  // Score values for sacrifice scenarios (interceptor dies)
  EXCELLENT_SACRIFICE_SCORE: 60,
  GOOD_SACRIFICE_SCORE: 45,

  // Ship attack specific adjustments
  UNCHECKED_THREAT_BONUS: 100,
  INTERCEPTOR_REMOVAL_CARD_PREMIUM: 1.15,  // Cards get 15% premium (don't exhaust a drone)

  // Protection value multipliers based on what's being protected
  SHIELD_PROTECTION_MULTIPLIER: 5,
  HULL_PROTECTION_MULTIPLIER: 15,
  SHIP_PROTECTION_MULTIPLIER: 10,  // Fallback

  // Dogfight ability bonuses (when intercepting with a DOGFIGHT drone)
  DOGFIGHT_KILL_BONUS: 30,         // Dogfight damage would kill the attacker
  DOGFIGHT_DAMAGE_MULTIPLIER: 5,   // Per point of dogfight damage (if not lethal)
};

// ========================================
// DEFENSE URGENCY (Percentage-Based)
// ========================================
// Defense priority scales with how close AI is to losing (60% damage = loss)
// Uses total hull damage percentage instead of section counting

export const DEFENSE_URGENCY = {
  // Damage percentage thresholds
  LOW_DAMAGE_THRESHOLD: 0.20,      // Below 20% - minimal defense priority
  MEDIUM_DAMAGE_THRESHOLD: 0.40,   // 20-40% - moderate defense
  HIGH_DAMAGE_THRESHOLD: 0.55,     // 40-55% - high priority (close to losing)
  // Above 55% is CRITICAL

  // Defense multipliers at each tier
  BASELINE_MULTIPLIER: 1.0,        // Below 20% damage
  MODERATE_MULTIPLIER: 2.0,        // 20-40% damage
  HIGH_MULTIPLIER: 4.0,            // 40-55% damage
  CRITICAL_MULTIPLIER: 8.0,        // 55%+ damage (close to 60% loss)

  // Base penalty per point of potential damage
  BASE_DAMAGE_PENALTY: -3,
};

// ========================================
// WIN RACE AWARENESS
// ========================================
// Adjust aggression based on relative damage progress

export const WIN_RACE = {
  // Threshold for significant advantage (10% difference)
  ADVANTAGE_THRESHOLD: 0.10,

  // Multipliers when ahead (protect the lead)
  AHEAD_DEFENSE_MULTIPLIER: 1.5,
  AHEAD_OFFENSE_MULTIPLIER: 0.7,

  // Multipliers when behind (catch up)
  BEHIND_DEFENSE_MULTIPLIER: 0.7,
  BEHIND_OFFENSE_MULTIPLIER: 1.5,
};

// ========================================
// THRESHOLD CROSSING BONUSES
// ========================================
// Small bonus for attacks that cross status thresholds (stat penalties)

export const THRESHOLD_BONUS = {
  // Bonus for pushing section to damaged status
  CROSS_TO_DAMAGED: 8,
  // Bonus for pushing section to critical status
  CROSS_TO_CRITICAL: 12,
};

// ========================================
// CARD EVALUATION CONSTANTS
// ========================================
// Used when scoring card plays

export const CARD_EVALUATION = {
  // DESTROY card scoring
  FILTERED_DESTROY_MULTIPLIER: 8,
  LANE_DESTROY_MULTIPLIER: 4,
  READY_DRONE_WEIGHT: 1.5,         // Ready drones worth more in lane destroy

  // DAMAGE card scoring
  DAMAGE_MULTIPLIER: 8,
  FILTERED_DAMAGE_MULTIPLIER: 10,
  MULTI_HIT_BONUS_PER_TARGET: 15,
  LETHAL_BASE_BONUS: 50,
  LETHAL_CLASS_MULTIPLIER: 15,
  OVERFLOW_SHIP_DAMAGE_MULTIPLIER: 12,  // Premium value for ship damage overflow
  PIERCING_SHIELD_BYPASS_MULTIPLIER: 4, // Value of bypassing shields with piercing

  // READY_DRONE card scoring
  SHIP_ATTACK_MULTIPLIER: 8,
  DRONE_ATTACK_MULTIPLIER: 8,
  INTERCEPTION_VALUE_PER_THREAT: 20,
  GUARDIAN_KEYWORD_BONUS: 30,
  LANE_IMPACT_WEIGHT: 1.5,
  LANE_FLIP_BONUS: 30,

  // GAIN_ENERGY card scoring
  ENABLES_CARD_BASE: 60,
  ENABLES_CARD_PER_COST: 5,
  LOW_PRIORITY_SCORE: 1,

  // DRAW card scoring
  DRAW_BASE_VALUE: 10,
  ENERGY_REMAINING_MULTIPLIER: 2,

  // SEARCH_AND_DRAW card scoring
  SEARCH_DRAW_VALUE_PER_CARD: 12,
  SEARCH_BONUS_PER_SEARCH: 2,

  // HEAL_SHIELDS card scoring
  SHIELD_HEAL_VALUE_PER_POINT: 5,

  // HEAL_HULL card scoring
  SECTION_HEAL_VALUE: 80,

  // REPEATING_EFFECT card scoring
  REPEAT_VALUE_PER_REPEAT: 25,

  // LANES_CONTROLLED card scoring
  LANE_CONTROL_ENERGY_VALUE: 30,    // Per energy gained from lane control
  LANE_CONTROL_DRAW_VALUE: 35,      // Per card drawn from lane control
  LANE_CONTROL_RALLY_BONUS: 25,     // Bonus for readying in contested lane

  // CREATE_TOKENS (Jammers) card scoring
  JAMMER_BASE_VALUE: 30,
  JAMMER_CPU_VALUE_MULTIPLIER: 5,
  JAMMER_HIGH_VALUE_DRONE_BONUS: 15,

  // CREATE_TOKENS (Rally Beacon) card scoring
  RALLY_BEACON_BASE_VALUE: 20,
  RALLY_BEACON_ADJACENT_DRONE_VALUE: 10,
  RALLY_BEACON_DEFENDING_DRONE_VALUE: 8,
  RALLY_BEACON_MOVEMENT_CARD_BONUS: 15,

  // MODIFY_STAT card scoring
  ATTACK_BUFF_MULTIPLIER: 8,
  CLASS_VALUE_MULTIPLIER: 10,
  THREAT_REDUCTION_MULTIPLIER: 8,
  INTERCEPTOR_OVERCOME_BONUS: 60,
  SPEED_BUFF_BONUS: 20,
  GENERIC_STAT_BONUS: 10,
  PERMANENT_MOD_MULTIPLIER: 1.5,
  GO_AGAIN_BONUS: 40,
  NOT_FIRST_ACTION_ENABLER_BONUS: 15,  // Added to goAgain cards when ready drones with NOT_FIRST_ACTION abilities exist
  MULTI_BUFF_BONUS_PER_DRONE: 10,

  // SINGLE_MOVE card scoring
  ON_MOVE_ATTACK_BONUS_PER_POINT: 15,
  ON_MOVE_SPEED_BONUS_PER_POINT: 10,

  // EXHAUST_DRONE card scoring (EMP Burst)
  EXHAUST_VALUE_MULTIPLIER: 8,    // Value per attack point denied

  // DRAIN_ENERGY card scoring (Power Drain)
  ENERGY_DENY_MULTIPLIER: 10,     // Value per energy drained from opponent

  // DISCARD card scoring (Mental Disruption)
  CARD_VALUE_MULTIPLIER: 18,      // Value per card discarded from opponent's hand

  // DEFENDER keyword bonus (also used by EXHAUST_DRONE)
  DEFENDER_KEYWORD_BONUS: 15,

  // INCREASE_THREAT card scoring (Raise the Alarm, Transmit Threat)
  THREAT_INCREASE_BASE_VALUE: 250,          // High base for flat threat cards - play ASAP
  THREAT_INCREASE_PER_POINT: 2,            // Per point of threat added
  THREAT_PER_DRONE_VALUE: 100,              // Per matching drone when perDrone is set

  // Status effect evaluation
  STATUS_MOVE_DENY_MULTIPLIER: 8,      // Per attack point (locked in place)
  STATUS_ATTACK_DENY_MULTIPLIER: 10,   // Per attack point (direct threat)
  STATUS_INTERCEPT_DENY_MULTIPLIER: 6, // Per speed point (interception capability)
  STATUS_READY_DENY_MULTIPLIER: 8,     // Per attack point for does not ready
  STATUS_READY_DURATION_FACTOR: 0.7,   // Does not ready is temporary (70% value)
  STATUS_CLEAR_VALUE_PER_EFFECT: 25,   // Per status removed
  STATUS_MARKED_CLEAR_BONUS: 15,       // Clearing marked status
  ON_MOVE_ABILITY_BONUS: 15,           // Denying ON_MOVE ability
};

// ========================================
// MOVE EVALUATION CONSTANTS
// ========================================
// Used when scoring move actions

export const MOVE_EVALUATION = {
  BASE_MOVE_COST: 10,
  DEFENSIVE_MOVE_BONUS: 25,
  OFFENSIVE_MOVE_DAMAGED: 20,
  ON_MOVE_ATTACK_BONUS: 15,
  ON_MOVE_SPEED_BONUS: 10,
};

// ========================================
// JAMMER CONSTANTS
// ========================================
// Used in Jammer adjustment pass

export const JAMMER = {
  EFFICIENCY_BONUS: 30,            // Low-attack drone removing Jammer
  EFFICIENCY_ATTACK_THRESHOLD: 2,  // Max attack for efficiency bonus
};

// ========================================
// UPGRADE CARD EVALUATION CONSTANTS
// ========================================
// Used when scoring MODIFY_DRONE_BASE (Upgrade) card plays

export const UPGRADE_EVALUATION = {
  // Base values by stat type
  ATTACK_UPGRADE_BASE: 40,        // +1 attack is highly valuable
  SPEED_UPGRADE_BASE: 35,         // +1 speed improves interception/evasion
  SHIELDS_UPGRADE_BASE: 30,       // +1 shields adds survivability
  LIMIT_UPGRADE_BASE: 50,         // +1 deployment limit is strategic
  COST_REDUCTION_BASE: 45,        // -1 cost is economically powerful
  ABILITY_GRANT_BASE: 60,         // Granting keywords is premium

  // Scaling multipliers
  DRONE_CLASS_MULTIPLIER: 8,      // Higher class drones benefit more
  DEPLOYED_DRONE_BONUS: 15,       // Per deployed drone of this type
  READY_DRONE_BONUS: 8,           // Additional bonus per ready drone
  REMAINING_LIMIT_MULTIPLIER: 10, // Per remaining deployable drone
  UPGRADE_SLOTS_SCARCITY: 12,     // Bonus when filling last slot

  // Synergy bonuses
  ATTACK_ON_HIGH_SPEED: 20,       // Attack upgrade on speed >= 4
  SPEED_ON_HIGH_ATTACK: 15,       // Speed upgrade on attack >= 3
  PIERCING_ON_HIGH_ATTACK: 30,    // Piercing on attack >= 3

  // Penalties
  LOW_REMAINING_LIMIT_PENALTY: -20, // When at deployment cap
  NO_DEPLOYED_PENALTY: -30,         // No drones of this type on board
};

// ========================================
// INVALID ACTION SCORE
// ========================================
// Used to mark actions as invalid/blocked

export const INVALID_SCORE = -999;

// ========================================
// TARGET SCORING CONSTANTS
// ========================================
// Universal constants for damage/destroy target evaluation
// Used by calculateTargetValue() for consistent prioritization

export const TARGET_SCORING = {
  // Priority 1: Jammer blocking (HIGHEST)
  JAMMER_BLOCKING_BASE: 30,          // Base bonus + protected targets value

  // Priority 2: Active interception blocking
  INTERCEPTION_BLOCKER_BONUS: 40,    // Per friendly attacker being blocked

  // Priority 3: Ready state
  READY_TARGET_BONUS: 25,

  // Priority 4: Threat value (flat bonuses by tier)
  CLASS_0_BONUS: 0,
  CLASS_1_BONUS: 3,
  CLASS_2_BONUS: 6,
  CLASS_3_BONUS: 10,
  LOW_ATTACK_BONUS: 0,               // attack 0-1
  MED_ATTACK_BONUS: 4,               // attack 2-3
  HIGH_ATTACK_BONUS: 8,              // attack 4+
  GUARDIAN_ABILITY_BONUS: 15,
  ANTI_SHIP_ABILITY_BONUS: 10,

  // Priority 5: Damage efficiency (tiebreaker)
  LETHAL_BONUS: 20,
  PIERCING_BYPASS_BONUS: 5,

  // Rally Beacon attack priority
  RALLY_BEACON_ATTACK_PRIORITY: 45,
};

// ========================================
// DAMAGE TYPE EVALUATION WEIGHTS
// ========================================
// Used when evaluating cards and attacks with special damage types
// SHIELD_BREAKER: 2:1 shield efficiency, then normal hull
// ION: Shield-only damage, excess wasted
// KINETIC: Hull-only damage, blocked entirely by shields

export const DAMAGE_TYPE_WEIGHTS = {
  // SHIELD_BREAKER weights
  SHIELD_BREAKER_HIGH_SHIELD_BONUS: 15,   // Bonus when target has 3+ shields
  SHIELD_BREAKER_LOW_SHIELD_PENALTY: -5,  // Penalty when target has 0-1 shields

  // ION weights (shield-only damage)
  ION_FULL_STRIP_BONUS: 20,               // Bonus when damage >= target shields
  ION_PER_SHIELD_VALUE: 6,                // Value per shield removed
  ION_WASTED_PENALTY: -3,                 // Penalty per point of wasted damage
  ION_NO_SHIELDS_PENALTY: -50,            // Heavy penalty for targets without shields

  // KINETIC weights (hull-only damage)
  KINETIC_UNSHIELDED_BONUS: 25,           // Bonus when target has 0 shields
  KINETIC_BLOCKED_PENALTY: -100,          // Penalty when target has shields (blocked)
};

// ========================================
// THREAT DRONE CONSTANTS
// ========================================
// Used for AI-only drones that increase player threat
// Signal Beacon: +1 threat per round (ON_ROUND_START)
// Threat Transmitter: +2 threat on ship hull damage (ON_SHIP_SECTION_HULL_DAMAGE)

// ========================================
// DRONE DISADVANTAGE PACING
// ========================================
// When AI has fewer ready drones, prefer card plays over drone actions

export const DRONE_PACING = {
  READY_DRONE_DEFICIT_THRESHOLD: 1,    // Minimum drone disadvantage to trigger
  NON_DRONE_ACTION_BONUS: 80,          // Bonus applied to play_card actions
};

export const THREAT_DRONES = {
  // Deployment bonuses
  ROUND_START_DEPLOY_BONUS: 20,           // Value of threat-per-round drones (deploy priority)

  // Attack targeting bonuses
  SHIP_DAMAGE_SHIP_ATTACK_BONUS: 25,      // Bonus for Threat Transmitter attacking ship sections
  SHIP_DAMAGE_DRONE_PENALTY: -30,         // Penalty for wasting Threat Transmitter on drone attacks

  // Protection priority (makes AI intercept for these drones)
  ROUND_START_PROTECTION_VALUE: 25,       // High value = AI will intercept for Signal Beacons
};
