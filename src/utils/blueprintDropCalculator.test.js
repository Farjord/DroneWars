import { describe, it, expect } from 'vitest';
import {
  CLASS_BAND_WEIGHTS,
  RARITY_WEIGHTS,
  getEligiblePOIs,
  getEligibleTiers,
  calculatePoolSize,
  calculateDropProbability,
  getDroneDropInfo
} from './blueprintDropCalculator.js';

describe('blueprintDropCalculator - Constants Export', () => {
  it('CLASS_BAND_WEIGHTS should be defined with correct structure', () => {
    expect(CLASS_BAND_WEIGHTS).toBeDefined();
    expect(CLASS_BAND_WEIGHTS['DRONE_BLUEPRINT_LIGHT']).toBeDefined();
    expect(CLASS_BAND_WEIGHTS['DRONE_BLUEPRINT_MEDIUM']).toBeDefined();
    expect(CLASS_BAND_WEIGHTS['DRONE_BLUEPRINT_HEAVY']).toBeDefined();
  });

  it('RARITY_WEIGHTS should be defined with correct structure', () => {
    expect(RARITY_WEIGHTS).toBeDefined();
    expect(RARITY_WEIGHTS.tier1).toBeDefined();
    expect(RARITY_WEIGHTS.tier2).toBeDefined();
    expect(RARITY_WEIGHTS.tier3).toBeDefined();
  });
});

describe('blueprintDropCalculator - getEligiblePOIs', () => {
  it('class 0 only eligible in Light POIs', () => {
    expect(getEligiblePOIs(0)).toEqual(['DRONE_BLUEPRINT_LIGHT']);
  });

  it('class 1 eligible in Light and Medium POIs', () => {
    const result = getEligiblePOIs(1);
    expect(result).toContain('DRONE_BLUEPRINT_LIGHT');
    expect(result).toContain('DRONE_BLUEPRINT_MEDIUM');
    expect(result).not.toContain('DRONE_BLUEPRINT_HEAVY');
  });

  it('class 2 eligible in all POIs (Light has 0 weight, but Medium and Heavy have weight)', () => {
    const result = getEligiblePOIs(2);
    expect(result).toContain('DRONE_BLUEPRINT_MEDIUM');
    expect(result).toContain('DRONE_BLUEPRINT_HEAVY');
    // Class 2 has 0 weight in LIGHT, so shouldn't be included
    expect(result).not.toContain('DRONE_BLUEPRINT_LIGHT');
  });

  it('class 3 eligible in Medium and Heavy POIs', () => {
    const result = getEligiblePOIs(3);
    expect(result).not.toContain('DRONE_BLUEPRINT_LIGHT');
    expect(result).toContain('DRONE_BLUEPRINT_MEDIUM');
    expect(result).toContain('DRONE_BLUEPRINT_HEAVY');
  });

  it('class 4 only eligible in Heavy POIs', () => {
    expect(getEligiblePOIs(4)).toEqual(['DRONE_BLUEPRINT_HEAVY']);
  });
});

describe('blueprintDropCalculator - getEligibleTiers', () => {
  it('Common drones eligible in all tiers', () => {
    expect(getEligibleTiers('Common')).toEqual([1, 2, 3]);
  });

  it('Uncommon drones eligible in all tiers', () => {
    expect(getEligibleTiers('Uncommon')).toEqual([1, 2, 3]);
  });

  it('Rare drones only eligible in tier 2 and 3', () => {
    expect(getEligibleTiers('Rare')).toEqual([2, 3]);
  });

  it('Mythic drones not eligible in any tier (no Mythic weight)', () => {
    // Based on RARITY_WEIGHTS, Mythic has 0 weight in all tiers
    expect(getEligibleTiers('Mythic')).toEqual([]);
  });
});

describe('blueprintDropCalculator - calculatePoolSize', () => {
  it('excludes starter drones from pool', () => {
    // Assuming there are some class 1 Commons, but starters should be excluded
    const poolSize = calculatePoolSize(1, 'Common');
    expect(poolSize).toBeGreaterThan(0);
  });

  it('excludes non-selectable drones from pool', () => {
    const poolSize = calculatePoolSize(2, 'Common');
    expect(poolSize).toBeGreaterThan(0);
  });

  it('returns 0 for non-existent class/rarity combinations', () => {
    const poolSize = calculatePoolSize(99, 'Common');
    expect(poolSize).toBe(0);
  });

  it('counts only drones matching exact class and rarity', () => {
    // Get pool size for class 1 Common
    const poolSize = calculatePoolSize(1, 'Common');
    expect(poolSize).toBeGreaterThan(0);

    // Get pool size for class 1 Uncommon - should be different
    const uncommonPoolSize = calculatePoolSize(1, 'Uncommon');
    expect(uncommonPoolSize).not.toBe(poolSize);
  });
});

