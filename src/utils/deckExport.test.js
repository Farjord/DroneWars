import { describe, it, expect } from 'vitest';
import { generateDeckCode } from './deckExportUtils.js';

// ========================================
// DECK EXPORT TESTS
// ========================================
// Integration tests for deck export functionality
// Key requirement: Export should NEVER include entries with quantity 0

describe('generateDeckCode', () => {
  describe('cards export', () => {
    it('should export cards with quantity > 0', () => {
      const deck = { CARD001: 2, CARD002: 3 };
      const result = generateDeckCode(deck, {}, {});

      expect(result).toContain('CARD001:2');
      expect(result).toContain('CARD002:3');
    });

    it('should NOT export cards with quantity 0', () => {
      const deck = { CARD001: 2, CARD002: 0, CARD003: 1 };
      const result = generateDeckCode(deck, {}, {});

      expect(result).toContain('CARD001:2');
      expect(result).toContain('CARD003:1');
      expect(result).not.toContain('CARD002');
      expect(result).not.toContain(':0');
    });

    it('should handle deck with all cards set to 0', () => {
      const deck = { CARD001: 0, CARD002: 0 };
      const result = generateDeckCode(deck, {}, {});

      expect(result).toMatch(/^cards:\|/); // Empty cards section
      expect(result).not.toContain('CARD001');
      expect(result).not.toContain('CARD002');
    });

    it('should handle empty deck', () => {
      const deck = {};
      const result = generateDeckCode(deck, {}, {});

      expect(result).toMatch(/^cards:\|/);
    });
  });

  describe('drones export', () => {
    it('should export drones with quantity > 0', () => {
      const drones = { 'Dart': 1, 'Mammoth': 1 };
      const result = generateDeckCode({}, drones, {});

      expect(result).toContain('Dart:1');
      expect(result).toContain('Mammoth:1');
    });

    it('should NOT export drones with quantity 0', () => {
      const drones = { 'Dart': 1, 'Removed Drone': 0 };
      const result = generateDeckCode({}, drones, {});

      expect(result).toContain('Dart:1');
      expect(result).not.toContain('Removed Drone');
      expect(result).not.toMatch(/Removed Drone:0/);
    });
  });

  describe('ship components export', () => {
    it('should export components with lane assignments', () => {
      const components = { 'COMP_001': 'l', 'COMP_002': 'm' };
      const result = generateDeckCode({}, {}, components);

      expect(result).toContain('COMP_001:l');
      expect(result).toContain('COMP_002:m');
    });

    it('should NOT export components with null lane', () => {
      const components = { 'COMP_001': 'l', 'COMP_002': null };
      const result = generateDeckCode({}, {}, components);

      expect(result).toContain('COMP_001:l');
      expect(result).not.toContain('COMP_002');
    });
  });

  describe('full workflow: add then remove cards', () => {
    it('should not include removed cards in export after setting to 0', () => {
      // Simulate a deck where user added cards then removed some
      const deck = {
        'CARD001': 4,  // User added 4
        'CARD002': 0,  // User added then removed (set to 0)
        'CARD003': 2,  // User added 2
        'CARD004': 0,  // User added then removed (set to 0)
      };
      const drones = {
        'Dart': 1,
        'Removed Drone': 0,  // User added then removed
      };

      const result = generateDeckCode(deck, drones, {});

      // Should contain kept items
      expect(result).toContain('CARD001:4');
      expect(result).toContain('CARD003:2');
      expect(result).toContain('Dart:1');

      // Should NOT contain removed items
      expect(result).not.toContain('CARD002');
      expect(result).not.toContain('CARD004');
      expect(result).not.toContain('Removed Drone');
      expect(result).not.toContain(':0');
    });
  });
});
