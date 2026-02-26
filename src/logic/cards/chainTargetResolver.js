// --- Chain Target Resolver ---
// Pure functions for computing valid targets during effect chain selection.
// Used by useEffectChain hook for selection-time target computation.
// No state mutations — uses PositionTracker for virtual position tracking.

import { resolveRefFromSelections } from './EffectChainProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

// --- Ref Resolution ---

/**
 * Resolve back-references in a targeting definition using prior selections.
 * Converts ref objects like { ref: 0, field: 'sourceLane' } to concrete values.
 */
export function resolveTargetingRefs(targeting, selections) {
  if (!targeting) return { type: 'NONE' };
  const resolved = { ...targeting };

  if (resolved.location && typeof resolved.location === 'object' && 'ref' in resolved.location) {
    resolved.location = resolveRefFromSelections(resolved.location, selections);
  }

  if (resolved.restrictions) {
    resolved.restrictions = resolved.restrictions.map(r => {
      if (r.reference && typeof r.reference === 'object' && 'ref' in r.reference) {
        return { ...r, reference: resolveRefFromSelections(r.reference, selections) };
      }
      return r;
    });
  }

  return resolved;
}

/**
 * Resolve back-references in a destination definition using prior selections.
 * Converts ref objects like { ref: 0, field: 'destinationLane' } to concrete lane IDs.
 */
export function resolveDestinationRefs(destination, selections) {
  if (!destination) return destination;
  const resolved = { ...destination };
  if (resolved.location && typeof resolved.location === 'object' && 'ref' in resolved.location) {
    resolved.location = resolveRefFromSelections(resolved.location, selections);
  }
  return resolved;
}

// --- Effect Classification ---

/**
 * Check if an effect is compound (needs target + destination selection).
 */
export function isCompoundEffect(effect) {
  return (effect.type === 'SINGLE_MOVE' || effect.type === 'MULTI_MOVE') && !!effect.destination;
}

/**
 * Check if an effect has a back-reference to a skipped/null selection.
 */
export function hasSkippedRef(effect, selections) {
  const refs = [];
  const targeting = effect.targeting;
  if (!targeting) return false;

  if (targeting.location && typeof targeting.location === 'object' && 'ref' in targeting.location) {
    refs.push(targeting.location.ref);
  }
  if (targeting.restrictions) {
    for (const r of targeting.restrictions) {
      if (r.reference && typeof r.reference === 'object' && 'ref' in r.reference) {
        refs.push(r.reference.ref);
      }
    }
  }
  if (effect.mod?.value && typeof effect.mod.value === 'object' && 'ref' in effect.mod.value) {
    refs.push(effect.mod.value.ref);
  }
  if (effect.destination?.location && typeof effect.destination.location === 'object' && 'ref' in effect.destination.location) {
    refs.push(effect.destination.location.ref);
  }

  return refs.some(refIdx => !selections[refIdx] || selections[refIdx].skipped);
}

// --- Target Computation Helpers ---

function getTargetPlayerId(affinity, actingPlayerId) {
  if (affinity === 'ENEMY') return actingPlayerId === 'player1' ? 'player2' : 'player1';
  return actingPlayerId;
}

function getTargetLanes(location) {
  const allLanes = ['lane1', 'lane2', 'lane3'];
  if (!location || location === 'ANY_LANE') return allLanes;
  if (allLanes.includes(location)) return [location];
  return allLanes;
}

function passesRestriction(drone, restriction, getEffectiveStats, lane) {
  if (restriction.type !== 'STAT_COMPARISON') return true;

  const { stat, comparison, reference, referenceStat } = restriction;
  if (!reference) return true;

  const droneStat = getEffectiveStats ? getEffectiveStats(drone, lane)[stat] : drone[stat];
  const refStat = getEffectiveStats ? getEffectiveStats(reference, reference.lane)[referenceStat] : reference[referenceStat];
  if (droneStat == null || refStat == null) return true;

  let result;
  switch (comparison) {
    case 'LT': result = droneStat < refStat; break;
    case 'LTE': result = droneStat <= refStat; break;
    case 'GT': result = droneStat > refStat; break;
    case 'GTE': result = droneStat >= refStat; break;
    default: result = true;
  }

  debugLog('CARD_PLAY_TRACE', '[1.3] Restriction check', {
    droneName: drone.name, stat, droneStat,
    refName: reference?.name, referenceStat, refStat,
    comparison, result,
    lane, refLane: reference?.lane,
  });

  return result;
}

// --- Per-Type Target Computation ---

