/**
 * RunSummaryModal.test.jsx
 * TDD tests for RunSummaryModal reputation display
 *
 * Tests for reputation destructure fix and display correctness
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RunSummaryModal from './RunSummaryModal.jsx';

describe('RunSummaryModal - Reputation Display', () => {
  const baseSummary = {
    success: true,
    mapName: 'Test Sector',
    mapTier: 1,
    hexesMoved: 10,
    hexesExplored: 8,
    totalHexes: 15,
    mapCompletionPercent: 53,
    poisVisited: 3,
    totalPois: 5,
    cardsCollected: [],
    creditsEarned: 1000,
    combatsWon: 2,
    combatsLost: 0,
    damageDealtToEnemies: 50,
    hullDamageTaken: 10,
    finalHull: 40,
    maxHull: 50,
    runDuration: 120000,
    finalDetection: 45
  };

  it('should render without errors when reputation is provided', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        repGained: 1500,
        combatRepGained: 1000,
        loadoutRepGained: 500,
        isStarterDeck: false,
        leveledUp: false
      }
    };

    expect(() => {
      render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);
    }).not.toThrow();
  });

  it('should display reputation breakdown correctly', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        repGained: 1500,
        combatRepGained: 1000,
        loadoutRepGained: 500,
        isStarterDeck: false,
        leveledUp: false
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    // Check total reputation
    expect(screen.getByText('+1,500')).toBeInTheDocument();

    // Check combat rep breakdown
    expect(screen.getByText('+1,000')).toBeInTheDocument();

    // Check loadout rep breakdown
    expect(screen.getByText('+500')).toBeInTheDocument();
  });

  it('should show MIA penalty notice when success is false', () => {
    const summary = {
      ...baseSummary,
      success: false,
      reputation: {
        repGained: 375,
        combatRepGained: 250,
        loadoutRepGained: 125,
        isStarterDeck: false,
        leveledUp: false
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText(/MIA Penalty Applied/i)).toBeInTheDocument();
    expect(screen.getByText(/75% reputation lost/i)).toBeInTheDocument();
  });

  it('should show level up notice when leveledUp is true', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        repGained: 2000,
        combatRepGained: 1500,
        loadoutRepGained: 500,
        isStarterDeck: false,
        leveledUp: true,
        previousLevel: 2,
        newLevel: 3
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText(/Level Up!/i)).toBeInTheDocument();
    expect(screen.getByText(/2.*→.*3/)).toBeInTheDocument();
  });

  it('should show starter deck notice when isStarterDeck is true', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        isStarterDeck: true
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText(/Starter deck used/i)).toBeInTheDocument();
    expect(screen.getByText(/no reputation earned/i)).toBeInTheDocument();
  });

  it('should not show reputation section when reputation is not provided', () => {
    const summary = {
      ...baseSummary
      // No reputation field
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    // Reputation section should not appear
    expect(screen.queryByText(/Reputation Earned/i)).toBeNull();
  });

  it('should show Combat Rep and Loadout Rep labels', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        repGained: 1500,
        combatRepGained: 1000,
        loadoutRepGained: 500,
        isStarterDeck: false,
        leveledUp: false
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText('Combat Rep')).toBeInTheDocument();
    expect(screen.getByText('Loadout Rep')).toBeInTheDocument();
  });
});
