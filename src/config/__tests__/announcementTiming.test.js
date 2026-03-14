import { describe, it, expect } from 'vitest';
import { computeCompoundDuration, PHASE_DISPLAY_DURATION, SCRAMBLE_DURATION_MS, STAGE_HOLD_MS, FADE_OUT_MS } from '../announcementTiming.js';

describe('announcementTiming constants', () => {
  it('PHASE_DISPLAY_DURATION equals SCRAMBLE + HOLD + FADE', () => {
    expect(PHASE_DISPLAY_DURATION).toBe(SCRAMBLE_DURATION_MS + STAGE_HOLD_MS + FADE_OUT_MS);
    expect(PHASE_DISPLAY_DURATION).toBe(1800);
  });
});

describe('computeCompoundDuration', () => {
  it('returns standard duration for 1 stage', () => {
    expect(computeCompoundDuration(1)).toBe(PHASE_DISPLAY_DURATION);
  });

  it('returns 3300ms for 2 stages', () => {
    // 2 * (500 + 1000) + 300 = 3300
    expect(computeCompoundDuration(2)).toBe(3300);
  });

  it('returns 4800ms for 3 stages', () => {
    // 3 * (500 + 1000) + 300 = 4800
    expect(computeCompoundDuration(3)).toBe(4800);
  });

  it('returns 6300ms for 4 stages', () => {
    // 4 * (500 + 1000) + 300 = 6300
    expect(computeCompoundDuration(4)).toBe(6300);
  });

  it('follows N * (SCRAMBLE + HOLD) + FADE formula', () => {
    for (let n = 1; n <= 6; n++) {
      expect(computeCompoundDuration(n)).toBe(n * (SCRAMBLE_DURATION_MS + STAGE_HOLD_MS) + FADE_OUT_MS);
    }
  });
});
