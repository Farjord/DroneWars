import { describe, it, expect } from 'vitest';
import {
  generateDeckCode,
  parseJSObjectLiteral,
  generateJSObjectLiteral,
  convertToAIFormat,
  convertFromAIFormat
} from './deckExportUtils.js';

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

// ========================================
// JS OBJECT LITERAL PARSING TESTS
// ========================================
// Tests for parsing JavaScript object literals (aiData.js format)

describe('parseJSObjectLiteral', () => {
  describe('basic parsing', () => {
    it('should parse basic JS object with single quotes', () => {
      const input = "{ name: 'Test', value: 123 }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test');
      expect(result.data.value).toBe(123);
    });

    it('should parse object with double quotes', () => {
      const input = '{ name: "Test", value: 123 }';
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test');
    });

    it('should parse nested objects', () => {
      const input = "{ outer: { inner: 'value' } }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.outer.inner).toBe('value');
    });

    it('should parse arrays', () => {
      const input = "{ items: ['a', 'b', 'c'] }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.items).toEqual(['a', 'b', 'c']);
    });

    it('should parse arrays of objects', () => {
      const input = "{ items: [{ id: 'A', qty: 1 }, { id: 'B', qty: 2 }] }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].id).toBe('A');
    });
  });

  describe('trailing commas', () => {
    it('should handle trailing comma in object', () => {
      const input = "{ name: 'Test', value: 1, }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test');
    });

    it('should handle trailing comma in array', () => {
      const input = "{ items: ['a', 'b',] }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.items).toEqual(['a', 'b']);
    });

    it('should handle trailing comma in nested structures', () => {
      const input = "{ outer: { inner: 'value', }, items: ['a',], }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
    });
  });

  describe('comments', () => {
    it('should strip line comments', () => {
      const input = `{
        name: 'Test', // this is a comment
        value: 1
      }`;
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test');
      expect(result.data.value).toBe(1);
    });

    it('should strip block comments', () => {
      const input = "{ /* comment */ name: 'Test' }";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test');
    });

    it('should strip multi-line block comments', () => {
      const input = `{
        /*
         * Multi-line comment
         * with multiple lines
         */
        name: 'Test'
      }`;
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test');
    });

    it('should handle comment at end of line with no newline', () => {
      const input = "{ name: 'Test' } // trailing comment";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error for invalid syntax', () => {
      const input = "{ invalid syntax here";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for empty input', () => {
      const input = "";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(false);
    });

    it('should return error for non-object input', () => {
      const input = "just a string";
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(false);
    });
  });

  describe('aiData format parsing', () => {
    it('should parse full aiData-style object', () => {
      const input = `{
        name: 'TEST AI',
        description: 'Used for test scenarios.',
        difficulty: 'Easy',
        modes: ['vs'],
        shipId: 'SHIP_001',
        imagePath: '/DroneWars/AI/TEST.png',
        dronePool: ['Talon', 'Mammoth'],
        shipDeployment: {
          strategy: 'aggressive',
          placement: ['bridge', 'powerCell', 'droneControlHub'],
          reasoning: 'Test reasoning'
        },
        decklist: [
          { id: 'CARD001', quantity: 4 },
          { id: 'CARD002', quantity: 2 },
        ]
      }`;
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('TEST AI');
      expect(result.data.description).toBe('Used for test scenarios.');
      expect(result.data.difficulty).toBe('Easy');
      expect(result.data.modes).toEqual(['vs']);
      expect(result.data.shipId).toBe('SHIP_001');
      expect(result.data.dronePool).toHaveLength(2);
      expect(result.data.shipDeployment.strategy).toBe('aggressive');
      expect(result.data.shipDeployment.placement).toHaveLength(3);
      expect(result.data.decklist).toHaveLength(2);
      expect(result.data.decklist[0].id).toBe('CARD001');
      expect(result.data.decklist[0].quantity).toBe(4);
    });

    it('should parse aiData with inline comments', () => {
      const input = `{
        name: 'Test',
        dronePool: [
          'Dart',        // Fast drone
          'Mammoth',     // Heavy drone
        ],
        decklist: [
          { id: 'CARD001', quantity: 4 },   // Laser Blast
          { id: 'CARD002', quantity: 2 },   // System Reboot
        ]
      }`;
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.dronePool).toEqual(['Dart', 'Mammoth']);
      expect(result.data.decklist).toHaveLength(2);
    });
  });
});

