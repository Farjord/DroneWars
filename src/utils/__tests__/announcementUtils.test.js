/**
 * announcementUtils Tests
 * TDD: Tests written first for shared announcement personalization utility.
 */

import { describe, it, expect } from 'vitest';
import { personalizeAnnouncements, extractAnnouncements } from '../announcementUtils.js';

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
