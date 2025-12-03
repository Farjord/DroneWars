/**
 * Threat Generator
 * Generates messages about hostile activity and threat levels in sectors
 * Uses actual map data values for specific, actionable intel
 */

/**
 * Generate threat-related messages for all maps
 */
export function generate(maps) {
  const messages = [];

  maps.forEach(map => {
    const name = map.name || 'Unknown Sector';
    const perimeter = map.encounterByZone?.perimeter || 0;
    const mid = map.encounterByZone?.mid || 0;
    const core = map.encounterByZone?.core || 0;
    const baseDetection = map.baseDetection || 0;

    // Perimeter encounter rate messages
    if (perimeter <= 5) {
      messages.push({
        text: `${name} perimeter at ${perimeter}% encounter rate - safe approach available`,
        type: 'info',
        priority: 5,
        sectorName: name
      });
    } else if (perimeter >= 10) {
      messages.push({
        text: `Caution: ${name} perimeter showing ${perimeter}% hostile activity`,
        type: 'warning',
        priority: 6,
        sectorName: name
      });
    }

    // Core zone danger
    if (core >= 15) {
      messages.push({
        text: `DANGER: ${name} core zones at ${core}% encounter rate`,
        type: 'danger',
        priority: 8,
        sectorName: name
      });
    } else if (core <= 10) {
      messages.push({
        text: `${name} core relatively quiet - only ${core}% encounter chance`,
        type: 'info',
        priority: 4,
        sectorName: name
      });
    }

    // Base detection warnings
    if (baseDetection >= 30) {
      messages.push({
        text: `WARNING: ${name} starts at ${baseDetection}% detection - high alert status`,
        type: 'warning',
        priority: 7,
        sectorName: name
      });
    } else if (baseDetection <= 10) {
      messages.push({
        text: `${name} detection baseline low at ${baseDetection}% - stealth viable`,
        type: 'info',
        priority: 5,
        sectorName: name
      });
    }

    // Mid-zone intel
    if (mid >= 12) {
      messages.push({
        text: `${name} mid-zones running hot at ${mid}% encounter probability`,
        type: 'warning',
        priority: 5,
        sectorName: name
      });
    }
  });

  return messages;
}

export default { generate };
