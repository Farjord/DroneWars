// ========================================
// BATTLE COLUMN — SHIP SECTION ACTION CARD DROP TESTS
// ========================================
// Tests that SHIP_SECTION targeting cards (like Shield Boost) can be
// dropped on ship sections via mouseUp within BattleColumn.
// Originally tested ShipSectionsDisplay; ported to BattleColumn after
// the 3-column grid restructure.

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BattleColumn from '../BattleColumn.jsx';

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

vi.mock('../SingleLaneView.jsx', () => ({
  default: ({ laneId, isPlayer }) => (
    <div data-testid={`lane-${laneId}-${isPlayer ? 'player' : 'opponent'}`} />
  )
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../logic/cards/shipSectionImageResolver.js', () => ({
  resolveShipSectionStats: (stats) => stats
}));

// Helper to find section wrapper elements (the divs with onMouseUp)
const getSectionWrappers = (container, side) => {
  const prefix = side === 'player' ? 'section-' : 'section-';
  const sectionElements = container.querySelectorAll(`[data-testid^="${prefix}"]`);
  // Filter to only get player or opponent sections based on DOM position
  return Array.from(sectionElements).map(el => el.parentElement);
};

// Helper to get player section wrappers (bottom of column)
const getPlayerSectionWrapper = (container) => {
  const sectionElements = container.querySelectorAll('[data-testid^="section-"]');
  // In BattleColumn: opponent section is first, player section is last
  // There are exactly 2 sections rendered per column
  const all = Array.from(sectionElements).map(el => el.parentElement);
  return all[1]; // Player section is the second one
};

// Helper to get opponent section wrappers (top of column)
const getOpponentSectionWrapper = (container) => {
  const sectionElements = container.querySelectorAll('[data-testid^="section-"]');
  const all = Array.from(sectionElements).map(el => el.parentElement);
  return all[0]; // Opponent section is the first one
};

