/**
 * Game State Factory Functions
 * Complex game state builders for comprehensive phase management tests
 */

import { createMockPlayer } from './phaseTestHelpers.js';

/**
 * Creates a complete game state for a specific phase
 */
export const createCompleteGameState = (phase, options = {}) => {
  const defaults = {
    gameMode: 'host',
    roundNumber: 1,
    includeAI: false,
    player1Cards: 5,
    player2Cards: 5,
    deployedDrones: { player1: [], player2: [] },
    currentPlayer: 'player1'
  };

  const config = { ...defaults, ...options };

  return {
    turnPhase: phase,
    gameMode: config.gameMode,
    gameStage: 'roundLoop',
    roundNumber: config.roundNumber,
    turn: 1,
    currentPlayer: config.currentPlayer,
    firstPlayerOfRound: config.currentPlayer,
    firstPasserOfPreviousRound: null,
    passInfo: {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    },
    commitments: {},
    player1: {
      ...createMockPlayer('Player 1'),
      hand: Array(config.player1Cards).fill({ id: 'card', name: 'Test Card' }),
      dronesOnBoard: {
        lane1: config.deployedDrones.player1.filter((_, i) => i % 3 === 0),
        lane2: config.deployedDrones.player1.filter((_, i) => i % 3 === 1),
        lane3: config.deployedDrones.player1.filter((_, i) => i % 3 === 2)
      }
    },
    player2: {
      ...createMockPlayer(config.includeAI ? 'AI' : 'Player 2'),
      hand: Array(config.player2Cards).fill({ id: 'card', name: 'Test Card' }),
      dronesOnBoard: {
        lane1: config.deployedDrones.player2.filter((_, i) => i % 3 === 0),
        lane2: config.deployedDrones.player2.filter((_, i) => i % 3 === 1),
        lane3: config.deployedDrones.player2.filter((_, i) => i % 3 === 2)
      }
    }
  };
};

/**
 * Creates a multi-round game state with first passer history
 */
export const createMultiRoundState = (currentRound, firstPasserHistory = []) => {
  const state = createCompleteGameState('action', { roundNumber: currentRound });

  // Set first passer of previous round if history exists
  if (firstPasserHistory.length >= currentRound - 1) {
    state.firstPasserOfPreviousRound = firstPasserHistory[currentRound - 2];
  }

  // Determine current round's first player based on previous round
  if (state.firstPasserOfPreviousRound === 'player1') {
    state.firstPlayerOfRound = 'player2';
    state.currentPlayer = 'player2';
  } else if (state.firstPasserOfPreviousRound === 'player2') {
    state.firstPlayerOfRound = 'player1';
    state.currentPlayer = 'player1';
  }

  return state;
};

/**
 * Creates a game state that triggers phase skip logic
 */
export const createSkippablePhaseState = (phaseToSkip) => {
  const state = createCompleteGameState('roundInitialization');

  switch (phaseToSkip) {
    case 'mandatoryDiscard':
      // Both players at or under hand limit
      state.player1.hand = Array(5).fill({ id: 'card' });
      state.player2.hand = Array(5).fill({ id: 'card' });
      break;

    case 'optionalDiscard':
      // Both players have no cards
      state.player1.hand = [];
      state.player2.hand = [];
      break;

    case 'allocateShields':
      // Round 1 or no shields to allocate
      state.roundNumber = 1;
      state.player1.shieldsToAllocate = 0;
      state.player2.shieldsToAllocate = 0;
      break;

    case 'mandatoryDroneRemoval':
      // No excess drones
      state.player1.dronesOnBoard = { lane1: [], lane2: [], lane3: [] };
      state.player2.dronesOnBoard = { lane1: [], lane2: [], lane3: [] };
      break;
  }

  return state;
};

/**
 * Creates a game state with specific commitment state
 */
export const createCommitmentState = (phase, player1Committed, player2Committed) => {
  const state = createCompleteGameState(phase);

  state.commitments[phase] = {
    player1: { completed: player1Committed },
    player2: { completed: player2Committed }
  };

  return state;
};

/**
 * Creates a game state with specific pass state
 */
export const createPassState = (phase, player1Passed, player2Passed, firstPasser = null) => {
  const state = createCompleteGameState(phase);

  state.passInfo = {
    player1Passed,
    player2Passed,
    firstPasser
  };

  return state;
};

/**
 * Creates a game state with empty deck for testing reshuffle
 */
export const createEmptyDeckState = () => {
  const state = createCompleteGameState('roundInitialization');

  state.player1.deck = [];
  state.player1.discard = Array(10).fill({ id: 'card', name: 'Test Card' });

  return state;
};
