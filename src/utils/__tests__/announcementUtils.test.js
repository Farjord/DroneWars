/**
 * announcementUtils Tests
 * TDD: Tests written first for shared announcement personalization utility.
 */

import { describe, it, expect } from 'vitest';
import { personalizeAnnouncements, extractAnnouncements, mergeCompoundAnnouncements } from '../announcementUtils.js';

describe('personalizeAnnouncements', () => {
  const baseState = {
    roundNumber: 3,
    firstPlayerOfRound: 'player1',
  };

  it('bakes round number into roundAnnouncement text', () => {
    const animations = {
      actionAnimations: [],
      systemAnimations: [{
        animationName: 'PHASE_ANNOUNCEMENT',
        payload: { phase: 'roundAnnouncement', text: 'ROUND', subtitle: null },
      }],
    };

    personalizeAnnouncements(animations, 'player1', baseState);

    expect(animations.systemAnimations[0].payload.text).toBe('ROUND 3');
  });

  it('sets "You Go First" subtitle for first player on deployment', () => {
    const animations = {
      actionAnimations: [{
        animationName: 'PHASE_ANNOUNCEMENT',
        payload: { phase: 'deployment', text: 'DEPLOYMENT PHASE', subtitle: null },
      }],
      systemAnimations: [],
    };

    personalizeAnnouncements(animations, 'player1', baseState);

    expect(animations.actionAnimations[0].payload.subtitle).toBe('You Go First');
  });

  it('sets "Opponent Goes First" subtitle for second player on deployment', () => {
    const animations = {
      actionAnimations: [{
        animationName: 'PHASE_ANNOUNCEMENT',
        payload: { phase: 'deployment', text: 'DEPLOYMENT PHASE', subtitle: null },
      }],
      systemAnimations: [],
    };

    personalizeAnnouncements(animations, 'player2', baseState);

    expect(animations.actionAnimations[0].payload.subtitle).toBe('Opponent Goes First');
  });

  it('sets first-player subtitle on action phase', () => {
    const animations = {
      actionAnimations: [{
        animationName: 'PHASE_ANNOUNCEMENT',
        payload: { phase: 'action', text: 'ACTION PHASE', subtitle: null },
      }],
      systemAnimations: [],
    };

    personalizeAnnouncements(animations, 'player1', baseState);

    expect(animations.actionAnimations[0].payload.subtitle).toBe('You Go First');
  });

  it('personalizes PASS_ANNOUNCEMENT for local player', () => {
    const animations = {
      actionAnimations: [{
        animationName: 'PASS_ANNOUNCEMENT',
        payload: { passedPlayerId: 'player1' },
      }],
      systemAnimations: [],
    };

    personalizeAnnouncements(animations, 'player1', baseState);

    expect(animations.actionAnimations[0].payload.text).toBe('YOU PASSED');
    expect(animations.actionAnimations[0].payload.phase).toBe('playerPass');
  });

  it('personalizes PASS_ANNOUNCEMENT for opponent', () => {
    const animations = {
      actionAnimations: [{
        animationName: 'PASS_ANNOUNCEMENT',
        payload: { passedPlayerId: 'player2' },
      }],
      systemAnimations: [],
    };

    personalizeAnnouncements(animations, 'player1', baseState);

    expect(animations.actionAnimations[0].payload.text).toBe('OPPONENT PASSED');
  });

  it('leaves non-announcement animations untouched', () => {
    const animations = {
      actionAnimations: [{
        animationName: 'DRONE_ATTACK',
        payload: { damage: 5 },
      }],
      systemAnimations: [],
    };

    personalizeAnnouncements(animations, 'player1', baseState);

    expect(animations.actionAnimations[0].payload).toEqual({ damage: 5 });
  });

  it('defaults round number to 1 when state.roundNumber is falsy', () => {
    const animations = {
      actionAnimations: [],
      systemAnimations: [{
        animationName: 'PHASE_ANNOUNCEMENT',
        payload: { phase: 'roundAnnouncement', text: 'ROUND', subtitle: null },
      }],
    };

    personalizeAnnouncements(animations, 'player1', { roundNumber: 0 });

    expect(animations.systemAnimations[0].payload.text).toBe('ROUND 1');
  });
});

