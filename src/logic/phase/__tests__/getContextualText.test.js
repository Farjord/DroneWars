// ========================================
// CONTEXTUAL TEXT UNIT TESTS
// ========================================
// Tests for getContextualText — Tier 2 phase banner text

import { describe, it, expect } from 'vitest';
import { getContextualText } from '../phaseDisplayUtils.js';

/** Base params with safe defaults — override per test */
const baseParams = {
  effectChainState: null,
  interceptionModeActive: false,
  turnPhase: null,
  pendingShieldsRemaining: null,
  shieldsToAllocate: 0,
  reallocationPhase: null,
  shieldsToRemove: 0,
  shieldsToAdd: 0,
  mandatoryAction: null,
  excessCards: 0,
  excessDrones: 0,
  optionalDiscardCount: 0,
  discardLimit: 0,
  isMyTurn: false,
  isMultiplayer: false,
  remainingDroneSlots: 0,
};

const call = (overrides) => getContextualText({ ...baseParams, ...overrides });

// ── Effect chain states (unchanged) ──

describe('getContextualText', () => {
  describe('effect chain states', () => {
    it('returns prompt text when effect chain has a prompt', () => {
      const result = call({
        effectChainState: { complete: false, prompt: 'Choose a target' },
      });
      expect(result).toEqual({ text: 'Choose a target', color: 'cyan' });
    });

    it('returns multi-target text with selected count', () => {
      const result = call({
        effectChainState: {
          complete: false,
          subPhase: 'multi-target',
          pendingMultiTargets: ['a', 'b'],
        },
      });
      expect(result).toEqual({ text: 'Select Targets (2 selected)', color: 'cyan' });
    });

    it('returns destination text', () => {
      const result = call({
        effectChainState: { complete: false, subPhase: 'destination' },
      });
      expect(result).toEqual({ text: 'Select Destination Lane', color: 'cyan' });
    });

    it('returns resolve effect N of M', () => {
      const result = call({
        effectChainState: {
          complete: false,
          currentIndex: 1,
          effects: [{}, {}, {}],
        },
      });
      expect(result).toEqual({ text: 'Resolve Effect 2 of 3', color: 'cyan' });
    });

    it('ignores completed effect chain', () => {
      const result = call({
        effectChainState: { complete: true, prompt: 'Should not show' },
        turnPhase: 'deployment',
        isMyTurn: true,
        remainingDroneSlots: 2,
      });
      expect(result.text).not.toContain('Should not show');
    });
  });

  // ── Interception (unchanged) ──

  describe('interception', () => {
    it('returns interceptor selection text', () => {
      const result = call({ interceptionModeActive: true });
      expect(result).toEqual({ text: 'Select an Interceptor', color: 'cyan' });
    });
  });

  // ── Shield allocation — "(X Remaining)" ──

  describe('allocateShields', () => {
    it('shows remaining from pendingShieldsRemaining when available', () => {
      const result = call({
        turnPhase: 'allocateShields',
        pendingShieldsRemaining: 2,
        shieldsToAllocate: 5,
      });
      expect(result).toEqual({ text: 'Assign Shields (2 Remaining)', color: 'cyan' });
    });

    it('falls back to shieldsToAllocate when pendingShieldsRemaining is null', () => {
      const result = call({
        turnPhase: 'allocateShields',
        pendingShieldsRemaining: null,
        shieldsToAllocate: 3,
      });
      expect(result).toEqual({ text: 'Assign Shields (3 Remaining)', color: 'cyan' });
    });
  });

  // ── Reallocation — "(X Remaining)" ──

  describe('reallocation', () => {
    it('removing phase shows remaining shields to remove', () => {
      const result = call({
        reallocationPhase: 'removing',
        shieldsToRemove: 2,
      });
      expect(result).toEqual({ text: 'Remove Shields (2 Remaining)', color: 'orange' });
    });

    it('adding phase shows remaining shields to add', () => {
      const result = call({
        reallocationPhase: 'adding',
        shieldsToAdd: 3,
      });
      expect(result).toEqual({ text: 'Add Shields (3 Remaining)', color: 'green' });
    });
  });

  // ── Mandatory discard — "(X Remaining)" ──

  describe('mandatoryDiscard', () => {
    it('shows remaining from mandatoryAction count', () => {
      const result = call({
        turnPhase: 'mandatoryDiscard',
        mandatoryAction: { type: 'discard', count: 2 },
      });
      expect(result).toEqual({ text: 'Discard Cards (2 Remaining)', color: 'orange' });
    });

    it('falls back to excessCards when no mandatoryAction count', () => {
      const result = call({
        turnPhase: 'mandatoryDiscard',
        excessCards: 4,
      });
      expect(result).toEqual({ text: 'Discard Cards (4 Remaining)', color: 'orange' });
    });
  });

  // ── Mandatory drone removal — "(X Remaining)" ──

  describe('mandatoryDroneRemoval', () => {
    it('shows remaining from mandatoryAction count', () => {
      const result = call({
        turnPhase: 'mandatoryDroneRemoval',
        mandatoryAction: { type: 'destroy', count: 1 },
      });
      expect(result).toEqual({ text: 'Remove Drones (1 Remaining)', color: 'orange' });
    });

    it('falls back to excessDrones', () => {
      const result = call({
        turnPhase: 'mandatoryDroneRemoval',
        excessDrones: 3,
      });
      expect(result).toEqual({ text: 'Remove Drones (3 Remaining)', color: 'orange' });
    });
  });

  // ── Optional discard — "(X Remaining)" ──

  describe('optionalDiscard', () => {
    it('shows remaining discard capacity', () => {
      const result = call({
        turnPhase: 'optionalDiscard',
        discardLimit: 5,
        optionalDiscardCount: 2,
      });
      expect(result).toEqual({ text: 'Discard Cards (3 Remaining)', color: 'yellow' });
    });
  });

  // ── Deployment — "(X Remaining)" ──

  describe('deployment', () => {
    it('shows remaining drone slots when my turn', () => {
      const result = call({
        turnPhase: 'deployment',
        isMyTurn: true,
        remainingDroneSlots: 4,
      });
      expect(result).toEqual({ text: 'Deploy Drones (4 Remaining)', color: 'cyan' });
    });
  });

  // ── Action — no remaining count ──

  describe('action', () => {
    it('shows Play an Action with no remaining count', () => {
      const result = call({
        turnPhase: 'action',
        isMyTurn: true,
      });
      expect(result).toEqual({ text: 'Play an Action', color: 'cyan' });
    });
  });

  // ── Not my turn ──

  describe('not my turn', () => {
    it('shows Opponent\'s Turn in multiplayer deployment', () => {
      const result = call({
        turnPhase: 'deployment',
        isMyTurn: false,
        isMultiplayer: true,
      });
      expect(result).toEqual({ text: "Opponent's Turn", color: 'red' });
    });

    it('shows AI Thinking in single-player action', () => {
      const result = call({
        turnPhase: 'action',
        isMyTurn: false,
        isMultiplayer: false,
      });
      expect(result).toEqual({ text: 'AI Thinking', color: 'red' });
    });
  });

  // ── Fallback ──

  describe('fallback', () => {
    it('returns Initialising when no phase matches', () => {
      const result = call({});
      expect(result).toEqual({ text: 'Initialising', color: 'cyan-dimmed' });
    });
  });
});
