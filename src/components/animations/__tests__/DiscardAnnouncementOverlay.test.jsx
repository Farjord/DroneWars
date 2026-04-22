import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DiscardAnnouncementOverlay from '../DiscardAnnouncementOverlay.jsx';
import { DISCARD_TOTAL_MS } from '../../../config/announcementTiming.js';

vi.mock('../ShatterCard.jsx', () => ({
  default: ({ card, triggered }) => (
    <div data-testid="shatter-card" data-card-name={card?.name} data-triggered={String(triggered)} />
  ),
}));

const card1 = { id: 'c1', name: 'Shock Wave', instanceId: 'i1' };
const card2 = { id: 'c2', name: 'Blitz', instanceId: 'i2' };

describe('DiscardAnnouncementOverlay', () => {
  it('shows "You Discarded" when discardingPlayerId matches localPlayerId', () => {
    render(
      <DiscardAnnouncementOverlay
        cards={[card1]}
        discardingPlayerId="player1"
        localPlayerId="player1"
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText('You Discarded')).toBeTruthy();
  });

  it('shows "Opponent Discarded" when discardingPlayerId differs from localPlayerId', () => {
    render(
      <DiscardAnnouncementOverlay
        cards={[card1]}
        discardingPlayerId="player2"
        localPlayerId="player1"
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText('Opponent Discarded')).toBeTruthy();
  });

  it('renders a ShatterCard for each discarded card', () => {
    render(
      <DiscardAnnouncementOverlay
        cards={[card1, card2]}
        discardingPlayerId="player1"
        localPlayerId="player1"
        onComplete={vi.fn()}
      />
    );
    const shards = screen.getAllByTestId('shatter-card');
    expect(shards).toHaveLength(2);
    expect(shards[0]).toHaveAttribute('data-card-name', 'Shock Wave');
    expect(shards[1]).toHaveAttribute('data-card-name', 'Blitz');
  });

  it('calls onComplete after the total animation duration', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <DiscardAnnouncementOverlay
        cards={[card1]}
        discardingPlayerId="player1"
        localPlayerId="player1"
        onComplete={onComplete}
      />
    );

    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DISCARD_TOTAL_MS + 50);
    });

    expect(onComplete).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
