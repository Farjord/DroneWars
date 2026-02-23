// ========================================
// KEYWORD HELPERS - UNIT TESTS
// ========================================

import { describe, it, expect } from 'vitest';
import {
  hasNotFirstActionAbility,
  hasReadyNotFirstActionDrones
} from '../keywordHelpers.js';

// ========================================
// NOT_FIRST_ACTION ABILITY DETECTION
// ========================================

describe('hasNotFirstActionAbility', () => {
  it('returns true for Jackal drone (has +2 attack NOT_FIRST_ACTION ability)', () => {
    const jackalDrone = { name: 'Jackal' };
    expect(hasNotFirstActionAbility(jackalDrone)).toBe(true);
  });

  it('returns true for Mongoose drone (has +2 speed NOT_FIRST_ACTION ability)', () => {
    const mongooseDrone = { name: 'Mongoose' };
    expect(hasNotFirstActionAbility(mongooseDrone)).toBe(true);
  });

  it('returns false for Dart drone (no NOT_FIRST_ACTION ability)', () => {
    const dartDrone = { name: 'Dart' };
    expect(hasNotFirstActionAbility(dartDrone)).toBe(false);
  });

  it('returns false for unknown drone', () => {
    const unknownDrone = { name: 'NonExistentDrone' };
    expect(hasNotFirstActionAbility(unknownDrone)).toBe(false);
  });
});

// ========================================
// READY NOT_FIRST_ACTION DRONES CHECK
// ========================================

describe('hasReadyNotFirstActionDrones', () => {
  it('returns true when a ready Jackal is on the board', () => {
    const playerState = {
      dronesOnBoard: {
        lane1: [{ name: 'Jackal', isExhausted: false }],
        lane2: [],
        lane3: []
      }
    };
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(true);
  });

  it('returns true when a ready Mongoose is on the board', () => {
    const playerState = {
      dronesOnBoard: {
        lane1: [],
        lane2: [{ name: 'Mongoose', isExhausted: false }],
        lane3: []
      }
    };
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(true);
  });

  it('returns false when Jackal is exhausted', () => {
    const playerState = {
      dronesOnBoard: {
        lane1: [{ name: 'Jackal', isExhausted: true }],
        lane2: [],
        lane3: []
      }
    };
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(false);
  });

  it('returns false when only non-NOT_FIRST_ACTION drones are on board', () => {
    const playerState = {
      dronesOnBoard: {
        lane1: [{ name: 'Dart', isExhausted: false }],
        lane2: [{ name: 'Talon', isExhausted: false }],
        lane3: []
      }
    };
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(false);
  });

  it('returns false when board is empty', () => {
    const playerState = {
      dronesOnBoard: {
        lane1: [],
        lane2: [],
        lane3: []
      }
    };
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(false);
  });

  it('returns false for null playerState', () => {
    expect(hasReadyNotFirstActionDrones(null)).toBe(false);
  });

  it('returns false for playerState without dronesOnBoard', () => {
    const playerState = {};
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(false);
  });

  it('returns true when Jackal is ready among other drones', () => {
    const playerState = {
      dronesOnBoard: {
        lane1: [{ name: 'Dart', isExhausted: false }],
        lane2: [{ name: 'Jackal', isExhausted: false }, { name: 'Talon', isExhausted: true }],
        lane3: [{ name: 'Mammoth', isExhausted: true }]
      }
    };
    expect(hasReadyNotFirstActionDrones(playerState)).toBe(true);
  });
});
