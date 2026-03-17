/**
 * buildTechTooltipItems.test.js
 * TDD tests for the pure buildTechTooltipItems utility function.
 * Tests that tech definitions are correctly mapped to tooltip item arrays.
 */

import { describe, it, expect } from 'vitest';
import { buildTechTooltipItems } from '../DroneTooltipPanel.jsx';

/** Assert that an item has the required tooltip shape */
const assertItemShape = (item) => {
  expect(item).toHaveProperty('key');
  expect(item).toHaveProperty('icon');
  expect(item).toHaveProperty('label');
  expect(item).toHaveProperty('description');
  expect(item).toHaveProperty('accentColor');
  expect(typeof item.key).toBe('string');
  expect(typeof item.label).toBe('string');
  expect(typeof item.description).toBe('string');
  expect(typeof item.accentColor).toBe('string');
};

describe('buildTechTooltipItems', () => {
  it('returns empty array when techDef has no abilities', () => {
    const techDef = { name: 'Empty Tech', abilities: [] };
    const items = buildTechTooltipItems(techDef);
    expect(items).toEqual([]);
  });

  it('returns item with correct key, label, description for a TRIGGERED ability', () => {
    const techDef = {
      name: 'Proximity Mine',
      abilities: [{
        name: 'Proximity Detonation',
        description: 'When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.',
        type: 'TRIGGERED',
      }],
    };
    const items = buildTechTooltipItems(techDef);
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('tech-ability-proximity-detonation');
    expect(items[0].label).toBe('Proximity Detonation');
    expect(items[0].description).toBe('When an enemy drone moves into this lane, deal 4 damage to it. Then destroy this mine.');
  });

  it('gives PASSIVE abilities border-emerald-400 accent', () => {
    const techDef = {
      name: 'Jammer',
      abilities: [{
        name: 'Jammer',
        description: 'Redirects targeting.',
        type: 'PASSIVE',
      }],
    };
    const items = buildTechTooltipItems(techDef);
    expect(items[0].accentColor).toBe('border-emerald-400');
  });

  it('gives TRIGGERED abilities border-amber-400 accent', () => {
    const techDef = {
      name: 'Rally Beacon',
      abilities: [{
        name: 'Rally Point',
        description: 'Go again on lane entry.',
        type: 'TRIGGERED',
      }],
    };
    const items = buildTechTooltipItems(techDef);
    expect(items[0].accentColor).toBe('border-amber-400');
  });

  it('returns 2 items for multi-ability tech (e.g., Jammer with passive + auto-destruct)', () => {
    const techDef = {
      name: 'Jammer',
      abilities: [
        { name: 'Jammer', description: 'Redirects targeting.', type: 'PASSIVE' },
        { name: 'Auto-Destruct', description: 'Destroyed at round end.', type: 'TRIGGERED' },
      ],
    };
    const items = buildTechTooltipItems(techDef);
    expect(items).toHaveLength(2);
    expect(items[0].key).toBe('tech-ability-jammer');
    expect(items[1].key).toBe('tech-ability-auto-destruct');
  });

  it('each item has the required shape (key, icon, label, description, accentColor)', () => {
    const techDef = {
      name: 'Jammer',
      abilities: [
        { name: 'Jammer', description: 'Redirects targeting.', type: 'PASSIVE' },
        { name: 'Auto-Destruct', description: 'Destroyed at round end.', type: 'TRIGGERED' },
      ],
    };
    const items = buildTechTooltipItems(techDef);
    items.forEach(assertItemShape);
  });

  it('handles undefined techDef gracefully', () => {
    expect(buildTechTooltipItems(undefined)).toEqual([]);
  });

  it('handles null techDef gracefully', () => {
    expect(buildTechTooltipItems(null)).toEqual([]);
  });

  it('handles techDef with no abilities property gracefully', () => {
    expect(buildTechTooltipItems({ name: 'Broken' })).toEqual([]);
  });

  it('falls back to PASSIVE config for unknown ability type', () => {
    const techDef = {
      name: 'Mystery',
      abilities: [{ name: 'Unknown Power', description: 'Mystery.', type: 'UNKNOWN_TYPE' }],
    };
    const items = buildTechTooltipItems(techDef);
    expect(items[0].accentColor).toBe('border-emerald-400');
  });
});
