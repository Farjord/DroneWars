import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * TDD Tests for Boss Combat Outcome Processing
 *
 * Tests for:
 * - processBossVictory: first-time vs repeat rewards, reputation, return to hangar
 * - processBossDefeat: MIA, return to hangar with failed screen
 * - processCombatEnd routing: detect isBossCombat flag and route accordingly
 */

// Mock dependencies
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    endRun: vi.fn(),
    resetGameState: vi.fn()
  }
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../loot/LootGenerator.js', () => ({
  default: {
    generateCombatSalvage: vi.fn(() => ({
      cards: [],
      salvageItem: null,
      aiCores: 0,
      blueprint: null
    })),
    generateDroneBlueprint: vi.fn()
  }
}));

vi.mock('../ExtractionController.js', () => ({
  default: {
    completePostBlockadeExtraction: vi.fn()
  }
}));

vi.mock('../../../data/aiData.js', () => ({
  default: [
    {
      bossId: 'BOSS_T1_NEMESIS',
      name: 'Nemesis-Class Dreadnought',
      modes: ['boss'],
      difficulty: 'Hard',
      bossConfig: {
        displayName: 'THE NEMESIS',
        subtitle: 'Commander',
        firstTimeReward: {
          credits: 5000,
          aiCores: 3,
          reputation: 500
        },
        repeatReward: {
          credits: 1000,
          aiCores: 1,
          reputation: 100
        }
      }
    }
  ]
}));

// Import after mocks
import CombatOutcomeProcessor from '../CombatOutcomeProcessor.js';
import gameStateManager from '../../../managers/GameStateManager.js';

describe('Boss Combat Victory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should route to processBossVictory when isBossCombat is true', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 1
        }
      }
    });

    const gameState = {
      winner: 'player1',
      player1: {
        shipSections: {
          bridge: { hull: 10 },
          powerCell: { hull: 10 },
          droneControlHub: { hull: 10 }
        }
      },
      player2: { deck: [] },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS',
        aiName: 'Nemesis-Class Dreadnought'
      }
    };

    const result = CombatOutcomeProcessor.processCombatEnd(gameState);

    // Should return boss-specific victory result
    expect(result.outcome).toBe('victory');
    expect(result.isBossReward).toBe(true);
  });

  it('should give firstTimeReward when bossId not in defeatedBosses', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],  // Not defeated yet
          totalBossVictories: 0,
          totalBossAttempts: 1
        }
      }
    });

    const gameState = {
      winner: 'player1',
      player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
      player2: { deck: [] },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    const result = CombatOutcomeProcessor.processCombatEnd(gameState);

    expect(result.isFirstBossVictory).toBe(true);
    expect(result.loot.credits).toBe(5000);
    expect(result.loot.aiCores).toBe(3);
    expect(result.loot.reputation).toBe(500);
  });

  it('should give repeatReward when bossId already in defeatedBosses', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: ['BOSS_T1_NEMESIS'],  // Already defeated
          totalBossVictories: 1,
          totalBossAttempts: 2
        }
      }
    });

    const gameState = {
      winner: 'player1',
      player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
      player2: { deck: [] },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    const result = CombatOutcomeProcessor.processCombatEnd(gameState);

    expect(result.isFirstBossVictory).toBe(false);
    expect(result.loot.credits).toBe(1000);
    expect(result.loot.aiCores).toBe(1);
    expect(result.loot.reputation).toBe(100);
  });

  it('should add bossId to defeatedBosses on first victory', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 1
        }
      }
    });

    const gameState = {
      winner: 'player1',
      player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
      player2: { deck: [] },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    CombatOutcomeProcessor.processCombatEnd(gameState);

    // Find the setState call that updates bossProgress
    const setStateCalls = gameStateManager.setState.mock.calls;
    const progressCall = setStateCalls.find(call =>
      call[0].singlePlayerProfile?.bossProgress?.defeatedBosses?.includes('BOSS_T1_NEMESIS')
    );

    expect(progressCall).toBeDefined();
  });

  it('should increment totalBossVictories', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 1
        }
      }
    });

    const gameState = {
      winner: 'player1',
      player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
      player2: { deck: [] },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    CombatOutcomeProcessor.processCombatEnd(gameState);

    // Find the setState call that updates totalBossVictories
    const setStateCalls = gameStateManager.setState.mock.calls;
    const progressCall = setStateCalls.find(call =>
      call[0].singlePlayerProfile?.bossProgress?.totalBossVictories === 1
    );

    expect(progressCall).toBeDefined();
  });

  it('should return to hangar (not tactical map) after boss victory', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 1
        }
      }
    });

    const gameState = {
      winner: 'player1',
      player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
      player2: { deck: [] },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    CombatOutcomeProcessor.processCombatEnd(gameState);

    // The pendingLoot should be set for the loot reveal modal
    const setStateCalls = gameStateManager.setState.mock.calls;
    const lootCall = setStateCalls.find(call => call[0].pendingLoot !== undefined);

    expect(lootCall).toBeDefined();
    expect(lootCall[0].pendingLoot.isBossReward).toBe(true);
  });
});