// ========================================
// JS OBJECT LITERAL GENERATION TESTS
// ========================================

describe('generateJSObjectLiteral', () => {
  describe('basic formatting', () => {
    it('should output single quotes for strings', () => {
      const data = { name: 'Test' };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain("name: 'Test'");
    });

    it('should format with proper indentation', () => {
      const data = { name: 'Test', value: 123 };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain('\n');
      expect(output).toMatch(/^\{/); // Starts with {
      expect(output).toMatch(/\}$/); // Ends with }
    });

    it('should handle numbers', () => {
      const data = { count: 42, price: 19.99 };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain('count: 42');
      expect(output).toContain('price: 19.99');
    });

    it('should handle booleans', () => {
      const data = { enabled: true, disabled: false };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain('enabled: true');
      expect(output).toContain('disabled: false');
    });

    it('should handle null', () => {
      const data = { empty: null };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain('empty: null');
    });
  });

  describe('arrays', () => {
    it('should format arrays on multiple lines', () => {
      const data = { items: ['a', 'b', 'c'] };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain('\n');
      expect(output).toContain("'a'");
      expect(output).toContain("'b'");
      expect(output).toContain("'c'");
    });

    it('should format arrays of objects', () => {
      const data = { items: [{ id: 'A', qty: 1 }, { id: 'B', qty: 2 }] };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain("id: 'A'");
      expect(output).toContain('qty: 1');
    });
  });

  describe('nested objects', () => {
    it('should format nested objects properly', () => {
      const data = {
        outer: {
          inner: 'value',
          nested: { deep: 'deeper' }
        }
      };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain("inner: 'value'");
      expect(output).toContain("deep: 'deeper'");
    });
  });

  describe('round-trip with parser', () => {
    it('should be parseable by parseJSObjectLiteral', () => {
      const data = { name: 'Test', value: 123 };
      const output = generateJSObjectLiteral(data);
      const parsed = parseJSObjectLiteral(output);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual(data);
    });

    it('should round-trip complex data structures', () => {
      const data = {
        name: 'Complex Test',
        items: ['a', 'b', 'c'],
        nested: { inner: 'value' },
        numbers: [1, 2, 3],
        objects: [{ id: 'A' }, { id: 'B' }]
      };
      const output = generateJSObjectLiteral(data);
      const parsed = parseJSObjectLiteral(output);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual(data);
    });
  });
});

// ========================================
// CONVERT TO AI FORMAT TESTS
// ========================================

