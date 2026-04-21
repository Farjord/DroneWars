import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DroneActionAnnouncementOverlay from '../DroneActionAnnouncementOverlay.jsx';
import { ACTION_ANNOUNCEMENT_DISPLAY_MS, ACTION_ANNOUNCEMENT_FADE_MS } from '../../../config/announcementTiming.js';

// Mock DroneToken — avoid context dependencies in unit tests
vi.mock('../../ui/DroneToken.jsx', () => ({
  default: ({ drone }) => <div data-testid="drone-token">{drone.name}</div>,
}));

const attackPayload = {
  attackerDrone: { id: 'd1', name: 'Dart' },
  attackerLane: 'lane1',
  attackerIsPlayer: true,
  targetDrone: { id: 'd2', name: 'Viper' },
  targetLane: 'lane2',
  targetIsPlayer: false,
  isIntercepted: false,
};

const movePayload = {
  drone: { id: 'd1', name: 'Dart' },
  sourceLane: 'lane1',
  destinationLane: 'lane2',
  droneIsPlayer: true,
};

describe('DroneActionAnnouncementOverlay', () => {
  it('renders attack variant with attacker and target drone tokens', () => {
    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={attackPayload}
        onComplete={vi.fn()}
      />
    );

    const tokens = screen.getAllByTestId('drone-token');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toHaveTextContent('Dart');
    expect(tokens[1]).toHaveTextContent('Viper');
  });

  it('renders ATTACKS → label in attack variant', () => {
    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={attackPayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText('ATTACKS →')).toBeTruthy();
  });

  it('renders lane badges for attack variant', () => {
    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={attackPayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getAllByText('Left').length).toBeGreaterThan(0);
  });

  it('renders INTERCEPTED! badge when isIntercepted is true', () => {
    const interceptedPayload = { ...attackPayload, isIntercepted: true };
    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={interceptedPayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText('INTERCEPTED!')).toBeTruthy();
  });

  it('shows interceptor drone (not original target) when isIntercepted is true', () => {
    const interceptorPayload = {
      ...attackPayload,
      isIntercepted: true,
      targetDrone: { id: 'd3', name: 'Guardian' },  // interceptor replaces target in payload
    };
    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={interceptorPayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText('Guardian')).toBeTruthy();
    expect(screen.queryByText('Viper')).toBeNull();  // original target not shown
  });

  it('does not render INTERCEPTED! badge when isIntercepted is false', () => {
    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={attackPayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.queryByText('INTERCEPTED!')).toBeNull();
  });

  it('renders move variant with drone token and destination lane', () => {
    render(
      <DroneActionAnnouncementOverlay
        variant="move"
        payload={movePayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByTestId('drone-token')).toHaveTextContent('Dart');
    expect(screen.getByText('MOVES →')).toBeTruthy();
    expect(screen.getByText('Centre')).toBeTruthy();
  });

  it('shows source lane badge for move variant', () => {
    render(
      <DroneActionAnnouncementOverlay
        variant="move"
        payload={movePayload}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText('Left')).toBeTruthy();
  });

  it('calls onComplete after display duration', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <DroneActionAnnouncementOverlay
        variant="attack"
        payload={attackPayload}
        onComplete={onComplete}
      />
    );

    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACTION_ANNOUNCEMENT_DISPLAY_MS + ACTION_ANNOUNCEMENT_FADE_MS + 50);
    });

    expect(onComplete).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