describe('Boss Combat Defeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should route to processBossDefeat when isBossCombat is true', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 },
      singlePlayerProfile: {
        bossProgress: {
          defeatedBosses: [],
          totalBossVictories: 0,
          totalBossAttempts: 1
        }
      }
    });

    const gameState = {
      winner: 'player2',
      player1: { shipSections: {} },
      player2: { shipSections: {} },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    const result = CombatOutcomeProcessor.processCombatEnd(gameState);

    expect(result.outcome).toBe('defeat');
  });

  it('should mark ship as MIA (unless starter deck)', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 1 }  // Not starter deck
    });

    const gameState = {
      winner: 'player2',
      player1: { shipSections: {} },
      player2: { shipSections: {} },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    CombatOutcomeProcessor.processCombatEnd(gameState);

    // Should call endRun(false) which marks as MIA
    expect(gameStateManager.endRun).toHaveBeenCalledWith(false);
  });

  it('should set failedRunType to "boss"', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 }
    });

    const gameState = {
      winner: 'player2',
      player1: { shipSections: {} },
      player2: { shipSections: {} },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    CombatOutcomeProcessor.processCombatEnd(gameState);

    // Find the setState call that sets failedRunType
    const setStateCalls = gameStateManager.setState.mock.calls;
    const failedCall = setStateCalls.find(call => call[0].failedRunType === 'boss');

    expect(failedCall).toBeDefined();
  });

  it('should return to hangar with showFailedRunScreen', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: { shipSlotId: 0 }
    });

    const gameState = {
      winner: 'player2',
      player1: { shipSections: {} },
      player2: { shipSections: {} },
      singlePlayerEncounter: {
        isBossCombat: true,
        bossId: 'BOSS_T1_NEMESIS'
      }
    };

    CombatOutcomeProcessor.processCombatEnd(gameState);

    // Should show failed run screen
    const setStateCalls = gameStateManager.setState.mock.calls;
    const failedCall = setStateCalls.find(call => call[0].showFailedRunScreen === true);

    expect(failedCall).toBeDefined();
  });
});

describe('finalizeBossLootCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return to hangar after boss loot collection', () => {
    gameStateManager.getState.mockReturnValue({
      currentRunState: null,
      singlePlayerEncounter: { isBossCombat: true, bossId: 'BOSS_T1_NEMESIS' },
      singlePlayerProfile: {
        credits: 1000,
        aiCores: 0,
        reputation: { current: 0 }
      }
    });

    const bossLoot = {
      credits: 5000,
      aiCores: 3,
      reputation: 500,
      isBossReward: true
    };

    CombatOutcomeProcessor.finalizeBossLootCollection(bossLoot);

    // Should set appState to hangar
    const setStateCalls = gameStateManager.setState.mock.calls;
    const hangarCall = setStateCalls.find(call => call[0].appState === 'hangar');

    expect(hangarCall).toBeDefined();
  });
});
