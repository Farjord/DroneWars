// ========================================
// DRONE CARD TOOLTIP DESCRIPTIONS
// ========================================
// Static data mapping warning keys to player-facing tooltip content for drone deployment.
// Used by buildDroneCardWarningItems() in DronesView.

/**
 * Tooltip description entries keyed by warning ID.
 * Each entry: { label, description, accentColor (Tailwind border class) }
 */
const droneCardTooltipDescriptions = {
  'wrong-phase': {
    label: 'Wrong Phase',
    description: 'Drones can only be deployed during the Deployment Phase.',
    accentColor: 'border-amber-400',
  },
  'not-your-turn': {
    label: 'Not Your Turn',
    description: 'Wait for your turn to deploy drones.',
    accentColor: 'border-amber-400',
  },
  'player-passed': {
    label: 'You Have Passed',
    description: 'You cannot deploy after passing.',
    accentColor: 'border-amber-400',
  },
  'mandatory-action': {
    label: 'Mandatory Action',
    description: 'You must complete a mandatory action first.',
    accentColor: 'border-amber-400',
  },
  'not-enough-resources': {
    label: 'Not Enough Resources',
    description: "You don't have enough resources to deploy this drone.",
    accentColor: 'border-amber-400',
  },
  'cpu-limit-reached': {
    label: 'CPU Limit Reached',
    description: 'Your CPU limit has been reached.',
    accentColor: 'border-amber-400',
  },
  'deployment-limit-reached': {
    label: 'Deployment Limit Reached',
    description: "This drone's deployment limit has been reached.",
    accentColor: 'border-amber-400',
  },
  'drone-unavailable': {
    label: 'Drone Unavailable',
    description: 'This drone is still rebuilding.',
    accentColor: 'border-amber-400',
  },
};

export default droneCardTooltipDescriptions;