function computeDroneTargets(targeting, actingPlayerId, playerStates, positionTracker, getEffectiveStats) {
  const targetPlayerId = getTargetPlayerId(targeting.affinity, actingPlayerId);
  const targetLanes = getTargetLanes(targeting.location);
  const board = playerStates[targetPlayerId]?.dronesOnBoard || {};
  const targets = [];

  let totalDrones = 0;
  let restrictionFailures = 0;

  for (const origLane of ['lane1', 'lane2', 'lane3']) {
    for (const drone of (board[origLane] || [])) {
      totalDrones++;
      const virtualLane = positionTracker?.getDronePosition(drone.id)?.lane || origLane;
      if (!targetLanes.includes(virtualLane)) continue;

      if (targeting.restrictions) {
        if (!targeting.restrictions.every(r => passesRestriction(drone, r, getEffectiveStats, virtualLane))) {
          restrictionFailures++;
          continue;
        }
      }

      targets.push({ ...drone, owner: targetPlayerId, lane: virtualLane });
    }
  }

  debugLog('EFFECT_CHAIN_DEBUG', '[TARGETS] computeDroneTargets', {
    affinity: targeting.affinity, targetPlayerId, location: targeting.location,
    totalDrones, restrictionFailures, validCount: targets.length,
    hasRestrictions: !!targeting.restrictions,
    restrictions: targeting.restrictions?.map(r => ({ type: r.type, stat: r.stat, comparison: r.comparison, referenceStat: r.referenceStat })),
  });

  return targets;
}

function computeLaneTargets(targeting, actingPlayerId) {
  const targetPlayerId = getTargetPlayerId(targeting.affinity || 'ENEMY', actingPlayerId);
  return ['lane1', 'lane2', 'lane3'].map(laneId => ({
    id: laneId,
    owner: targetPlayerId,
    type: 'lane',
  }));
}

function computeCardInHandTargets(targeting, actingPlayerId, playerStates, positionTracker) {
  const targetPlayerId = getTargetPlayerId(targeting.affinity || 'FRIENDLY', actingPlayerId);
  const hand = playerStates[targetPlayerId]?.hand || [];
  return hand
    .filter(card => !positionTracker?.isCardDiscarded(card.id))
    .map(card => ({ ...card, owner: targetPlayerId }));
}

function computeShipSectionTargets(targeting, actingPlayerId, playerStates) {
  const targetPlayerId = getTargetPlayerId(targeting.affinity || 'ENEMY', actingPlayerId);
  const sections = playerStates[targetPlayerId]?.placedSections || {};
  return Object.entries(sections)
    .filter(([, section]) => !section.destroyed)
    .map(([name, section]) => ({ id: name, owner: targetPlayerId, ...section }));
}

// --- Main Target Computation ---

/**
 * Compute valid targets for a chain effect given prior selections.
 *
 * @param {Object} effect - The chain effect with targeting definition
 * @param {number} effectIndex - Index in the effects[] array
 * @param {Array} selections - Prior selections [{ target, lane, destination?, skipped? }, ...]
 * @param {Object} positionTracker - PositionTracker instance for virtual positions
 * @param {Object} context - { actingPlayerId, playerStates, getEffectiveStats }
 * @returns {Array} Valid target objects for UI highlighting
 */
export function computeChainTargets(effect, effectIndex, selections, positionTracker, context) {
  const { actingPlayerId, playerStates, getEffectiveStats } = context;
  const targeting = resolveTargetingRefs(effect.targeting, selections);

  if (targeting.type === 'NONE') return [];

  switch (targeting.type) {
    case 'DRONE':
      return computeDroneTargets(targeting, actingPlayerId, playerStates, positionTracker, getEffectiveStats);
    case 'LANE':
      return computeLaneTargets(targeting, actingPlayerId);
    case 'CARD_IN_HAND':
      return computeCardInHandTargets(targeting, actingPlayerId, playerStates, positionTracker);
    case 'SHIP_SECTION':
      return computeShipSectionTargets(targeting, actingPlayerId, playerStates);
    default:
      return [];
  }
}

/**
 * Compute valid destination targets for compound effects (SINGLE_MOVE, MULTI_MOVE).
 *
 * @param {Object} destination - { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }
 * @param {Object} selection - { target, lane } — the primary selection for this effect
 * @param {string} actingPlayerId - Acting player ID
 * @returns {Array} Valid lane target objects
 */
export function computeDestinationTargets(destination, selection, actingPlayerId) {
  if (!destination || destination.type !== 'LANE') return [];

  const lanes = ['lane1', 'lane2', 'lane3'];

  // Concrete lane ID (e.g., resolved from a ref) — single valid destination
  if (lanes.includes(destination.location)) {
    return [{ id: destination.location, owner: actingPlayerId, type: 'lane' }];
  }

  if (destination.location === 'ADJACENT_TO_PRIMARY') {
    const sourceLane = selection.lane;
    if (!sourceLane) return [];
    const sourceIdx = parseInt(sourceLane.replace('lane', ''), 10);
    return lanes
      .filter(laneId => Math.abs(parseInt(laneId.replace('lane', ''), 10) - sourceIdx) === 1)
      .map(laneId => ({ id: laneId, owner: actingPlayerId, type: 'lane' }));
  }

  // Generic: any other lane (MULTI_MOVE destination)
  if (selection.lane) {
    return lanes
      .filter(laneId => laneId !== selection.lane)
      .map(laneId => ({ id: laneId, owner: actingPlayerId, type: 'lane' }));
  }

  return lanes.map(laneId => ({ id: laneId, owner: actingPlayerId, type: 'lane' }));
}
