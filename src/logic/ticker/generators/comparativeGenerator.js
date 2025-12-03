/**
 * Comparative Generator
 * Generates messages that compare sectors to help players choose
 * Analyzes all maps to find best/worst options
 */

/**
 * Generate comparative analysis messages
 */
export function generate(maps) {
  const messages = [];

  if (maps.length < 2) return messages;

  // Find sector with lowest perimeter encounter rate
  const sortedByPerimeter = [...maps].sort((a, b) =>
    (a.encounterByZone?.perimeter || 0) - (b.encounterByZone?.perimeter || 0)
  );
  const safestApproach = sortedByPerimeter[0];
  if (safestApproach) {
    const rate = safestApproach.encounterByZone?.perimeter || 0;
    messages.push({
      text: `TACTICAL: ${safestApproach.name} offers safest approach at ${rate}% perimeter threat`,
      type: 'info',
      priority: 7,
      sectorName: safestApproach.name
    });
  }

  // Find sector with lowest base detection
  const sortedByDetection = [...maps].sort((a, b) =>
    (a.baseDetection || 0) - (b.baseDetection || 0)
  );
  const stealthiest = sortedByDetection[0];
  if (stealthiest && stealthiest !== safestApproach) {
    messages.push({
      text: `STEALTH: ${stealthiest.name} has lowest detection baseline at ${stealthiest.baseDetection || 0}%`,
      type: 'info',
      priority: 6,
      sectorName: stealthiest.name
    });
  }

  // Find sector with most POIs
  const sortedByPoi = [...maps].sort((a, b) =>
    (b.poiCount || 0) - (a.poiCount || 0)
  );
  const richest = sortedByPoi[0];
  if (richest) {
    messages.push({
      text: `SALVAGE: ${richest.name} has highest density with ${richest.poiCount || 0} POIs`,
      type: 'info',
      priority: 6,
      sectorName: richest.name
    });
  }

  // Find sector with most Ordnance
  const sortedByOrdnance = [...maps].sort((a, b) =>
    (b.poiTypeBreakdown?.Ordnance || 0) - (a.poiTypeBreakdown?.Ordnance || 0)
  );
  const mostOrdnance = sortedByOrdnance[0];
  if (mostOrdnance && (mostOrdnance.poiTypeBreakdown?.Ordnance || 0) >= 2) {
    messages.push({
      text: `WEAPONS: ${mostOrdnance.name} leads with ${mostOrdnance.poiTypeBreakdown.Ordnance} Ordnance caches`,
      type: 'info',
      priority: 5,
      sectorName: mostOrdnance.name
    });
  }

  // Find best risk/reward (high POI, low detection)
  const riskReward = [...maps].map(m => ({
    map: m,
    score: (m.poiCount || 0) * 10 - (m.baseDetection || 0) - ((m.encounterByZone?.core || 0) / 2)
  })).sort((a, b) => b.score - a.score);

  const bestValue = riskReward[0]?.map;
  if (bestValue) {
    messages.push({
      text: `RECOMMENDED: ${bestValue.name} - ${bestValue.poiCount || 0} POIs at ${bestValue.baseDetection || 0}% base detection`,
      type: 'priority',
      priority: 8,
      sectorName: bestValue.name
    });
  }

  // Warn about most dangerous sector
  const sortedByDanger = [...maps].sort((a, b) =>
    (b.encounterByZone?.core || 0) - (a.encounterByZone?.core || 0)
  );
  const mostDangerous = sortedByDanger[0];
  if (mostDangerous && (mostDangerous.encounterByZone?.core || 0) >= 15) {
    messages.push({
      text: `CAUTION: ${mostDangerous.name} core at ${mostDangerous.encounterByZone.core}% - highest threat level`,
      type: 'warning',
      priority: 7,
      sectorName: mostDangerous.name
    });
  }

  return messages;
}

export default { generate };