describe('convertToAIFormat', () => {
  describe('decklist conversion', () => {
    it('should convert deck object to decklist array', () => {
      const deck = { 'CARD001': 4, 'CARD002': 2 };
      const result = convertToAIFormat(deck, {}, {}, { id: 'SHIP_001' }, {});
      expect(result.decklist).toContainEqual({ id: 'CARD001', quantity: 4 });
      expect(result.decklist).toContainEqual({ id: 'CARD002', quantity: 2 });
    });

    it('should filter out zero-quantity cards', () => {
      const deck = { 'CARD001': 4, 'CARD002': 0 };
      const result = convertToAIFormat(deck, {}, {}, { id: 'SHIP_001' }, {});
      expect(result.decklist).toHaveLength(1);
      expect(result.decklist[0].id).toBe('CARD001');
    });

    it('should handle empty deck', () => {
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, {});
      expect(result.decklist).toEqual([]);
    });
  });

  describe('dronePool conversion', () => {
    it('should convert selectedDrones to dronePool array', () => {
      const drones = { 'Talon': 1, 'Mammoth': 1 };
      const result = convertToAIFormat({}, drones, {}, { id: 'SHIP_001' }, {});
      expect(result.dronePool).toContain('Talon');
      expect(result.dronePool).toContain('Mammoth');
    });

    it('should expand drone quantities', () => {
      const drones = { 'Talon': 2, 'Mammoth': 1 };
      const result = convertToAIFormat({}, drones, {}, { id: 'SHIP_001' }, {});
      // Should have 'Talon' twice
      expect(result.dronePool.filter(d => d === 'Talon')).toHaveLength(2);
      expect(result.dronePool.filter(d => d === 'Mammoth')).toHaveLength(1);
    });

    it('should filter out zero-quantity drones', () => {
      const drones = { 'Talon': 1, 'Removed': 0 };
      const result = convertToAIFormat({}, drones, {}, { id: 'SHIP_001' }, {});
      expect(result.dronePool).toContain('Talon');
      expect(result.dronePool).not.toContain('Removed');
    });
  });

  describe('shipDeployment conversion', () => {
    it('should convert ship components to placement array', () => {
      const components = { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' };
      const result = convertToAIFormat({}, {}, components, { id: 'SHIP_001' }, {});
      expect(result.shipDeployment).toBeDefined();
      expect(result.shipDeployment.placement).toHaveLength(3);
    });

    it('should default strategy to balanced', () => {
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, {});
      expect(result.shipDeployment.strategy).toBe('balanced');
    });
  });

  describe('preserved fields', () => {
    it('should preserve name from import', () => {
      const preserved = { name: 'My Custom Name' };
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, preserved);
      expect(result.name).toBe('My Custom Name');
    });

    it('should preserve description from import', () => {
      const preserved = { description: 'Test deck description' };
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, preserved);
      expect(result.description).toBe('Test deck description');
    });

    it('should preserve difficulty from import', () => {
      const preserved = { difficulty: 'Hard' };
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, preserved);
      expect(result.difficulty).toBe('Hard');
    });

    it('should preserve modes from import', () => {
      const preserved = { modes: ['vs', 'extraction'] };
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, preserved);
      expect(result.modes).toEqual(['vs', 'extraction']);
    });

    it('should preserve imagePath from import', () => {
      const preserved = { imagePath: '/path/to/image.png' };
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, preserved);
      expect(result.imagePath).toBe('/path/to/image.png');
    });

    it('should preserve shipDeployment strategy and reasoning', () => {
      const preserved = {
        shipDeployment: {
          strategy: 'aggressive',
          reasoning: 'Test reasoning text'
        }
      };
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, preserved);
      expect(result.shipDeployment.strategy).toBe('aggressive');
      expect(result.shipDeployment.reasoning).toBe('Test reasoning text');
    });

    it('should use default name when not preserved', () => {
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, {});
      expect(result.name).toBe('Exported Deck');
    });
  });

  describe('shipId', () => {
    it('should include shipId from selectedShip', () => {
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_002' }, {});
      expect(result.shipId).toBe('SHIP_002');
    });

    it('should handle null selectedShip', () => {
      const result = convertToAIFormat({}, {}, {}, null, {});
      expect(result.shipId).toBeDefined();
    });
  });
});

// ========================================
// CONVERT FROM AI FORMAT TESTS
// ========================================

