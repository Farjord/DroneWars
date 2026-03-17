// ========================================
// DRONE TOOLTIP DESCRIPTIONS
// ========================================
// Static data mapping effect/trait/ability/keyword/damage-type keys
// to player-facing tooltip content. Used by buildTooltipItems().

/** Delay before tooltip appears on hover (ms) */
export const TOOLTIP_HOVER_DELAY_MS = 400;

/**
 * Tooltip description entries keyed by effect/trait/keyword/damage-type ID.
 * Each entry: { label, description, accentColor (Tailwind border class) }
 */
const droneTooltipDescriptions = {
  // --- Status effects (temporary) ---
  'cannot-attack': {
    label: 'Cannot Attack',
    description: 'This drone is unable to attack this round.',
    accentColor: 'border-red-500',
  },
  'cannot-move': {
    label: 'Cannot Move',
    description: 'This drone is unable to move this round.',
    accentColor: 'border-red-500',
  },
  'cannot-intercept': {
    label: 'Cannot Intercept',
    description: 'This drone is unable to intercept this round.',
    accentColor: 'border-red-500',
  },
  'snared': {
    label: 'Snared',
    description: 'Next move will be cancelled.',
    accentColor: 'border-orange-400',
  },
  'suppressed': {
    label: 'Suppressed',
    description: 'Next attack will be cancelled.',
    accentColor: 'border-violet-400',
  },
  'does-not-ready': {
    label: 'Does Not Ready',
    description: 'This drone will not ready next phase.',
    accentColor: 'border-amber-400',
  },

  // --- Traits ---
  'marked': {
    label: 'Marked',
    description: 'Priority target — attacks are directed here first.',
    accentColor: 'border-red-500',
  },
  'passive': {
    label: 'Passive',
    description: 'Cannot attack or intercept.',
    accentColor: 'border-emerald-400',
  },
  'inert': {
    label: 'Inert',
    description: 'Cannot move.',
    accentColor: 'border-amber-400',
  },

  // --- Keywords (permanent) ---
  'guardian': {
    label: 'Guardian',
    description: 'Protects the ship section in this lane from attack.',
    accentColor: 'border-sky-400',
  },
  'jammer': {
    label: 'Jammer',
    description: 'Forces enemy card effects to target this drone.',
    accentColor: 'border-purple-400',
  },
  'piercing': {
    label: 'Piercing',
    description: 'Attacks bypass shields entirely.',
    accentColor: 'border-yellow-400',
  },

  // --- Damage types (permanent) ---
  'shield-breaker': {
    label: 'Shield Breaker',
    description: 'Each point of damage removes 2 shields.',
    accentColor: 'border-cyan-400',
  },
  'ion': {
    label: 'Ion Damage',
    description: 'Attacks only affect shields — cannot damage hull.',
    accentColor: 'border-indigo-400',
  },
  'kinetic': {
    label: 'Kinetic Damage',
    description: 'Attacks bypass shields but are blocked by hull armour.',
    accentColor: 'border-orange-500',
  },
};

export default droneTooltipDescriptions;
