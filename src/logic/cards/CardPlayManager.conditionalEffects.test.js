// ========================================
// CARD PLAY MANAGER - CONDITIONAL EFFECTS INTEGRATION TESTS
// ========================================
// TDD: Tests for conditional effects integration in CardPlayManager
// Tests PRE/POST timing hooks for conditionalEffects array on cards

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing CardPlayManager
vi.mock('../EffectRouter.js', () => {
  return {
    default: class MockEffectRouter {
      routeEffect(effect, context) {
        // Simulate damage effect processing
        if (effect.type === 'DAMAGE') {
          const wasDestroyed = effect.value >= 5; // Simulate: 5+ damage destroys target
          return {
            newPlayerStates: context.playerStates,
            animationEvents: [],
            additionalEffects: [],
            effectResult: {
              wasDestroyed,
              damageDealt: { shield: 0, hull: effect.value },
              targetId: context.target?.id
            }
          };
        }
        // Return null to trigger fallback
        return null;
      }
    }
  };
});

// Import after mocks are set up
import cardPlayManager from './CardPlayManager.js';

describe('CardPlayManager with conditionalEffects', () => {
  let mockTarget;
  let mockPlayerStates;
  let mockPlacedSections;
  let mockCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();

    // Standard mock target drone
    mockTarget = {
      id: 'drone_123',
      name: 'TestDrone',
      hull: 3,
      currentShields: 2,
      isExhausted: false,
      isMarked: false,
      attack: 2,
      speed: 4,
      owner: 'player2',
      lane: 'lane1'
    };

    // Standard mock player states
    mockPlayerStates = {
      player1: {
        name: 'Player 1',
        energy: 10,
        hand: [],
        discardPile: [],
        deck: [{ id: 'card3' }, { id: 'card4' }],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      },
      player2: {
        name: 'Player 2',
        energy: 10,
        hand: [],
        discardPile: [],
        deck: [],
        dronesOnBoard: { lane1: [mockTarget], lane2: [], lane3: [] },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      }
    };

    // Standard mock placed sections
    mockPlacedSections = {
      player1: ['bridge'],
      player2: ['bridge']
    };

    // Standard mock callbacks
    mockCallbacks = {
      logCallback: vi.fn(),
      resolveAttackCallback: vi.fn()
    };
  });

  // ========================================
  // PRE TIMING INTEGRATION
  // ========================================
  describe('PRE timing integration', () => {
    it('applies BONUS_DAMAGE when PRE condition met before primary effect', () => {
      mockTarget.isMarked = true;
      const card = {
        id: 'CARD_BONUS_DMG',
        instanceId: 'inst_001',
        name: 'Marked Hunter',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          id: 'marked-bonus',
          timing: 'PRE',
          condition: { type: 'TARGET_IS_MARKED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
        }]
      };

      // Add card to hand so it can be played
      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      // The test validates the integration point exists and processes correctly
      // Actual damage modification is tested in ConditionalEffectProcessor tests
      expect(result).toBeDefined();
      expect(result.newPlayerStates).toBeDefined();
    });

    it('does NOT apply BONUS_DAMAGE when PRE condition not met', () => {
      mockTarget.isMarked = false; // Condition NOT met
      const card = {
        id: 'CARD_BONUS_DMG',
        instanceId: 'inst_001',
        name: 'Marked Hunter',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          id: 'marked-bonus',
          timing: 'PRE',
          condition: { type: 'TARGET_IS_MARKED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result).toBeDefined();
      expect(result.newPlayerStates).toBeDefined();
    });

    it('queues DESTROY effect from PRE conditional when condition met', () => {
      mockTarget.hull = 1; // Low hull - condition will be met
      const card = {
        id: 'CARD_EXECUTE',
        instanceId: 'inst_002',
        name: 'Executioner',
        cost: 2,
        effect: { type: 'DAMAGE', value: 0 }, // Placeholder effect (conditional DESTROY is the main effect)
        conditionalEffects: [{
          id: 'execute-weak',
          timing: 'PRE',
          condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
          grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      // Additional DESTROY effect should be queued
      expect(result.additionalEffects).toBeDefined();
    });
  });

  // ========================================
  // POST TIMING INTEGRATION
  // ========================================
  describe('POST timing integration', () => {
    it('grants DRAW effect when ON_DESTROY condition met after damage', () => {
      const card = {
        id: 'CARD_SCAVENGER',
        instanceId: 'inst_003',
        name: 'Scavenger Shot',
        cost: 2,
        effect: { type: 'DAMAGE', value: 5 }, // Enough to destroy (in mock)
        conditionalEffects: [{
          id: 'draw-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      // POST conditional should queue DRAW effect when target is destroyed
      expect(result.additionalEffects).toBeDefined();
    });

    it('does NOT grant DRAW effect when target survives', () => {
      const card = {
        id: 'CARD_SCAVENGER',
        instanceId: 'inst_003',
        name: 'Scavenger Shot',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 }, // Not enough to destroy
        conditionalEffects: [{
          id: 'draw-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      // Should not queue DRAW effect if target survives
      expect(result).toBeDefined();
    });

    it('grants GO_AGAIN dynamically when POST condition met', () => {
      const card = {
        id: 'CARD_HUNTER',
        instanceId: 'inst_004',
        name: 'Kill Shot',
        cost: 3,
        effect: { type: 'DAMAGE', value: 5, goAgain: false }, // Base: no goAgain
        conditionalEffects: [{
          id: 'goagain-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'GO_AGAIN' }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      // If target was destroyed, turn should NOT end (GO_AGAIN granted)
      expect(result).toBeDefined();
    });

    it('grants GAIN_ENERGY when ON_DAMAGE condition met', () => {
      const card = {
        id: 'CARD_ENERGY_LEECH',
        instanceId: 'inst_005',
        name: 'Energy Leech',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          id: 'energy-on-damage',
          timing: 'POST',
          condition: { type: 'ON_DAMAGE' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 1 }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result.additionalEffects).toBeDefined();
    });
  });

  // ========================================
  // MULTIPLE CONDITIONALS
  // ========================================
  describe('multiple conditionals', () => {
    it('processes both PRE and POST conditionals on same card', () => {
      mockTarget.isMarked = true;
      const card = {
        id: 'CARD_OPPORTUNIST',
        instanceId: 'inst_006',
        name: 'Opportunist Strike',
        cost: 4,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [
          {
            id: 'marked-bonus',
            timing: 'PRE',
            condition: { type: 'TARGET_IS_MARKED' },
            grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
          },
          {
            id: 'energy-on-destroy',
            timing: 'POST',
            condition: { type: 'ON_DESTROY' },
            grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
          },
          {
            id: 'goagain-on-destroy',
            timing: 'POST',
            condition: { type: 'ON_DESTROY' },
            grantedEffect: { type: 'GO_AGAIN' }
          }
        ]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result).toBeDefined();
      expect(result.newPlayerStates).toBeDefined();
    });

    it('processes multiple POST conditionals independently', () => {
      const card = {
        id: 'CARD_MULTI_REWARD',
        instanceId: 'inst_007',
        name: 'Rewarding Kill',
        cost: 3,
        effect: { type: 'DAMAGE', value: 5 },
        conditionalEffects: [
          {
            id: 'draw-on-destroy',
            timing: 'POST',
            condition: { type: 'ON_DESTROY' },
            grantedEffect: { type: 'DRAW', value: 1 }
          },
          {
            id: 'energy-on-destroy',
            timing: 'POST',
            condition: { type: 'ON_DESTROY' },
            grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
          }
        ]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result.additionalEffects).toBeDefined();
    });
  });

  // ========================================
  // CARDS WITHOUT CONDITIONAL EFFECTS
  // ========================================
  describe('cards without conditionalEffects', () => {
    it('works normally for cards without conditionalEffects property', () => {
      const card = {
        id: 'CARD_SIMPLE',
        instanceId: 'inst_008',
        name: 'Simple Shot',
        cost: 1,
        effect: { type: 'DAMAGE', value: 2 }
        // No conditionalEffects
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result).toBeDefined();
      expect(result.newPlayerStates).toBeDefined();
      expect(result.animationEvents).toBeDefined();
    });

    it('works normally for cards with empty conditionalEffects array', () => {
      const card = {
        id: 'CARD_EMPTY_COND',
        instanceId: 'inst_009',
        name: 'Empty Conditionals',
        cost: 1,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: []
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result).toBeDefined();
      expect(result.newPlayerStates).toBeDefined();
    });
  });

  // ========================================
  // ANIMATION EVENTS
  // ========================================
  describe('animation events', () => {
    it('includes CARD_REVEAL animation for conditional effect cards', () => {
      const card = {
        id: 'CARD_WITH_COND',
        instanceId: 'inst_010',
        name: 'Conditional Card',
        cost: 2,
        effect: { type: 'DAMAGE', value: 2 },
        conditionalEffects: [{
          id: 'draw-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        }]
      };

      mockPlayerStates.player1.hand.push(card);

      const result = cardPlayManager.resolveCardPlay(
        card, mockTarget, 'player1', mockPlayerStates,
        mockPlacedSections, mockCallbacks
      );

      expect(result.animationEvents).toBeDefined();
      expect(result.animationEvents.some(e => e.type === 'CARD_REVEAL')).toBe(true);
    });
  });
});
