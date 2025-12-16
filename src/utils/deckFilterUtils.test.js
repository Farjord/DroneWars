/**
 * deckFilterUtils.test.js
 * TDD tests for deck builder filter utility functions
 *
 * Tests the filter logic used in DeckBuilder for:
 * - Card filtering (OR/AND logic)
 * - Drone filtering
 * - Rarity sorting with Starter support
 * - Active filter counting
 */

import { describe, it, expect } from 'vitest';
import {
  filterCards,
  filterDrones,
  sortByRarity,
  countActiveFilters,
  generateFilterChips,
  RARITY_ORDER,
  RARITY_ORDER_EXTRACTION,
} from './deckFilterUtils.js';

// ========================================
// MOCK DATA
// ========================================

const mockCards = [
  {
    id: 'CARD001',
    name: 'Laser Blast',
    type: 'Ordnance',
    rarity: 'Common',
    cost: 2,
    targetingText: 'Drone (Any)',
    keywords: ['Damage'],
    damageType: 'Kinetic',
    aiOnly: false,
  },
  {
    id: 'CARD002',
    name: 'Plasma Bolt',
    type: 'Ordnance',
    rarity: 'Rare',
    cost: 4,
    targetingText: 'Drone (Enemy)',
    keywords: ['Damage', 'Go Again'],
    damageType: 'Ion',
    aiOnly: false,
  },
  {
    id: 'CARD003',
    name: 'Shield Boost',
    type: 'Tactic',
    rarity: 'Uncommon',
    cost: 3,
    targetingText: 'Drone (Friendly)',
    keywords: ['Shield Buff'],
    aiOnly: false,
  },
  {
    id: 'CARD004',
    name: 'Draw Power',
    type: 'Support',
    rarity: 'Common',
    cost: 1,
    targetingText: 'N/A',
    keywords: ['Draw'],
    aiOnly: false,
  },
  {
    id: 'CARD005',
    name: 'Multi Draw',
    type: 'Support',
    rarity: 'Mythic',
    cost: 5,
    targetingText: 'N/A',
    keywords: ['Draw', 'Go Again'],
    aiOnly: false,
  },
  {
    id: 'CARD006_ENHANCED',
    name: 'Laser Blast Enhanced',
    type: 'Ordnance',
    rarity: 'Common',
    cost: 2,
    targetingText: 'Drone (Any)',
    keywords: ['Damage'],
    damageType: 'Kinetic',
    aiOnly: false,
  },
  {
    id: 'CARD007',
    name: 'AI Exclusive Card',
    type: 'Ordnance',
    rarity: 'Rare',
    cost: 3,
    targetingText: 'Drone (Enemy)',
    keywords: ['Damage'],
    damageType: 'Shield Breaker',
    aiOnly: true,
  },
  {
    id: 'CARD008',
    name: 'Starter Card',
    type: 'Ordnance',
    rarity: 'Common',
    cost: 2,
    targetingText: 'Drone (Any)',
    keywords: ['Damage'],
    isStarterPool: true,
    aiOnly: false,
  },
];

const mockDrones = [
  {
    name: 'Dart',
    class: 1,
    rarity: 'Common',
    keywords: ['Active', 'Scout'],
    aiOnly: false,
  },
  {
    name: 'Talon',
    class: 2,
    rarity: 'Uncommon',
    keywords: ['Active', 'Fighter'],
    damageType: 'Kinetic',
    aiOnly: false,
  },
  {
    name: 'Mammoth',
    class: 4,
    rarity: 'Rare',
    keywords: ['Passive', 'Tank'],
    damageType: 'Ion',
    aiOnly: false,
  },
  {
    name: 'Bastion',
    class: 3,
    rarity: 'Uncommon',
    keywords: ['Triggered', 'Guardian Protocol'],
    aiOnly: false,
  },
  {
    name: 'AI Drone',
    class: 5,
    rarity: 'Mythic',
    keywords: ['Active', 'Special'],
    aiOnly: true,
  },
  {
    name: 'Starter Drone',
    class: 1,
    rarity: 'Common',
    keywords: ['Active'],
    isStarterPool: true,
    aiOnly: false,
  },
];

const defaultCardFilters = {
  searchText: '',
  cost: { min: 0, max: 99 },
  rarity: [],
  type: [],
  target: [],
  damageType: [],
  abilities: [],
  hideEnhanced: false,
  includeAIOnly: false,
};

const defaultDroneFilters = {
  rarity: [],
  class: [],
  abilities: [],
  damageType: [],
  includeAIOnly: false,
};