describe('convertFromAIFormat', () => {
  describe('decklist conversion', () => {
    it('should convert decklist array to deck object', () => {
      const aiData = {
        decklist: [
          { id: 'CARD001', quantity: 4 },
          { id: 'CARD002', quantity: 2 }
        ]
      };
      const result = convertFromAIFormat(aiData);
      expect(result.deck).toEqual({ 'CARD001': 4, 'CARD002': 2 });
    });

    it('should filter out zero-quantity cards', () => {
      const aiData = {
        decklist: [
          { id: 'CARD001', quantity: 4 },
          { id: 'CARD002', quantity: 0 }
        ]
      };
      const result = convertFromAIFormat(aiData);
      expect(result.deck).toEqual({ 'CARD001': 4 });
    });

    it('should handle empty decklist', () => {
      const aiData = { decklist: [] };
      const result = convertFromAIFormat(aiData);
      expect(result.deck).toEqual({});
    });

    it('should handle missing decklist', () => {
      const aiData = {};
      const result = convertFromAIFormat(aiData);
      expect(result.deck).toEqual({});
    });
  });

  describe('dronePool conversion', () => {
    it('should aggregate dronePool into quantities', () => {
      const aiData = { dronePool: ['Talon', 'Talon', 'Mammoth'] };
      const result = convertFromAIFormat(aiData);
      expect(result.selectedDrones).toEqual({ 'Talon': 2, 'Mammoth': 1 });
    });

    it('should handle single drones', () => {
      const aiData = { dronePool: ['Dart'] };
      const result = convertFromAIFormat(aiData);
      expect(result.selectedDrones).toEqual({ 'Dart': 1 });
    });

    it('should handle empty dronePool', () => {
      const aiData = { dronePool: [] };
      const result = convertFromAIFormat(aiData);
      expect(result.selectedDrones).toEqual({});
    });

    it('should handle missing dronePool', () => {
      const aiData = {};
      const result = convertFromAIFormat(aiData);
      expect(result.selectedDrones).toEqual({});
    });
  });

  describe('shipDeployment conversion', () => {
    it('should convert placement to ship components', () => {
      const aiData = {
        shipDeployment: {
          placement: ['bridge', 'powerCell', 'droneControlHub']
        }
      };
      const result = convertFromAIFormat(aiData);
      expect(Object.keys(result.selectedShipComponents)).toHaveLength(3);
    });

    it('should map placement positions to lanes correctly', () => {
      const aiData = {
        shipDeployment: {
          placement: ['bridge', 'powerCell', 'droneControlHub']
        }
      };
      const result = convertFromAIFormat(aiData);
      // Index 0 -> lane 'l', index 1 -> lane 'm', index 2 -> lane 'r'
      const lanes = Object.values(result.selectedShipComponents);
      expect(lanes).toContain('l');
      expect(lanes).toContain('m');
      expect(lanes).toContain('r');
    });

    it('should handle empty placement', () => {
      const aiData = { shipDeployment: { placement: [] } };
      const result = convertFromAIFormat(aiData);
      expect(result.selectedShipComponents).toEqual({});
    });

    it('should handle missing shipDeployment', () => {
      const aiData = {};
      const result = convertFromAIFormat(aiData);
      expect(result.selectedShipComponents).toEqual({});
    });
  });

  describe('shipId extraction', () => {
    it('should extract shipId', () => {
      const aiData = { shipId: 'SHIP_002' };
      const result = convertFromAIFormat(aiData);
      expect(result.shipId).toBe('SHIP_002');
    });

    it('should handle missing shipId', () => {
      const aiData = {};
      const result = convertFromAIFormat(aiData);
      expect(result.shipId).toBeUndefined();
    });
  });

  describe('preserved fields extraction', () => {
    it('should capture name in preservedFields', () => {
      const aiData = { name: 'My AI' };
      const result = convertFromAIFormat(aiData);
      expect(result.preservedFields.name).toBe('My AI');
    });

    it('should capture description in preservedFields', () => {
      const aiData = { description: 'A test deck' };
      const result = convertFromAIFormat(aiData);
      expect(result.preservedFields.description).toBe('A test deck');
    });

    it('should capture difficulty in preservedFields', () => {
      const aiData = { difficulty: 'Hard' };
      const result = convertFromAIFormat(aiData);
      expect(result.preservedFields.difficulty).toBe('Hard');
    });

    it('should capture modes in preservedFields', () => {
      const aiData = { modes: ['vs'] };
      const result = convertFromAIFormat(aiData);
      expect(result.preservedFields.modes).toEqual(['vs']);
    });

    it('should capture imagePath in preservedFields', () => {
      const aiData = { imagePath: '/path/to/image.png' };
      const result = convertFromAIFormat(aiData);
      expect(result.preservedFields.imagePath).toBe('/path/to/image.png');
    });

    it('should capture shipDeployment strategy and reasoning', () => {
      const aiData = {
        shipDeployment: {
          strategy: 'aggressive',
          reasoning: 'Because reasons',
          placement: []
        }
      };
      const result = convertFromAIFormat(aiData);
      expect(result.preservedFields.shipDeployment.strategy).toBe('aggressive');
      expect(result.preservedFields.shipDeployment.reasoning).toBe('Because reasons');
    });
  });
});

// ========================================
// ROUND-TRIP CONVERSION TESTS
// ========================================

