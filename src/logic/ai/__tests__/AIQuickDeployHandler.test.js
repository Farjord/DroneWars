import { describe, it, expect, vi } from 'vitest';
import { finishDeploymentPhase } from '../AIQuickDeployHandler.js';

describe('AIQuickDeployHandler', () => {
  describe('finishDeploymentPhase', () => {
    it('returns without error when gameStateManager is null', async () => {
      await expect(finishDeploymentPhase(null, () => ({}))).resolves.toBeUndefined();
    });

    it('stops when AI has already passed', async () => {
      const mockGSM = {
        getState: vi.fn(() => ({
          passInfo: { player2Passed: true },
          player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
          player2: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
        })),
        setState: vi.fn(),
        addLogEntry: vi.fn()
      };

      await finishDeploymentPhase(mockGSM, () => ({}));
      // Should not crash, just exit early
      expect(mockGSM.setState).not.toHaveBeenCalled();
    });
  });
});
