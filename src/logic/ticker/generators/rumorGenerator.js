/**
 * Rumor Generator
 * Generates atmospheric flavor messages based on actual map data
 * References real high-value targets and sector conditions
 * Only generates messages when data warrants it (e.g., 4+ of a POI type)
 */

import { debugLog } from '../../../utils/debugLogger.js';

// Message templates for high pack concentrations
const PACK_RUMORS = {
  Ordnance: [
    'Reports of heavy weapons stockpiles in {sector}...',
    'Salvagers speak of munitions caches hidden in {sector}...',
    'Intercepted manifests suggest arms depot in {sector}...',
    'Word of {count} ordnance sites confirmed in {sector}...'
  ],
  Support: [
    'Rumors of operational repair bays near {sector}...',
    'Word is {sector} still has functioning med-stations...',
    'Old supply routes point to support caches in {sector}...',
    'Reports of {count} support facilities active in {sector}...'
  ],
  Tactic: [
    'Intel suggests tactical data nodes concentrated in {sector}...',
    'Encrypted tactical archives reportedly intact in {sector}...',
    'Command bunker intel fragments traced to {sector}...',
    'Sources confirm {count} tactical sites in {sector}...'
  ],
  Upgrade: [
    'Whispers of pre-war tech components salvaged from {sector}...',
    'Engineering crews report upgrade modules in {sector}...',
    'Prototype hardware rumored to be stashed in {sector}...',
    'Scouts report {count} upgrade caches in {sector}...'
  ]
};

/**
 * Pick a random template from an array
 */
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Fill template placeholders
 */
function fillTemplate(template, values) {
  let result = template;
  Object.entries(values).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

/**
 * Generate data-driven rumor messages
 */
export function generate(maps) {
  const messages = [];
  const HIGH_CONCENTRATION_THRESHOLD = 4;

  // Find sectors with high concentrations of each pack type (4+)
  const highOrdnance = maps.filter(m => (m.poiTypeBreakdown?.Ordnance || 0) >= HIGH_CONCENTRATION_THRESHOLD);
  const highSupport = maps.filter(m => (m.poiTypeBreakdown?.Support || 0) >= HIGH_CONCENTRATION_THRESHOLD);
  const highTactic = maps.filter(m => (m.poiTypeBreakdown?.Tactic || 0) >= HIGH_CONCENTRATION_THRESHOLD);
  const highUpgrade = maps.filter(m => (m.poiTypeBreakdown?.Upgrade || 0) >= HIGH_CONCENTRATION_THRESHOLD);

  // Debug logging for ticker data verification
  debugLog('TICKER', 'Maps received for rumors:', maps.map(m => ({
    name: m.name,
    poiTypeBreakdown: m.poiTypeBreakdown
  })));
  debugLog('TICKER', 'High concentration sectors found:', {
    Ordnance: highOrdnance.map(m => ({ name: m.name, count: m.poiTypeBreakdown?.Ordnance })),
    Support: highSupport.map(m => ({ name: m.name, count: m.poiTypeBreakdown?.Support })),
    Tactic: highTactic.map(m => ({ name: m.name, count: m.poiTypeBreakdown?.Tactic })),
    Upgrade: highUpgrade.map(m => ({ name: m.name, count: m.poiTypeBreakdown?.Upgrade }))
  });

  // Generate Ordnance concentration rumors (priority 7 - notable finds)
  highOrdnance.forEach(sector => {
    messages.push({
      text: fillTemplate(pickRandom(PACK_RUMORS.Ordnance), {
        sector: sector.name,
        count: sector.poiTypeBreakdown.Ordnance
      }),
      type: 'rumor',
      priority: 7,
      sectorName: sector.name
    });
  });

  // Generate Support concentration rumors (priority 7 - notable finds)
  highSupport.forEach(sector => {
    messages.push({
      text: fillTemplate(pickRandom(PACK_RUMORS.Support), {
        sector: sector.name,
        count: sector.poiTypeBreakdown.Support
      }),
      type: 'rumor',
      priority: 7,
      sectorName: sector.name
    });
  });

  // Generate Tactic concentration rumors (priority 7 - notable finds)
  highTactic.forEach(sector => {
    messages.push({
      text: fillTemplate(pickRandom(PACK_RUMORS.Tactic), {
        sector: sector.name,
        count: sector.poiTypeBreakdown.Tactic
      }),
      type: 'rumor',
      priority: 7,
      sectorName: sector.name
    });
  });

  // Generate Upgrade concentration rumors (priority 7 - notable finds)
  highUpgrade.forEach(sector => {
    messages.push({
      text: fillTemplate(pickRandom(PACK_RUMORS.Upgrade), {
        sector: sector.name,
        count: sector.poiTypeBreakdown.Upgrade
      }),
      type: 'rumor',
      priority: 7,
      sectorName: sector.name
    });
  });

  // --- Existing rumor types (kept for variety) ---

  // Blueprint-related rumors
  const blueprintSectors = maps.filter(m => m.hasDroneBlueprints);
  if (blueprintSectors.length > 0) {
    const sector = pickRandom(blueprintSectors);
    messages.push({
      text: `Scavengers whisper of prototype schematics hidden in ${sector.name}...`,
      type: 'rumor',
      priority: 6,
      sectorName: sector.name
    });
  }

  // High-value sector rumors (7+ POIs)
  const highPoiSectors = maps.filter(m => (m.poiCount || 0) >= 7);
  if (highPoiSectors.length > 0) {
    const sector = pickRandom(highPoiSectors);
    messages.push({
      text: `Old salvage manifests reference ${sector.poiCount} cache sites near ${sector.name}...`,
      type: 'rumor',
      priority: 4,
      sectorName: sector.name
    });
  }

  // Low threat sector hints
  const lowThreatSectors = maps.filter(m => (m.baseDetection || 0) <= 10);
  if (lowThreatSectors.length > 0) {
    const sector = pickRandom(lowThreatSectors);
    messages.push({
      text: `Patrol schedules suggest ${sector.name} is lightly guarded...`,
      type: 'rumor',
      priority: 4,
      sectorName: sector.name
    });
  }

  // High threat sector warnings
  const highThreatSectors = maps.filter(m => (m.baseDetection || 0) >= 30);
  if (highThreatSectors.length > 0) {
    const sector = pickRandom(highThreatSectors);
    messages.push({
      text: `Encrypted chatter indicates heavy drone presence in ${sector.name}...`,
      type: 'rumor',
      priority: 5,
      sectorName: sector.name
    });
  }

  // Token sector mystery
  const tokenSectors = maps.filter(m => m.requiresToken);
  if (tokenSectors.length > 0) {
    const sector = pickRandom(tokenSectors);
    messages.push({
      text: `Something valuable enough to require clearance lies in ${sector.name}...`,
      type: 'rumor',
      priority: 5,
      sectorName: sector.name
    });
  }

  // Only add generic atmospheric rumors if we have few data-driven ones
  if (messages.length < 3) {
    const genericRumors = [
      'Long-range sensors detecting unusual energy fluctuations...',
      'Unidentified signals on encrypted frequencies...',
      'Old war-era beacons activating sporadically...',
      'Automated defense grids showing intermittent failures...'
    ];
    messages.push({
      text: pickRandom(genericRumors),
      type: 'rumor',
      priority: 2,
      sectorName: null
    });
  }

  return messages;
}

export default { generate };
