/**
 * Unit Tests for Tactical Generators
 * TDD tests for tactical map ticker message generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAIThreatMessages,
  generateBlockadeMessages,
  generateCapacityMessages,
  generateLockdownMessages,
  generateHullMessages,
  generateCreditsMessages,
  generatePOIMessages,
  generateExplorationMessages,
  generateRichPOIMessages,
  generateLowRiskPOIMessages,
  generateAllTacticalMessages
} from './tacticalGenerators.js';

// Mock ExtractionController
vi.mock('../../singlePlayer/ExtractionController.js', () => ({
  default: {
    calculateExtractionLimit: vi.fn(() => 6)
  }
}));

// ========================================
// AI THREAT GENERATOR TESTS
// ========================================
describe('generateAIThreatMessages', () => {
  it('should return danger type at high detection (>=80%)', () => {
    const runState = {
      detection: 85,
      mapTier: 1
    };
    const messages = generateAIThreatMessages(runState);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('danger');
    expect(messages[0].text).toContain('hunting');
  });

  it('should return warning type at medium detection (50-79%)', () => {
    const runState = {
      detection: 60,
      mapTier: 1
    };
    const messages = generateAIThreatMessages(runState);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('warning');
    expect(messages[0].text).toContain('patrols');
  });

  it('should return info type at low detection (<50%)', () => {
    const runState = {
      detection: 20,
      mapTier: 1
    };
    const messages = generateAIThreatMessages(runState);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('low threat');
  });

  it('should use correct AI name from tier 1 threat tables', () => {
    const runState = {
      detection: 30,
      mapTier: 1
    };
    const messages = generateAIThreatMessages(runState);
    // Tier 1 low threat: 'Rogue Scout Pattern' or 'Automated Patrol Unit'
    expect(
      messages[0].text.includes('Rogue Scout Pattern') ||
      messages[0].text.includes('Automated Patrol Unit')
    ).toBe(true);
  });

  it('should default to tier 1 if mapTier is undefined', () => {
    const runState = {
      detection: 30
      // mapTier undefined
    };
    const messages = generateAIThreatMessages(runState);
    expect(messages).toHaveLength(1);
    // Should not be "Unknown Threat"
    expect(messages[0].text).not.toContain('Unknown Threat');
  });
});

// ========================================
// BLOCKADE GENERATOR TESTS
// ========================================
describe('generateBlockadeMessages', () => {
  it('should return danger type at critical detection (>=85%)', () => {
    const runState = { detection: 90 };
    const messages = generateBlockadeMessages(runState);
    expect(messages[0].type).toBe('danger');
    expect(messages[0].text).toContain('90%');
  });

  it('should return danger type at high detection (70-84%)', () => {
    const runState = { detection: 75 };
    const messages = generateBlockadeMessages(runState);
    expect(messages[0].type).toBe('danger');
    expect(messages[0].text).toContain('75%');
  });

  it('should return warning type at medium detection (50-69%)', () => {
    const runState = { detection: 55 };
    const messages = generateBlockadeMessages(runState);
    expect(messages[0].type).toBe('warning');
    expect(messages[0].text).toContain('55%');
  });

  it('should return info type at low detection (25-49%)', () => {
    const runState = { detection: 35 };
    const messages = generateBlockadeMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('35%');
  });

  it('should return info type at very low detection (<25%)', () => {
    const runState = { detection: 15 };
    const messages = generateBlockadeMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('15%');
  });
});

// ========================================
// CAPACITY GENERATOR TESTS
// ========================================
describe('generateCapacityMessages', () => {
  it('should return priority type when overloaded (loot > limit)', () => {
    const runState = {
      collectedLoot: [1, 2, 3, 4, 5, 6, 7, 8], // 8 items, limit is 6
      shipSlotId: 1,
      shipSections: {}
    };
    const messages = generateCapacityMessages(runState);
    expect(messages[0].type).toBe('priority');
    expect(messages[0].text).toContain('OVERLOADED');
    expect(messages[0].text).toContain('8/6');
  });

  it('should return warning type when at capacity', () => {
    const runState = {
      collectedLoot: [1, 2, 3, 4, 5, 6], // 6 items = limit
      shipSlotId: 1,
      shipSections: {}
    };
    const messages = generateCapacityMessages(runState);
    expect(messages[0].type).toBe('warning');
    expect(messages[0].text).toContain('full');
  });

  it('should return info type for nearly full cargo', () => {
    const runState = {
      collectedLoot: [1, 2, 3, 4, 5], // 5 items, limit 6
      shipSlotId: 1,
      shipSections: {}
    };
    const messages = generateCapacityMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('nearly full');
  });

  it('should return rumor type for low cargo', () => {
    const runState = {
      collectedLoot: [1], // 1 item, limit 6
      shipSlotId: 1,
      shipSections: {}
    };
    const messages = generateCapacityMessages(runState);
    expect(messages[0].type).toBe('rumor');
  });
});

// ========================================
// LOCKDOWN GENERATOR TESTS
// ========================================
describe('generateLockdownMessages', () => {
  it('should return danger type at critical threat (>=95%)', () => {
    const runState = { detection: 97 };
    const messages = generateLockdownMessages(runState);
    expect(messages[0].type).toBe('danger');
    expect(messages[0].text).toContain('CRITICAL');
  });

  it('should return danger type at high threat (85-94%)', () => {
    const runState = { detection: 88 };
    const messages = generateLockdownMessages(runState);
    expect(messages[0].type).toBe('danger');
    expect(messages[0].text).toContain('lockdown');
  });

  it('should return warning type at elevated threat (75-84%)', () => {
    const runState = { detection: 78 };
    const messages = generateLockdownMessages(runState);
    expect(messages[0].type).toBe('warning');
    expect(messages[0].text).toContain('elevated');
  });

  it('should return empty array at lower detection', () => {
    const runState = { detection: 50 };
    const messages = generateLockdownMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// HULL GENERATOR TESTS
// ========================================
describe('generateHullMessages', () => {
  it('should return danger type when hull <= 25%', () => {
    const runState = { currentHull: 20, maxHull: 100 };
    const messages = generateHullMessages(runState);
    expect(messages[0].type).toBe('danger');
    expect(messages[0].text).toContain('critical');
  });

  it('should return warning type when hull <= 50%', () => {
    const runState = { currentHull: 45, maxHull: 100 };
    const messages = generateHullMessages(runState);
    expect(messages[0].type).toBe('warning');
    expect(messages[0].text).toContain('damaged');
  });

  it('should return info type when hull < 100%', () => {
    const runState = { currentHull: 75, maxHull: 100 };
    const messages = generateHullMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('75%');
  });

  it('should return empty array at full hull', () => {
    const runState = { currentHull: 100, maxHull: 100 };
    const messages = generateHullMessages(runState);
    expect(messages).toHaveLength(0);
  });

  it('should handle missing maxHull', () => {
    const runState = { currentHull: 50 };
    const messages = generateHullMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// CREDITS GENERATOR TESTS
// ========================================
describe('generateCreditsMessages', () => {
  it('should return rumor type for high credits (>500)', () => {
    const runState = { creditsEarned: 750 };
    const messages = generateCreditsMessages(runState);
    expect(messages[0].type).toBe('rumor');
    expect(messages[0].text).toContain('750');
  });

  it('should return rumor type for low credits (>0)', () => {
    const runState = { creditsEarned: 200 };
    const messages = generateCreditsMessages(runState);
    expect(messages[0].type).toBe('rumor');
  });

  it('should return empty array for zero credits', () => {
    const runState = { creditsEarned: 0 };
    const messages = generateCreditsMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// POI GENERATOR TESTS
// ========================================
describe('generatePOIMessages', () => {
  it('should return priority type for remaining POIs', () => {
    const runState = {
      mapData: {
        pois: [{ q: 0, r: 0 }, { q: 1, r: 1 }, { q: 2, r: 2 }]
      },
      lootedPOIs: [{ q: 0, r: 0 }] // 1 looted, 2 remaining
    };
    const messages = generatePOIMessages(runState);
    expect(messages[0].type).toBe('priority');
    expect(messages[0].text).toContain('2');
  });

  it('should return empty array when no POIs remain', () => {
    const runState = {
      mapData: {
        pois: [{ q: 0, r: 0 }]
      },
      lootedPOIs: [{ q: 0, r: 0 }]
    };
    const messages = generatePOIMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// EXPLORATION GENERATOR TESTS
// ========================================
describe('generateExplorationMessages', () => {
  it('should return info type for high exploration (>=75%)', () => {
    const runState = {
      mapData: { hexes: new Array(100) },
      hexesExplored: new Array(80)
    };
    const messages = generateExplorationMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('80%');
    expect(messages[0].text).toContain('thorough');
  });

  it('should return info type for medium exploration (50-74%)', () => {
    const runState = {
      mapData: { hexes: new Array(100) },
      hexesExplored: new Array(60)
    };
    const messages = generateExplorationMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('60%');
  });

  it('should return rumor type for low exploration (25-49%)', () => {
    const runState = {
      mapData: { hexes: new Array(100) },
      hexesExplored: new Array(30)
    };
    const messages = generateExplorationMessages(runState);
    expect(messages[0].type).toBe('rumor');
    expect(messages[0].text).toContain('70%'); // 100-30 = 70% uncharted
  });

  it('should return empty array for very low exploration (<25%)', () => {
    const runState = {
      mapData: { hexes: new Array(100) },
      hexesExplored: new Array(10)
    };
    const messages = generateExplorationMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// RICH POI GENERATOR TESTS
// ========================================
describe('generateRichPOIMessages', () => {
  it('should return priority type for core zone POIs', () => {
    const runState = {
      mapData: {
        pois: [
          { q: 0, r: 0, zone: 'core' },
          { q: 1, r: 1, zone: 'core' },
          { q: 2, r: 2, zone: 'mid' }
        ]
      },
      lootedPOIs: []
    };
    const messages = generateRichPOIMessages(runState);
    expect(messages[0].type).toBe('priority');
    expect(messages[0].text).toContain('2');
    expect(messages[0].text).toContain('high-value');
  });

  it('should exclude looted POIs', () => {
    const runState = {
      mapData: {
        pois: [
          { q: 0, r: 0, zone: 'core' },
          { q: 1, r: 1, zone: 'core' }
        ]
      },
      lootedPOIs: [{ q: 0, r: 0 }] // One core POI already looted
    };
    const messages = generateRichPOIMessages(runState);
    expect(messages[0].text).toContain('1'); // Only 1 remaining
  });

  it('should return empty array when no core POIs', () => {
    const runState = {
      mapData: {
        pois: [{ q: 0, r: 0, zone: 'perimeter' }]
      },
      lootedPOIs: []
    };
    const messages = generateRichPOIMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// LOW RISK POI GENERATOR TESTS
// ========================================
describe('generateLowRiskPOIMessages', () => {
  it('should return info type for perimeter POIs', () => {
    const runState = {
      mapData: {
        pois: [
          { q: 0, r: 0, zone: 'perimeter' },
          { q: 1, r: 1, zone: 'perimeter' },
          { q: 2, r: 2, zone: 'core' }
        ]
      },
      lootedPOIs: []
    };
    const messages = generateLowRiskPOIMessages(runState);
    expect(messages[0].type).toBe('info');
    expect(messages[0].text).toContain('2');
    expect(messages[0].text).toContain('low-risk');
  });

  it('should exclude looted POIs', () => {
    const runState = {
      mapData: {
        pois: [
          { q: 0, r: 0, zone: 'perimeter' },
          { q: 1, r: 1, zone: 'perimeter' }
        ]
      },
      lootedPOIs: [{ q: 0, r: 0 }]
    };
    const messages = generateLowRiskPOIMessages(runState);
    expect(messages[0].text).toContain('1');
  });

  it('should return empty array when no perimeter POIs', () => {
    const runState = {
      mapData: {
        pois: [{ q: 0, r: 0, zone: 'core' }]
      },
      lootedPOIs: []
    };
    const messages = generateLowRiskPOIMessages(runState);
    expect(messages).toHaveLength(0);
  });
});

// ========================================
// GENERATE ALL MESSAGES TESTS
// ========================================
describe('generateAllTacticalMessages', () => {
  it('should return array with stable IDs', () => {
    const runState = {
      detection: 50,
      mapTier: 1,
      collectedLoot: [1, 2],
      currentHull: 80,
      maxHull: 100,
      creditsEarned: 100,
      mapData: { hexes: new Array(50), pois: [] },
      hexesExplored: new Array(25),
      lootedPOIs: [],
      shipSlotId: 1,
      shipSections: {}
    };
    const messages = generateAllTacticalMessages(runState);
    expect(messages.length).toBeGreaterThan(0);
    messages.forEach(msg => {
      expect(msg.id).toBeDefined();
      expect(msg.id).toMatch(/^tactical_/);
    });
  });

  it('should handle null/undefined run state gracefully', () => {
    const messages = generateAllTacticalMessages(null);
    expect(messages).toEqual([]);

    const messages2 = generateAllTacticalMessages(undefined);
    expect(messages2).toEqual([]);
  });

  it('should include messages from multiple generators', () => {
    const runState = {
      detection: 50,
      mapTier: 1,
      collectedLoot: [1, 2, 3],
      currentHull: 70,
      maxHull: 100,
      creditsEarned: 300,
      mapData: {
        hexes: new Array(100),
        pois: [{ q: 0, r: 0, zone: 'perimeter' }]
      },
      hexesExplored: new Array(50),
      lootedPOIs: [],
      shipSlotId: 1,
      shipSections: {}
    };
    const messages = generateAllTacticalMessages(runState);

    // Should have multiple message types
    const types = new Set(messages.map(m => m.type));
    expect(types.size).toBeGreaterThan(1);
  });
});
