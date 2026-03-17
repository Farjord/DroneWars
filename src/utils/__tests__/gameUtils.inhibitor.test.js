import { describe, it, expect } from 'vitest';
import { hasMovementInhibitorInLane } from '../gameUtils.js';

function makeInhibitorTech() {
  return {
    id: 'inhibitor_1',
    name: 'Thruster Inhibitor',
    isTech: true,
    abilities: [{
      name: 'Thruster Lock',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'INHIBIT_MOVEMENT' },
    }],
  };
}

function makePlayerStates(overrides = {}) {
  const base = {
    player1: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [] },
    },
    player2: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      techSlots: { lane1: [], lane2: [], lane3: [] },
    },
  };
  return { ...base, ...overrides };
}

describe('hasMovementInhibitorInLane (3-arg signature)', () => {
  it('returns true when OPPONENT has inhibitor tech in lane', () => {
    const states = makePlayerStates();
    // Player2 has the inhibitor in lane1 — player1's drones should be inhibited
    states.player2.techSlots.lane1.push(makeInhibitorTech());

    expect(hasMovementInhibitorInLane(states, 'player1', 'lane1')).toBe(true);
  });

  it('returns false when drone OWNER has inhibitor but opponent does not', () => {
    const states = makePlayerStates();
    // Player1 has the inhibitor on their own board — their own drones should NOT be inhibited
    states.player1.techSlots.lane1.push(makeInhibitorTech());

    expect(hasMovementInhibitorInLane(states, 'player1', 'lane1')).toBe(false);
  });

  it('returns false when neither player has inhibitor', () => {
    const states = makePlayerStates();
    expect(hasMovementInhibitorInLane(states, 'player1', 'lane1')).toBe(false);
  });

  it('checks both techSlots and dronesOnBoard on opponent board', () => {
    const states = makePlayerStates();
    // Opponent has inhibitor as a drone (unusual but the function checks both)
    states.player2.dronesOnBoard.lane2.push({
      id: 'inhibitor_drone',
      name: 'Some Inhibitor Drone',
      abilities: [{
        name: 'Lock',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'INHIBIT_MOVEMENT' },
      }],
    });

    expect(hasMovementInhibitorInLane(states, 'player1', 'lane2')).toBe(true);
  });

  it('works symmetrically for player2 as drone owner', () => {
    const states = makePlayerStates();
    // Player1 has inhibitor — player2's drones inhibited
    states.player1.techSlots.lane3.push(makeInhibitorTech());

    expect(hasMovementInhibitorInLane(states, 'player2', 'lane3')).toBe(true);
    // Player2's own board has nothing — player1's drones NOT inhibited in lane3
    expect(hasMovementInhibitorInLane(states, 'player1', 'lane3')).toBe(false);
  });
});
