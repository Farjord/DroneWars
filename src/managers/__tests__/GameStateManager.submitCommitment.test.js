/**
 * GameStateManager.submitCommitment() Tests
 * TDD: Verifies commitments route through gameServer when available,
 * ensuring GameEngine captures and broadcasts announcement animations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from '../GameStateManager.js';

describe('GameStateManager.submitCommitment', () => {
  beforeEach(() => {
    // Reset gameServer
    gameStateManager.setGameServer(null);
  });

  it('routes through gameServer.submitAction when gameServer is set', async () => {
    const mockResult = { success: true };
    const mockGameServer = {
      submitAction: vi.fn().mockResolvedValue(mockResult),
      getLocalPlayerId: () => 'player1',
    };
    gameStateManager.setGameServer(mockGameServer);

    const payload = { phase: 'deckSelection', playerId: 'player1', actionData: {} };
    const result = await gameStateManager.submitCommitment(payload);

    expect(mockGameServer.submitAction).toHaveBeenCalledWith('commitment', payload);
    expect(result).toBe(mockResult);
  });

  it('falls back to actionProcessor.processCommitment when no gameServer', async () => {
    const mockResult = { success: true };
    gameStateManager.actionProcessor = {
      ...gameStateManager.actionProcessor,
      processCommitment: vi.fn().mockResolvedValue(mockResult),
    };

    const payload = { phase: 'deckSelection', playerId: 'player1', actionData: {} };
    const result = await gameStateManager.submitCommitment(payload);

    expect(gameStateManager.actionProcessor.processCommitment).toHaveBeenCalledWith(payload);
    expect(result).toBe(mockResult);
  });
});
