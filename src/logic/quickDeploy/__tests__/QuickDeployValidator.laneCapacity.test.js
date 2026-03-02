import { describe, it, expect, vi } from 'vitest';

// Mock calculateEffectiveShipStats
vi.mock('../../../logic/statsCalculator.js', () => ({
  calculateEffectiveShipStats: vi.fn().mockReturnValue({
    totals: { initialDeployment: 20, energyPerTurn: 10, cpuLimit: 10 }
  })
}));

import { validateAgainstDeck } from '../QuickDeployValidator.js';

const createMockDeck = (droneNames) => ({
  droneSlots: droneNames.map(name => ({ assignedDrone: name }))
});

const mockPlayerState = { shipSections: {} };
const mockPlacedSections = ['SectionA', 'SectionB', 'SectionC'];

describe('QuickDeployValidator - lane capacity', () => {
  it('should flag assignment with 6 drones in one lane as invalid', () => {
    const qd = {
      name: 'Test Deploy',
      droneRoster: ['Dart', 'Dart', 'Dart', 'Dart', 'Talon', 'Talon'],
      placements: [
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Talon', lane: 0 },
        { droneName: 'Talon', lane: 0 },
      ],
    };
    const deck = createMockDeck(['Dart', 'Dart', 'Dart', 'Dart', 'Talon', 'Talon']);
    const result = validateAgainstDeck(qd, deck, mockPlayerState, mockPlacedSections);
    expect(result.valid).toBe(false);
    expect(result.reasons.some(r => r.type === 'lane_capacity_exceeded')).toBe(true);
  });

  it('should allow 5 drones in one lane (at limit)', () => {
    const qd = {
      name: 'Test Deploy',
      droneRoster: ['Dart', 'Dart', 'Talon', 'Talon', 'Striker'],
      placements: [
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Talon', lane: 0 },
        { droneName: 'Talon', lane: 0 },
        { droneName: 'Striker', lane: 0 },
      ],
    };
    const deck = createMockDeck(['Dart', 'Dart', 'Talon', 'Talon', 'Striker']);
    const result = validateAgainstDeck(qd, deck, mockPlayerState, mockPlacedSections);
    expect(result.reasons.filter(r => r.type === 'lane_capacity_exceeded')).toHaveLength(0);
  });

  it('should flag lane with mixed types totalling over 5 as invalid', () => {
    const qd = {
      name: 'Test Deploy',
      droneRoster: ['Dart', 'Dart', 'Talon', 'Talon', 'Striker', 'Striker', 'Striker'],
      placements: [
        { droneName: 'Dart', lane: 1 },
        { droneName: 'Dart', lane: 1 },
        { droneName: 'Talon', lane: 1 },
        { droneName: 'Talon', lane: 1 },
        { droneName: 'Striker', lane: 1 },
        { droneName: 'Striker', lane: 1 },
      ],
    };
    const deck = createMockDeck(['Dart', 'Dart', 'Talon', 'Talon', 'Striker', 'Striker', 'Striker']);
    const result = validateAgainstDeck(qd, deck, mockPlayerState, mockPlacedSections);
    expect(result.valid).toBe(false);
    const laneCapErrors = result.reasons.filter(r => r.type === 'lane_capacity_exceeded');
    expect(laneCapErrors).toHaveLength(1);
    expect(laneCapErrors[0].details.lane).toBe(1);
    expect(laneCapErrors[0].details.count).toBe(6);
  });
});
