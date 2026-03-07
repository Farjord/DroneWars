import { debugLog } from '../../utils/debugLogger.js';
import { calculateEffectiveStats } from '../statsCalculator.js';
import { SeededRandom } from '../../utils/seededRandom.js';

/**
 * Simple string hash (djb2) for deterministic RNG seed discrimination.
 * Ensures different IDs of the same length produce different seeds.
 */
export function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Shared helper: apply targetSelection config to a candidate pool.
 * Used by DamageEffectProcessor and DestroyEffectProcessor.
 */
export function applyTargetSelection(candidates, tsConfig, context, laneId, targetPlayerState, actingPlayerState, placedSections, card) {
  const discriminator = card?.instanceId || candidates.length;
  const rng = SeededRandom.forTargetSelection(
    { gameSeed: context.gameSeed ?? 12345, roundNumber: context.roundNumber },
    typeof discriminator === 'string' ? hashString(discriminator) : discriminator
  );
  return selectTargets(candidates, tsConfig, rng, (drone) => {
    if (!tsConfig.stat) return 0;
    const effectiveStats = calculateEffectiveStats(drone, laneId, targetPlayerState, actingPlayerState, placedSections || {});
    return effectiveStats[tsConfig.stat] ?? drone[tsConfig.stat];
  });
}

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

    debugLog('TARGETING_PROCESSING', `[selectTargets] ${method} stat=${stat} count=${count}`, {
      pool: drones.map(d => `${d.name}(${getValue(d)})`),
      selected: selected.map(d => d.name)
    });

    return selected;
  }

  debugLog('TARGETING_PROCESSING', `[selectTargets] Unknown method: ${method}`);
  return drones;
}
