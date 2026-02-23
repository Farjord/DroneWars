// ========================================
// SHIP SECTIONS DISPLAY ACTION CARD DROP TESTS
// ========================================
// TDD tests for action card ship section targeting via drag-and-drop
// Tests that SHIP_SECTION targeting cards (like Shield Boost) can be
// dropped on ship sections to trigger the card play.

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShipSectionsDisplay from '../ShipSectionsDisplay.jsx';

// Mock dependencies
vi.mock('../ShipSectionCompact.jsx', () => ({
  default: ({ section, onClick, isCardTarget }) => (
    <div
      data-testid={`section-${section}`}
      data-is-card-target={isCardTarget}
      onClick={onClick}
    >
      {section}
    </div>
  )
}));

vi.mock('../../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveShipStats: () => ({ bySection: {} })
  })
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../utils/shipSectionImageResolver.js', () => ({
  resolveShipSectionStats: (stats) => stats
}));

// Helper to find section wrapper elements (the divs with onMouseUp)
const getSectionWrappers = (container) => {
  // Find the mock section elements and get their parent divs
  const sectionElements = container.querySelectorAll('[data-testid^="section-"]');
  return Array.from(sectionElements).map(el => el.parentElement);
};

describe('ShipSectionsDisplay action card drop', () => {
  // Mock Shield Boost card - SHIP_SECTION targeting with FRIENDLY affinity
  const mockShipSectionCard = {
    id: 'CARD037',
    instanceId: 'CARD037-inst-1',
    name: 'Shield Boost',
    cost: 2,
    type: 'Support',
    targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' },
    effect: { type: 'RESTORE_SECTION_SHIELDS', value: 2 }
  };

  // Mock a DRONE targeting card (should NOT trigger section drop)
  const mockDroneTargetCard = {
    id: 'CARD001',
    instanceId: 'CARD001-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    targeting: { type: 'DRONE', affinity: 'ANY' },
    effect: { type: 'DAMAGE', amount: 2 }
  };

  const defaultProps = {
    player: {
      shipSections: {
        bridge: { hull: 8, maxHull: 8, shields: 2, allocatedShields: 1 },
        powerCell: { hull: 6, maxHull: 6, shields: 2, allocatedShields: 0 },
        droneControlHub: { hull: 10, maxHull: 10, shields: 2, allocatedShields: 2 }
      }
    },
    isPlayer: true,
    placedSections: ['bridge', 'powerCell', 'droneControlHub'],
    onSectionClick: vi.fn(),
    onAbilityClick: vi.fn(),
    onTargetClick: vi.fn(),
    onViewFullCard: vi.fn(),
    isInteractive: false,
    validCardTargets: [
      { id: 'bridge', owner: 'player1' },
      { id: 'powerCell', owner: 'player1' },
      { id: 'droneControlHub', owner: 'player1' }
    ],
    selectedDrone: null,
    reallocationPhase: null,
    pendingShieldAllocations: null,
    pendingShieldChanges: null,
    gameEngine: {
      getEffectiveSectionMaxShields: vi.fn()
    },
    turnPhase: 'action',
    isMyTurn: () => true,
    passInfo: {},
    getLocalPlayerId: () => 'player1',
    localPlayerState: { energy: 5 },
    shipAbilityMode: null,
    hoveredTarget: null,
    setHoveredTarget: vi.fn(),
    sectionRefs: { current: {} },
    draggedDrone: null,
    handleDroneDragEnd: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ship section drop detection for SHIP_SECTION targeting cards', () => {
    it('should call handleActionCardDragEnd with section for SHIP_SECTION targeting card', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      // Find the section wrapper divs (the ones with onMouseUp)
      const sectionWrappers = getSectionWrappers(container);

      // Trigger mouseUp on the first section (bridge)
      fireEvent.mouseUp(sectionWrappers[0]);

      expect(mockHandleActionCardDragEnd).toHaveBeenCalledWith(
        { id: 'bridge', name: 'bridge' },
        'section',
        'player1'
      );
    });

    it('should call handleActionCardDragEnd with correct owner for opponent section', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          isPlayer={false}
          validCardTargets={[
            { id: 'bridge', owner: 'player2' },
            { id: 'powerCell', owner: 'player2' },
            { id: 'droneControlHub', owner: 'player2' }
          ]}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const sectionWrappers = getSectionWrappers(container);
      fireEvent.mouseUp(sectionWrappers[1]); // powerCell

      expect(mockHandleActionCardDragEnd).toHaveBeenCalledWith(
        { id: 'powerCell', name: 'powerCell' },
        'section',
        'player2'
      );
    });

    it('should call handleActionCardDragEnd with correct section IDs for all sections', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const sectionWrappers = getSectionWrappers(container);

      // Test bridge (index 0)
      fireEvent.mouseUp(sectionWrappers[0]);
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'bridge', name: 'bridge' },
        'section',
        'player1'
      );

      // Test powerCell (index 1)
      fireEvent.mouseUp(sectionWrappers[1]);
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'powerCell', name: 'powerCell' },
        'section',
        'player1'
      );

      // Test droneControlHub (index 2)
      fireEvent.mouseUp(sectionWrappers[2]);
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'droneControlHub', name: 'droneControlHub' },
        'section',
        'player1'
      );
    });
  });

  describe('non-SHIP_SECTION targeting cards', () => {
    it('should NOT call handleActionCardDragEnd for DRONE targeting card on section', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockDroneTargetCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const sectionWrappers = getSectionWrappers(container);
      fireEvent.mouseUp(sectionWrappers[0]);

      expect(mockHandleActionCardDragEnd).not.toHaveBeenCalled();
    });
  });

  describe('no drag active', () => {
    it('should NOT call handleActionCardDragEnd when draggedActionCard is null', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          draggedActionCard={null}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const sectionWrappers = getSectionWrappers(container);
      fireEvent.mouseUp(sectionWrappers[0]);

      expect(mockHandleActionCardDragEnd).not.toHaveBeenCalled();
    });

    it('should NOT throw if handleActionCardDragEnd prop is not provided', () => {
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockShipSectionCard }}
          // handleActionCardDragEnd not provided
        />
      );

      const sectionWrappers = getSectionWrappers(container);

      expect(() => {
        fireEvent.mouseUp(sectionWrappers[0]);
      }).not.toThrow();
    });
  });

  describe('existing functionality preserved', () => {
    it('should still handle drone drop on opponent section', () => {
      const mockHandleDroneDragEnd = vi.fn();
      const mockDrone = { id: 'drone-1', name: 'Dart' };
      const { container } = render(
        <ShipSectionsDisplay
          {...defaultProps}
          isPlayer={false}
          draggedDrone={mockDrone}
          handleDroneDragEnd={mockHandleDroneDragEnd}
        />
      );

      const sectionWrappers = getSectionWrappers(container);
      fireEvent.mouseUp(sectionWrappers[0]); // bridge

      expect(mockHandleDroneDragEnd).toHaveBeenCalled();
    });
  });
});
