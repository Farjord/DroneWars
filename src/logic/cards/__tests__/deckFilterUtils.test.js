/**
 * deckFilterUtils.test.js
 * TDD tests for deck builder filter utility functions
 *
 * Tests the filter logic used in DeckBuilder for:
 * - Card filtering (OR/AND logic, searchKeywords, faction, inDeck)
 * - Drone filtering (searchKeywords, faction, inSquad)
 * - Rarity sorting with Starter support
 * - Active filter counting
 * - Enhancer filter utils
 */

import { describe, it, expect } from 'vitest';
import {
  filterCards,
  filterDrones,
  sortByRarity,
  countActiveFilters,
  countActiveDroneFilters,
  generateFilterChips,
  generateDroneFilterChips,
  createDefaultCardFilters,
  createDefaultDroneFilters,
  filterEnhancerItems,
  generateEnhancerFilterChips,
  countActiveEnhancerFilters,
  createDefaultEnhancerFilters,
  RARITY_ORDER,
  RARITY_ORDER_EXTRACTION,
} from '../deckFilterUtils.js';

// ========================================
// MOCK DATA
// ========================================

const mockCards = [
  {
    id: 'CONVERGENCE_BEAM',
    baseCardId: 'CONVERGENCE_BEAM',
    name: 'Laser Blast',
    description: 'Fires a focused beam of energy',
    type: 'Ordnance',
    rarity: 'Common',
    cost: 2,
    targetingText: 'Drone (Any)',
    keywords: ['Damage'],
    damageType: 'Kinetic',
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
  {
    id: 'SYSTEM_REBOOT',
    baseCardId: 'SYSTEM_REBOOT',
    name: 'Plasma Bolt',
    description: 'Launches a plasma projectile',
    type: 'Ordnance',
    rarity: 'Rare',
    cost: 4,
    targetingText: 'Drone (Enemy)',
    keywords: ['Damage', 'Go Again'],
    damageType: 'Ion',
    faction: 'MARK',
    aiOnly: false,
  },
  {
    id: 'OUT_THINK',
    baseCardId: 'OUT_THINK',
    name: 'Shield Boost',
    description: 'Reinforces shields temporarily',
    type: 'Tactic',
    rarity: 'Uncommon',
    cost: 3,
    targetingText: 'Drone (Friendly)',
    keywords: ['Shield Buff'],
    faction: 'MOVEMENT',
    aiOnly: false,
  },
  {
    id: 'ENERGY_SURGE',
    baseCardId: 'ENERGY_SURGE',
    name: 'Draw Power',
    description: 'Channels energy to draw cards',
    type: 'Support',
    rarity: 'Common',
    cost: 1,
    targetingText: 'N/A',
    keywords: ['Draw'],
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
  {
    id: 'REACTIVATION_PROTOCOL',
    baseCardId: 'REACTIVATION_PROTOCOL',
    name: 'Multi Draw',
    description: 'Draws multiple cards at once',
    type: 'Support',
    rarity: 'Mythic',
    cost: 5,
    targetingText: 'N/A',
    keywords: ['Draw', 'Go Again'],
    faction: 'MARK',
    aiOnly: false,
  },
  {
    id: 'CARD006_ENHANCED',
    baseCardId: 'CARD006',
    name: 'Laser Blast Enhanced',
    description: 'Enhanced energy beam',
    type: 'Ordnance',
    rarity: 'Common',
    cost: 2,
    targetingText: 'Drone (Any)',
    keywords: ['Damage'],
    damageType: 'Kinetic',
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
  {
    id: 'EMERGENCY_PATCH',
    baseCardId: 'EMERGENCY_PATCH',
    name: 'AI Exclusive Card',
    description: 'AI only tactical maneuver',
    type: 'Ordnance',
    rarity: 'Rare',
    cost: 3,
    targetingText: 'Drone (Enemy)',
    keywords: ['Damage'],
    damageType: 'Shield Breaker',
    faction: 'MOVEMENT',
    aiOnly: true,
  },
  {
    id: 'SHIELD_RECHARGE',
    baseCardId: 'SHIELD_RECHARGE',
    name: 'Starter Card',
    description: 'Basic starter ability',
    type: 'Ordnance',
    rarity: 'Common',
    cost: 2,
    targetingText: 'Drone (Any)',
    keywords: ['Damage'],
    isStarterPool: true,
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
];

const mockDrones = [
  {
    name: 'Dart',
    class: 1,
    rarity: 'Common',
    keywords: ['Active', 'Scout'],
    description: 'A fast reconnaissance drone.',
    faction: 'MOVEMENT',
    aiOnly: false,
  },
  {
    name: 'Talon',
    class: 2,
    rarity: 'Uncommon',
    keywords: ['Active', 'Fighter'],
    damageType: 'Kinetic',
    description: 'Standard combat fighter.',
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
  {
    name: 'Mammoth',
    class: 4,
    rarity: 'Rare',
    keywords: ['Passive', 'Tank'],
    damageType: 'Ion',
    description: 'Heavy armored assault platform.',
    faction: 'MARK',
    aiOnly: false,
  },
  {
    name: 'Bastion',
    class: 3,
    rarity: 'Uncommon',
    keywords: ['Triggered', 'Guardian Protocol'],
    description: 'Defensive guardian drone.',
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
  {
    name: 'AI Drone',
    class: 5,
    rarity: 'Mythic',
    keywords: ['Active', 'Special'],
    faction: 'NEUTRAL_1',
    aiOnly: true,
  },
  {
    name: 'Starter Drone',
    class: 1,
    rarity: 'Common',
    keywords: ['Active'],
    isStarterPool: true,
    faction: 'NEUTRAL_1',
    aiOnly: false,
  },
];

const defaultCardFilters = {
  searchKeywords: [],
  cost: { min: 0, max: 99 },
  rarity: [],
  type: [],
  target: [],
  damageType: [],
  abilities: [],
  faction: [],
  inDeck: null,
  hideEnhanced: false,
  includeAIOnly: false,
};

const defaultDroneFilters = {
  searchKeywords: [],
  rarity: [],
  class: [],
  abilities: [],
  damageType: [],
  faction: [],
  inSquad: null,
  includeAIOnly: false,
};

const mockDeck = {
  'CONVERGENCE_BEAM': 2,
  'SYSTEM_REBOOT': 1,
};

const mockSelectedDrones = {
  'Dart': 1,
  'Talon': 1,
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

      // Only REACTIVATION_PROTOCOL has both Draw AND Go Again
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('REACTIVATION_PROTOCOL');
    });

    it('should show all cards when no abilities selected', () => {
      const filters = { ...defaultCardFilters, abilities: [] };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });

    it('should show cards with single ability when one selected', () => {
      const filters = { ...defaultCardFilters, abilities: ['Draw'] };
      const result = filterCards(mockCards, filters);

      // ENERGY_SURGE and REACTIVATION_PROTOCOL have Draw
      expect(result.length).toBe(2);
      expect(result.some(c => c.id === 'ENERGY_SURGE')).toBe(true);
      expect(result.some(c => c.id === 'REACTIVATION_PROTOCOL')).toBe(true);
    });
  });

  // ----------------------------------------
  // SEARCH KEYWORDS
  // ----------------------------------------
  describe('Search keywords', () => {
    it('should filter by single keyword in name', () => {
      const filters = { ...defaultCardFilters, searchKeywords: ['laser'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.name.toLowerCase().includes('laser'))).toBe(true);
      expect(result.length).toBe(2); // Laser Blast + Laser Blast Enhanced
    });

    it('should be case-insensitive', () => {
      const filters = { ...defaultCardFilters, searchKeywords: ['LASER'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.name.toLowerCase().includes('laser'))).toBe(true);
    });

    it('should match description', () => {
      const filters = { ...defaultCardFilters, searchKeywords: ['focused'] };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('CONVERGENCE_BEAM');
    });

    it('should require ALL keywords to match (AND logic)', () => {
      const filters = { ...defaultCardFilters, searchKeywords: ['laser', 'enhanced'] };
      const result = filterCards(mockCards, filters);

      // Only 'Laser Blast Enhanced' has both 'laser' and 'enhanced' in name
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('CARD006_ENHANCED');
    });

    it('should return all cards with empty searchKeywords', () => {
      const filters = { ...defaultCardFilters, searchKeywords: [] };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });
  });

  // ----------------------------------------
  // FACTION FILTER
  // ----------------------------------------
  describe('Faction filter', () => {
    it('should filter by single faction', () => {
      const filters = { ...defaultCardFilters, faction: ['MARK'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.faction === 'MARK')).toBe(true);
      expect(result.length).toBe(2); // SYSTEM_REBOOT + REACTIVATION_PROTOCOL
    });

    it('should use OR logic for multiple factions', () => {
      const filters = { ...defaultCardFilters, faction: ['MARK', 'MOVEMENT'] };
      const result = filterCards(mockCards, filters);

      expect(result.every(c => c.faction === 'MARK' || c.faction === 'MOVEMENT')).toBe(true);
    });

    it('should return all cards with empty faction filter', () => {
      const filters = { ...defaultCardFilters, faction: [] };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });
  });

  // ----------------------------------------
  // IN DECK FILTER
  // ----------------------------------------
  describe('In Deck filter', () => {
    it('should show only cards in deck when inDeck is yes', () => {
      const filters = { ...defaultCardFilters, inDeck: 'yes' };
      const result = filterCards(mockCards, filters, mockDeck);

      expect(result.length).toBe(2);
      expect(result.some(c => c.id === 'CONVERGENCE_BEAM')).toBe(true);
      expect(result.some(c => c.id === 'SYSTEM_REBOOT')).toBe(true);
    });

    it('should show only cards not in deck when inDeck is no', () => {
      const filters = { ...defaultCardFilters, inDeck: 'no' };
      const result = filterCards(mockCards, filters, mockDeck);

      expect(result.every(c => c.id !== 'CONVERGENCE_BEAM' && c.id !== 'SYSTEM_REBOOT')).toBe(true);
    });

    it('should show all cards when inDeck is null', () => {
      const filters = { ...defaultCardFilters, inDeck: null };
      const result = filterCards(mockCards, filters, mockDeck);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });

    it('should work without deck parameter', () => {
      const filters = { ...defaultCardFilters, inDeck: null };
      const result = filterCards(mockCards, filters);

      expect(result.length).toBe(mockCards.filter(c => !c.aiOnly).length);
    });

    it('should show base card as in-deck when enhanced variant is in deck', () => {
      // CARD006_ENHANCED has baseCardId 'CARD006', so the base card
      // with baseCardId 'CARD006' should show as in-deck if deck has CARD006_ENHANCED
      const deckWithEnhanced = { 'CARD006_ENHANCED': 1 };
      const filters = { ...defaultCardFilters, inDeck: 'yes' };
      const result = filterCards(mockCards, filters, deckWithEnhanced);

      // CARD006_ENHANCED itself is in deck (deck[card.id] > 0)
      expect(result.some(c => c.id === 'CARD006_ENHANCED')).toBe(true);
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

      // Only ENERGY_SURGE (cost 1, has Draw)
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ENERGY_SURGE');
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

  // ----------------------------------------
  // SEARCH KEYWORDS
  // ----------------------------------------
  describe('Search keywords', () => {
    it('should filter by keyword in name', () => {
      const filters = { ...defaultDroneFilters, searchKeywords: ['dart'] };
      const result = filterDrones(mockDrones, filters);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Dart');
    });

    it('should be case-insensitive', () => {
      const filters = { ...defaultDroneFilters, searchKeywords: ['DART'] };
      const result = filterDrones(mockDrones, filters);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Dart');
    });

    it('should match description', () => {
      const filters = { ...defaultDroneFilters, searchKeywords: ['reconnaissance'] };
      const result = filterDrones(mockDrones, filters);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Dart');
    });

    it('should require ALL keywords (AND logic)', () => {
      const filters = { ...defaultDroneFilters, searchKeywords: ['combat', 'fighter'] };
      const result = filterDrones(mockDrones, filters);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Talon');
    });

    it('should return all drones with empty searchKeywords', () => {
      const filters = { ...defaultDroneFilters, searchKeywords: [] };
      const result = filterDrones(mockDrones, filters);

      // Should return all non-AI drones (5 out of 6)
      expect(result.length).toBe(5);
    });
  });

  // ----------------------------------------
  // FACTION FILTER
  // ----------------------------------------
  describe('Faction filter', () => {
    it('should filter by single faction', () => {
      const filters = { ...defaultDroneFilters, faction: ['MOVEMENT'] };
      const result = filterDrones(mockDrones, filters);

      expect(result.every(d => d.faction === 'MOVEMENT')).toBe(true);
      expect(result.length).toBe(1); // Dart
    });

    it('should use OR logic for multiple factions', () => {
      const filters = { ...defaultDroneFilters, faction: ['MOVEMENT', 'MARK'] };
      const result = filterDrones(mockDrones, filters);

      expect(result.every(d => d.faction === 'MOVEMENT' || d.faction === 'MARK')).toBe(true);
    });

    it('should return all drones with empty faction filter', () => {
      const filters = { ...defaultDroneFilters, faction: [] };
      const result = filterDrones(mockDrones, filters);

      expect(result.length).toBe(5); // excludes AI drone
    });
  });

  // ----------------------------------------
  // IN SQUAD FILTER
  // ----------------------------------------
  describe('In Squad filter', () => {
    it('should show only drones in squad when inSquad is yes', () => {
      const filters = { ...defaultDroneFilters, inSquad: 'yes' };
      const result = filterDrones(mockDrones, filters, mockSelectedDrones);

      expect(result.length).toBe(2);
      expect(result.some(d => d.name === 'Dart')).toBe(true);
      expect(result.some(d => d.name === 'Talon')).toBe(true);
    });

    it('should show only drones not in squad when inSquad is no', () => {
      const filters = { ...defaultDroneFilters, inSquad: 'no' };
      const result = filterDrones(mockDrones, filters, mockSelectedDrones);

      expect(result.every(d => d.name !== 'Dart' && d.name !== 'Talon')).toBe(true);
    });

    it('should show all drones when inSquad is null', () => {
      const filters = { ...defaultDroneFilters, inSquad: null };
      const result = filterDrones(mockDrones, filters, mockSelectedDrones);

      expect(result.length).toBe(5); // excludes AI drone
    });
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

  it('should count each searchKeyword', () => {
    const filters = { ...defaultCardFilters, searchKeywords: ['laser', 'blast'] };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(2);
  });

  it('should count each faction selection', () => {
    const filters = { ...defaultCardFilters, faction: ['MARK', 'MOVEMENT'] };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    expect(count).toBe(2);
  });

  it('should count inDeck as 1 when non-null', () => {
    const filters = { ...defaultCardFilters, inDeck: 'yes' };
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
      searchKeywords: ['test'],
      cost: { min: 2, max: 5 },
      rarity: ['Common', 'Rare'],
      type: ['Ordnance'],
      abilities: ['Draw', 'Go Again'],
      faction: ['MARK'],
      inDeck: 'yes',
      hideEnhanced: true,
    };
    const count = countActiveFilters(filters, { minCost: 0, maxCost: 99 });
    // keywords(1) + cost(1) + rarity(2) + type(1) + abilities(2) + faction(1) + inDeck(1) + hideEnhanced(1) = 10
    expect(count).toBe(10);
  });
});

// ========================================
// FILTER CHIPS GENERATION TESTS
// ========================================

describe('generateFilterChips', () => {
  it('should generate chip for each keyword', () => {
    const filters = { ...defaultCardFilters, searchKeywords: ['laser', 'blast'] };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === '"laser"' && c.filterType === 'searchKeywords' && c.filterValue === 'laser')).toBe(true);
    expect(chips.some(c => c.label === '"blast"' && c.filterType === 'searchKeywords' && c.filterValue === 'blast')).toBe(true);
  });

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

  it('should generate faction chip with display name', () => {
    const filters = { ...defaultCardFilters, faction: ['MARK'] };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    const factionChip = chips.find(c => c.filterType === 'faction');
    expect(factionChip).toBeDefined();
    expect(factionChip.label).toBe('Targeting Array');
    expect(factionChip.filterValue).toBe('MARK');
  });

  it('should generate inDeck chip when set to yes', () => {
    const filters = { ...defaultCardFilters, inDeck: 'yes' };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'In Deck' && c.filterType === 'inDeck')).toBe(true);
  });

  it('should generate inDeck chip when set to no', () => {
    const filters = { ...defaultCardFilters, inDeck: 'no' };
    const chips = generateFilterChips(filters, { minCost: 0, maxCost: 99 });

    expect(chips.some(c => c.label === 'Not In Deck' && c.filterType === 'inDeck')).toBe(true);
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

// ========================================
// DRONE FILTER COUNTING TESTS
// ========================================

describe('countActiveDroneFilters', () => {
  it('should return 0 when no filters active', () => {
    const count = countActiveDroneFilters(defaultDroneFilters);
    expect(count).toBe(0);
  });

  it('should count each searchKeyword', () => {
    const filters = { ...defaultDroneFilters, searchKeywords: ['dart'] };
    const count = countActiveDroneFilters(filters);
    expect(count).toBe(1);
  });

  it('should count each rarity selection separately', () => {
    const filters = { ...defaultDroneFilters, rarity: ['Common', 'Rare'] };
    const count = countActiveDroneFilters(filters);
    expect(count).toBe(2);
  });

  it('should count faction selections', () => {
    const filters = { ...defaultDroneFilters, faction: ['MOVEMENT'] };
    const count = countActiveDroneFilters(filters);
    expect(count).toBe(1);
  });

  it('should count inSquad as 1 when non-null', () => {
    const filters = { ...defaultDroneFilters, inSquad: 'yes' };
    const count = countActiveDroneFilters(filters);
    expect(count).toBe(1);
  });

  it('should count all active filters correctly', () => {
    const filters = {
      ...defaultDroneFilters,
      searchKeywords: ['test'],
      rarity: ['Common'],
      class: [1, 2],
      abilities: ['Active'],
      faction: ['MOVEMENT'],
      inSquad: 'yes',
      includeAIOnly: true,
    };
    const count = countActiveDroneFilters(filters);
    // keywords(1) + rarity(1) + class(2) + abilities(1) + faction(1) + inSquad(1) + includeAIOnly(1) = 8
    expect(count).toBe(8);
  });
});

// ========================================
// DRONE FILTER CHIPS GENERATION TESTS
// ========================================

describe('generateDroneFilterChips', () => {
  it('should generate chip for each keyword', () => {
    const filters = { ...defaultDroneFilters, searchKeywords: ['dart'] };
    const chips = generateDroneFilterChips(filters);

    expect(chips.some(c => c.label === '"dart"' && c.filterType === 'searchKeywords')).toBe(true);
  });

  it('should generate chip for each selected rarity', () => {
    const filters = { ...defaultDroneFilters, rarity: ['Common', 'Rare'] };
    const chips = generateDroneFilterChips(filters);

    expect(chips.some(c => c.label === 'Common')).toBe(true);
    expect(chips.some(c => c.label === 'Rare')).toBe(true);
  });

  it('should generate chip for each selected class', () => {
    const filters = { ...defaultDroneFilters, class: [1, 3] };
    const chips = generateDroneFilterChips(filters);

    expect(chips.some(c => c.label === 'Class 1')).toBe(true);
    expect(chips.some(c => c.label === 'Class 3')).toBe(true);
  });

  it('should generate faction chip with display name', () => {
    const filters = { ...defaultDroneFilters, faction: ['MOVEMENT'] };
    const chips = generateDroneFilterChips(filters);

    const factionChip = chips.find(c => c.filterType === 'faction');
    expect(factionChip).toBeDefined();
    expect(factionChip.label).toBe('Drift Syndicate');
    expect(factionChip.filterValue).toBe('MOVEMENT');
  });

  it('should generate inSquad chip when set', () => {
    const filters = { ...defaultDroneFilters, inSquad: 'yes' };
    const chips = generateDroneFilterChips(filters);

    expect(chips.some(c => c.label === 'In Squad' && c.filterType === 'inSquad')).toBe(true);
  });

  it('should NOT generate keyword chip when searchKeywords is empty', () => {
    const filters = { ...defaultDroneFilters, searchKeywords: [] };
    const chips = generateDroneFilterChips(filters);

    expect(chips.some(c => c.filterType === 'searchKeywords')).toBe(false);
  });
});

// ========================================
// ENHANCER UTILS TESTS
// ========================================

describe('Enhancer utils', () => {
  const mockEnhancerItems = [
    { card: { id: 'C1', name: 'Laser Blast', rarity: 'Common', faction: 'NEUTRAL_1', description: 'A basic attack' }, quantity: 5 },
    { card: { id: 'C2', name: 'Plasma Bolt', rarity: 'Rare', faction: 'MARK', description: 'Powerful shot' }, quantity: 2 },
    { card: { id: 'C3', name: 'Shield Wall', rarity: 'Uncommon', faction: 'MOVEMENT', description: 'Defensive barrier' }, quantity: 8 },
  ];

  const defaultEnhancerFilters = {
    searchKeywords: [],
    rarity: [],
    faction: [],
    copiesLessThan: null,
  };

  describe('filterEnhancerItems', () => {
    it('should return all items with default filters', () => {
      const result = filterEnhancerItems(mockEnhancerItems, defaultEnhancerFilters);
      expect(result.length).toBe(3);
    });

    it('should filter by keyword in card name', () => {
      const filters = { ...defaultEnhancerFilters, searchKeywords: ['laser'] };
      const result = filterEnhancerItems(mockEnhancerItems, filters);
      expect(result.length).toBe(1);
      expect(result[0].card.name).toBe('Laser Blast');
    });

    it('should filter by rarity', () => {
      const filters = { ...defaultEnhancerFilters, rarity: ['Rare'] };
      const result = filterEnhancerItems(mockEnhancerItems, filters);
      expect(result.length).toBe(1);
      expect(result[0].card.rarity).toBe('Rare');
    });

    it('should filter by faction', () => {
      const filters = { ...defaultEnhancerFilters, faction: ['MARK'] };
      const result = filterEnhancerItems(mockEnhancerItems, filters);
      expect(result.length).toBe(1);
      expect(result[0].card.faction).toBe('MARK');
    });

    it('should filter by copiesLessThan', () => {
      const filters = { ...defaultEnhancerFilters, copiesLessThan: 5 };
      const result = filterEnhancerItems(mockEnhancerItems, filters);
      expect(result.every(item => item.quantity < 5)).toBe(true);
      expect(result.length).toBe(1); // Only Plasma Bolt (qty 2)
    });

    it('should combine filters', () => {
      const filters = { ...defaultEnhancerFilters, rarity: ['Common', 'Uncommon'], copiesLessThan: 6 };
      const result = filterEnhancerItems(mockEnhancerItems, filters);
      expect(result.length).toBe(1); // Laser Blast (Common, qty 5 < 6)
    });
  });

  describe('generateEnhancerFilterChips', () => {
    it('should generate keyword chips', () => {
      const filters = { ...defaultEnhancerFilters, searchKeywords: ['laser'] };
      const chips = generateEnhancerFilterChips(filters);
      expect(chips.some(c => c.label === '"laser"' && c.filterType === 'searchKeywords')).toBe(true);
    });

    it('should generate rarity chips', () => {
      const filters = { ...defaultEnhancerFilters, rarity: ['Rare'] };
      const chips = generateEnhancerFilterChips(filters);
      expect(chips.some(c => c.label === 'Rare' && c.filterType === 'rarity')).toBe(true);
    });

    it('should generate faction chip with display name', () => {
      const filters = { ...defaultEnhancerFilters, faction: ['MARK'] };
      const chips = generateEnhancerFilterChips(filters);
      expect(chips.some(c => c.label === 'Targeting Array' && c.filterType === 'faction')).toBe(true);
    });

    it('should generate copiesLessThan chip', () => {
      const filters = { ...defaultEnhancerFilters, copiesLessThan: 5 };
      const chips = generateEnhancerFilterChips(filters);
      expect(chips.some(c => c.label === '< 5 copies' && c.filterType === 'copiesLessThan')).toBe(true);
    });
  });

  describe('countActiveEnhancerFilters', () => {
    it('should return 0 with default filters', () => {
      expect(countActiveEnhancerFilters(defaultEnhancerFilters)).toBe(0);
    });

    it('should count all active filters', () => {
      const filters = {
        searchKeywords: ['test'],
        rarity: ['Common', 'Rare'],
        faction: ['MARK'],
        copiesLessThan: 5,
      };
      // keywords(1) + rarity(2) + faction(1) + copiesLessThan(1) = 5
      expect(countActiveEnhancerFilters(filters)).toBe(5);
    });
  });

  describe('createDefaultEnhancerFilters', () => {
    it('should return correct default shape', () => {
      const defaults = createDefaultEnhancerFilters();
      expect(defaults).toEqual({
        searchKeywords: [],
        rarity: [],
        faction: [],
        copiesLessThan: null,
      });
    });
  });
});

// ========================================
// DEFAULT FILTER CREATORS
// ========================================

describe('createDefaultCardFilters', () => {
  it('should include searchKeywords, faction, and inDeck', () => {
    const defaults = createDefaultCardFilters({ minCost: 0, maxCost: 10 });
    expect(defaults.searchKeywords).toEqual([]);
    expect(defaults.faction).toEqual([]);
    expect(defaults.inDeck).toBeNull();
  });
});

describe('createDefaultDroneFilters', () => {
  it('should include searchKeywords, faction, and inSquad', () => {
    const defaults = createDefaultDroneFilters();
    expect(defaults.searchKeywords).toEqual([]);
    expect(defaults.faction).toEqual([]);
    expect(defaults.inSquad).toBeNull();
  });
});
