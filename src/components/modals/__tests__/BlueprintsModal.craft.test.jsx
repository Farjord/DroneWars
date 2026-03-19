/**
 * BlueprintsModal.craft.test.jsx
 * Tests for crafting drones/components via blueprints
 *
 * When players craft drones or ship components, items are added to inventory.
 * Instance tracking has been removed - inventory quantities are the source of truth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
vi.mock('../../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

// Mock drone data with starter and non-starter drones
vi.mock('../../../data/droneData.js', () => ({
  default: [
    // Starter drones (should NOT create instances)
    { name: 'Dart', rarity: 'Common', selectable: true },
    { name: 'Talon', rarity: 'Common', selectable: true },
    // Non-starter drones (SHOULD create instances)
    { name: 'Harrier', rarity: 'Uncommon', selectable: true },
    { name: 'Bomber Drone', rarity: 'Rare', selectable: true },
  ]
}));

// Mock ship section data with starter and non-starter components
vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    // Starter components
    { id: 'BRIDGE_001', name: 'Standard Command Bridge', type: 'Bridge', rarity: 'Common', hull: 10, maxHull: 10 },
    // Non-starter components
    { id: 'BRIDGE_002', name: 'Tactical Command Bridge', type: 'Bridge', rarity: 'Uncommon', hull: 12, maxHull: 12 },
    { id: 'POWERCELL_002', name: 'Advanced Power Cell', type: 'Power Cell', rarity: 'Rare', hull: 15 },
  ]
}));

// Mock ship data
vi.mock('../../../data/shipData.js', () => ({
  getAllShips: () => [
    { id: 'SHIP_001', name: 'Reconnaissance Corvette', rarity: 'Common', baseHull: 8, baseShields: 3 },
    { id: 'SHIP_002', name: 'Assault Frigate', rarity: 'Uncommon', baseHull: 12, baseShields: 4 },
  ]
}));

// Mock card data for rarity colors
vi.mock('../../../data/cardData.js', () => ({
  RARITY_COLORS: { Common: '#808080', Uncommon: '#1eff00', Rare: '#0070dd', Mythic: '#a335ee' }
}));

// Mock starter deck data
vi.mock('../../../data/playerDeckData.js', () => ({
  starterDeck: {
    droneSlots: [
      { slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' },
      { slotIndex: 1, slotDamaged: false, assignedDrone: 'Talon' },
    ],
    shipComponents: {
      'BRIDGE_001': 'm',
    }
  }
}));

// Mock starter pool IDs
vi.mock('../../../data/saveGameSchema.js', () => ({
  starterPoolShipIds: ['SHIP_001'],
  starterPoolDroneNames: ['Dart', 'Talon']
}));

// Mock economy data
vi.mock('../../../data/economyData.js', () => ({
  ECONOMY: {
    REPLICATION_COSTS: { Common: 100, Uncommon: 250, Rare: 600, Mythic: 1500 }
  }
}));

// Mock AI cores data
vi.mock('../../../data/aiCoresData.js', () => ({
  getAICoresCost: (rarity) => {
    const costs = { Common: 1, Uncommon: 2, Rare: 3, Mythic: 5 };
    return costs[rarity] || 1;
  }
}));

// Import after mocks
import { useGameState } from '../../../hooks/useGameState.js';
import BlueprintsModal from '../BlueprintsModal.jsx';

describe('BlueprintsModal - Crafting Updates Inventory', () => {
  const mockGameStateManager = {
    setState: vi.fn(),
    updateCardDiscoveryState: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Crafting non-starter drones', () => {
    it('should add drone to inventory when crafting', async () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['Harrier']
          },
          singlePlayerInventory: {}
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      const craftButtons = screen.getAllByText('Craft');
      fireEvent.click(craftButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];
      expect(setStateCall.singlePlayerInventory['Harrier']).toBe(1);
    });
  });

  describe('Crafting non-starter ship components', () => {
    it('should add component to inventory when crafting', async () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['BRIDGE_002']
          },
          singlePlayerInventory: {}
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Switch to Ships tab
      fireEvent.click(screen.getByText('Ships'));

      const craftButtons = screen.getAllByText('Craft');
      fireEvent.click(craftButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];
      expect(setStateCall.singlePlayerInventory).toBeDefined();
    });
  });

  describe('Ship Cards — consumable crafting', () => {
    it('should add ship card to inventory when crafting (starter ship always unlocked)', async () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: []
          },
          singlePlayerInventory: {}
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Switch to Ship Cards tab
      fireEvent.click(screen.getByText('Ship Cards'));

      // Starter ship (SHIP_001) is always unlocked and craftable
      const craftButtons = screen.getAllByText('Craft');
      fireEvent.click(craftButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];
      // Starter ship should be added to inventory
      expect(setStateCall.singlePlayerInventory['SHIP_001']).toBe(1);
    });
  });
});
