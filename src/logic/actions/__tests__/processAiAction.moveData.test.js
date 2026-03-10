import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAiAction } from '../DroneActionStrategy.js';

/**
 * Tests that AI SINGLE_MOVE card plays (Maneuver/Maneuver+) correctly
 * bridge moveData into chainSelections for the effect chain processor.
 *
 * Bug: AI generates play_card actions with moveData but processAiAction
 * ignores it, passing null target → crash in executeSingleMove.
 */

describe('processAiAction: play_card with moveData', () => {
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      processCardPlay: vi.fn().mockResolvedValue({ success: true }),
      processDeployment: vi.fn(),
      processAttack: vi.fn(),
      processMove: vi.fn(),
      processAbility: vi.fn(),
      get: vi.fn().mockReturnValue(1),
    };
  });

  it('passes chainSelections built from moveData for movement cards', async () => {
    const drone = { id: 'drone-1', name: 'Scout', owner: 'player2' };
    const card = { id: 'card-maneuver-plus', name: 'Maneuver+', effectType: 'SINGLE_MOVE' };

    const aiDecision = {
      type: 'action',
      payload: {
        type: 'play_card',
        card,
        target: null,
        moveData: { drone, fromLane: 'lane2', toLane: 'lane3' },
      }
    };

    await processAiAction({ aiDecision }, mockCtx);

    expect(mockCtx.processCardPlay).toHaveBeenCalledWith({
      card,
      targetId: undefined,
      playerId: 'player2',
      chainSelections: [{
        target: drone,
        lane: 'lane2',
        destination: 'lane3'
      }]
    });
  });

  it('does not add chainSelections when moveData is absent', async () => {
    const card = { id: 'card-repair', name: 'Repair', effectType: 'REPAIR' };
    const target = { id: 'drone-2' };

    const aiDecision = {
      type: 'action',
      payload: {
        type: 'play_card',
        card,
        target,
      }
    };

    await processAiAction({ aiDecision }, mockCtx);

    const callArg = mockCtx.processCardPlay.mock.calls[0][0];
    expect(callArg).toEqual({
      card,
      targetId: 'drone-2',
      playerId: 'player2',
    });
    expect(callArg).not.toHaveProperty('chainSelections');
  });
});
