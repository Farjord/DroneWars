/**
 * RunSummaryModal.test.jsx
 * Tests for RunSummaryModal reputation display
 *
 * Updated for event-driven reputation system:
 * - Combat Rep, Exploration Rep, Extraction Bonus breakdown
 * - No MIA penalty, no starter deck exclusion
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RunSummaryModal from '../RunSummaryModal.jsx';

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
        combatRep: 800,
        explorationRep: 500,
        extractionBonus: 200,
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
        combatRep: 800,
        explorationRep: 500,
        extractionBonus: 200,
        leveledUp: false
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    // Check total reputation
    expect(screen.getByText('+1,500')).toBeInTheDocument();

    // Check combat rep breakdown
    expect(screen.getByText('+800')).toBeInTheDocument();

    // Check exploration rep breakdown
    expect(screen.getByText('+500')).toBeInTheDocument();

    // Check extraction bonus
    expect(screen.getByText('+200')).toBeInTheDocument();
  });

  it('should show level up notice when leveledUp is true', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        repGained: 2000,
        combatRep: 1500,
        explorationRep: 300,
        extractionBonus: 200,
        leveledUp: true,
        previousLevel: 2,
        newLevel: 3
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText(/Level Up!/i)).toBeInTheDocument();
    expect(screen.getByText(/2.*→.*3/)).toBeInTheDocument();
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

  it('should show Combat Rep and Exploration Rep labels', () => {
    const summary = {
      ...baseSummary,
      reputation: {
        repGained: 1000,
        combatRep: 600,
        explorationRep: 200,
        extractionBonus: 200,
        leveledUp: false
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText('Combat Rep')).toBeInTheDocument();
    expect(screen.getByText('Exploration Rep')).toBeInTheDocument();
    expect(screen.getByText('Extraction Bonus')).toBeInTheDocument();
  });

  it('should not show extraction bonus on failed run (0 bonus)', () => {
    const summary = {
      ...baseSummary,
      success: false,
      reputation: {
        repGained: 450,
        combatRep: 300,
        explorationRep: 150,
        extractionBonus: 0,
        leveledUp: false
      }
    };

    render(<RunSummaryModal summary={summary} onClose={vi.fn()} />);

    // Extraction Bonus label should not appear when bonus is 0
    expect(screen.queryByText('Extraction Bonus')).toBeNull();
  });
});
