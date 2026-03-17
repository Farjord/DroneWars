import { describe, it, expect, vi } from 'vitest';

vi.mock('../../scoring/laneScoring.js', () => ({
  calculateLaneScore: vi.fn(() => 10)
}));
vi.mock('../../helpers/jammerHelpers.js', () => ({
  hasJammerInLane: vi.fn(() => false)
}));

import { evaluateCreateTokensCard } from '../droneCards.js';
import { INVALID_SCORE } from '../../aiConstants.js';
import { MAX_TECH_PER_LANE } from '../../../utils/gameEngineUtils.js';

function makeCard(tokenName) {
  return {
    id: `DEPLOY_${tokenName.toUpperCase().replace(/ /g, '_')}`,
    name: `Deploy ${tokenName}`,
    cost: 2,
    effects: [{ type: 'CREATE_TECH', tokenName, targeting: { type: 'LANE', affinity: 'FRIENDLY' } }],
  };
}

function makeContext({ player1TechSlots = {}, player2TechSlots = {} } = {}) {
  return {
    player1: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [], ...player1TechSlots },
    },
    player2: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [], ...player2TechSlots },
    },
    gameDataService: {
      getEffectiveStats: () => ({ attack: 3, speed: 3, keywords: new Set() }),
    },
    placedSections: [],
    allSections: { player1: [], player2: [] },
    getShipStatus: () => ({}),
    getLaneOfDrone: () => null,
  };
}

function fillTechSlots(lane) {
  return { [lane]: Array(MAX_TECH_PER_LANE).fill({ id: 'filler', name: 'Filler', isTech: true }) };
}

describe('Mine evaluators check AI (player2) tech slots for capacity', () => {
  const mineTypes = [
    { tokenName: 'Proximity Mine', card: makeCard('Proximity Mine') },
    { tokenName: 'Inhibitor Mine', card: makeCard('Inhibitor Mine') },
    { tokenName: 'Jitter Mine', card: makeCard('Jitter Mine') },
    { tokenName: 'Thruster Inhibitor', card: makeCard('Thruster Inhibitor') },
  ];

  for (const { tokenName, card } of mineTypes) {
    describe(tokenName, () => {
      it('returns INVALID when player2 (AI) tech slots full', () => {
        const target = { id: 'lane1', owner: 'player2', type: 'lane' };
        const context = makeContext({ player2TechSlots: fillTechSlots('lane1') });
        const result = evaluateCreateTokensCard(card, target, context);
        expect(result.score).toBe(INVALID_SCORE);
      });

      it('succeeds when player1 tech slots full but player2 has room', () => {
        const target = { id: 'lane1', owner: 'player2', type: 'lane' };
        const context = makeContext({ player1TechSlots: fillTechSlots('lane1') });

        // For mines/TI that score based on enemy presence, add some enemy drones
        if (tokenName === 'Thruster Inhibitor') {
          context.player1.dronesOnBoard.lane1 = [{ id: 'e1', name: 'Scout', class: 2, isToken: false }];
        }

        const result = evaluateCreateTokensCard(card, target, context);
        expect(result.score).not.toBe(INVALID_SCORE);
      });
    });
  }
});

describe('Mine evaluators check AI (player2) tech slots for duplicates', () => {
  it('Proximity Mine returns INVALID when player2 lane already has one', () => {
    const target = { id: 'lane1', owner: 'player2', type: 'lane' };
    const context = makeContext({
      player2TechSlots: { lane1: [{ id: 'pm1', name: 'Proximity Mine', isTech: true }] },
    });
    const result = evaluateCreateTokensCard(makeCard('Proximity Mine'), target, context);
    expect(result.score).toBe(INVALID_SCORE);
  });

  it('Thruster Inhibitor returns INVALID when player2 lane already has one', () => {
    const target = { id: 'lane1', owner: 'player2', type: 'lane' };
    const context = makeContext({
      player2TechSlots: { lane1: [{ id: 'ti1', name: 'Thruster Inhibitor', isTech: true }] },
    });
    // TI also needs enemy drones to score, but duplicate check comes first
    const result = evaluateCreateTokensCard(makeCard('Thruster Inhibitor'), target, context);
    expect(result.score).toBe(INVALID_SCORE);
  });
});
