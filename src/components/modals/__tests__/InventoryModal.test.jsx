/**
 * InventoryModal.test.jsx
 * TDD tests for Ship Section starter component detection
 *
 * BUG: Starter ship section cards show as placeholder backgrounds instead of
 * being displayed as owned cards with "Starter Section - ∞" label.
 *
 * Root cause: slot0Components extraction uses wrong keys ('left', 'middle', 'right')
 * but the actual keys in shipComponents are the component IDs themselves.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock all dependencies BEFORE importing the component
vi.mock('../../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

vi.mock('../../../data/cardData.js', () => ({
  default: [],
  RARITY_COLORS: { Common: '#808080', Uncommon: '#1eff00', Rare: '#0070dd', Mythic: '#a335ee' }
}));

vi.mock('../../../data/droneData.js', () => ({
  default: []
}));

vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    { id: 'BRIDGE_001', type: 'Bridge', name: 'Standard Command Bridge', rarity: 'Common' },
    { id: 'POWERCELL_001', type: 'Power Cell', name: 'Standard Power Cell', rarity: 'Common' },
    { id: 'DRONECONTROL_001', type: 'Drone Control Hub', name: 'Standard Drone Control Hub', rarity: 'Common' },
    { id: 'BRIDGE_002', type: 'Bridge', name: 'Tactical Command Bridge', rarity: 'Uncommon' }
  ]
}));

vi.mock('../../../data/shipData.js', () => ({
  shipCollection: []
}));

// Mock the card components to simplify testing
vi.mock('../../ui/HiddenCard', () => ({
  default: ({ rarity }) => <div data-testid="hidden-card">Hidden {rarity}</div>
}));

vi.mock('../../ui/HiddenShipCard', () => ({
  default: ({ rarity }) => <div data-testid="hidden-ship-card">Hidden Ship {rarity}</div>
}));

vi.mock('../../ui/HiddenShipSectionCard', () => ({
  default: ({ rarity }) => <div data-testid="hidden-section-card">Hidden Section {rarity}</div>
}));

vi.mock('../../ui/ActionCard', () => ({
  default: ({ card }) => <div data-testid="action-card">{card.name}</div>
}));

vi.mock('../../ui/DroneCard', () => ({
  default: ({ drone }) => <div data-testid="drone-card">{drone.name}</div>
}));

vi.mock('../../ui/ShipCard', () => ({
  default: ({ ship }) => <div data-testid="ship-card">{ship.name}</div>
}));

vi.mock('../../ui/ShipSectionCard', () => ({
  default: ({ section }) => <div data-testid="section-card">{section.name}</div>
}));

// Import after mocks
import { useGameState } from '../../../hooks/useGameState.js';
import InventoryModal from '../InventoryModal.jsx';

describe('InventoryModal - Ship Section Starter Component Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * BUG TEST: Starter ship sections should be detected from Slot 0
   *
   * The shipComponents in Slot 0 use component IDs as keys:
   * { 'BRIDGE_001': 'm', 'POWERCELL_001': 'l', 'DRONECONTROL_001': 'r' }
   *
   * Current broken code looks for: 'left', 'middle', 'right'
   * Expected behavior: Extract component IDs from Object.keys()
   *
   * This test will FAIL until the bug is fixed.
   */
  describe('slot0Components extraction bug', () => {
    it('should identify starter components from Slot 0 shipComponents keys', () => {
      // Setup: Mock game state with Slot 0 containing starter components
      // NOTE: The keys ARE the component IDs, values are lane codes
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerInventory: {},
          singlePlayerDiscoveredCards: [],
          singlePlayerShipSlots: [
            {
              id: 0,
              status: 'active',
              shipId: 'SHIP_001',
              decklist: [],
              drones: [],
              shipComponents: {
                'BRIDGE_001': 'm',       // Key = component ID
                'POWERCELL_001': 'l',    // Key = component ID
                'DRONECONTROL_001': 'r'  // Key = component ID
              }
            },
            { id: 1, status: 'empty', decklist: [], drones: [], shipComponents: {} }
          ],
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: [],
          singlePlayerOwnedShips: []
        }
      });

      render(<InventoryModal onClose={() => {}} />);

      // Navigate to Ship Sections tab
      const sectionsTab = screen.getByText('Ship Sections');
      fireEvent.click(sectionsTab);

      // ASSERT: The 3 starter components should show as ShipSectionCard (owned)
      // NOT as HiddenShipSectionCard (undiscovered)
      const sectionCards = screen.getAllByTestId('section-card');

      // We expect 3 starter components to be shown as owned
      expect(sectionCards.length).toBeGreaterThanOrEqual(3);

      // The starter components should NOT be hidden
      // BRIDGE_001, POWERCELL_001, DRONECONTROL_001 should all be visible
      expect(screen.getByText('Standard Command Bridge')).toBeInTheDocument();
      expect(screen.getByText('Standard Power Cell')).toBeInTheDocument();
      expect(screen.getByText('Standard Drone Control Hub')).toBeInTheDocument();
    });

    it('should mark starter components with "Starter Section" label', () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerInventory: {},
          singlePlayerDiscoveredCards: [],
          singlePlayerShipSlots: [
            {
              id: 0,
              status: 'active',
              shipId: 'SHIP_001',
              decklist: [],
              drones: [],
              shipComponents: {
                'BRIDGE_001': 'm',
                'POWERCELL_001': 'l',
                'DRONECONTROL_001': 'r'
              }
            }
          ],
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: [],
          singlePlayerOwnedShips: []
        }
      });

      render(<InventoryModal onClose={() => {}} />);

      // Navigate to Ship Sections tab
      const sectionsTab = screen.getByText('Ship Sections');
      fireEvent.click(sectionsTab);

      // ASSERT: Starter components should show "Starter Section - ∞"
      const starterLabels = screen.getAllByText(/Starter Section/);
      expect(starterLabels.length).toBe(3); // All 3 starter components
    });

    it('should show non-starter components as undiscovered (hidden)', () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerInventory: {},
          singlePlayerDiscoveredCards: [],
          singlePlayerShipSlots: [
            {
              id: 0,
              status: 'active',
              shipId: 'SHIP_001',
              decklist: [],
              drones: [],
              shipComponents: {
                'BRIDGE_001': 'm',
                'POWERCELL_001': 'l',
                'DRONECONTROL_001': 'r'
              }
            }
          ],
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: [],
          singlePlayerOwnedShips: []
        }
      });

      render(<InventoryModal onClose={() => {}} />);

      // Navigate to Ship Sections tab
      const sectionsTab = screen.getByText('Ship Sections');
      fireEvent.click(sectionsTab);

      // ASSERT: BRIDGE_002 (non-starter) should be hidden
      // since it's not in Slot 0 and not in inventory
      const hiddenCards = screen.queryAllByTestId('hidden-section-card');
      expect(hiddenCards.length).toBe(1); // Only BRIDGE_002 is hidden
    });

    it('should handle empty shipComponents gracefully', () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerInventory: {},
          singlePlayerDiscoveredCards: [],
          singlePlayerShipSlots: [
            {
              id: 0,
              status: 'active',
              shipId: 'SHIP_001',
              decklist: [],
              drones: [],
              shipComponents: {} // Empty - no starter components
            }
          ],
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: [],
          singlePlayerOwnedShips: []
        }
      });

      render(<InventoryModal onClose={() => {}} />);

      // Navigate to Ship Sections tab
      const sectionsTab = screen.getByText('Ship Sections');
      fireEvent.click(sectionsTab);

      // ASSERT: All components should be hidden (none are starters)
      const hiddenCards = screen.queryAllByTestId('hidden-section-card');
      expect(hiddenCards.length).toBe(4); // All 4 components hidden
    });

    it('should handle null shipComponents gracefully', () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerInventory: {},
          singlePlayerDiscoveredCards: [],
          singlePlayerShipSlots: [
            {
              id: 0,
              status: 'active',
              shipId: 'SHIP_001',
              decklist: [],
              drones: [],
              shipComponents: null // Null
            }
          ],
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: [],
          singlePlayerOwnedShips: []
        }
      });

      // Should not crash
      expect(() => {
        render(<InventoryModal onClose={() => {}} />);
      }).not.toThrow();
    });
  });
});
