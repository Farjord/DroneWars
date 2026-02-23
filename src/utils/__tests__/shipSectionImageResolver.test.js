// ========================================
// SHIP SECTION IMAGE RESOLVER - UNIT TESTS
// ========================================
// TDD tests for resolving ship-type-dependent section images.
// Tests written FIRST before implementation.

import { describe, it, expect, vi } from 'vitest';
import {
  resolveShipSectionImage,
  resolveShipSectionStats,
  normalizeShipName,
  normalizeSectionType,
  getFallbackImagePath,
  getShipSpecificImagePath
} from '../shipSectionImageResolver.js';

// ========================================
// NORMALIZE SECTION TYPE TESTS
// ========================================
describe('normalizeSectionType', () => {
  it('should keep "Bridge" as "Bridge"', () => {
    expect(normalizeSectionType('Bridge')).toBe('Bridge');
  });

  it('should convert "Power Cell" to "Power_Cell"', () => {
    expect(normalizeSectionType('Power Cell')).toBe('Power_Cell');
  });

  it('should convert "Drone Control Hub" to "Drone_Control_Hub"', () => {
    expect(normalizeSectionType('Drone Control Hub')).toBe('Drone_Control_Hub');
  });

  it('should handle legacy key "bridge" -> "Bridge"', () => {
    expect(normalizeSectionType('bridge')).toBe('Bridge');
  });

  it('should handle legacy key "powerCell" -> "Power_Cell"', () => {
    expect(normalizeSectionType('powerCell')).toBe('Power_Cell');
  });

  it('should handle legacy key "droneControlHub" -> "Drone_Control_Hub"', () => {
    expect(normalizeSectionType('droneControlHub')).toBe('Drone_Control_Hub');
  });

  it('should handle legacy key "tacticalBridge" -> "Bridge"', () => {
    expect(normalizeSectionType('tacticalBridge')).toBe('Bridge');
  });

  it('should return null for unknown section types', () => {
    expect(normalizeSectionType('unknownSection')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(normalizeSectionType(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(normalizeSectionType(undefined)).toBeNull();
  });
});

// ========================================
// NORMALIZE SHIP NAME TESTS
// ========================================
describe('normalizeShipName', () => {
  it('should extract "Corvette" from "Reconnaissance Corvette"', () => {
    expect(normalizeShipName('Reconnaissance Corvette')).toBe('Corvette');
  });

  it('should extract "Carrier" from "Heavy Assault Carrier"', () => {
    expect(normalizeShipName('Heavy Assault Carrier')).toBe('Carrier');
  });

  it('should keep "Scout" as "Scout"', () => {
    expect(normalizeShipName('Scout')).toBe('Scout');
  });

  it('should resolve ship ID "SHIP_001" to "Corvette"', () => {
    expect(normalizeShipName('SHIP_001')).toBe('Corvette');
  });

  it('should resolve ship ID "SHIP_002" to "Carrier"', () => {
    expect(normalizeShipName('SHIP_002')).toBe('Carrier');
  });

  it('should resolve ship ID "SHIP_003" to "Scout"', () => {
    expect(normalizeShipName('SHIP_003')).toBe('Scout');
  });

  it('should handle ship object with id property', () => {
    const shipObj = { id: 'SHIP_001', name: 'Reconnaissance Corvette' };
    expect(normalizeShipName(shipObj)).toBe('Corvette');
  });

  it('should handle ship object with name property', () => {
    const shipObj = { name: 'Heavy Assault Carrier' };
    expect(normalizeShipName(shipObj)).toBe('Carrier');
  });

  it('should return null for null input', () => {
    expect(normalizeShipName(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(normalizeShipName(undefined)).toBeNull();
  });

  it('should return null for unknown ship ID', () => {
    expect(normalizeShipName('SHIP_999')).toBeNull();
  });

  it('should return null for unknown ship name', () => {
    expect(normalizeShipName('Unknown Ship Class')).toBeNull();
  });
});

// ========================================
// GET FALLBACK IMAGE PATH TESTS
// ========================================
describe('getFallbackImagePath', () => {
  it('should return /DroneWars/img/Bridge.png for "Bridge"', () => {
    expect(getFallbackImagePath('Bridge')).toBe('/DroneWars/img/Bridge.png');
  });

  it('should return /DroneWars/img/Power_Cell.png for "Power_Cell"', () => {
    expect(getFallbackImagePath('Power_Cell')).toBe('/DroneWars/img/Power_Cell.png');
  });

  it('should return /DroneWars/img/Drone_Control_Hub.png for "Drone_Control_Hub"', () => {
    expect(getFallbackImagePath('Drone_Control_Hub')).toBe('/DroneWars/img/Drone_Control_Hub.png');
  });

  it('should return null for unknown section type', () => {
    expect(getFallbackImagePath('Unknown')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(getFallbackImagePath(null)).toBeNull();
  });
});

// ========================================
// GET SHIP SPECIFIC IMAGE PATH TESTS
// ========================================
describe('getShipSpecificImagePath', () => {
  it('should return /DroneWars/Ships/Corvette/Bridge.png for Corvette + Bridge', () => {
    expect(getShipSpecificImagePath('Corvette', 'Bridge')).toBe('/DroneWars/Ships/Corvette/Bridge.png');
  });

  it('should return /DroneWars/Ships/Carrier/Power_Cell.png for Carrier + Power_Cell', () => {
    expect(getShipSpecificImagePath('Carrier', 'Power_Cell')).toBe('/DroneWars/Ships/Carrier/Power_Cell.png');
  });

  it('should return /DroneWars/Ships/Scout/Drone_Control_Hub.png for Scout + Drone_Control_Hub', () => {
    expect(getShipSpecificImagePath('Scout', 'Drone_Control_Hub')).toBe('/DroneWars/Ships/Scout/Drone_Control_Hub.png');
  });

  it('should return null if shipName is null', () => {
    expect(getShipSpecificImagePath(null, 'Bridge')).toBeNull();
  });

  it('should return null if sectionType is null', () => {
    expect(getShipSpecificImagePath('Corvette', null)).toBeNull();
  });
});

// ========================================
// RESOLVE SHIP SECTION IMAGE TESTS
// ========================================
describe('resolveShipSectionImage', () => {
  describe('with valid ship and section', () => {
    it('should return ship-specific path for Corvette + Bridge', () => {
      expect(resolveShipSectionImage('Reconnaissance Corvette', 'Bridge'))
        .toBe('/DroneWars/Ships/Corvette/Bridge.png');
    });

    it('should return ship-specific path for Carrier + Power Cell', () => {
      expect(resolveShipSectionImage('Heavy Assault Carrier', 'Power Cell'))
        .toBe('/DroneWars/Ships/Carrier/Power_Cell.png');
    });

    it('should return ship-specific path for Scout + Drone Control Hub', () => {
      expect(resolveShipSectionImage('Scout', 'Drone Control Hub'))
        .toBe('/DroneWars/Ships/Scout/Drone_Control_Hub.png');
    });

    it('should handle ship ID with section type', () => {
      expect(resolveShipSectionImage('SHIP_001', 'Bridge'))
        .toBe('/DroneWars/Ships/Corvette/Bridge.png');
    });

    it('should handle ship ID with legacy section key', () => {
      expect(resolveShipSectionImage('SHIP_002', 'powerCell'))
        .toBe('/DroneWars/Ships/Carrier/Power_Cell.png');
    });

    it('should handle ship object with section type', () => {
      const ship = { id: 'SHIP_003', name: 'Scout' };
      expect(resolveShipSectionImage(ship, 'droneControlHub'))
        .toBe('/DroneWars/Ships/Scout/Drone_Control_Hub.png');
    });
  });

  describe('fallback behavior', () => {
    it('should return fallback path when ship is null', () => {
      expect(resolveShipSectionImage(null, 'Bridge'))
        .toBe('/DroneWars/img/Bridge.png');
    });

    it('should return fallback path when ship is undefined', () => {
      expect(resolveShipSectionImage(undefined, 'Power Cell'))
        .toBe('/DroneWars/img/Power_Cell.png');
    });

    it('should return fallback path for unknown ship', () => {
      expect(resolveShipSectionImage('Unknown Ship', 'Bridge'))
        .toBe('/DroneWars/img/Bridge.png');
    });

    it('should return null for unknown section type', () => {
      expect(resolveShipSectionImage('Corvette', 'unknownSection'))
        .toBeNull();
    });

    it('should return null when both ship and section are invalid', () => {
      expect(resolveShipSectionImage(null, null))
        .toBeNull();
    });
  });
});

// ========================================
// RESOLVE SHIP SECTION STATS TESTS
// ========================================
describe('resolveShipSectionStats', () => {
  const mockSectionStats = {
    id: 'BRIDGE_001',
    type: 'Bridge',
    name: 'Standard Command Bridge',
    key: 'bridge',
    image: '/DroneWars/img/Bridge.png',
    hull: 10,
    shields: 3
  };

  it('should return new object with resolved image path', () => {
    const result = resolveShipSectionStats(mockSectionStats, 'SHIP_001');
    expect(result.image).toBe('/DroneWars/Ships/Corvette/Bridge.png');
  });

  it('should not mutate original stats object', () => {
    const originalImage = mockSectionStats.image;
    resolveShipSectionStats(mockSectionStats, 'SHIP_001');
    expect(mockSectionStats.image).toBe(originalImage);
  });

  it('should preserve all other properties', () => {
    const result = resolveShipSectionStats(mockSectionStats, 'SHIP_002');
    expect(result.id).toBe('BRIDGE_001');
    expect(result.name).toBe('Standard Command Bridge');
    expect(result.hull).toBe(10);
    expect(result.shields).toBe(3);
  });

  it('should use section type property for resolution', () => {
    const stats = { type: 'Power Cell', image: '/DroneWars/img/Power_Cell.png' };
    const result = resolveShipSectionStats(stats, 'SHIP_003');
    expect(result.image).toBe('/DroneWars/Ships/Scout/Power_Cell.png');
  });

  it('should fallback to key property if type is missing', () => {
    const stats = { key: 'droneControlHub', image: '/DroneWars/img/Drone_Control_Hub.png' };
    const result = resolveShipSectionStats(stats, 'Corvette');
    expect(result.image).toBe('/DroneWars/Ships/Corvette/Drone_Control_Hub.png');
  });

  it('should return original stats if null', () => {
    expect(resolveShipSectionStats(null, 'SHIP_001')).toBeNull();
  });

  it('should return original stats if undefined', () => {
    expect(resolveShipSectionStats(undefined, 'SHIP_001')).toBeUndefined();
  });

  it('should use fallback image when ship is null', () => {
    const result = resolveShipSectionStats(mockSectionStats, null);
    expect(result.image).toBe('/DroneWars/img/Bridge.png');
  });

  it('should handle ship object input', () => {
    const ship = { id: 'SHIP_002', name: 'Heavy Assault Carrier' };
    const result = resolveShipSectionStats(mockSectionStats, ship);
    expect(result.image).toBe('/DroneWars/Ships/Carrier/Bridge.png');
  });
});
