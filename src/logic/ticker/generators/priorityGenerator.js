/**
 * Priority Generator
 * Generates messages about high-value targets and access requirements
 * Uses actual map data for specific intel
 */

/**
 * Generate priority-related messages for all maps
 */
export function generate(maps) {
  const messages = [];

  maps.forEach(map => {
    const name = map.name || 'Unknown Sector';
    const difficulty = map.difficulty || 'Unknown';

    // Drone blueprints - highest priority
    if (map.hasDroneBlueprints) {
      const count = map.dronePoiCount || 1;
      messages.push({
        text: `DRONE BLUEPRINTS: ${count} schematic ${count === 1 ? 'location' : 'locations'} confirmed in ${name}`,
        type: 'priority',
        priority: 10,
        sectorName: name
      });
    }

    // Security token required
    if (map.requiresToken) {
      messages.push({
        text: `RESTRICTED: ${name} requires security token for access`,
        type: 'warning',
        priority: 7,
        sectorName: name
      });
    }

    // Manufacturing facilities
    if (map.dronePoiCount && map.dronePoiCount > 0) {
      messages.push({
        text: `${map.dronePoiCount} drone manufacturing ${map.dronePoiCount === 1 ? 'facility' : 'facilities'} active in ${name}`,
        type: 'info',
        priority: 6,
        sectorName: name
      });
    }

    // Entry cost alerts
    if (map.entryCost && map.entryCost > 0) {
      messages.push({
        text: `${name} entry requires ${map.entryCost} credits - ${difficulty} tier`,
        type: 'info',
        priority: 4,
        sectorName: name
      });
    }

    // Gate count info
    if (map.gateCount) {
      messages.push({
        text: `${name} has ${map.gateCount} extraction points available`,
        type: 'info',
        priority: 3,
        sectorName: name
      });
    }
  });

  return messages;
}

export default { generate };
