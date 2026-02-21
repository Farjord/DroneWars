import { describe, it, expect, vi } from 'vitest';
import {
  extractDronesFromDeck,
  randomlySelectDrones,
  processPlacement
} from '../AISimultaneousPhaseStrategy.js';

const mockDronePool = [
  { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1 },
  { name: 'Talon', class: 2, attack: 3, speed: 4, hull: 2 },
  { name: 'Bomber', class: 3, attack: 5, speed: 2, hull: 4 },
  { name: 'Scout', class: 1, attack: 1, speed: 7, hull: 1 },
  { name: 'Guardian', class: 2, attack: 2, speed: 3, hull: 3 },
  { name: 'Phantom', class: 1, attack: 2, speed: 5, hull: 1 }
];

describe('AISimultaneousPhaseStrategy', () => {
  describe('extractDronesFromDeck', () => {
    it('maps drone names to objects from pool', () => {
      const result = extractDronesFromDeck(['Dart', 'Talon', 'Bomber'], mockDronePool);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Dart');
      expect(result[2].name).toBe('Bomber');
    });

    it('filters out drones not found in pool', () => {
      const result = extractDronesFromDeck(['Dart', 'NonExistent', 'Talon'], mockDronePool);
      expect(result).toHaveLength(2);
    });

    it('returns empty array for empty input', () => {
      expect(extractDronesFromDeck([], mockDronePool)).toEqual([]);
    });
  });

  describe('randomlySelectDrones', () => {
    it('returns exactly N drones', () => {
      const mockGSM = { getState: () => ({ gameSeed: 42 }) };
      const result = randomlySelectDrones(mockDronePool, 3, mockGSM);
      expect(result).toHaveLength(3);
    });

    it('returns all drones if count >= pool size', () => {
      const mockGSM = { getState: () => ({ gameSeed: 42 }) };
      const result = randomlySelectDrones(mockDronePool, 10, mockGSM);
      expect(result).toHaveLength(mockDronePool.length);
    });

    it('produces deterministic results with same seed', () => {
      const mockGSM = { getState: () => ({ gameSeed: 123 }) };
      const result1 = randomlySelectDrones([...mockDronePool], 3, mockGSM);
      const result2 = randomlySelectDrones([...mockDronePool], 3, mockGSM);
      expect(result1.map(d => d.name)).toEqual(result2.map(d => d.name));
    });
  });

  describe('processPlacement', () => {
    it('converts personality shipComponents to placement array', async () => {
      const personality = {
        name: 'Test',
        shipComponents: { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm', 'DRONECONTROL_001': 'r' }
      };
      const result = await processPlacement(personality);
      expect(result).toHaveLength(3);
      expect(result).toContain('bridge');
    });

    it('falls back to default placement when no shipComponents', async () => {
      const result = await processPlacement(null);
      expect(result).toEqual(['bridge', 'powerCell', 'droneControlHub']);
    });
  });
});
