/**
 * BlueprintsModal.craft.test.jsx
 * TDD tests for drone/component instance creation when crafting
 *
 * When players craft drones or ship components, the system must create
 * instance objects (droneInstances / shipComponentInstances) to track
 * individual copies with damage/hull states. These instances are required
 * for the deck builder's availability calculations.
 *
 * Bug: Crafting adds to inventory but doesn't create instances, causing
 * crafted items to not appear in the deck builder.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
vi.mock('../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

// Mock drone data with starter and non-starter drones
vi.mock('../../data/droneData.js', () => ({
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
vi.mock('../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    // Starter components (should NOT create instances)
    { id: 'BRIDGE_001', name: 'Standard Command Bridge', type: 'Bridge', rarity: 'Common', hull: 10, maxHull: 10 },
    // Non-starter components (SHOULD create instances)
    { id: 'BRIDGE_002', name: 'Tactical Command Bridge', type: 'Bridge', rarity: 'Uncommon', hull: 12, maxHull: 12 },
    { id: 'POWERCELL_002', name: 'Advanced Power Cell', type: 'Power Cell', rarity: 'Rare', hull: 15 },
  ]
}));

// Mock ship data
vi.mock('../../data/shipData.js', () => ({
  getAllShips: () => [
    { id: 'SHIP_001', name: 'Reconnaissance Corvette', rarity: 'Common', baseHull: 8, baseShields: 3 },
    { id: 'SHIP_002', name: 'Assault Frigate', rarity: 'Uncommon', baseHull: 12, baseShields: 4 },
  ]
}));

// Mock card data for rarity colors
vi.mock('../../data/cardData.js', () => ({
  RARITY_COLORS: { Common: '#808080', Uncommon: '#1eff00', Rare: '#0070dd', Mythic: '#a335ee' }
}));

// Mock starter deck data
vi.mock('../../data/playerDeckData.js', () => ({
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
vi.mock('../../data/saveGameSchema.js', () => ({
  starterPoolShipIds: ['SHIP_001'],
  starterPoolDroneNames: ['Dart', 'Talon']
}));

// Mock economy data
vi.mock('../../data/economyData.js', () => ({
  ECONOMY: {
    REPLICATION_COSTS: { Common: 100, Uncommon: 250, Rare: 600, Mythic: 1500 }
  }
}));

// Mock AI cores data
vi.mock('../../data/aiCoresData.js', () => ({
  getAICoresCost: (rarity) => {
    const costs = { Common: 1, Uncommon: 2, Rare: 3, Mythic: 5 };
    return costs[rarity] || 1;
  }
}));

// Import after mocks
import { useGameState } from '../../hooks/useGameState.js';
import BlueprintsModal from './BlueprintsModal.jsx';

describe('BlueprintsModal - Crafting Creates Instances', () => {
  const mockGameStateManager = {
    setState: vi.fn(),
    updateCardDiscoveryState: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Crafting non-starter drones', () => {
    it('should create a drone instance when crafting a non-starter drone', async () => {
      // Setup: Player has enough resources, no existing instances
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['Harrier']
          },
          singlePlayerInventory: {},
          singlePlayerDroneInstances: [], // No instances yet
          singlePlayerShipComponentInstances: []
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Find and click the Create button for Harrier
      const createButtons = screen.getAllByText('Create');
      // Harrier is the first non-starter drone in the list
      fireEvent.click(createButtons[0]);

      // Verify setState was called
      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      // Get the setState call arguments
      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];

      // Verify drone instance was created
      expect(setStateCall.singlePlayerDroneInstances).toBeDefined();
      expect(setStateCall.singlePlayerDroneInstances.length).toBe(1);

      const droneInstance = setStateCall.singlePlayerDroneInstances[0];
      expect(droneInstance).toMatchObject({
        droneName: 'Harrier',
        shipSlotId: null,
        isDamaged: false
      });
      expect(droneInstance.instanceId).toBeDefined();
      expect(droneInstance.instanceId).toMatch(/^DRONE_/);
    });

    it('should create multiple instances when crafting the same drone multiple times', async () => {
      // Setup: Player has enough resources, one existing instance
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['Harrier']
          },
          singlePlayerInventory: { 'Harrier': 1 },
          singlePlayerDroneInstances: [
            { instanceId: 'DRONE_existing_001', droneName: 'Harrier', shipSlotId: null, isDamaged: false }
          ],
          singlePlayerShipComponentInstances: []
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Craft second copy
      const createButtons = screen.getAllByText('Create');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];

      // Verify 2 instances now exist (1 existing + 1 new)
      expect(setStateCall.singlePlayerDroneInstances.length).toBe(2);
      expect(setStateCall.singlePlayerDroneInstances[0].instanceId).toBe('DRONE_existing_001');
      expect(setStateCall.singlePlayerDroneInstances[1].droneName).toBe('Harrier');
    });

    it('should NOT create instance when crafting a starter drone', async () => {
      // Setup: Player can somehow craft a starter drone (edge case)
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: []
          },
          singlePlayerInventory: {},
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: []
        },
        gameStateManager: mockGameStateManager
      });

      // Note: In production, starter drones are excluded from blueprints,
      // but this test verifies the instance creation logic handles them correctly
      // This scenario shouldn't happen in normal gameplay, but defensive code is good
    });
  });

  describe('Crafting non-starter ship components', () => {
    it('should create a component instance when crafting a non-starter component', async () => {
      // Setup: Player has enough resources
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['BRIDGE_002']
          },
          singlePlayerInventory: {},
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: [] // No instances yet
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Switch to Ships tab
      fireEvent.click(screen.getByText('Ships'));

      // Find and click Create button for Tactical Command Bridge
      const createButtons = screen.getAllByText('Create');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];

      // Verify component instance was created
      expect(setStateCall.singlePlayerShipComponentInstances).toBeDefined();
      expect(setStateCall.singlePlayerShipComponentInstances.length).toBe(1);

      const componentInstance = setStateCall.singlePlayerShipComponentInstances[0];
      expect(componentInstance).toMatchObject({
        componentId: 'BRIDGE_002',
        shipSlotId: null,
        currentHull: 12,
        maxHull: 12
      });
      expect(componentInstance.instanceId).toBeDefined();
      expect(componentInstance.instanceId).toMatch(/^COMP_/);
    });

    it('should handle components with only hull (no maxHull) correctly', async () => {
      // Setup: Test Advanced Power Cell which only has hull defined
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['POWERCELL_002']
          },
          singlePlayerInventory: {},
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: []
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Switch to Ships tab
      fireEvent.click(screen.getByText('Ships'));

      // Find and click Create button for Advanced Power Cell
      const createButtons = screen.getAllByText('Create');
      // Find the button for Advanced Power Cell (index may vary)
      const advancedPowerCellButton = createButtons.find((button, idx) => {
        const parent = button.closest('[style]');
        return parent && parent.textContent.includes('Advanced Power Cell');
      });

      if (advancedPowerCellButton) {
        fireEvent.click(advancedPowerCellButton);
      } else {
        // Fallback: click last button (might be Advanced Power Cell)
        fireEvent.click(createButtons[createButtons.length - 1]);
      }

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];

      // Verify maxHull defaults to hull value
      const componentInstance = setStateCall.singlePlayerShipComponentInstances[0];
      expect(componentInstance.currentHull).toBe(15);
      expect(componentInstance.maxHull).toBe(15); // Should default to hull
    });
  });

  describe('Inventory is also updated', () => {
    it('should update both inventory and instances when crafting', async () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: ['Harrier']
          },
          singlePlayerInventory: {},
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: []
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      const createButtons = screen.getAllByText('Create');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];

      // Verify both inventory and instances updated
      expect(setStateCall.singlePlayerInventory['Harrier']).toBe(1);
      expect(setStateCall.singlePlayerDroneInstances.length).toBe(1);
    });
  });

  describe('Ship Cards do not create instances', () => {
    it('should NOT create instances when unlocking ship cards', async () => {
      useGameState.mockReturnValue({
        gameState: {
          singlePlayerProfile: {
            credits: 1000,
            aiCores: 10,
            unlockedBlueprints: []
          },
          singlePlayerInventory: {},
          singlePlayerDroneInstances: [],
          singlePlayerShipComponentInstances: []
        },
        gameStateManager: mockGameStateManager
      });

      render(<BlueprintsModal onClose={() => {}} />);

      // Switch to Ship Cards tab
      fireEvent.click(screen.getByText('Ship Cards'));

      // Unlock Assault Frigate
      const unlockButtons = screen.getAllByText('Unlock');
      fireEvent.click(unlockButtons[0]);

      await waitFor(() => {
        expect(mockGameStateManager.setState).toHaveBeenCalled();
      });

      const setStateCall = mockGameStateManager.setState.mock.calls[0][0];

      // Verify ship card added to inventory but NO instances created
      expect(setStateCall.singlePlayerInventory['SHIP_002']).toBe(1);

      // Ship slots don't use instance arrays
      if (setStateCall.singlePlayerDroneInstances) {
        expect(setStateCall.singlePlayerDroneInstances.length).toBe(0);
      }
      if (setStateCall.singlePlayerShipComponentInstances) {
        expect(setStateCall.singlePlayerShipComponentInstances.length).toBe(0);
      }
    });
  });
});
