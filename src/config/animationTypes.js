// Animation NAME constants — single source of truth for animation event names.
// Import from here instead of using raw strings to catch typos at build time.

// Sequences & meta
export const ANIMATION_SEQUENCE = 'ANIMATION_SEQUENCE';
export const STATE_SNAPSHOT = 'STATE_SNAPSHOT';
export const TRIGGER_CHAIN_PAUSE = 'TRIGGER_CHAIN_PAUSE';

// Attack
export const DRONE_ATTACK_START = 'DRONE_ATTACK_START';
export const DRONE_RETURN = 'DRONE_RETURN';

// Card visuals
export const CARD_REVEAL = 'CARD_REVEAL';
export const SHIP_ABILITY_REVEAL = 'SHIP_ABILITY_REVEAL';
export const CARD_VISUAL = 'CARD_VISUAL';

// Movement
export const DRONE_MOVEMENT = 'DRONE_MOVEMENT';

// Status
export const STATUS_CONSUMPTION = 'STATUS_CONSUMPTION';

// Notifications
export const PASS_NOTIFICATION = 'PASS_NOTIFICATION';
export const GO_AGAIN_NOTIFICATION = 'GO_AGAIN_NOTIFICATION';
export const TRIGGER_FIRED = 'TRIGGER_FIRED';
export const MOVEMENT_BLOCKED = 'MOVEMENT_BLOCKED';

// Deployment
export const TELEPORT_IN = 'TELEPORT_IN';
export const TELEPORT_OUT = 'TELEPORT_OUT';

// Damage feedback
export const SHIELD_DAMAGE = 'SHIELD_DAMAGE';
export const HULL_DAMAGE = 'HULL_DAMAGE';
export const DRONE_DESTROYED = 'DRONE_DESTROYED';
export const SECTION_DESTROYED = 'SECTION_DESTROYED';
export const SECTION_DAMAGED = 'SECTION_DAMAGED';
export const HEAL_EFFECT = 'HEAL_EFFECT';

// Ordnance
export const OVERFLOW_PROJECTILE = 'OVERFLOW_PROJECTILE';
export const SPLASH_EFFECT = 'SPLASH_EFFECT';
export const BARRAGE_IMPACT = 'BARRAGE_IMPACT';
export const RAILGUN_TURRET = 'RAILGUN_TURRET';
export const RAILGUN_BEAM = 'RAILGUN_BEAM';

// Tech
export const TECH_DEPLOY = 'TECH_DEPLOY';
export const TECH_DESTROY = 'TECH_DESTROY';
export const TECH_TRIGGER_FIRE = 'TECH_TRIGGER_FIRE';

// Stat changes
export const STAT_BUFF = 'STAT_BUFF';
export const STAT_DEBUFF = 'STAT_DEBUFF';

// Non-visual (produced by strategy files, no AnimationManager handler)
export const RETALIATE_DAMAGE = 'RETALIATE_DAMAGE';
export const DOGFIGHT_DAMAGE = 'DOGFIGHT_DAMAGE';
