import { describe, it, expect } from 'vitest';
import { isRepositionNoOp } from '../isRepositionNoOp';

describe('isRepositionNoOp', () => {
  it('returns true when insertion index is null', () => {
    expect(isRepositionNoOp(null, 1)).toBe(true);
  });

  it('returns true when insertion index equals current index (same position)', () => {
    expect(isRepositionNoOp(1, 1)).toBe(true);
  });

  it('returns false when moving to front', () => {
    expect(isRepositionNoOp(0, 2)).toBe(false);
  });

  it('returns false when moving to end (the bug case)', () => {
    expect(isRepositionNoOp(2, 0)).toBe(false);
  });

  it('returns false when moving right by one — B in [A,B,C] to [A,C,B]', () => {
    expect(isRepositionNoOp(2, 1)).toBe(false);
  });

  it('returns false when moving left by one — B in [A,B,C] to [B,A,C]', () => {
    expect(isRepositionNoOp(0, 1)).toBe(false);
  });
});
