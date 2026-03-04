// ========================================
// TECH / DRONE NAME UNIQUENESS TESTS
// ========================================
// Guards against name collisions between tech and drones — TriggerProcessor
// uses name-based lookups, so collisions would cause incorrect behaviour.

import { describe, it, expect } from 'vitest';
import fullDroneCollection from '../droneData.js';
import fullTechCollection from '../techData.js';

describe('Tech and Drone name uniqueness', () => {
  it('no tech name collides with any drone name', () => {
    const droneNames = new Set(fullDroneCollection.map(d => d.name));
    for (const tech of fullTechCollection) {
      expect(droneNames.has(tech.name), `Tech "${tech.name}" collides with a drone name`).toBe(false);
    }
  });

  it('all tech names are unique within techData', () => {
    const names = fullTechCollection.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all tech entries have required fields', () => {
    for (const tech of fullTechCollection) {
      expect(tech.hull).toBeDefined();
      expect(tech.isTech).toBe(true);
      expect(tech.abilities).toBeDefined();
      expect(Array.isArray(tech.abilities)).toBe(true);
    }
  });

  it('no tech entry has removed drone-like fields', () => {
    const removedFields = ['attack', 'shields', 'speed', 'class', 'limit', 'rebuildRate', 'rarity', 'upgradeSlots'];
    for (const tech of fullTechCollection) {
      for (const field of removedFields) {
        expect(tech[field], `Tech "${tech.name}" still has removed field "${field}"`).toBeUndefined();
      }
    }
  });
});
