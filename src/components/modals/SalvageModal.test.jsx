/**
 * SalvageModal Component Tests
 * TDD: Tests for salvage modal UI improvements
 * - Progress bar should NOT be rendered
 * - Large centered "?" in locked slots (no Lock icon)
 * - Sweep line scan effect on scanning slots
 */

import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SalvageModal from './SalvageModal.jsx';

describe('SalvageModal', () => {
  const mockOnSalvageSlot = vi.fn();
  const mockOnLeave = vi.fn();
  const mockOnEngageCombat = vi.fn();
  const mockOnEscape = vi.fn();
  const mockOnQuit = vi.fn();

  // Base salvage state with multiple slots, none revealed yet
  const baseSalvageState = {
    poi: {
      poiData: {
        name: 'Abandoned Outpost',
        description: 'A derelict structure',
        color: '#10b981'
      }
    },
    zone: 2,
    totalSlots: 3,
    slots: [
      { revealed: false, type: null, content: null },
      { revealed: false, type: null, content: null },
      { revealed: false, type: null, content: null }
    ],
    currentSlotIndex: 0,
    currentEncounterChance: 15,
    encounterTriggered: false
  };

  // Salvage state with first slot revealed (card)
  const partiallyRevealedState = {
    ...baseSalvageState,
    slots: [
      { revealed: true, type: 'card', content: { rarity: 'Rare' } },
      { revealed: false, type: null, content: null },
      { revealed: false, type: null, content: null }
    ],
    currentSlotIndex: 1,
    currentEncounterChance: 25
  };

  // Salvage state with encounter triggered
  const encounterState = {
    ...baseSalvageState,
    encounterTriggered: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders null when no salvageState provided', () => {
      const { container } = render(
        <SalvageModal
          salvageState={null}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders POI name and description', () => {
      render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText('Abandoned Outpost')).toBeInTheDocument();
      expect(screen.getByText('A derelict structure')).toBeInTheDocument();
    });

    test('renders correct number of slots based on totalSlots', () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      const slots = container.querySelectorAll('.salvage-slot');
      expect(slots).toHaveLength(3);
    });
  });

  describe('Progress Bar Removal', () => {
    test('does NOT render progress bar container during scanning', async () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Click salvage button to start scanning
      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      fireEvent.click(salvageButton);

      // Progress bar container should NOT exist
      const progressContainer = container.querySelector('.salvage-scan-container');
      expect(progressContainer).toBeNull();
    });

    test('does NOT render "SCANNING FOR THREATS..." text', async () => {
      render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Click salvage button to start scanning
      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      fireEvent.click(salvageButton);

      // "SCANNING FOR THREATS..." text should NOT appear
      expect(screen.queryByText(/scanning for threats/i)).not.toBeInTheDocument();
    });

    test('does NOT render progress percentage during scanning', async () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Click salvage button to start scanning
      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      fireEvent.click(salvageButton);

      // Progress percentage element should NOT exist
      const progressPercent = container.querySelector('.salvage-scan-percent');
      expect(progressPercent).toBeNull();
    });
  });

  describe('Locked Slot Display', () => {
    test('renders large question mark in locked slots', () => {
      const { container } = render(
        <SalvageModal
          salvageState={partiallyRevealedState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Locked slots (index 2, which is after current target at index 1) should have question mark
      const questionMarks = container.querySelectorAll('.salvage-slot-question');
      expect(questionMarks.length).toBeGreaterThan(0);
      expect(questionMarks[0].textContent).toBe('?');
    });

    test('does NOT render Lock icon in locked slots', () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Get locked slots (all except first which is "next")
      const lockedSlots = container.querySelectorAll('.salvage-slot--locked');

      lockedSlots.forEach(slot => {
        // Should not contain any SVG (Lock icon)
        const svgIcons = slot.querySelectorAll('svg');
        expect(svgIcons.length).toBe(0);
      });
    });

    test('locked slots do NOT have "Scanning..." label text', () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      const lockedSlots = container.querySelectorAll('.salvage-slot--locked');

      lockedSlots.forEach(slot => {
        expect(slot.textContent).not.toContain('Scanning');
      });
    });
  });

  describe('Scanning State', () => {
    test('applies scanning class to slot being scanned', async () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Click salvage button to start scanning
      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      fireEvent.click(salvageButton);

      // First slot should have scanning class
      const scanningSlot = container.querySelector('.salvage-slot--scanning');
      expect(scanningSlot).not.toBeNull();
    });

    test('scanning slot does NOT have "Scanning..." text label', async () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Click salvage button to start scanning
      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      fireEvent.click(salvageButton);

      // Scanning slot should NOT have "Scanning..." text
      const scanningSlot = container.querySelector('.salvage-slot--scanning');
      expect(scanningSlot.textContent).not.toContain('Scanning...');
    });
  });

  describe('Next Target Slot', () => {
    test('applies next class to current target slot', () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // First slot should have next class
      const nextSlot = container.querySelector('.salvage-slot--next');
      expect(nextSlot).not.toBeNull();
    });

    test('next target slot shows large question mark', () => {
      const { container } = render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      const nextSlot = container.querySelector('.salvage-slot--next');
      const questionMark = nextSlot.querySelector('.salvage-slot-question');
      expect(questionMark).not.toBeNull();
      expect(questionMark.textContent).toBe('?');
    });
  });

  describe('Revealed Slots', () => {
    test('revealed card slots show HiddenCard component', () => {
      const { container } = render(
        <SalvageModal
          salvageState={partiallyRevealedState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // First slot is revealed as card
      const cardSlot = container.querySelector('.salvage-slot--card');
      expect(cardSlot).not.toBeNull();

      // Should contain HiddenCard (has dw-hidden-card class)
      const hiddenCard = cardSlot.querySelector('.dw-hidden-card');
      expect(hiddenCard).not.toBeNull();
    });
  });

  describe('Action Buttons', () => {
    test('renders Leave POI button when nothing revealed', () => {
      render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByRole('button', { name: /leave poi/i })).toBeInTheDocument();
    });

    test('renders Leave with Loot button when slots revealed', () => {
      render(
        <SalvageModal
          salvageState={partiallyRevealedState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByRole('button', { name: /leave with loot/i })).toBeInTheDocument();
    });

    test('renders Salvage button for initial state', () => {
      render(
        <SalvageModal
          salvageState={baseSalvageState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByRole('button', { name: /^salvage$/i })).toBeInTheDocument();
    });

    test('renders Continue Salvaging button when slots revealed', () => {
      render(
        <SalvageModal
          salvageState={partiallyRevealedState}
          detection={20}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByRole('button', { name: /continue salvaging/i })).toBeInTheDocument();
    });
  });

  describe('Encounter State', () => {
    test('renders combat buttons when encounter triggered', () => {
      render(
        <SalvageModal
          salvageState={encounterState}
          detection={50}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
          onEngageCombat={mockOnEngageCombat}
          onEscape={mockOnEscape}
          onQuit={mockOnQuit}
        />
      );

      expect(screen.getByRole('button', { name: /abort mission/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /escape/i })).toBeInTheDocument();
    });
  });

  describe('MIA Warning', () => {
    // State with high detection that would cause MIA when leaving
    const highDetectionState = {
      ...baseSalvageState,
      poi: {
        poiData: {
          name: 'Dangerous Outpost',
          description: 'A dangerous location',
          color: '#ef4444',
          threatIncrease: 15  // Will cause MIA if detection >= 85
        }
      }
    };

    // tierConfig with fallback looting threat
    const tierConfig = {
      detectionTriggers: {
        looting: 10
      }
    };

    test('shows MIA warning when detection + threatIncrease >= 100', () => {
      render(
        <SalvageModal
          salvageState={highDetectionState}
          tierConfig={tierConfig}
          detection={90}  // 90 + 15 = 105 >= 100
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText(/salvaging would result in mia/i)).toBeInTheDocument();
    });

    test('disables Salvage button when MIA would occur', () => {
      render(
        <SalvageModal
          salvageState={highDetectionState}
          tierConfig={tierConfig}
          detection={90}  // 90 + 15 = 105 >= 100
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      expect(salvageButton).toBeDisabled();
    });

    test('keeps Leave POI button enabled when MIA would occur', () => {
      render(
        <SalvageModal
          salvageState={highDetectionState}
          tierConfig={tierConfig}
          detection={90}
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      const leaveButton = screen.getByRole('button', { name: /leave poi/i });
      expect(leaveButton).not.toBeDisabled();
    });

    test('shows correct detection values in warning message', () => {
      render(
        <SalvageModal
          salvageState={highDetectionState}
          tierConfig={tierConfig}
          detection={90}  // 90 + 15 = 105
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      // Should show the threat increase and total
      expect(screen.getByText(/\+15%/)).toBeInTheDocument();
      expect(screen.getByText(/105%/)).toBeInTheDocument();
    });

    test('does NOT show MIA warning when detection is safe', () => {
      render(
        <SalvageModal
          salvageState={highDetectionState}
          tierConfig={tierConfig}
          detection={50}  // 50 + 15 = 65 < 100
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.queryByText(/salvaging would result in mia/i)).not.toBeInTheDocument();
    });

    test('Salvage button is enabled when detection is safe', () => {
      render(
        <SalvageModal
          salvageState={highDetectionState}
          tierConfig={tierConfig}
          detection={50}  // 50 + 15 = 65 < 100
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      const salvageButton = screen.getByRole('button', { name: /salvage/i });
      expect(salvageButton).not.toBeDisabled();
    });

    test('uses tierConfig fallback when POI has no threatIncrease', () => {
      const stateNoThreat = {
        ...baseSalvageState,
        poi: {
          poiData: {
            name: 'Basic Outpost',
            description: 'A basic location'
            // No threatIncrease - should use tierConfig.detectionTriggers.looting (10)
          }
        }
      };

      render(
        <SalvageModal
          salvageState={stateNoThreat}
          tierConfig={tierConfig}
          detection={95}  // 95 + 10 = 105 >= 100
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText(/salvaging would result in mia/i)).toBeInTheDocument();
      expect(screen.getByText(/\+10%/)).toBeInTheDocument();
    });

    test('shows MIA warning at exactly 100% detection threshold', () => {
      const stateExact = {
        ...baseSalvageState,
        poi: {
          poiData: {
            name: 'Edge Case Outpost',
            description: 'Testing exact threshold',
            threatIncrease: 10
          }
        }
      };

      render(
        <SalvageModal
          salvageState={stateExact}
          tierConfig={tierConfig}
          detection={90}  // 90 + 10 = 100 exactly
          onSalvageSlot={mockOnSalvageSlot}
          onLeave={mockOnLeave}
        />
      );

      expect(screen.getByText(/salvaging would result in mia/i)).toBeInTheDocument();
    });
  });
});
