/**
 * glossaryDescriptions.js
 *
 * Human-written descriptions for game mechanics glossary.
 * This file contains ONLY descriptions - no technical parameters.
 * All valid parameters, subEffects, and technical details are
 * automatically extracted from the actual game code.
 *
 * PURPOSE: Provide developer-friendly explanations of what each
 * effect/targeting/condition does and when to use it.
 *
 * IMPORTANT: These descriptions are for documentation only and
 * never affect game logic. Missing descriptions will be flagged
 * in the glossary but won't break functionality.
 */

// ========================================
// EFFECT TYPE DESCRIPTIONS
// ========================================

export const effectDescriptions = {
  // === DAMAGE & DESTRUCTION ===
  'DAMAGE': 'Deals damage to a target. Can be normal damage (blocked by shields) or piercing damage (ignores shields). Can target single units or use filters to affect multiple targets matching criteria.',

  'PIERCING': 'A damage modifier that causes damage to ignore shields and directly damage hull. Used with the DAMAGE effect type.',

  'DESTROY': 'Immediately destroys target(s). Can target a single unit, all units in a lane, or filtered subsets based on stats like speed or hull.',

  'DESTROY_SELF': 'Destroys the unit that triggered this effect. Commonly used with ON_ATTACK trigger for kamikaze-style mechanics.',

  'DESTROY_UPGRADE': 'Removes an applied upgrade from an enemy drone type, reverting any stat bonuses or abilities granted by that upgrade.',

  // === HEALING ===
  'HEAL_HULL': 'Restores hull points to a damaged target, up to its maximum hull value. Cannot exceed max hull. Works on both drones and ship sections.',

  'HEAL_SHIELDS': 'Restores shield points to a target, up to its maximum shield value. Only affects units with shield capacity.',

  'HEAL': 'Generic healing effect that can restore hull points to damaged units. Similar to HEAL_HULL but may have different targeting scope.',

  // === STAT MODIFICATION ===
  'MODIFY_STAT': 'Applies a temporary or permanent modification to a drone\'s stats. Temporary mods last until end of turn. Permanent mods persist for the game. Can modify attack, speed, hull, shields, or cost.',

  'PERMANENT_STAT_MOD': 'Permanently increases a stat on the affected unit. The bonus persists for the entire game and stacks with other modifiers.',

  'MODIFY_DRONE_BASE': 'Permanently modifies the base stats of a drone type. Affects all drones of that type on the board and future deployments. Used by Upgrade cards.',

  'CONDITIONAL_MODIFY_STAT': 'Modifies a stat only when a specific condition is met. The condition is checked every time stats are calculated, so bonuses apply dynamically when conditions change.',

  'CONDITIONAL_MODIFY_STAT_SCALING': 'Similar to CONDITIONAL_MODIFY_STAT but the bonus scales based on how many times the condition is met. For example, +1 attack per damaged ship section.',

  'FLANKING_BONUS': 'Grants stat bonuses when a drone is positioned in an outer lane (Lane 1 or Lane 3). Encourages tactical positioning.',

  // === RESOURCE MANAGEMENT ===
  'DRAW': 'Draws cards from your deck into your hand. If the deck is empty, automatically shuffles the discard pile to create a new deck.',

  'GAIN_ENERGY': 'Adds energy to the acting player\'s energy pool, up to their maximum energy capacity determined by ship sections.',

  'SEARCH_AND_DRAW': 'Allows viewing multiple cards from the top of your deck and selecting specific cards to draw. Useful for finding key cards. Can include filters to only show certain card types.',

  // === DRONE STATES ===
  'READY_DRONE': 'Removes exhaustion from a drone, allowing it to attack or use abilities again this turn. Does not work on drones that haven\'t been exhausted.',

  // === MOVEMENT ===
  'SINGLE_MOVE': 'Moves one friendly drone from its current lane to an adjacent lane. The drone becomes exhausted unless the effect specifies otherwise.',

  'MULTI_MOVE': 'Moves up to a specified number of friendly drones from one lane to another. Provides tactical repositioning for multiple units at once.',

  // === TOKEN CREATION ===
  'CREATE_TOKENS': 'Creates drone tokens (non-card drones) in specified lanes. Tokens function like deployed drones but weren\'t played from hand. Can bypass CPU limits if specified.',

  // === TRIGGERED EFFECTS ===
  'ON_ATTACK': 'Triggers an effect after a drone completes an attack. Routed through TriggerProcessor. Used for self-destruct mechanics (Firefly) or permanent stat bonuses (Gladiator).',

  'REPEATING_EFFECT': 'Executes a set of effects multiple times based on a condition. For example, "Draw 1 card and gain 1 energy" repeated once for each damaged ship section.',

  // === KEYWORDS ===
  'GRANT_KEYWORD': 'Gives a special keyword ability to a drone. Keywords provide special combat behaviors like PIERCING (ignore shields), GUARDIAN (protects ship section), or DOGFIGHT (deal damage when intercepting).',

  // === SHIELD MANAGEMENT ===
  'REALLOCATE_SHIELDS': 'Allows moving shield tokens between drones in a lane or removing them entirely. Used during the shield allocation phase.',

  // === SPECIAL ===
  'BONUS_DAMAGE_VS_SHIP': 'Grants additional damage when attacking enemy ship sections. Used by bomber-type drones to make them more effective against ships.',

  'LOG': 'Internal effect type for adding messages to the game log. Used for tracking game events and animations.'
};

