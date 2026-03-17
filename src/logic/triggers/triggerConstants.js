// ========================================
// TRIGGER CONSTANTS
// ========================================
// Enums for the unified trigger system.
// Replaces magic strings throughout trigger processing.

/**
 * Trigger types — when a trigger fires.
 * Self triggers: ON_MOVE, ON_DEPLOY, ON_ROUND_END, ON_ATTACK
 * Controller triggers: ON_CARD_DRAWN, ON_ENERGY_GAINED, ON_CARD_PLAY
 * Lane triggers: ON_LANE_MOVEMENT_IN, ON_LANE_MOVEMENT_OUT, ON_LANE_DEPLOYMENT, ON_LANE_ATTACK
 */
export const TRIGGER_TYPES = Object.freeze({
  ON_MOVE: 'ON_MOVE',
  ON_DEPLOY: 'ON_DEPLOY',
  ON_ROUND_END: 'ON_ROUND_END',
  ON_ATTACK: 'ON_ATTACK',
  ON_CARD_DRAWN: 'ON_CARD_DRAWN',
  ON_ENERGY_GAINED: 'ON_ENERGY_GAINED',
  ON_CARD_PLAY: 'ON_CARD_PLAY',
  ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN',
  ON_LANE_MOVEMENT_OUT: 'ON_LANE_MOVEMENT_OUT',
  ON_LANE_DEPLOYMENT: 'ON_LANE_DEPLOYMENT',
  ON_LANE_ATTACK: 'ON_LANE_ATTACK',
  ON_INTERCEPT: 'ON_INTERCEPT',
  ON_ATTACKED: 'ON_ATTACKED'
});

/**
 * Trigger owners — whose actions can trigger it.
 * CONTROLLER: the drone's owner
 * OPPONENT: the drone's owner's opponent
 * ANY: either player
 * LANE_OWNER: drones belonging to the board-owner (used by mines)
 * LANE_ENEMY: drones NOT belonging to the board-owner
 */
export const TRIGGER_OWNERS = Object.freeze({
  CONTROLLER: 'CONTROLLER',
  OPPONENT: 'OPPONENT',
  ANY: 'ANY',
  LANE_OWNER: 'LANE_OWNER',
  LANE_ENEMY: 'LANE_ENEMY'
});

/**
 * Trigger scopes — where the trigger looks for events.
 * SELF: only the trigger drone itself (self-triggers)
 * SAME_LANE: events in the same lane as the trigger drone
 * ANY_LANE: events in any lane
 */
export const TRIGGER_SCOPES = Object.freeze({
  SELF: 'SELF',
  SAME_LANE: 'SAME_LANE',
  ANY_LANE: 'ANY_LANE'
});

/**
 * Self trigger types — triggers where the drone is always the actor.
 * These don't need triggerOwner because the drone IS the actor.
 */
export const SELF_TRIGGER_TYPES = Object.freeze(new Set([
  TRIGGER_TYPES.ON_MOVE,
  TRIGGER_TYPES.ON_DEPLOY,
  TRIGGER_TYPES.ON_ROUND_END,
  TRIGGER_TYPES.ON_ATTACK,
  TRIGGER_TYPES.ON_INTERCEPT,
  TRIGGER_TYPES.ON_ATTACKED
]));

/**
 * Controller trigger types — triggered by the drone's controller's game actions.
 */
export const CONTROLLER_TRIGGER_TYPES = Object.freeze(new Set([
  TRIGGER_TYPES.ON_CARD_DRAWN,
  TRIGGER_TYPES.ON_ENERGY_GAINED,
  TRIGGER_TYPES.ON_CARD_PLAY
]));

/**
 * Lane trigger types — triggered by actions in the trigger drone's lane.
 */
export const LANE_TRIGGER_TYPES = Object.freeze(new Set([
  TRIGGER_TYPES.ON_LANE_MOVEMENT_IN,
  TRIGGER_TYPES.ON_LANE_MOVEMENT_OUT,
  TRIGGER_TYPES.ON_LANE_DEPLOYMENT,
  TRIGGER_TYPES.ON_LANE_ATTACK
]));

/**
 * Lane control filter values — used in triggerFilter.laneControl.
 * CONTROLLED_BY_ACTOR: trigger only fires when actor controls the lane
 * NOT_CONTROLLED_BY_ACTOR: trigger only fires when actor does NOT control the lane
 */
export const LANE_CONTROL_FILTERS = Object.freeze({
  CONTROLLED_BY_ACTOR: 'CONTROLLED_BY_ACTOR',
  NOT_CONTROLLED_BY_ACTOR: 'NOT_CONTROLLED_BY_ACTOR'
});

/**
 * Trigger timing — which turn phase allows the trigger to fire.
 * OWN_TURN_ONLY: only fires when the trigger owner is the current turn player
 * ANY_TURN: fires regardless of whose turn it is (default when not specified)
 */
export const TRIGGER_TIMING = Object.freeze({
  OWN_TURN_ONLY: 'OWN_TURN_ONLY',
  ANY_TURN: 'ANY_TURN'
});

/**
 * Effect targets — controls whose perspective the effect executes from.
 * Overrides actingPlayerId in the effect context.
 * TRIGGER_OWNER: actingPlayerId = reactorPlayerId (default)
 * TRIGGER_OPPONENT: actingPlayerId = opponent of reactorPlayerId
 *
 * NOTE: This does NOT mean "who gets directly affected." For example,
 * DRAIN_ENERGY with effectTarget: TRIGGER_OWNER means "execute drain FROM
 * the trigger owner's perspective" — drains the owner's opponent.
 */
export const EFFECT_TARGETS = Object.freeze({
  TRIGGER_OWNER: 'TRIGGER_OWNER',
  TRIGGER_OPPONENT: 'TRIGGER_OPPONENT'
});

/**
 * Maximum cascade chain depth — safety net against unbounded recursion.
 * Should never trigger in normal gameplay.
 */
export const MAX_CHAIN_DEPTH = 20;
