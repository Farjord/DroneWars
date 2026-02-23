import { describe, it, expect } from 'vitest';
import { updateDeckState, updateDroneState } from '../deckStateUtils.js';

// ========================================
// DECK STATE UTILS TESTS
// ========================================
// TDD tests for deck/drone state management
// Key requirement: Entries with quantity 0 should NOT exist in state

describe('updateDeckState', () => {
  describe('adding cards', () => {
    it('should add a card with quantity > 0 to empty state', () => {
      const prevState = {};
      const result = updateDeckState(prevState, 'CARD001', 2);

      expect(result).toEqual({ CARD001: 2 });
    });

    it('should add a card to existing state', () => {
      const prevState = { CARD001: 2 };
      const result = updateDeckState(prevState, 'CARD002', 3);

      expect(result).toEqual({ CARD001: 2, CARD002: 3 });
    });

    it('should update quantity of existing card', () => {
      const prevState = { CARD001: 2 };
      const result = updateDeckState(prevState, 'CARD001', 4);

      expect(result).toEqual({ CARD001: 4 });
    });
  });

  describe('removing cards (quantity = 0)', () => {
    it('should remove card from state when quantity is set to 0', () => {
      const prevState = { CARD001: 2, CARD002: 3 };
      const result = updateDeckState(prevState, 'CARD001', 0);

      expect(result).toEqual({ CARD002: 3 });
      expect(result).not.toHaveProperty('CARD001');
    });

    it('should return empty object when last card is removed', () => {
      const prevState = { CARD001: 2 };
      const result = updateDeckState(prevState, 'CARD001', 0);

      expect(result).toEqual({});
    });

    it('should not add entry when setting non-existent card to 0', () => {
      const prevState = { CARD001: 2 };
      const result = updateDeckState(prevState, 'CARD999', 0);

      expect(result).toEqual({ CARD001: 2 });
      expect(result).not.toHaveProperty('CARD999');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const prevState = { CARD001: 2 };
      const result = updateDeckState(prevState, 'CARD002', 3);

      expect(prevState).toEqual({ CARD001: 2 });
      expect(result).not.toBe(prevState);
    });
  });

  describe('user workflow: manually setting quantity to 0', () => {
    it('should remove card when user clicks 0 button after adding card', () => {
      // Simulate: User adds card with quantity 2
      let state = {};
      state = updateDeckState(state, 'CARD001', 2);
      expect(state).toEqual({ CARD001: 2 });

      // User manually clicks the "0" button
      state = updateDeckState(state, 'CARD001', 0);

      // Card should be completely removed from state
      expect(state).toEqual({});
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should handle sequence: add → increment → set to 0', () => {
      let state = {};

      // User adds card with quantity 1
      state = updateDeckState(state, 'CARD001', 1);
      expect(state).toEqual({ CARD001: 1 });

      // User increments to 3
      state = updateDeckState(state, 'CARD001', 3);
      expect(state).toEqual({ CARD001: 3 });

      // User manually sets to 0
      state = updateDeckState(state, 'CARD001', 0);

      // Card should be gone
      expect(state).toEqual({});
      expect(state).not.toHaveProperty('CARD001');
    });

    it('should only remove the card set to 0, keeping others intact', () => {
      let state = {};

      // User adds 3 different cards
      state = updateDeckState(state, 'CARD001', 2);
      state = updateDeckState(state, 'CARD002', 3);
      state = updateDeckState(state, 'CARD003', 4);
      expect(Object.keys(state)).toHaveLength(3);

      // User removes CARD002 by setting to 0
      state = updateDeckState(state, 'CARD002', 0);

      // Only CARD001 and CARD003 should remain
      expect(state).toEqual({ CARD001: 2, CARD003: 4 });
      expect(Object.keys(state)).toHaveLength(2);
      expect(state).not.toHaveProperty('CARD002');
    });

    it('should handle adding and removing same card multiple times', () => {
      let state = {};

      // Add card
      state = updateDeckState(state, 'CARD001', 2);
      expect(state).toHaveProperty('CARD001');

      // Remove it
      state = updateDeckState(state, 'CARD001', 0);
      expect(state).not.toHaveProperty('CARD001');

      // Add it again
      state = updateDeckState(state, 'CARD001', 1);
      expect(state).toEqual({ CARD001: 1 });

      // Remove again
      state = updateDeckState(state, 'CARD001', 0);
      expect(state).toEqual({});
    });
  });
});

describe('updateDroneState', () => {
  describe('adding drones', () => {
    it('should add a drone with quantity > 0 to empty state', () => {
      const prevState = {};
      const result = updateDroneState(prevState, 'Dart', 1);

      expect(result).toEqual({ 'Dart': 1 });
    });

    it('should add a drone to existing state', () => {
      const prevState = { 'Dart': 1 };
      const result = updateDroneState(prevState, 'Mammoth', 1);

      expect(result).toEqual({ 'Dart': 1, 'Mammoth': 1 });
    });
  });

  describe('removing drones (quantity = 0)', () => {
    it('should remove drone from state when quantity is set to 0', () => {
      const prevState = { 'Dart': 1, 'Mammoth': 1 };
      const result = updateDroneState(prevState, 'Dart', 0);

      expect(result).toEqual({ 'Mammoth': 1 });
      expect(result).not.toHaveProperty('Dart');
    });

    it('should return empty object when last drone is removed', () => {
      const prevState = { 'Dart': 1 };
      const result = updateDroneState(prevState, 'Dart', 0);

      expect(result).toEqual({});
    });

    it('should not add entry when setting non-existent drone to 0', () => {
      const prevState = { 'Dart': 1 };
      const result = updateDroneState(prevState, 'Unknown Drone', 0);

      expect(result).toEqual({ 'Dart': 1 });
      expect(result).not.toHaveProperty('Unknown Drone');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const prevState = { 'Dart': 1 };
      const result = updateDroneState(prevState, 'Mammoth', 1);

      expect(prevState).toEqual({ 'Dart': 1 });
      expect(result).not.toBe(prevState);
    });
  });
});