// ========================================
// CARD FILTER TESTS
// ========================================

describe('filterCards', () => {
  // ----------------------------------------
  // OR FILTERS (mutually exclusive properties)
  // ----------------------------------------
  describe('OR filters (mutually exclusive properties)', () => {
    it('should show cards matching ANY selected rarity', () => {
      const filters = { ...defaultCardFilters, rarity: ['Common', 'Rare'] };
      const result = filterCards(mockCards, filters);

      expect(result.some(c => c.rarity === 'Common')).toBe(true);
      expect(result.some(c => c.rarity === 'Rare')).toBe(true);
      expect(result.some(c => c.rarity === 'Uncommon')).toBe(false);
      expect(result.some(c => c.rarity === 'Mythic')).toBe(false);
    });

    it('should show all cards when no rarity selected', () => {
      const filters = { ...defaultCardFilters, rarity: [] };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });

    it('should show cards matching ANY selected type', () => {
      const filters = { ...defaultCardFilters, type: ['Ordnance', 'Tactic'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.type === 'Ordnance' || c.type === 'Tactic')).toBe(true);
    });

    it('should show cards matching ANY selected target', () => {
      const filters = { ...defaultCardFilters, target: ['Drone (Any)', 'N/A'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.targetingText === 'Drone (Any)' || c.targetingText === 'N/A')).toBe(true);
    });

    it('should show cards matching ANY selected damage type', () => {
      const filters = { ...defaultCardFilters, damageType: ['Ion', 'Kinetic'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.damageType === 'Ion' || c.damageType === 'Kinetic' || !c.damageType)).toBe(true);
    });
  });

  // ----------------------------------------
  // AND FILTERS (abilities)
  // ----------------------------------------
  describe('AND filters (abilities)', () => {
    it('should show cards having ALL selected abilities', () => {
      const filters = { ...defaultCardFilters, abilities: ['Draw', 'Go Again'] };
      const result = filterCards(mockCards, filters);

      // Only CARD005 has both Draw AND Go Again
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('CARD005');
    });

    it('should show all cards when no abilities selected', () => {
      const filters = { ...defaultCardFilters, abilities: [] };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });

    it('should show cards with single ability when one selected', () => {
      const filters = { ...defaultCardFilters, abilities: ['Draw'] };
      const result = filterCards(mockCards, filters);

      // CARD004 and CARD005 have Draw
      expect(result.length).toBe(2);
      expect(result.some(c => c.id === 'CARD004')).toBe(true);
      expect(result.some(c => c.id === 'CARD005')).toBe(true);
    });
  });

  // ----------------------------------------
  // SPECIAL FILTERS
  // ----------------------------------------
  describe('Special filters', () => {
    it('should filter cards by cost range', () => {
      const filters = { ...defaultCardFilters, cost: { min: 2, max: 3 } };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.cost >= 2 && c.cost <= 3)).toBe(true);
    });

    it('should filter cards by text search (name)', () => {
      const filters = { ...defaultCardFilters, searchText: 'laser' };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.name.toLowerCase().includes('laser'))).toBe(true);
    });

    it('should filter cards by text search (case-insensitive)', () => {
      const filters = { ...defaultCardFilters, searchText: 'LASER' };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.name.toLowerCase().includes('laser'))).toBe(true);
    });

    it('should hide enhanced cards when hideEnhanced is true', () => {
      const filters = { ...defaultCardFilters, hideEnhanced: true };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => !c.id.endsWith('_ENHANCED'))).toBe(true);
    });

    it('should show enhanced cards when hideEnhanced is false', () => {
      const filters = { ...defaultCardFilters, hideEnhanced: false };
      const result = filterCards(mockCards, filters);

      expect(result.some(c => c.id.endsWith('_ENHANCED'))).toBe(true);
    });

    it('should hide AI-only cards by default', () => {
      const filters = { ...defaultCardFilters, includeAIOnly: false };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => !c.aiOnly)).toBe(true);
    });

    it('should include AI-only cards when includeAIOnly is true', () => {
      const filters = { ...defaultCardFilters, includeAIOnly: true };
      const result = filterCards(mockCards, filters);

      expect(result.some(c => c.aiOnly)).toBe(true);
    });
  });

  // ----------------------------------------
  // EXTRACTION MODE (Starter)
  // ----------------------------------------
  describe('Extraction mode (Starter)', () => {
    it('should filter by Starter rarity (isStarterPool)', () => {
      const filters = { ...defaultCardFilters, rarity: ['Starter'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.isStarterPool)).toBe(true);
    });

    it('should include Starter cards when Common is selected (not in extraction mode)', () => {
      // In non-extraction mode, Starter cards have rarity 'Common'
      const filters = { ...defaultCardFilters, rarity: ['Common'] };
      const result = filterCards(mockCards, filters);

      expect(result.some(c => c.rarity === 'Common')).toBe(true);
    });
  });

  // ----------------------------------------
  // COMBINED FILTERS
  // ----------------------------------------
  describe('Combined filters', () => {
    it('should combine rarity and type filters correctly', () => {
      const filters = {
        ...defaultCardFilters,
        rarity: ['Common'],
        type: ['Ordnance'],
      };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.rarity === 'Common' && c.type === 'Ordnance')).toBe(true);
    });

    it('should combine cost and abilities filters correctly', () => {
      const filters = {
        ...defaultCardFilters,
        cost: { min: 1, max: 2 },
        abilities: ['Draw'],
      };
      const result = filterCards(mockCards, filters);

      // Only CARD004 (cost 1, has Draw)
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('CARD004');
    });
  });
});