describe('BattleColumn ship section action card drop', () => {
  const mockShipSectionCard = {
    id: 'CARD037',
    instanceId: 'CARD037-inst-1',
    name: 'Shield Boost',
    cost: 2,
    type: 'Support',
    targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' },
    effect: { type: 'RESTORE_SECTION_SHIELDS', value: 2 }
  };

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
    laneId: 'lane1',
    sectionIndex: 0,
    localPlayerState: {
      energy: 5,
      shipSections: {
        bridge: { hull: 8, maxHull: 8, shields: 2, allocatedShields: 1 }
      }
    },
    opponentPlayerState: {
      shipSections: {
        weapons: { hull: 6, maxHull: 6, shields: 2, allocatedShields: 0 }
      }
    },
    localPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
    opponentPlacedSections: ['weapons', 'engines', 'cargo'],
    selectedCard: null,
    validCardTargets: [
      { id: 'bridge', owner: 'player1' },
      { id: 'weapons', owner: 'player2' }
    ],
    affectedDroneIds: [],
    abilityMode: null,
    validAbilityTargets: [],
    effectChainState: null,
    turnPhase: 'action',
    reallocationPhase: null,
    pendingShieldAllocations: null,
    pendingShieldChanges: null,
    shipAbilityMode: null,
    hoveredTarget: null,
    selectedDrone: null,
    recentlyHitDrones: [],
    potentialInterceptors: [],
    potentialGuardians: [],
    droneRefs: { current: {} },
    sectionRefs: { current: {} },
    mandatoryAction: null,
    gameEngine: { getEffectiveSectionMaxShields: vi.fn(), getShipStatus: vi.fn() },
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    isMyTurn: () => true,
    getPlacedSectionsForEngine: vi.fn(),
    passInfo: {},
    handleTargetClick: vi.fn(),
    handleLaneClick: vi.fn(),
    handleShipSectionClick: vi.fn(),
    handleShipAbilityClick: vi.fn(),
    handleTokenClick: vi.fn(),
    handleAbilityIconClick: vi.fn(),
    setHoveredTarget: vi.fn(),
    onViewShipSection: vi.fn(),
    interceptedBadge: null,
    draggedCard: null,
    handleCardDragEnd: vi.fn(),
    draggedDrone: null,
    handleDroneDragStart: vi.fn(),
    handleDroneDragEnd: vi.fn(),
    draggedActionCard: null,
    handleActionCardDragEnd: vi.fn(),
    hoveredLane: null,
    setHoveredLane: vi.fn(),
    laneControl: { lane1: null, lane2: null, lane3: null },
    opponentEffectiveStats: { bySection: {} },
    localEffectiveStats: { bySection: {} },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ship section drop detection for SHIP_SECTION targeting cards', () => {
    it('should call handleActionCardDragEnd with section for SHIP_SECTION targeting card', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <BattleColumn
          {...defaultProps}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const playerSection = getPlayerSectionWrapper(container);
      fireEvent.mouseUp(playerSection);

      expect(mockHandleActionCardDragEnd).toHaveBeenCalledWith(
        { id: 'bridge', name: 'bridge' },
        'section',
        'player1'
      );
    });

    it('should call handleActionCardDragEnd with correct owner for opponent section', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <BattleColumn
          {...defaultProps}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const opponentSection = getOpponentSectionWrapper(container);
      fireEvent.mouseUp(opponentSection);

      expect(mockHandleActionCardDragEnd).toHaveBeenCalledWith(
        { id: 'weapons', name: 'weapons' },
        'section',
        'player2'
      );
    });

    it('should call handleActionCardDragEnd with correct section IDs across columns', () => {
      const mockHandleActionCardDragEnd = vi.fn();

      // Render column 0 (bridge / weapons)
      const { container: c0 } = render(
        <BattleColumn
          {...defaultProps}
          sectionIndex={0}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );
      fireEvent.mouseUp(getPlayerSectionWrapper(c0));
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'bridge', name: 'bridge' },
        'section',
        'player1'
      );

      // Render column 1 (powerCell / engines)
      const { container: c1 } = render(
        <BattleColumn
          {...defaultProps}
          laneId="lane2"
          sectionIndex={1}
          localPlayerState={{
            ...defaultProps.localPlayerState,
            shipSections: {
              ...defaultProps.localPlayerState.shipSections,
              powerCell: { hull: 6, maxHull: 6, shields: 2, allocatedShields: 0 }
            }
          }}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );
      fireEvent.mouseUp(getPlayerSectionWrapper(c1));
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'powerCell', name: 'powerCell' },
        'section',
        'player1'
      );
    });
  });

  describe('non-SHIP_SECTION targeting cards', () => {
    it('should NOT call handleActionCardDragEnd for DRONE targeting card on section', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <BattleColumn
          {...defaultProps}
          draggedActionCard={{ card: mockDroneTargetCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const playerSection = getPlayerSectionWrapper(container);
      fireEvent.mouseUp(playerSection);

      expect(mockHandleActionCardDragEnd).not.toHaveBeenCalled();
    });
  });

  describe('no drag active', () => {
    it('should NOT call handleActionCardDragEnd when draggedActionCard is null', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      const { container } = render(
        <BattleColumn
          {...defaultProps}
          draggedActionCard={null}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const playerSection = getPlayerSectionWrapper(container);
      fireEvent.mouseUp(playerSection);

      expect(mockHandleActionCardDragEnd).not.toHaveBeenCalled();
    });

    it('should NOT throw if handleActionCardDragEnd prop is not provided', () => {
      const { container } = render(
        <BattleColumn
          {...defaultProps}
          draggedActionCard={{ card: mockShipSectionCard }}
          handleActionCardDragEnd={undefined}
        />
      );

      const playerSection = getPlayerSectionWrapper(container);

      expect(() => {
        fireEvent.mouseUp(playerSection);
      }).not.toThrow();
    });
  });

  describe('existing functionality preserved', () => {
    it('should still handle drone drop on opponent section', () => {
      const mockHandleDroneDragEnd = vi.fn();
      const mockDrone = { id: 'drone-1', name: 'Dart' };
      const { container } = render(
        <BattleColumn
          {...defaultProps}
          draggedDrone={mockDrone}
          handleDroneDragEnd={mockHandleDroneDragEnd}
        />
      );

      const opponentSection = getOpponentSectionWrapper(container);
      fireEvent.mouseUp(opponentSection);

      expect(mockHandleDroneDragEnd).toHaveBeenCalled();
    });
  });
});
