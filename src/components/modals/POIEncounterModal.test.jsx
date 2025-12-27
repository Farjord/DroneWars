/**
 * POIEncounterModal Component Tests
 * TDD: Tests for POI encounter modal with evade item functionality
 */

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import POIEncounterModal from './POIEncounterModal.jsx';

// Mock gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(() => ({
      singlePlayerProfile: {
        tacticalItems: {
          ITEM_EVADE: 2,
          ITEM_EXTRACT: 1,
          ITEM_THREAT_REDUCE: 3
        }
      }
    })),
    getTacticalItemCount: vi.fn((id) => {
      const counts = { ITEM_EVADE: 2, ITEM_EXTRACT: 1, ITEM_THREAT_REDUCE: 3 };
      return counts[id] || 0;
    }),
    subscribe: vi.fn(() => () => {}),
    emit: vi.fn()
  }
}));

describe('POIEncounterModal', () => {
  const mockOnProceed = vi.fn();
  const mockOnQuickDeploy = vi.fn();
  const mockOnEscape = vi.fn();
  const mockOnEvade = vi.fn();
  const mockOnClose = vi.fn();

  const combatEncounter = {
    poi: {
      poiData: {
        name: 'Hostile Outpost',
        description: 'Enemy stronghold',
        flavourText: 'Scanners detect hostile activity...',
        color: '#ef4444'
      }
    },
    outcome: 'combat',
    aiId: 'RAIDER',
    reward: {
      credits: 500,
      rewardType: 'TECH_SALVAGE'
    },
    detection: 45.5,
    threatLevel: 'medium'
  };

  const lootEncounter = {
    poi: {
      poiData: {
        name: 'Abandoned Cache',
        description: 'Supply depot',
        flavourText: 'No hostile signatures detected...',
        color: '#10b981'
      }
    },
    outcome: 'loot',
    aiId: null,
    reward: {
      credits: 300,
      rewardType: 'RESOURCES'
    },
    detection: 20.0,
    threatLevel: 'low'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders null when no encounter provided', () => {
      const { container } = render(
        <POIEncounterModal
          encounter={null}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders POI name and description', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Hostile Outpost')).toBeInTheDocument();
      expect(screen.getByText('Enemy stronghold')).toBeInTheDocument();
    });

    test('shows HOSTILE SIGNATURES DETECTED for combat encounters', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('HOSTILE SIGNATURES DETECTED')).toBeInTheDocument();
    });

    test('shows AREA SECURED for loot encounters', () => {
      render(
        <POIEncounterModal
          encounter={lootEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('AREA SECURED')).toBeInTheDocument();
    });
  });

  describe('Combat Actions', () => {
    test('renders Escape button for combat encounters', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /escape/i })).toBeInTheDocument();
    });

    test('calls onEscape when Escape button clicked', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /escape/i }));
      expect(mockOnEscape).toHaveBeenCalledTimes(1);
    });

    test('renders Engage Hostiles button for combat without quick deploy', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
          validQuickDeployments={[]}
        />
      );

      expect(screen.getByRole('button', { name: /engage hostiles/i })).toBeInTheDocument();
    });

    test('renders Standard and Quick Deploy buttons when quick deployments available', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onQuickDeploy={mockOnQuickDeploy}
          onClose={mockOnClose}
          validQuickDeployments={[{ id: 'deploy1' }]}
        />
      );

      expect(screen.getByRole('button', { name: /standard deploy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick deploy/i })).toBeInTheDocument();
    });
  });

  describe('Loot Actions', () => {
    test('renders Salvage Location button for loot encounters', () => {
      render(
        <POIEncounterModal
          encounter={lootEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /salvage location/i })).toBeInTheDocument();
    });
  });

  describe('Evade Item - Combat Encounters', () => {
    test('renders Evade Item button when combat encounter and evadeItemCount > 0', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onEvade={mockOnEvade}
          onClose={mockOnClose}
          evadeItemCount={2}
        />
      );

      expect(screen.getByRole('button', { name: /use jammer/i })).toBeInTheDocument();
    });

    test('shows remaining evade item count on button', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onEvade={mockOnEvade}
          onClose={mockOnClose}
          evadeItemCount={2}
        />
      );

      // Should show count indicator like "x2" or "(2)"
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    test('calls onEvade handler when Evade Item button clicked', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onEvade={mockOnEvade}
          onClose={mockOnClose}
          evadeItemCount={2}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /use jammer/i }));
      expect(mockOnEvade).toHaveBeenCalledTimes(1);
    });

    test('hides Evade Item button when evadeItemCount is 0', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onEvade={mockOnEvade}
          onClose={mockOnClose}
          evadeItemCount={0}
        />
      );

      expect(screen.queryByRole('button', { name: /use jammer/i })).not.toBeInTheDocument();
    });

    test('hides Evade Item button when evadeItemCount prop not provided', () => {
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByRole('button', { name: /use jammer/i })).not.toBeInTheDocument();
    });
  });

  describe('Evade Item - Non-Combat Encounters', () => {
    test('hides Evade Item button for loot encounters even when items available', () => {
      render(
        <POIEncounterModal
          encounter={lootEncounter}
          onProceed={mockOnProceed}
          onEvade={mockOnEvade}
          onClose={mockOnClose}
          evadeItemCount={2}
        />
      );

      expect(screen.queryByRole('button', { name: /use jammer/i })).not.toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    test('calls onClose when overlay clicked', () => {
      const { container } = render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );

      const overlay = container.querySelector('.dw-modal-overlay');
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('does not call onClose when modal content clicked', () => {
      const { container } = render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onClose={mockOnClose}
        />
      );

      const content = container.querySelector('.dw-modal-content');
      fireEvent.click(content);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Potential Reputation Tooltip', () => {
    test('should render potential reputation label with title attribute when reputation data provided', () => {
      const encounterWithRep = {
        ...combatEncounter,
        aiData: {
          difficulty: 'Easy',
          shipClass: 'Raider',
          escapeDamage: { min: 2, max: 4 }
        },
        potentialReputation: {
          repEarned: 1000,
          aiMultiplier: 0.5,
          aiDifficulty: 'Easy',
          wasCapped: false
        }
      };

      const { container } = render(
        <POIEncounterModal
          encounter={encounterWithRep}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onClose={mockOnClose}
        />
      );

      const labels = container.querySelectorAll('.dw-modal-stat-label');
      const repLabel = Array.from(labels).find(label => label.textContent.includes('Potential Reputation'));

      expect(repLabel).toHaveAttribute('title');
    });

    test('should have formula explanation in title attribute', () => {
      const encounterWithRep = {
        ...combatEncounter,
        aiData: {
          difficulty: 'Easy',
          shipClass: 'Raider',
          escapeDamage: { min: 2, max: 4 }
        },
        potentialReputation: {
          repEarned: 1000,
          aiMultiplier: 0.5,
          aiDifficulty: 'Easy',
          wasCapped: false
        }
      };

      const { container } = render(
        <POIEncounterModal
          encounter={encounterWithRep}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onClose={mockOnClose}
        />
      );

      const labels = container.querySelectorAll('.dw-modal-stat-label');
      const repLabel = Array.from(labels).find(label => label.textContent.includes('Potential Reputation'));
      const title = repLabel.getAttribute('title');

      expect(title).toContain('Formula');
      expect(title).toContain('Deck Value');
      expect(title).toContain('Map Cap');
      expect(title).toContain('AI Multiplier');
    });

    test('should not render potential reputation when data not provided', () => {
      // Combat encounter without potentialReputation
      render(
        <POIEncounterModal
          encounter={combatEncounter}
          onProceed={mockOnProceed}
          onEscape={mockOnEscape}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText(/Potential Reputation/i)).not.toBeInTheDocument();
    });
  });
});