// ========================================
// TARGETING TYPE DESCRIPTIONS
// ========================================

export const targetingDescriptions = {
  'DRONE': 'Targets a single drone on the battlefield. Can specify affinity (friendly/enemy/any), location (specific lanes or any lane), and custom filters (like exhausted only).',

  'LANE': 'Targets an entire lane, affecting all eligible units within it. Can specify if it targets friendly or enemy lanes.',

  'SHIP_SECTION': 'Targets one of the player\'s ship sections. Used for effects that heal or damage ship hulls directly.',

  'NONE': 'No target selection required. Used by upgrades (modal opens for pool selection), System Sabotage (modal), and Purge Protocol (auto-resolves).'
};

// ========================================
// CONDITION TYPE DESCRIPTIONS
// ========================================

export const conditionDescriptions = {
  'SHIP_SECTION_HULL_DAMAGED': 'Checks if a ship section in the specified location has taken hull damage. Returns true if the section is in "damaged" or "critical" status.',

  'OWN_DAMAGED_SECTIONS': 'Counts how many of your ship sections are damaged or critical. Used for scaling effects that get stronger as your ship takes damage.',

  'FLANKING': 'Checks if a drone is positioned in an outer lane (Lane 1 or Lane 3). Used by the Skirmisher Drone for positioning-based bonuses.'
};

// ========================================
// KEYWORD DESCRIPTIONS
// ========================================

export const keywordDescriptions = {
  'PIERCING': 'Damage from this source ignores shields and directly damages hull. Useful against heavily-shielded targets.',

  // Note: DEFENDER keyword removed - all drones can now intercept multiple times without exhausting.
  // HP/shields naturally limit how many times a drone can intercept before being destroyed.

  'GUARDIAN': 'While this drone is active in a lane, the ship section in that lane cannot be directly targeted by attacks. Enemies must destroy the Guardian first.',

  'JAMMER': 'While this drone is ready in a lane, opponent card effects can only target this drone. Provides protection for other units in the same lane. Effect is disabled when exhausted.'
};

// ========================================
// SCOPE DESCRIPTIONS
// ========================================

export const scopeDescriptions = {
  'SINGLE': 'Affects only the single targeted unit. Most precise form of targeting.',

  'LANE': 'Affects all eligible units in the target lane. Can hit both friendly and enemy units depending on the effect.',

  'FILTERED': 'Affects all units in the target area that match specific criteria, such as speed >= 5 or hull <= 2. Allows conditional area effects.'
};

// ========================================
// FILTER COMPARISON DESCRIPTIONS
// ========================================

export const comparisonDescriptions = {
  'GTE': 'Greater Than or Equal To (>=). Matches units where the stat is at least the specified value.',

  'LTE': 'Less Than or Equal To (<=). Matches units where the stat is at most the specified value.',

  'EQ': 'Equal To (=). Matches units where the stat exactly equals the specified value.',

  'GT': 'Greater Than (>). Matches units where the stat exceeds the specified value.',

  'LT': 'Less Than (<). Matches units where the stat is below the specified value.'
};

// ========================================
// AFFINITY DESCRIPTIONS
// ========================================

export const affinityDescriptions = {
  'FRIENDLY': 'Can only target your own units or lanes.',

  'ENEMY': 'Can only target opponent units or lanes.',

  'ANY': 'Can target either friendly or enemy units/lanes. Provides maximum flexibility.'
};

// ========================================
// LOCATION DESCRIPTIONS
// ========================================

export const locationDescriptions = {
  'ANY_LANE': 'Can target units in any lane on the battlefield.',

  'SAME_LANE': 'Can only affect units in the same lane as the source or trigger.',

  'ADJACENT_LANE': 'Can only affect units in lanes directly next to the source lane.'
};
