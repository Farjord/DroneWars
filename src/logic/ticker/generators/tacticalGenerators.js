/**
 * Tactical Generators
 * Message generators for the tactical map ticker
 * Generates messages based on current run state rather than map data
 */

import ExtractionController from '../../singlePlayer/ExtractionController.js';
import { mapTiers } from '../../../data/mapData.js';

/**
 * Get threat tier based on detection percentage
 * @param {number} detection - Current detection level (0-100)
 * @returns {string} 'low', 'medium', or 'high'
 */
function getThreatTier(detection) {
  if (detection >= 80) return 'high';
  if (detection >= 50) return 'medium';
  return 'low';
}

/**
 * Get a random AI name from the threat table for current tier
 * @param {number} mapTier - Map tier (1-indexed)
 * @param {string} tier - Threat tier ('low', 'medium', 'high')
 * @returns {string} AI name
 */
function getAIName(mapTier, tier) {
  // mapTier is 1-indexed, array is 0-indexed
  const tierConfig = mapTiers[(mapTier || 1) - 1];
  const threatTable = tierConfig?.threatTables?.[tier];
  if (!threatTable || threatTable.length === 0) {
    return 'Unknown Threat';
  }
  // Pick random AI from tier
  return threatTable[Math.floor(Math.random() * threatTable.length)];
}

/**
 * AI Threat Generator
 * Generates messages about the AI type currently hunting the player
 */
export function generateAIThreatMessages(currentRunState) {
  const messages = [];
  const { detection, mapTier } = currentRunState;
  const tier = getThreatTier(detection);
  const aiName = getAIName(mapTier || 1, tier);

  if (tier === 'high') {
    messages.push({
      text: `${aiName} actively hunting this sector`,
      type: 'danger',
      priority: 9
    });
  } else if (tier === 'medium') {
    messages.push({
      text: `${aiName} patrols detected in area`,
      type: 'warning',
      priority: 6
    });
  } else {
    messages.push({
      text: `${aiName} activity - low threat level`,
      type: 'info',
      priority: 3
    });
  }

  return messages;
}

/**
 * Blockade Risk Generator
 * Generates messages about extraction blockade probability
 */
export function generateBlockadeMessages(currentRunState) {
  const messages = [];
  const { detection } = currentRunState;

  if (detection >= 85) {
    messages.push({
      text: `Extraction blockade nearly certain - ${detection}% risk`,
      type: 'danger',
      priority: 10
    });
  } else if (detection >= 70) {
    messages.push({
      text: `High blockade risk - ${detection}% chance of interception`,
      type: 'danger',
      priority: 8
    });
  } else if (detection >= 50) {
    messages.push({
      text: `Extraction blockade risk: ${detection}%`,
      type: 'warning',
      priority: 5
    });
  } else if (detection >= 25) {
    messages.push({
      text: `Blockade probability: ${detection}%`,
      type: 'info',
      priority: 3
    });
  } else {
    messages.push({
      text: `Low blockade risk - ${detection}% detection`,
      type: 'info',
      priority: 2
    });
  }

  return messages;
}

/**
 * Capacity Generator
 * Generates messages about cargo hold capacity
 */
export function generateCapacityMessages(currentRunState) {
  const messages = [];
  const lootCount = currentRunState.collectedLoot?.length || 0;
  const extractionLimit = ExtractionController.calculateExtractionLimit(currentRunState);

  if (lootCount > extractionLimit) {
    messages.push({
      text: `OVERLOADED: ${lootCount}/${extractionLimit} cargo - excess will be lost`,
      type: 'priority',
      priority: 10
    });
  } else if (lootCount === extractionLimit) {
    messages.push({
      text: `Cargo hold full: ${lootCount}/${extractionLimit} capacity`,
      type: 'warning',
      priority: 5
    });
  } else if (lootCount >= extractionLimit - 1 && extractionLimit > 1) {
    messages.push({
      text: `Cargo hold nearly full: ${lootCount}/${extractionLimit}`,
      type: 'info',
      priority: 4
    });
  } else if (lootCount >= extractionLimit / 2) {
    messages.push({
      text: `Cargo hold: ${lootCount}/${extractionLimit} capacity`,
      type: 'info',
      priority: 2
    });
  } else {
    messages.push({
      text: `Plenty of cargo space remaining: ${lootCount}/${extractionLimit}`,
      type: 'rumor',
      priority: 1
    });
  }

  return messages;
}

/**
 * Lockdown Generator
 * Generates messages about area lockdown (proximity to 100% detection)
 */
export function generateLockdownMessages(currentRunState) {
  const messages = [];
  const { detection } = currentRunState;

  if (detection >= 95) {
    messages.push({
      text: `CRITICAL: Area lockdown imminent - ${detection}% threat`,
      type: 'danger',
      priority: 10
    });
  } else if (detection >= 85) {
    messages.push({
      text: `Area lockdown approaching - ${detection}% threat level`,
      type: 'danger',
      priority: 8
    });
  } else if (detection >= 75) {
    messages.push({
      text: `Threat level elevated - ${detection}%`,
      type: 'warning',
      priority: 6
    });
  }
  // No message for lower threat levels - covered by blockade generator

  return messages;
}

/**
 * Hull Status Generator
 * Generates messages about current hull integrity
 */
