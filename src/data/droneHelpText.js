// ========================================
// DRONE HELP TEXT DATA
// ========================================
// Contextual help content for drone card stats.
// Used by DetailedDroneModal to explain game mechanics to new players.

export const DRONE_HELP_TEXT = {
  attack: {
    title: 'Attack Power',
    icon: 'Crosshair',
    description: `Damage dealt when attacking. Hits shields first, then hull. Piercing attacks bypass shields entirely. Green = buffed.`
  },
  shields: {
    title: 'Shield Points',
    icon: 'Shield',
    description: `Absorbs damage before hull takes hits. You receive new shields each turn to allocate during the shield phase.`
  },
  hull: {
    title: 'Hull Integrity',
    icon: 'Square',
    description: `Your drone's health. At zero, the drone is destroyed. Hull does NOT regenerate - only healed by specific cards.`
  },
  speed: {
    title: 'Speed Rating',
    icon: 'Gauge',
    description: `Determines interception ability. A drone can only intercept an attacker if its speed is equal or higher. Faster drones can't be blocked by slower ones.`
  },
  cost: {
    title: 'Deployment Cost',
    icon: 'Power',
    description: `Resources to deploy. Uses Deployment Budget (purple +) first, then Energy (yellow bolt). Green = reduced.`
  },
  upgrades: {
    title: 'Upgrade Slots',
    icon: 'Wrench',
    description: `Shows applied/total slots. Play Upgrade cards to enhance this drone. Each upgrade uses 1-2 slots and affects ALL copies deployed.`
  },
  deployed: {
    title: 'Deployment Limit',
    icon: 'Users',
    description: `Max copies on the field at once (current/limit). Red = at limit, can't deploy more. Some upgrades increase this.`
  }
};