// ========================================
// DRONE FILTER TESTS
// ========================================

describe('filterDrones', () => {
  it('should show drones matching ANY selected rarity', () => {
    const filters = { ...defaultDroneFilters, rarity: ['Common', 'Rare'] };
    const result = filterDrones(mockDrones, filters);

    expect(result.every(d => d.rarity === 'Common' || d.rarity === 'Rare')).toBe(true);
  });

  it('should show drones matching ANY selected class', () => {
    const filters = { ...defaultDroneFilters, class: [1, 2] };
    const result = filterDrones(mockDrones, filters);

    expect(result.every(d => d.class === 1 || d.class === 2)).toBe(true);
  });

  it('should show drones having ALL selected abilities (AND logic)', () => {
    const filters = { ...defaultDroneFilters, abilities: ['Active', 'Scout'] };
    const result = filterDrones(mockDrones, filters);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Dart');
  });

  it('should show drones matching ANY selected damage type', () => {
    const filters = { ...defaultDroneFilters, damageType: ['Ion'] };
    const result = filterDrones(mockDrones, filters);

    expect(result.every(d => d.damageType === 'Ion' || !d.damageType)).toBe(true);
  });

  it('should hide AI-only drones by default', () => {
    const filters = { ...defaultDroneFilters, includeAIOnly: false };
    const result = filterDrones(mockDrones, filters);

    expect(result.every(d => !d.aiOnly)).toBe(true);
  });

  it('should include AI-only drones when includeAIOnly is true', () => {
    const filters = { ...defaultDroneFilters, includeAIOnly: true };
    const result = filterDrones(mockDrones, filters);

    expect(result.some(d => d.aiOnly)).toBe(true);
  });

  it('should filter by Starter rarity (isStarterPool)', () => {
    const filters = { ...defaultDroneFilters, rarity: ['Starter'] };
    const result = filterDrones(mockDrones, filters);

    expect(result.every(d => d.isStarterPool)).toBe(true);
  });
});

// ========================================
// RARITY SORTING TESTS
// ========================================

describe('sortByRarity', () => {
  it('should sort by rarity: Common < Uncommon < Rare < Mythic', () => {
    const cards = [
      { id: '1', rarity: 'Mythic' },
      { id: '2', rarity: 'Common' },
      { id: '3', rarity: 'Rare' },
      { id: '4', rarity: 'Uncommon' },
    ];

    const result = sortByRarity(cards, false);

    expect(result[0].rarity).toBe('Common');
    expect(result[1].rarity).toBe('Uncommon');
    expect(result[2].rarity).toBe('Rare');
    expect(result[3].rarity).toBe('Mythic');
  });

  describe('Extraction mode sorting', () => {
    it('should place Starter cards first when sorting by rarity', () => {
      const cards = [
        { id: '1', rarity: 'Common' },
        { id: '2', rarity: 'Common', isStarterPool: true },
        { id: '3', rarity: 'Rare' },
        { id: '4', rarity: 'Common', isStarterPool: true },
      ];

      const result = sortByRarity(cards, true); // extraction mode

      expect(result[0].isStarterPool).toBe(true);
      expect(result[1].isStarterPool).toBe(true);
      expect(result[2].isStarterPool).toBeFalsy();
    });

    it('should maintain Starter < Common < Uncommon < Rare < Mythic order', () => {
      const cards = [
        { id: '1', rarity: 'Mythic' },
        { id: '2', rarity: 'Common', isStarterPool: true },
        { id: '3', rarity: 'Uncommon' },
        { id: '4', rarity: 'Common' },
      ];

      const result = sortByRarity(cards, true);

      // Starter first, then Common, then Uncommon, then Mythic
      expect(result[0].isStarterPool).toBe(true);
      expect(result[1].rarity).toBe('Common');
      expect(result[1].isStarterPool).toBeFalsy();
    });
  });
});

