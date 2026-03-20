// ========================================
// ACTION CARD TOOLTIP DESCRIPTIONS
// ========================================
// Static data mapping warning/property keys to player-facing tooltip content.
// Used by buildActionCardTooltipItems().

/**
 * Tooltip description entries keyed by warning/property ID.
 * Each entry: { label, description, accentColor (Tailwind border class) }
 */
const actionCardTooltipDescriptions = {
  // --- Warning items (unplayable reasons) ---
  'not-enough-energy': {
    label: 'Not Enough Energy',
    description: 'You need more energy to play this card.',
    accentColor: 'border-amber-400',
  },
  'not-enough-momentum': {
    label: 'Not Enough Momentum',
    description: 'You need more momentum to play this card.',
    accentColor: 'border-amber-400',
  },
  'no-valid-targets': {
    label: 'No Valid Targets',
    description: 'There are no valid targets for this card.',
    accentColor: 'border-amber-400',
  },
  'lane-control-not-met': {
    label: 'Lane Control Not Met',
    description: 'You do not control enough lanes to play this card.',
    accentColor: 'border-amber-400',
  },
  'play-condition-not-met': {
    label: 'Play Condition Not Met',
    description: 'This card\'s play condition is not satisfied.',
    accentColor: 'border-amber-400',
  },
  'not-your-turn': {
    label: 'Not Your Turn',
    description: 'Wait for your turn to play cards.',
    accentColor: 'border-amber-400',
  },
  'player-passed': {
    label: 'You Have Passed',
    description: 'You cannot play cards after passing.',
    accentColor: 'border-amber-400',
  },
  'wrong-phase': {
    label: 'Wrong Phase',
    description: 'Cards can only be played during the Action Phase.',
    accentColor: 'border-amber-400',
  },

  // --- Property items (informational) ---
  'go-again': {
    label: 'Go Again',
    description: 'Playing this card does not end your turn.',
    accentColor: 'border-cyan-400',
  },
  'momentum-cost': {
    label: 'Momentum Cost',
    description: 'This card costs momentum to play.',
    accentColor: 'border-blue-400',
  },
  'lanes-controlled': {
    label: 'Lanes Controlled',
    description: 'Effect repeats for each lane you control.',
    accentColor: 'border-cyan-400',
  },
  'momentum-bonus': {
    label: 'Momentum Bonus',
    description: 'Bonus effect active — not your first action this turn.',
    accentColor: 'border-blue-400',
  },
};

export default actionCardTooltipDescriptions;
