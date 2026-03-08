import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClientStateStore from '../ClientStateStore.js';

describe('ClientStateStore', () => {
  let store;
  let mockGSM;
  let gsmSubscribers;

  const mockState = {
    turnPhase: 'action',
    player1: { hp: 10 },
    player2: { hp: 8 },
  };

  beforeEach(() => {
    gsmSubscribers = [];
    mockGSM = {
      getState: vi.fn().mockReturnValue(mockState),
      subscribe: vi.fn((listener) => {
        gsmSubscribers.push(listener);
        return () => {
          const idx = gsmSubscribers.indexOf(listener);
          if (idx > -1) gsmSubscribers.splice(idx, 1);
        };
      }),
    };
    store = new ClientStateStore(mockGSM);
  });

  describe('getState', () => {
    it('delegates to gameStateManager.getState', () => {
      expect(store.getState()).toBe(mockState);
      expect(mockGSM.getState).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      expect(typeof unsub).toBe('function');
    });

    it('notifies subscribers when GSM emits events', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      // Simulate GSM emitting an event
      gsmSubscribers.forEach(sub => sub({ type: 'STATE_UPDATE' }));

      expect(listener).toHaveBeenCalledWith({ type: 'STATE_UPDATE' });
    });

    it('unsubscribe stops notifications', () => {
      const listener = vi.fn();
      const unsub = store.subscribe(listener);
      unsub();

      gsmSubscribers.forEach(sub => sub({ type: 'STATE_UPDATE' }));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getState during engine processing', () => {
    it('returns pre-processing snapshot when engine is processing and no appliedState', () => {
      const preProcessingState = { turnPhase: 'action', player1: { hp: 10 }, player2: { hp: 8 } };
      mockGSM._engineProcessing = true;
      mockGSM._preProcessingState = preProcessingState;

      expect(store.getState()).toBe(preProcessingState);
      // Should NOT have called gsm.getState since snapshot was returned
      mockGSM.getState.mockClear();
      store.getState();
      expect(mockGSM.getState).not.toHaveBeenCalled();
    });

    it('returns appliedState over snapshot when appliedState exists', () => {
      const appliedState = { turnPhase: 'deployment', player1: { hp: 9 }, player2: { hp: 7 } };
      store.applyUpdate(appliedState);

      mockGSM._engineProcessing = true;
      mockGSM._preProcessingState = { turnPhase: 'action', player1: { hp: 10 }, player2: { hp: 8 } };

      expect(store.getState()).toBe(appliedState);
    });

    it('falls through to gsm.getState when not processing', () => {
      mockGSM._engineProcessing = false;
      mockGSM._preProcessingState = null;

      expect(store.getState()).toBe(mockState);
      expect(mockGSM.getState).toHaveBeenCalled();
    });
  });

  describe('applyUpdate', () => {
    it('notifies subscribers with ENGINE_UPDATE event', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      const newState = { turnPhase: 'deployment', player1: { hp: 10 }, player2: { hp: 5 } };
      store.applyUpdate(newState);

      expect(listener).toHaveBeenCalledWith({ type: 'ENGINE_UPDATE' });
    });

    it('updates getState to return the new state after applyUpdate', () => {
      const newState = { turnPhase: 'deployment', player1: { hp: 10 }, player2: { hp: 5 } };
      store.applyUpdate(newState);

      // After applyUpdate, getState returns the applied state
      expect(store.getState()).toEqual(newState);
    });
  });
});
