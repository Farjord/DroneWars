import { describe, it, expect } from 'vitest';
import {
  parseJSObjectLiteral,
  generateJSObjectLiteral,
  convertToAIFormat,
  convertFromAIFormat,
  shipComponentsToPlacement
} from './deckExportUtils.js';

// ========================================
// JS OBJECT LITERAL PARSING TESTS
// ========================================

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

  describe('deck format parsing', () => {
    it('should parse full deck-style object with shipComponents', () => {
      const input = `{
        shipId: 'SHIP_001',
        decklist: [
          { id: 'CARD001', quantity: 4 },
          { id: 'CARD002', quantity: 2 },
        ],
        dronePool: ['Talon', 'Mammoth'],
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      }`;
      const result = parseJSObjectLiteral(input);
      expect(result.success).toBe(true);
      expect(result.data.shipId).toBe('SHIP_001');
      expect(result.data.dronePool).toHaveLength(2);
      expect(result.data.shipComponents['BRIDGE_001']).toBe('l');
      expect(result.data.decklist).toHaveLength(2);
      expect(result.data.decklist[0].id).toBe('CARD001');
      expect(result.data.decklist[0].quantity).toBe(4);
    });

    it('should parse deck with inline comments', () => {
      const input = `{
        shipId: 'SHIP_001',
        dronePool: [
          'Dart',        // Fast drone
          'Mammoth',     // Heavy drone
        ],
        decklist: [
          { id: 'CARD001', quantity: 4 },   // Laser Blast
          { id: 'CARD002', quantity: 2 },   // System Reboot
        ],
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
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

    it('should format arrays of objects with inline simple objects', () => {
      const data = { items: [{ id: 'A', qty: 1 }, { id: 'B', qty: 2 }] };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain("{ id: 'A', qty: 1 }");
      expect(output).toContain("{ id: 'B', qty: 2 }");
    });

    it('should group string arrays ~5 per line', () => {
      const data = { names: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] };
      const output = generateJSObjectLiteral(data);
      // First 5 on one line, remaining 2 on next line
      expect(output).toContain("'A', 'B', 'C', 'D', 'E'");
      expect(output).toContain("'F', 'G'");
    });
  });

  describe('nested objects', () => {
    it('should inline simple nested objects', () => {
      const data = {
        outer: {
          inner: 'value',
          nested: { deep: 'deeper' }
        }
      };
      const output = generateJSObjectLiteral(data);
      // outer is not simple (has nested object), so it stays multi-line
      expect(output).toContain("inner: 'value'");
      // nested is simple (only scalar values), so it gets inlined
      expect(output).toContain("{ deep: 'deeper' }");
    });

    it('should quote ALL_CAPS keys like data IDs', () => {
      const data = {
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm'
        }
      };
      const output = generateJSObjectLiteral(data);
      expect(output).toContain("'BRIDGE_001': 'l'");
      expect(output).toContain("'POWERCELL_001': 'm'");
      // shipComponents should NOT be quoted (camelCase)
      expect(output).toContain('shipComponents:');
      expect(output).not.toContain("'shipComponents'");
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

  describe('shipComponents output', () => {
    it('should output shipComponents directly', () => {
      const components = { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' };
      const result = convertToAIFormat({}, {}, components, { id: 'SHIP_001' }, {});
      expect(result.shipComponents).toEqual(components);
    });

    it('should not include shipDeployment', () => {
      const result = convertToAIFormat({}, {}, {}, { id: 'SHIP_001' }, {});
      expect(result.shipDeployment).toBeUndefined();
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

  describe('shipComponents conversion', () => {
    it('should read shipComponents directly', () => {
      const aiData = {
        shipComponents: { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' }
      };
      const result = convertFromAIFormat(aiData);
      expect(result.selectedShipComponents).toEqual({
        'BRIDGE_001': 'l',
        'POWERCELL_001': 'm',
        'DRONECONTROL_001': 'r'
      });
    });

    it('should fall back to shipDeployment.placement for backward compat', () => {
      const aiData = {
        shipDeployment: {
          placement: ['bridge', 'powerCell', 'droneControlHub']
        }
      };
      const result = convertFromAIFormat(aiData);
      expect(Object.keys(result.selectedShipComponents)).toHaveLength(3);
      const lanes = Object.values(result.selectedShipComponents);
      expect(lanes).toContain('l');
      expect(lanes).toContain('m');
      expect(lanes).toContain('r');
    });

    it('should handle empty shipComponents', () => {
      const aiData = { shipComponents: {} };
      const result = convertFromAIFormat(aiData);
      expect(result.selectedShipComponents).toEqual({});
    });

    it('should handle missing shipComponents and shipDeployment', () => {
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
  });
});

// ========================================
// SHIP COMPONENTS TO PLACEMENT TESTS
// ========================================

describe('shipComponentsToPlacement', () => {
  it('should convert component IDs to legacy placement array', () => {
    const components = { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' };
    const result = shipComponentsToPlacement(components);
    expect(result).toEqual(['bridge', 'powerCell', 'droneControlHub']);
  });

  it('should handle different lane orders', () => {
    const components = { 'POWERCELL_001': 'l', 'BRIDGE_001': 'm', 'DRONECONTROL_001': 'r' };
    const result = shipComponentsToPlacement(components);
    expect(result).toEqual(['powerCell', 'bridge', 'droneControlHub']);
  });

  it('should handle empty components', () => {
    const result = shipComponentsToPlacement({});
    expect(result).toEqual([]);
  });

  it('should handle null components', () => {
    const result = shipComponentsToPlacement(null);
    expect(result).toEqual([]);
  });
});

// ========================================
// ROUND-TRIP CONVERSION TESTS
// ========================================

describe('round-trip conversion', () => {
  it('should preserve all data through import-export cycle', () => {
    const original = {
      shipId: 'SHIP_001',
      dronePool: ['Talon', 'Mammoth', 'Mammoth'],
      shipComponents: {
        'BRIDGE_001': 'l',
        'POWERCELL_001': 'm',
        'DRONECONTROL_001': 'r'
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

    // Verify converted data
    expect(exported.shipId).toBe(original.shipId);
    expect(exported.shipComponents).toEqual(original.shipComponents);
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

  it('should handle full JS round-trip with parse and generate', () => {
    const original = `{
      shipId: 'SHIP_001',
      dronePool: ['Talon', 'Mammoth'],
      shipComponents: {
        'BRIDGE_001': 'l',
        'POWERCELL_001': 'm',
        'DRONECONTROL_001': 'r'
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
    expect(finalParse.data.shipId).toBe('SHIP_001');
    expect(finalParse.data.shipComponents).toEqual({
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    });
  });

  it('should handle backward compat: legacy shipDeployment import re-exports as shipComponents', () => {
    const legacy = {
      shipId: 'SHIP_001',
      dronePool: ['Talon'],
      shipDeployment: {
        placement: ['bridge', 'powerCell', 'droneControlHub']
      },
      decklist: [{ id: 'CARD001', quantity: 4 }]
    };

    const { deck, selectedDrones, selectedShipComponents, shipId, preservedFields } =
      convertFromAIFormat(legacy);

    const exported = convertToAIFormat(
      deck,
      selectedDrones,
      selectedShipComponents,
      { id: shipId },
      preservedFields
    );

    expect(exported.shipComponents).toEqual({
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    });
    expect(exported.shipDeployment).toBeUndefined();
  });
});
