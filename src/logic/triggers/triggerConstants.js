// ========================================
// TRIGGER CONSTANTS
// ========================================
// Enums for the unified trigger system.
// Replaces magic strings throughout trigger processing.

/**
 * Trigger types — when a trigger fires.
 * Self triggers: ON_MOVE, ON_DEPLOY, ON_ROUND_START, ON_ATTACK
 * Controller triggers: ON_CARD_DRAWN, ON_ENERGY_GAINED, ON_CARD_PLAY
 * Lane triggers: ON_LANE_MOVEMENT_IN, ON_LANE_MOVEMENT_OUT, ON_LANE_DEPLOYMENT, ON_LANE_ATTACK
 */
export const TRIGGER_TYPES = Object.freeze({
  ON_MOVE: 'ON_MOVE',
  ON_DEPLOY: 'ON_DEPLOY',
  ON_ROUND_START: 'ON_ROUND_START',
  ON_ATTACK: 'ON_ATTACK',
  ON_CARD_DRAWN: 'ON_CARD_DRAWN',
  ON_ENERGY_GAINED: 'ON_ENERGY_GAINED',
  ON_CARD_PLAY: 'ON_CARD_PLAY',
  ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN',
  ON_LANE_MOVEMENT_OUT: 'ON_LANE_MOVEMENT_OUT',
  ON_LANE_DEPLOYMENT: 'ON_LANE_DEPLOYMENT',
  ON_LANE_ATTACK: 'ON_LANE_ATTACK'
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
  TRIGGER_TYPES.ON_ROUND_START,
  TRIGGER_TYPES.ON_ATTACK
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
 * Maximum cascade chain depth — safety net against unbounded recursion.
 * Should never trigger in normal gameplay.
 */
export const MAX_CHAIN_DEPTH = 20;