export function generateHullMessages(currentRunState) {
  const messages = [];
  const { currentHull, maxHull } = currentRunState;

  if (!maxHull || maxHull === 0) return messages;

  const hullPercent = Math.round((currentHull / maxHull) * 100);

  if (hullPercent <= 25) {
    messages.push({
      text: `Hull critical - ${hullPercent}% integrity`,
      type: 'danger',
      priority: 9
    });
  } else if (hullPercent <= 50) {
    messages.push({
      text: `Hull damaged - ${hullPercent}% integrity`,
      type: 'warning',
      priority: 5
    });
  } else if (hullPercent < 100) {
    messages.push({
      text: `Hull integrity: ${hullPercent}%`,
      type: 'info',
      priority: 2
    });
  }
  // No message at 100% - no news is good news

  return messages;
}

/**
 * Credits Generator
 * Generates messages about credits earned (rumor type for flavor)
 */
export function generateCreditsMessages(currentRunState) {
  const messages = [];
  const { creditsEarned } = currentRunState;

  if (creditsEarned > 500) {
    messages.push({
      text: `Salvage operations yielded ${creditsEarned} credits`,
      type: 'rumor',
      priority: 3
    });
  } else if (creditsEarned > 0) {
    messages.push({
      text: `${creditsEarned} credits salvaged so far`,
      type: 'rumor',
      priority: 1
    });
  }

  return messages;
}

/**
 * POI Status Generator
 * Generates messages about remaining points of interest
 */
export function generatePOIMessages(currentRunState) {
  const messages = [];
  const { mapData, lootedPOIs } = currentRunState;

  const totalPOIs = mapData?.pois?.length || 0;
  const lootedCount = lootedPOIs?.length || 0;
  const remainingPOIs = totalPOIs - lootedCount;

  if (remainingPOIs > 0 && totalPOIs > 0) {
    if (remainingPOIs === 1) {
      messages.push({
        text: `1 salvage opportunity remaining`,
        type: 'priority',
        priority: 4
      });
    } else if (remainingPOIs <= 3) {
      messages.push({
        text: `${remainingPOIs} salvage opportunities detected`,
        type: 'priority',
        priority: 3
      });
    }
  }

  return messages;
}

/**
 * Exploration Progress Generator
 * Generates messages about map exploration percentage
 */
export function generateExplorationMessages(currentRunState) {
  const messages = [];
  const { mapData, hexesExplored = [] } = currentRunState;
  const totalHexes = mapData?.hexes?.length || 0;
  const exploredCount = hexesExplored.length;
  const exploredPercent = totalHexes > 0 ? Math.round((exploredCount / totalHexes) * 100) : 0;

  if (exploredPercent >= 75) {
    messages.push({
      text: `Sector ${exploredPercent}% mapped - thorough reconnaissance`,
      type: 'info',
      priority: 2
    });
  } else if (exploredPercent >= 50) {
    messages.push({
      text: `Sector ${exploredPercent}% explored`,
      type: 'info',
      priority: 2
    });
  } else if (exploredPercent >= 25) {
    messages.push({
      text: `${100 - exploredPercent}% of sector remains uncharted`,
      type: 'rumor',
      priority: 3
    });
  }
  // No message for very low exploration - too early to matter

  return messages;
}

/**
 * Rich POI Generator
 * Generates messages about high-value POIs in core zone
 */
export function generateRichPOIMessages(currentRunState) {
  const messages = [];
  const { mapData, lootedPOIs = [] } = currentRunState;
  const pois = mapData?.pois || [];

  // Filter out looted POIs
  const unvisitedPOIs = pois.filter(poi =>
    !lootedPOIs.some(l => l.q === poi.q && l.r === poi.r)
  );

  // Count core zone POIs (highest rewards)
  const coreZonePOIs = unvisitedPOIs.filter(poi => poi.zone === 'core');

  if (coreZonePOIs.length > 0) {
    messages.push({
      text: `${coreZonePOIs.length} high-value targets in core zone`,
      type: 'priority',
      priority: 7
    });
  }

  return messages;
}

/**
 * Low Risk POI Generator
 * Generates messages about safe POIs on perimeter
 */
export function generateLowRiskPOIMessages(currentRunState) {
  const messages = [];
  const { mapData, lootedPOIs = [] } = currentRunState;
  const pois = mapData?.pois || [];

  // Filter out looted POIs
  const unvisitedPOIs = pois.filter(poi =>
    !lootedPOIs.some(l => l.q === poi.q && l.r === poi.r)
  );

  // Count perimeter POIs (lowest risk)
  const perimeterPOIs = unvisitedPOIs.filter(poi => poi.zone === 'perimeter');

  if (perimeterPOIs.length > 0) {
    messages.push({
      text: `${perimeterPOIs.length} low-risk salvage sites on perimeter`,
      type: 'info',
      priority: 4
    });
  }

  return messages;
}

/**
 * Generate all tactical messages from current run state
 * @param {Object} currentRunState - Current run state
 * @returns {Array} Array of message objects
 */
export function generateAllTacticalMessages(currentRunState) {
  if (!currentRunState) return [];

  const allMessages = [
    ...generateAIThreatMessages(currentRunState),
    ...generateBlockadeMessages(currentRunState),
    ...generateCapacityMessages(currentRunState),
    ...generateLockdownMessages(currentRunState),
    ...generateHullMessages(currentRunState),
    ...generateCreditsMessages(currentRunState),
    ...generatePOIMessages(currentRunState),
    ...generateExplorationMessages(currentRunState),
    ...generateRichPOIMessages(currentRunState),
    ...generateLowRiskPOIMessages(currentRunState)
  ];

  // Add stable IDs based on content
  return allMessages.map((msg, index) => ({
    ...msg,
    id: `tactical_${index}_${msg.type}_${msg.text.slice(0, 20).replace(/\s/g, '_')}`
  }));
}