describe('extractAnnouncements', () => {
  it('separates PHASE_ANNOUNCEMENT and PASS_ANNOUNCEMENT from visual animations', () => {
    const allAnimations = [
      { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'deployment', text: 'DEPLOYMENT PHASE', subtitle: null } },
      { animationName: 'DRONE_ATTACK', payload: { damage: 5 } },
      { animationName: 'PASS_ANNOUNCEMENT', payload: { passedPlayerId: 'player1', text: 'YOU PASSED', phase: 'playerPass' } },
      { animationName: 'SHIELD_HIT', payload: { blocked: 2 } },
    ];

    const { announcements, visualAnimations } = extractAnnouncements(allAnimations);

    expect(announcements).toHaveLength(2);
    expect(visualAnimations).toHaveLength(2);
    expect(announcements[0].phaseName).toBe('deployment');
    expect(announcements[0].phaseText).toBe('DEPLOYMENT PHASE');
    expect(announcements[1].phaseName).toBe('playerPass');
    expect(visualAnimations[0].animationName).toBe('DRONE_ATTACK');
    expect(visualAnimations[1].animationName).toBe('SHIELD_HIT');
  });

  it('returns empty announcements when none present', () => {
    const allAnimations = [
      { animationName: 'DRONE_ATTACK', payload: { damage: 5 } },
    ];

    const { announcements, visualAnimations } = extractAnnouncements(allAnimations);

    expect(announcements).toHaveLength(0);
    expect(visualAnimations).toHaveLength(1);
  });

  it('generates unique ids for each announcement', () => {
    const allAnimations = [
      { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'roundAnnouncement', text: 'ROUND 1' } },
      { animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'deployment', text: 'DEPLOYMENT PHASE' } },
    ];

    const { announcements } = extractAnnouncements(allAnimations);

    expect(announcements[0].id).toBeTruthy();
    expect(announcements[1].id).toBeTruthy();
    expect(announcements[0].id).not.toBe(announcements[1].id);
  });
});

describe('mergeCompoundAnnouncements', () => {
  function mkAnnouncement(phaseName, phaseText, subtitle = null) {
    return { id: `phase-anim-${phaseName}`, phaseName, phaseText, subtitle };
  }

  it('merges [playerPass, deploymentComplete, action] into one compound item', () => {
    const input = [
      mkAnnouncement('playerPass', 'YOU PASSED'),
      mkAnnouncement('deploymentComplete', 'DEPLOYMENT COMPLETE'),
      mkAnnouncement('action', 'ACTION PHASE', 'You Go First'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result).toHaveLength(1);
    expect(result[0].compound).toBe(true);
    expect(result[0].phaseName).toBe('compoundDeployToAction');
    expect(result[0].stages).toEqual([
      { phaseText: 'YOU PASSED', subtitle: 'Deployment Complete' },
      { phaseText: 'ACTION PHASE', subtitle: 'You Go First' },
    ]);
  });

  it('preserves "OPPONENT PASSED" text in stage 1', () => {
    const input = [
      mkAnnouncement('playerPass', 'OPPONENT PASSED'),
      mkAnnouncement('deploymentComplete', 'DEPLOYMENT COMPLETE'),
      mkAnnouncement('action', 'ACTION PHASE', 'Opponent Goes First'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result).toHaveLength(1);
    expect(result[0].stages[0].phaseText).toBe('OPPONENT PASSED');
    expect(result[0].stages[1].subtitle).toBe('Opponent Goes First');
  });

  it('does not merge when only 2 of 3 items match (partial match)', () => {
    const input = [
      mkAnnouncement('playerPass', 'YOU PASSED'),
      mkAnnouncement('deploymentComplete', 'DEPLOYMENT COMPLETE'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result).toHaveLength(2);
    expect(result[0].compound).toBeFalsy();
    expect(result[1].compound).toBeFalsy();
  });

  it('does not merge when sequence is in wrong order', () => {
    const input = [
      mkAnnouncement('deploymentComplete', 'DEPLOYMENT COMPLETE'),
      mkAnnouncement('playerPass', 'YOU PASSED'),
      mkAnnouncement('action', 'ACTION PHASE', 'You Go First'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result).toHaveLength(3);
    expect(result.every(a => !a.compound)).toBe(true);
  });

  it('passes through non-matching announcements unchanged', () => {
    const input = [
      mkAnnouncement('roundAnnouncement', 'ROUND 1'),
      mkAnnouncement('deployment', 'DEPLOYMENT PHASE', 'You Go First'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result).toHaveLength(2);
    expect(result[0].phaseName).toBe('roundAnnouncement');
    expect(result[1].phaseName).toBe('deployment');
  });

  it('preserves surrounding items when pattern is embedded', () => {
    const input = [
      mkAnnouncement('roundAnnouncement', 'ROUND 1'),
      mkAnnouncement('playerPass', 'YOU PASSED'),
      mkAnnouncement('deploymentComplete', 'DEPLOYMENT COMPLETE'),
      mkAnnouncement('action', 'ACTION PHASE', 'You Go First'),
      mkAnnouncement('deployment', 'DEPLOYMENT PHASE'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result).toHaveLength(3);
    expect(result[0].phaseName).toBe('roundAnnouncement');
    expect(result[1].compound).toBe(true);
    expect(result[1].phaseName).toBe('compoundDeployToAction');
    expect(result[2].phaseName).toBe('deployment');
  });

  it('returns empty array for empty input', () => {
    expect(mergeCompoundAnnouncements([])).toEqual([]);
  });

  it('generates a new id for the compound item', () => {
    const input = [
      mkAnnouncement('playerPass', 'YOU PASSED'),
      mkAnnouncement('deploymentComplete', 'DEPLOYMENT COMPLETE'),
      mkAnnouncement('action', 'ACTION PHASE', 'You Go First'),
    ];

    const result = mergeCompoundAnnouncements(input);

    expect(result[0].id).toMatch(/^phase-anim-/);
    expect(result[0].id).not.toBe(input[0].id);
  });
});
