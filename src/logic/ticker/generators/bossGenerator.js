/**
 * Boss Generator
 * Generates tracking messages for boss encounters
 */

import aiPersonalities from '../../../data/aiData.js';

/**
 * Generate boss tracking messages
 * @param {Array} maps - Array of map objects (not used, but required by interface)
 * @returns {Array} Array of message objects
 */
export function generate(maps) {
  const messages = [];

  // Find boss AIs
  const bosses = aiPersonalities.filter(ai => ai.modes?.includes('boss'));

  bosses.forEach(boss => {
    const displayName = boss.bossConfig?.displayName || boss.name;
    messages.push({
      text: `TRACKING: We are monitoring ${displayName}'s location in T1 space`,
      type: 'danger',
      priority: 9
    });
  });

  return messages;
}

export default { generate };
