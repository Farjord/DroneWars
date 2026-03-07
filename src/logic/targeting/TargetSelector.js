import { debugLog } from '../../utils/debugLogger.js';

/**
 * Select drones from a candidate pool based on targetSelection criteria.
 *
 * @param {Array} drones - Pre-filtered candidate drones
 * @param {Object} criteria - { method, stat?, count }
 * @param {SeededRandom} rng - Deterministic RNG instance
 * @param {Function} [getStatValue] - Optional (drone) => number for effective stats
 * @returns {Array} Selected drones
 */
export function selectTargets(drones, criteria, rng, getStatValue = null) {
  if (!criteria) return drones;
  if (!drones.length || criteria.count <= 0) return [];

  const { method, stat, count } = criteria;

  if (method === 'RANDOM') {
    const shuffled = rng.shuffle(drones);
    return shuffled.slice(0, count);
  }

  if (method === 'HIGHEST' || method === 'LOWEST') {
    // Shuffle first to randomize tie order deterministically
    const shuffled = rng.shuffle(drones);
    const getValue = getStatValue || ((drone) => drone[stat]);
    const ascending = method === 'LOWEST';

    shuffled.sort((a, b) => {
      const valA = getValue(a);
      const valB = getValue(b);
      return ascending ? valA - valB : valB - valA;
    });

    const selected = shuffled.slice(0, count);

    debugLog('TARGETING', `[selectTargets] ${method} stat=${stat} count=${count}`, {
      pool: drones.map(d => `${d.name}(${getValue(d)})`),
      selected: selected.map(d => d.name)
    });

    return selected;
  }

  debugLog('TARGETING', `[selectTargets] Unknown method: ${method}`);
  return drones;
}
