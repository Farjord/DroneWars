/**
 * ViewDeckModal.test.jsx
 * TDD tests for ViewDeckModal component
 *
 * Tests focus on:
 * 1. ShipCard display at top of modal
 * 2. Ship-specific section image resolution
 * 3. Modal open/close behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock ShipCard component
vi.mock('../../ui/ShipCard.jsx', () => ({
  default: ({ ship, isSelectable }) => (
    <div data-testid="ship-card" data-ship-name={ship?.name} data-selectable={isSelectable}>
      {ship?.name}
    </div>
  )
}));

// Mock ShipSection component
vi.mock('../../ui/ShipSection.jsx', () => ({
  default: ({ section, stats }) => (
    <div data-testid={`ship-section-${section}`} data-image={stats?.image}>
      {section}
    </div>
  )
}));

// Mock DroneCard component
vi.mock('../../ui/DroneCard.jsx', () => ({
  default: ({ drone }) => (
    <div data-testid="drone-card">{drone?.name}</div>
  )
}));

// Mock ActionCard component
vi.mock('../../ui/ActionCard.jsx', () => ({
  default: ({ card }) => (
    <div data-testid="action-card">{card?.name}</div>
  )
}));

// Mock shipSectionData
vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    {
      id: 'BRIDGE_001',
      key: 'bridge',
      type: 'Bridge',
      name: 'Standard Command Bridge',
      image: '/DroneWars/img/Bridge.png',
      stats: { healthy: { Draw: 5, Discard: 3 } },
      middleLaneBonus: { Draw: 1, Discard: 1 }
    },
    {
      id: 'POWERCELL_001',
      key: 'powerCell',
      type: 'Power Cell',
      name: 'Standard Power Cell',
      image: '/DroneWars/img/Power_Cell.png',
      stats: { healthy: { 'Energy Per Turn': 10 } },
      middleLaneBonus: { 'Energy Per Turn': 2 }
    },
    {
      id: 'DRONECONTROL_001',
      key: 'droneControlHub',
      type: 'Drone Control Hub',
      name: 'Standard Drone Control Hub',
      image: '/DroneWars/img/Drone_Control_Hub.png',
      stats: { healthy: { 'Initial Deployment': 6 } },
      middleLaneBonus: { 'Initial Deployment': 2 }
    }
  ]
}));

// Mock gameEngine
vi.mock('../../../logic/gameLogic.js', () => ({
  gameEngine: {}
}));

// Mock resolveShipSectionStats to return stats with resolved image
vi.mock('../../../logic/cards/shipSectionImageResolver.js', () => ({
  resolveShipSectionStats: vi.fn((stats, ship) => {
    if (!stats || !ship) return stats;
    // Simulate resolved image path
    const shipName = ship.name?.includes('Corvette') ? 'Corvette' :
                     ship.name?.includes('Carrier') ? 'Carrier' : 'Scout';
    const sectionType = stats.type?.replace(/ /g, '_') || 'Bridge';
    return {
      ...stats,
      image: `/DroneWars/Ships/${shipName}/${sectionType}.png`
    };
  })
}));

// Import component after mocks
import ViewDeckModal from '../ViewDeckModal.jsx';
import { resolveShipSectionStats } from '../../../logic/cards/shipSectionImageResolver.js';

describe('ViewDeckModal', () => {
  const mockShip = {
    id: 'SHIP_001',
    name: 'Reconnaissance Corvette',
    rarity: 'Common',
    baseHull: 8,
    baseShields: 3,
    deckLimits: { totalCards: 40, ordnanceLimit: 15, tacticLimit: 15, supportLimit: 15, upgradeLimit: 10 }
  };

  const mockShipComponents = {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  };

  const mockDrones = [
    { name: 'Dart', class: 1 },
    { name: 'Fighter Drone', class: 2 }
  ];

  const mockCards = [
    { card: { name: 'Laser Burst', cost: 2 }, quantity: 3 },
    { card: { name: 'Shield Boost', cost: 1 }, quantity: 2 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ViewDeckModal
          isOpen={false}
          onClose={() => {}}
          title="Test Deck"
        />
      );

      expect(screen.queryByText('Test Deck')).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
        />
      );

      expect(screen.getByText('Test Deck')).toBeInTheDocument();
    });

    it('should display correct drone and card counts', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          drones={mockDrones}
          cards={mockCards}
        />
      );

      // 2 drones, 5 cards (3+2)
      expect(screen.getByText('2 drones, 5 cards')).toBeInTheDocument();
    });
  });

  describe('ShipCard display', () => {
    it('should render ShipCard when ship prop is provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
        />
      );

      const shipCard = screen.getByTestId('ship-card');
      expect(shipCard).toBeInTheDocument();
      expect(shipCard).toHaveAttribute('data-ship-name', 'Reconnaissance Corvette');
    });

    it('should NOT render ShipCard when ship is null', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={null}
        />
      );

      expect(screen.queryByTestId('ship-card')).toBeNull();
    });

    it('should NOT render ShipCard when ship is undefined', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
        />
      );

      expect(screen.queryByTestId('ship-card')).toBeNull();
    });

    it('should display "Your Ship" heading when ship provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
        />
      );

      expect(screen.getByText('Your Ship')).toBeInTheDocument();
    });

    it('should NOT display "Your Ship" heading when ship is null', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={null}
        />
      );

      expect(screen.queryByText('Your Ship')).toBeNull();
    });

    it('should set ShipCard isSelectable to false', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
        />
      );

      const shipCard = screen.getByTestId('ship-card');
      expect(shipCard).toHaveAttribute('data-selectable', 'false');
    });
  });

  describe('Ship Layout section', () => {
    it('should render Ship Layout heading when shipComponents provided and Layout tab active', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          shipComponents={mockShipComponents}
        />
      );

      // Click Layout tab first
      const layoutTab = screen.getByRole('button', { name: /layout/i });
      fireEvent.click(layoutTab);

      expect(screen.getByText('Ship Layout')).toBeInTheDocument();
    });

    it('should render ship sections for each lane when Layout tab active', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          shipComponents={mockShipComponents}
          ship={mockShip}
        />
      );

      // Click Layout tab first
      const layoutTab = screen.getByRole('button', { name: /layout/i });
      fireEvent.click(layoutTab);

      // Check lane labels
      expect(screen.getByText('LEFT')).toBeInTheDocument();
      expect(screen.getByText('MIDDLE (Bonus)')).toBeInTheDocument();
      expect(screen.getByText('RIGHT')).toBeInTheDocument();
    });

    it('should call resolveShipSectionStats for each component when ship provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          shipComponents={mockShipComponents}
          ship={mockShip}
        />
      );

      // Click Layout tab first
      const layoutTab = screen.getByRole('button', { name: /layout/i });
      fireEvent.click(layoutTab);

      // Should have been called for each component (may be called multiple times due to React Strict Mode)
      // Verify at least called with expected arguments for each component
      expect(resolveShipSectionStats).toHaveBeenCalled();
      const calls = resolveShipSectionStats.mock.calls;
      const calledComponentIds = calls.map(call => call[0]?.id);
      expect(calledComponentIds).toContain('BRIDGE_001');
      expect(calledComponentIds).toContain('POWERCELL_001');
      expect(calledComponentIds).toContain('DRONECONTROL_001');
    });

    it('should pass resolved stats with ship-specific image to ShipSection', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          shipComponents={mockShipComponents}
          ship={mockShip}
        />
      );

      // Click Layout tab first
      const layoutTab = screen.getByRole('button', { name: /layout/i });
      fireEvent.click(layoutTab);

      // Verify the mock was called with component and ship
      expect(resolveShipSectionStats).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'BRIDGE_001' }),
        mockShip
      );
    });
  });

  describe('Tab navigation', () => {
    it('should render Ship tab when ship is provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
        />
      );

      expect(screen.getByRole('button', { name: /ship/i })).toBeInTheDocument();
    });

    it('should NOT render Ship tab when ship is null', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={null}
          drones={mockDrones}
        />
      );

      // Should have Drones and Cards tabs but not Ship
      expect(screen.queryByRole('button', { name: /^ship$/i })).toBeNull();
      expect(screen.getByRole('button', { name: /drones/i })).toBeInTheDocument();
    });

    it('should render Layout tab when shipComponents provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          shipComponents={mockShipComponents}
        />
      );

      expect(screen.getByRole('button', { name: /layout/i })).toBeInTheDocument();
    });

    it('should NOT render Layout tab when shipComponents is empty', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          shipComponents={{}}
          drones={mockDrones}
        />
      );

      expect(screen.queryByRole('button', { name: /layout/i })).toBeNull();
    });

    it('should always render Drones and Cards tabs', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
        />
      );

      expect(screen.getByRole('button', { name: /drones/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cards/i })).toBeInTheDocument();
    });

    it('should default to Ship tab when ship is provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
          drones={mockDrones}
        />
      );

      // Ship tab should be active - ShipCard should be visible
      expect(screen.getByTestId('ship-card')).toBeInTheDocument();
    });

    it('should default to Drones tab when ship is not provided', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          drones={mockDrones}
        />
      );

      // Drones tab should be active - drone cards should be visible
      expect(screen.getAllByTestId('drone-card')).toHaveLength(2);
    });

    it('should switch to Drones tab when clicked', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
          drones={mockDrones}
        />
      );

      // Click Drones tab
      const dronesTab = screen.getByRole('button', { name: /drones/i });
      fireEvent.click(dronesTab);

      // Drone cards should be visible
      expect(screen.getAllByTestId('drone-card')).toHaveLength(2);
    });

    it('should switch to Cards tab when clicked', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          ship={mockShip}
          cards={mockCards}
        />
      );

      // Click Cards tab
      const cardsTab = screen.getByRole('button', { name: /cards/i });
      fireEvent.click(cardsTab);

      // Action cards should be visible
      expect(screen.getAllByTestId('action-card')).toHaveLength(2);
    });

    it('should display correct counts in tab labels', () => {
      render(
        <ViewDeckModal
          isOpen={true}
          onClose={() => {}}
          title="Test Deck"
          drones={mockDrones}
          cards={mockCards}
        />
      );

      // Check tabs show counts
      expect(screen.getByRole('button', { name: /drones \(2\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cards \(5\)/i })).toBeInTheDocument();
    });
  });
});
