import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useWinnerModal from '../useWinnerModal';

describe('useWinnerModal', () => {
  it('shows modal when winner is set', () => {
    const { result, rerender } = renderHook(
      ({ winner }) => useWinnerModal(winner),
      { initialProps: { winner: null } }
    );

    expect(result.current.showWinnerModal).toBe(false);

    rerender({ winner: 'player1' });

    expect(result.current.showWinnerModal).toBe(true);
  });

  it('stays closed after dismissal even though winner is still truthy', () => {
    const { result, rerender } = renderHook(
      ({ winner }) => useWinnerModal(winner),
      { initialProps: { winner: 'player1' } }
    );

    expect(result.current.showWinnerModal).toBe(true);

    act(() => {
      result.current.dismissWinnerModal();
    });

    expect(result.current.showWinnerModal).toBe(false);

    // Re-render with the same winner — modal must stay closed
    rerender({ winner: 'player1' });
    expect(result.current.showWinnerModal).toBe(false);
  });

  it('resets for a new game — shows modal again after winner clears and a new winner is set', () => {
    const { result, rerender } = renderHook(
      ({ winner }) => useWinnerModal(winner),
      { initialProps: { winner: 'player1' } }
    );

    act(() => {
      result.current.dismissWinnerModal();
    });
    expect(result.current.showWinnerModal).toBe(false);

    // New game starts — winner clears
    rerender({ winner: null });
    expect(result.current.showWinnerModal).toBe(false);

    // New game ends — new winner
    rerender({ winner: 'player2' });
    expect(result.current.showWinnerModal).toBe(true);
  });
});
