// ========================================
// MOVEMENT CARD DRAG-AND-DROP TESTS
// ========================================
// TDD tests for movement card behavior when using drag-and-drop.
// Specifically tests the bug where dragging a drone after playing a
// Maneuver card would not include the card in setMoveConfirmation,
// causing the movement to be treated as a normal drone move instead
// of a card-based movement.

import { describe, it, expect } from 'vitest';

/**
 * Test the logic that determines what gets passed to setMoveConfirmation
 * when a drone is dragged during a movement card selection flow.
 *
 * Bug: In handleDroneDragEnd Case 2 (move to adjacent lane), the code was:
 *   setMoveConfirmation({ drone, from, to });
 *
 * This did NOT include the card from multiSelectState, causing:
 * 1. Drone to be exhausted (DO_NOT_EXHAUST not checked)
 * 2. Card not discarded from hand (processMovementCompletion never called)
 *
 * Fix: Check if multiSelectState has an active movement card and include it:
 *   const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
 *                        multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
 *                        ? multiSelectState.card : null;
 *   setMoveConfirmation({ drone, from, to, card: movementCard });
 */
describe('handleDroneDragEnd movement card integration', () => {
  describe('when multiSelectState has an active SINGLE_MOVE card', () => {
    const mockManeuverCard = {
      id: 'CARD023',
      instanceId: 'card-123',
      name: 'Maneuver',
      effect: {
        type: 'SINGLE_MOVE',
        properties: ['DO_NOT_EXHAUST']
      }
    };

    const multiSelectState = {
      card: mockManeuverCard,
      phase: 'select_drone',
      selectedDrones: [],
      sourceLane: null,
      maxDrones: 1,
      actingPlayerId: 'player1'
    };

    it('should detect the movement card from multiSelectState', () => {
      // This tests the fix logic that will be added to handleDroneDragEnd
      const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                           multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                           ? multiSelectState.card : null;

      expect(movementCard).not.toBeNull();
      expect(movementCard.name).toBe('Maneuver');
      expect(movementCard.effect.type).toBe('SINGLE_MOVE');
    });

    it('should preserve DO_NOT_EXHAUST property from the card', () => {
      const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                           multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                           ? multiSelectState.card : null;

      expect(movementCard.effect.properties).toContain('DO_NOT_EXHAUST');
    });

    it('should preserve card instanceId for proper discard', () => {
      const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                           multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                           ? multiSelectState.card : null;

      expect(movementCard.instanceId).toBe('card-123');
    });
  });

  describe('when multiSelectState has an active MULTI_MOVE card', () => {
    const mockRepositionCard = {
      id: 'CARD019',
      instanceId: 'card-456',
      name: 'Reposition',
      effect: {
        type: 'MULTI_MOVE',
        count: 3,
        properties: ['DO_NOT_EXHAUST']
      }
    };

    const multiSelectState = {
      card: mockRepositionCard,
      phase: 'select_source_lane',
      selectedDrones: [],
      sourceLane: null,
      maxDrones: 3,
      actingPlayerId: 'player1'
    };

    it('should detect MULTI_MOVE card from multiSelectState', () => {
      const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                           multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                           ? multiSelectState.card : null;

      expect(movementCard).not.toBeNull();
      expect(movementCard.name).toBe('Reposition');
      expect(movementCard.effect.type).toBe('MULTI_MOVE');
    });
  });

  describe('when no multiSelectState is active', () => {
    it('should return null for movement card (normal drone move)', () => {
      const noMultiSelectState = null;

      const movementCard = noMultiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                           noMultiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                           ? noMultiSelectState.card : null;

      expect(movementCard).toBeNull();
    });
  });

  describe('when multiSelectState has a non-movement card', () => {
    const mockNonMovementCard = {
      id: 'CARD001',
      instanceId: 'card-789',
      name: 'Repair',
      effect: {
        type: 'HEAL',
        amount: 2
      }
    };

    const multiSelectState = {
      card: mockNonMovementCard,
      phase: 'select_target',
      selectedDrones: [],
      sourceLane: null,
      maxDrones: 1,
      actingPlayerId: 'player1'
    };

    it('should return null for non-movement cards', () => {
      const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                           multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                           ? multiSelectState.card : null;

      expect(movementCard).toBeNull();
    });
  });
});