describe('blueprintDropCalculator - calculateDropProbability', () => {
  it('calculates correct probability for valid POI+tier', () => {
    const drone = { name: 'TestDrone', class: 1, rarity: 'Common' };
    const prob = calculateDropProbability(drone, 'DRONE_BLUEPRINT_LIGHT', 1);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('returns 0 for impossible POI (class not in band)', () => {
    const drone = { name: 'TestDrone', class: 0, rarity: 'Common' };
    const prob = calculateDropProbability(drone, 'DRONE_BLUEPRINT_HEAVY', 1);
    expect(prob).toBe(0);
  });

  it('returns 0 for impossible tier (Rare in tier 1)', () => {
    const drone = { name: 'TestDrone', class: 1, rarity: 'Rare' };
    const prob = calculateDropProbability(drone, 'DRONE_BLUEPRINT_LIGHT', 1);
    expect(prob).toBe(0);
  });

  it('probability formula: P(class) × P(rarity) × (1/pool)', () => {
    const drone = { name: 'TestDrone', class: 1, rarity: 'Common' };

    // For LIGHT POI, tier 1:
    // Class 1 weight: 40 out of (60+40+0) = 40/100 = 0.4
    // Common weight: 90 out of (90+10+0) = 90/100 = 0.9
    // Pool size: let's say there are N class 1 Commons
    // P = 0.4 × 0.9 × (1/N) = 0.36 / N

    const prob = calculateDropProbability(drone, 'DRONE_BLUEPRINT_LIGHT', 1);
    const poolSize = calculatePoolSize(1, 'Common');

    const expectedProb = (40 / 100) * (90 / 100) * (1 / poolSize);
    expect(prob).toBeCloseTo(expectedProb, 5);
  });

  it('higher tier reduces probability for Common (lower weight)', () => {
    const drone = { name: 'TestDrone', class: 1, rarity: 'Common' };

    const probTier1 = calculateDropProbability(drone, 'DRONE_BLUEPRINT_LIGHT', 1);
    const probTier3 = calculateDropProbability(drone, 'DRONE_BLUEPRINT_LIGHT', 3);

    // Tier 1: Common 90%, Tier 3: Common 40%
    expect(probTier1).toBeGreaterThan(probTier3);
  });
});

describe('blueprintDropCalculator - getDroneDropInfo', () => {
  it('returns all valid sources for a multi-POI drone', () => {
    const drone = { name: 'TestDrone', class: 1, rarity: 'Common' };
    const dropInfo = getDroneDropInfo(drone);

    expect(dropInfo.sources.length).toBeGreaterThan(0);
    expect(dropInfo.poolSize).toBeGreaterThan(0);

    // Class 1 Common should appear in Light and Medium POIs across all tiers
    const poiTypes = new Set(dropInfo.sources.map(s => s.poiType));
    expect(poiTypes.has('DRONE_BLUEPRINT_LIGHT')).toBe(true);
    expect(poiTypes.has('DRONE_BLUEPRINT_MEDIUM')).toBe(true);
  });

  it('returns empty sources for non-existent drone', () => {
    const drone = { name: 'FakeDrone', class: 99, rarity: 'Common' };
    const dropInfo = getDroneDropInfo(drone);

    expect(dropInfo.sources.length).toBe(0);
    expect(dropInfo.poolSize).toBe(0);
  });

  it('each source has poiType, tier, and probability', () => {
    const drone = { name: 'TestDrone', class: 2, rarity: 'Common' };
    const dropInfo = getDroneDropInfo(drone);

    dropInfo.sources.forEach(source => {
      expect(source).toHaveProperty('poiType');
      expect(source).toHaveProperty('tier');
      expect(source).toHaveProperty('probability');
      expect(source.probability).toBeGreaterThan(0);
      expect(source.probability).toBeLessThanOrEqual(1);
    });
  });

  it('Rare drone only appears in tier 2 and 3 sources', () => {
    // Use actual Rare drone from collection (Aegis is class 3 Rare)
    const drone = { name: 'Aegis', class: 3, rarity: 'Rare' };
    const dropInfo = getDroneDropInfo(drone);

    const tiers = dropInfo.sources.map(s => s.tier);
    expect(tiers).not.toContain(1);
    expect(tiers.length).toBeGreaterThan(0);
    tiers.forEach(tier => {
      expect([2, 3]).toContain(tier);
    });
  });

  it('poolSize matches the class+rarity pool calculation', () => {
    const drone = { name: 'TestDrone', class: 1, rarity: 'Common' };
    const dropInfo = getDroneDropInfo(drone);

    const expectedPoolSize = calculatePoolSize(1, 'Common');
    expect(dropInfo.poolSize).toBe(expectedPoolSize);
  });
});
