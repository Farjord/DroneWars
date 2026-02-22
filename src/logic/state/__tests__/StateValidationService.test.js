/**
 * StateValidationService Tests
 * Tests for state validation methods extracted from GameStateManager
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Import after mock setup
import { debugLog } from '../../../utils/debugLogger.js';

// Minimal GSM stub for constructor injection
function createMockGSM(overrides = {}) {
  return {
    state: { testMode: false, turnPhase: null },
    _updateContext: null,
    actionProcessor: {
      isActionInProgress: vi.fn(() => false),
      getQueueLength: vi.fn(() => 0),
    },
    gameFlowManager: {
      isProcessingAutomaticPhase: false,
    },
    ...overrides,
  };
}

// Dynamic import so the mock is in place
const { default: StateValidationService } = await import('../StateValidationService.js');

describe('StateValidationService', () => {
  let service;
  let mockGSM;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGSM = createMockGSM();
    service = new StateValidationService(mockGSM);
  });

  describe('extractCallerInfo', () => {
    test('extracts function names and file names from stack lines', () => {
      const stackLines = [
        'Error',
        '    at setState (http://localhost:5173/src/managers/GameStateManager.js:380:15)',
        '    at processAction (http://localhost:5173/src/managers/ActionProcessor.js:120:10)',
        '    at handleClick (http://localhost:5173/src/components/App.jsx:50:5)',
      ];

      const result = service.extractCallerInfo(stackLines);

      expect(result.functions).toContain('setState');
      expect(result.functions).toContain('processAction');
      expect(result.functions).toContain('handleClick');
      expect(result.files).toContain('GameStateManager.js');
      expect(result.files).toContain('ActionProcessor.js');
      expect(result.files).toContain('App.jsx');
      expect(result.primaryCaller).toBe('setState');
      expect(result.primaryFile).toBe('GameStateManager.js');
    });

    test('deduplicates function and file names', () => {
      const stackLines = [
        'Error',
        '    at setState (http://localhost:5173/src/managers/GameStateManager.js:380:15)',
        '    at setState (http://localhost:5173/src/managers/GameStateManager.js:390:15)',
      ];

      const result = service.extractCallerInfo(stackLines);

      expect(result.functions.filter(f => f === 'setState')).toHaveLength(1);
    });

    test('returns Unknown for empty stack', () => {
      const result = service.extractCallerInfo([]);

      expect(result.primaryCaller).toBe('Unknown');
      expect(result.primaryFile).toBe('Unknown');
      expect(result.functions).toEqual([]);
      expect(result.files).toEqual([]);
    });

    test('filters out Object and anonymous function names', () => {
      const stackLines = [
        'Error',
        '    at Object.setState (http://localhost:5173/src/managers/GameStateManager.js:380:15)',
        '    at anonymous (http://localhost:5173/src/managers/GameStateManager.js:380:15)',
      ];

      const result = service.extractCallerInfo(stackLines);

      expect(result.functions).not.toContain('Object');
      expect(result.functions).not.toContain('anonymous');
    });
  });

  describe('isInitializationPhase', () => {
    const initPhases = [null, 'preGame', 'droneSelection', 'deckSelection', 'deckBuilding', 'placement', 'gameInitializing', 'initialDraw'];
    const gameplayPhases = ['deployment', 'action', 'roundEnd', 'gameEnd', 'energyReset', 'draw'];

    test('returns true for initialization phases', () => {
      for (const phase of initPhases) {
        expect(service.isInitializationPhase(phase)).toBe(true);
      }
    });

    test('returns false for gameplay phases', () => {
      for (const phase of gameplayPhases) {
        expect(service.isInitializationPhase(phase)).toBe(false);
      }
    });
  });

  describe('validateTurnPhaseTransition', () => {
    test('does not warn for valid transitions', () => {
      service.validateTurnPhaseTransition(null, 'preGame');
      service.validateTurnPhaseTransition('preGame', 'droneSelection');
      service.validateTurnPhaseTransition('deployment', 'action');

      const warningCalls = debugLog.mock.calls.filter(
        call => call[0] === 'VALIDATION' && typeof call[1] === 'string' && call[1].includes('Invalid turn phase')
      );
      expect(warningCalls).toHaveLength(0);
    });

    test('warns for invalid transitions', () => {
      service.validateTurnPhaseTransition('gameEnd', 'deployment');

      expect(debugLog).toHaveBeenCalledWith(
        'VALIDATION',
        expect.stringContaining('Invalid turn phase transition')
      );
    });

    test('skips validation in test mode', () => {
      mockGSM.state.testMode = true;

      service.validateTurnPhaseTransition('gameEnd', 'deployment');

      const warningCalls = debugLog.mock.calls.filter(
        call => call[0] === 'VALIDATION' && typeof call[1] === 'string' && call[1].includes('Invalid turn phase')
      );
      expect(warningCalls).toHaveLength(0);
    });
  });

  describe('validatePlayerStates', () => {
    test('warns on negative energy', () => {
      service.validatePlayerStates(
        { energy: -1, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        { energy: 5, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      );

      expect(debugLog).toHaveBeenCalledWith(
        'VALIDATION',
        expect.stringContaining('negative energy')
      );
    });

    test('warns on duplicate drone IDs', () => {
      const dupeId = 'drone-123';
      service.validatePlayerStates(
        { dronesOnBoard: { lane1: [{ id: dupeId }], lane2: [], lane3: [] } },
        { dronesOnBoard: { lane1: [{ id: dupeId }], lane2: [], lane3: [] } }
      );

      expect(debugLog).toHaveBeenCalledWith(
        'VALIDATION',
        expect.stringContaining('Duplicate drone ID')
      );
    });

    test('does not warn for valid player states', () => {
      service.validatePlayerStates(
        { energy: 5, dronesOnBoard: { lane1: [{ id: 'd1' }], lane2: [], lane3: [] } },
        { energy: 3, dronesOnBoard: { lane1: [{ id: 'd2' }], lane2: [], lane3: [] } }
      );

      const warningCalls = debugLog.mock.calls.filter(
        call => call[0] === 'VALIDATION'
      );
      expect(warningCalls).toHaveLength(0);
    });

    test('handles null players gracefully', () => {
      expect(() => service.validatePlayerStates(null, null)).not.toThrow();
      expect(() => service.validatePlayerStates(null, { energy: 5 })).not.toThrow();
    });
  });
});
