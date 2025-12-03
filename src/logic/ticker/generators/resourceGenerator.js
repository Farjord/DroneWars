/**
 * Resource Generator
 * Generates messages about available resources and POIs in sectors
 * Uses actual counts and map type data
 */

/**
 * Generate resource-related messages for all maps
 */
export function generate(maps) {
  const messages = [];

  maps.forEach(map => {
    const name = map.name || 'Unknown Sector';
    const breakdown = map.poiTypeBreakdown || {};
    const poiCount = map.poiCount || 0;
    const mapType = map.type || 'GENERIC';

    // Ordnance caches - always show count
    if (breakdown.Ordnance && breakdown.Ordnance >= 1) {
      const count = breakdown.Ordnance;
      if (count >= 3) {
        messages.push({
          text: `${count} Ordnance caches confirmed in ${name} - weapons-rich sector`,
          type: 'info',
          priority: 6,
          sectorName: name
        });
      } else {
        messages.push({
          text: `${count} Ordnance ${count === 1 ? 'cache' : 'caches'} located in ${name}`,
          type: 'info',
          priority: 4,
          sectorName: name
        });
      }
    }

    // Support facilities
    if (breakdown.Support && breakdown.Support >= 1) {
      const count = breakdown.Support;
      messages.push({
        text: `${count} Support ${count === 1 ? 'facility' : 'facilities'} detected in ${name}`,
        type: 'info',
        priority: 4,
        sectorName: name
      });
    }

    // Tactical assets
    if (breakdown.Tactic && breakdown.Tactic >= 2) {
      messages.push({
        text: `${breakdown.Tactic} Tactical data nodes identified in ${name}`,
        type: 'info',
        priority: 5,
        sectorName: name
      });
    }

    // Upgrade components
    if (breakdown.Upgrade && breakdown.Upgrade >= 1) {
      const count = breakdown.Upgrade;
      messages.push({
        text: `${count} Upgrade ${count === 1 ? 'component' : 'components'} available in ${name}`,
        type: 'info',
        priority: 5,
        sectorName: name
      });
    }

    // High POI count sectors
    if (poiCount >= 7) {
      messages.push({
        text: `${name} offers ${poiCount} points of interest - high salvage potential`,
        type: 'info',
        priority: 6,
        sectorName: name
      });
    }

    // Map type specific messages
    if (mapType !== 'GENERIC') {
      const typeNames = {
        'MUNITIONS_FACTORY': 'Munitions Factory',
        'SUPPORT_DEPOT': 'Support Depot',
        'TACTICAL_CENTER': 'Tactical Center',
        'RESEARCH_LAB': 'Research Laboratory'
      };
      const typeName = typeNames[mapType] || mapType;
      messages.push({
        text: `${name} identified as ${typeName} - specialized loot available`,
        type: 'priority',
        priority: 7,
        sectorName: name
      });
    }
  });

  return messages;
}

export default { generate };