describe('round-trip conversion', () => {
  it('should preserve all data through import-export cycle', () => {
    const original = {
      name: 'Test AI',
      description: 'Test description',
      difficulty: 'Hard',
      modes: ['vs'],
      shipId: 'SHIP_001',
      imagePath: '/path/to/image.png',
      dronePool: ['Talon', 'Mammoth', 'Mammoth'],
      shipDeployment: {
        strategy: 'aggressive',
        placement: ['bridge', 'powerCell', 'droneControlHub'],
        reasoning: 'Test reasoning'
      },
      decklist: [
        { id: 'CARD001', quantity: 4 },
        { id: 'CARD002', quantity: 2 }
      ]
    };

    // Import
    const { deck, selectedDrones, selectedShipComponents, shipId, preservedFields } =
      convertFromAIFormat(original);

    // Export
    const exported = convertToAIFormat(
      deck,
      selectedDrones,
      selectedShipComponents,
      { id: shipId },
      preservedFields
    );

    // Verify preserved fields
    expect(exported.name).toBe(original.name);
    expect(exported.description).toBe(original.description);
    expect(exported.difficulty).toBe(original.difficulty);
    expect(exported.modes).toEqual(original.modes);
    expect(exported.imagePath).toBe(original.imagePath);
    expect(exported.shipDeployment.strategy).toBe(original.shipDeployment.strategy);
    expect(exported.shipDeployment.reasoning).toBe(original.shipDeployment.reasoning);

    // Verify converted data
    expect(exported.shipId).toBe(original.shipId);
    expect(exported.decklist).toContainEqual({ id: 'CARD001', quantity: 4 });
    expect(exported.decklist).toContainEqual({ id: 'CARD002', quantity: 2 });
    expect(exported.dronePool).toContain('Talon');
    expect(exported.dronePool.filter(d => d === 'Mammoth')).toHaveLength(2);
  });

  it('should handle minimal data through round-trip', () => {
    const original = {
      shipId: 'SHIP_001',
      dronePool: ['Talon'],
      decklist: [{ id: 'CARD001', quantity: 1 }]
    };

    const { deck, selectedDrones, selectedShipComponents, shipId, preservedFields } =
      convertFromAIFormat(original);

    const exported = convertToAIFormat(
      deck,
      selectedDrones,
      selectedShipComponents,
      { id: shipId },
      preservedFields
    );

    expect(exported.shipId).toBe(original.shipId);
    expect(exported.dronePool).toContain('Talon');
    expect(exported.decklist).toContainEqual({ id: 'CARD001', quantity: 1 });
  });

  it('should preserve unknown top-level fields', () => {
    const original = {
      name: 'Test',
      customField: 'custom value',
      anotherField: { nested: 'data' },
      shipId: 'SHIP_001',
      dronePool: [],
      decklist: []
    };

    const { deck, selectedDrones, selectedShipComponents, shipId, preservedFields } =
      convertFromAIFormat(original);

    const exported = convertToAIFormat(
      deck,
      selectedDrones,
      selectedShipComponents,
      { id: shipId },
      preservedFields
    );

    expect(exported.name).toBe(original.name);
    // Custom fields should be preserved if implemented
  });

  it('should handle full JS round-trip with parse and generate', () => {
    const original = `{
      name: 'Full Round Trip',
      shipId: 'SHIP_001',
      dronePool: ['Talon', 'Mammoth'],
      shipDeployment: {
        strategy: 'balanced',
        placement: ['bridge', 'powerCell', 'droneControlHub'],
      },
      decklist: [
        { id: 'CARD001', quantity: 4 },
      ]
    }`;

    // Parse JS text
    const parseResult = parseJSObjectLiteral(original);
    expect(parseResult.success).toBe(true);

    // Convert from AI format
    const { deck, selectedDrones, selectedShipComponents, shipId, preservedFields } =
      convertFromAIFormat(parseResult.data);

    // Convert back to AI format
    const aiFormat = convertToAIFormat(
      deck,
      selectedDrones,
      selectedShipComponents,
      { id: shipId },
      preservedFields
    );

    // Generate JS text
    const outputText = generateJSObjectLiteral(aiFormat);

    // Parse generated text to verify validity
    const finalParse = parseJSObjectLiteral(outputText);
    expect(finalParse.success).toBe(true);
    expect(finalParse.data.name).toBe('Full Round Trip');
    expect(finalParse.data.shipId).toBe('SHIP_001');
  });
});
