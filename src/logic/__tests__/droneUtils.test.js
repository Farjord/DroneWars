import { describe, it, expect } from 'vitest';
import { extractDroneNameFromId } from '../droneUtils.js';

describe('extractDroneNameFromId', () => {
  it.each([
    ['player2_Talon_0006', 'Talon'],
    ['player1_Assault_Hawk_0003', 'Assault_Hawk'],
    ['player1_X_0001', 'X'],
  ])('extracts name from %s → %s', (input, expected) => {
    expect(extractDroneNameFromId(input)).toBe(expected);
  });

  it('returns empty string for null/undefined', () => {
    expect(extractDroneNameFromId(null)).toBe('');
    expect(extractDroneNameFromId(undefined)).toBe('');
    expect(extractDroneNameFromId('')).toBe('');
  });
});