// ========================================
// ACTIVE FILTER COUNT TESTS
// ========================================

describe('countActiveFilters', () => {
  it('should return 0 when no filters active', () => {
    const count = countActiveFilters(defaultCardFilters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(0);
  });

  it('should count each rarity selection separately', () => {
    const filters = { ...defaultCardFilters, rarity: ['Common', 'Rare'] };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(2);
  });

  it('should count cost filter as 1 when modified', () => {
    const filters = { ...defaultCardFilters, cost: { min: 2, max: 5 } };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(1);
  });

  it('should count search as 1 when non-empty', () => {
    const filters = { ...defaultCardFilters, searchText: 'laser' };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(1);
  });

  it('should count hideEnhanced as 1 when true', () => {
    const filters = { ...defaultCardFilters, hideEnhanced: true };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(1);
  });

  it('should count includeAIOnly as 1 when true', () => {
    const filters = { ...defaultCardFilters, includeAIOnly: true };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(1);
  });

  it('should count all active filters correctly', () => {
    const filters = {
      ...defaultCardFilters,
      searchText: 'test',
      cost: { min: 2, max: 5 },
      rarity: ['Common', 'Rare'],
      type: ['Ordnance'],
      abilities: ['Draw', 'Go Again'],
      hideEnhanced: true,
    };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    // search(1) + cost(1) + rarity(2) + type(1) + abilities(2) + hideEnhanced(1) = 8
    expect(count).toBe(8);
  });
});

// ========================================
// FILTER CHIPS GENERATION TESTS
// ========================================

describe('generateFilterChips', () => {
  it('should generate chip for each selected rarity', () => {
    const filters = { ...defaultCardFilters, rarity: ['Common', 'Rare'] };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'Common')).toBe(true);
    expect(chips.some(c => c.label === 'Rare')).toBe(true);
  });

  it('should generate chip for each selected type with prefix', () => {
    const filters = { ...defaultCardFilters, type: ['Ordnance'] };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'Type: Ordnance')).toBe(true);
  });

  it('should generate chip for each selected ability', () => {
    const filters = { ...defaultCardFilters, abilities: ['Draw', 'Go Again'] };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'Draw')).toBe(true);
    expect(chips.some(c => c.label === 'Go Again')).toBe(true);
  });

  it('should generate cost chip when range differs from default', () => {
    const filters = { ...defaultCardFilters, cost: { min: 2, max: 5 } };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'Cost: 2-5')).toBe(true);
  });

  it('should NOT generate cost chip when range is default', () => {
    const filters = { ...defaultCardFilters, cost: { min: 0, max: 99 } };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label.startsWith('Cost:'))).toBe(false);
  });

  it('should generate search chip with quoted text', () => {
    const filters = { ...defaultCardFilters, searchText: 'laser' };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === '"laser"')).toBe(true);
  });

  it('should generate "No Enhanced" chip when hideEnhanced is true', () => {
    const filters = { ...defaultCardFilters, hideEnhanced: true };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'No Enhanced')).toBe(true);
  });

  it('should generate "+AI Cards" chip when includeAIOnly is true', () => {
    const filters = { ...defaultCardFilters, includeAIOnly: true };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === '+AI Cards')).toBe(true);
  });

  it('should include filterType and filterValue for chip removal', () => {
    const filters = { ...defaultCardFilters, rarity: ['Common'] };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    const rarityChip = chips.find(c => c.label === 'Common');
    expect(rarityChip.filterType).toBe('rarity');
    expect(rarityChip.filterValue).toBe('Common');
  });
});

// ========================================
// RARITY ORDER CONSTANTS TESTS
// ========================================

describe('Rarity order constants', () => {
  it('should have correct standard order', () => {
    expect(RARITY_ORDER).toEqual(['Common', 'Uncommon', 'Rare', 'Mythic']);
  });

  it('should have Starter first in extraction order', () => {
    expect(RARITY_ORDER_EXTRACTION[0]).toBe('Starter');
    expect(RARITY_ORDER_EXTRACTION).toEqual(['Starter', 'Common', 'Uncommon', 'Rare', 'Mythic']);
  });
});
