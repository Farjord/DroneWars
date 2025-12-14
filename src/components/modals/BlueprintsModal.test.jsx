/**
 * BlueprintsModal.test.jsx
 * TDD tests for excluding starter items from Blueprints
 *
 * Starter deck items (Ship, Ship Sections, Drones) are always available with
 * infinite (99) quantity in ALL deck slots. They should NOT appear in Blueprints
 * since players don't need to craft them.
 *
 * Starter items to exclude:
 * - Drones: Dart, Talon, Mammoth, Bastion, Seraph
 * - Ship Sections: BRIDGE_001, POWERCELL_001, DRONECONTROL_001
 * - Ships: SHIP_001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies BEFORE importing the component
vi.mock('../../hooks/useGameState.js', () => ({
  useGameState: vi.fn()
}));

// Mock drone data with starter and non-starter drones
vi.mock('../../data/droneData.js', () => ({
  default: [
    // Starter drones (should be EXCLUDED)
    { name: 'Dart', rarity: 'Common', selectable: true },
    { name: 'Talon', rarity: 'Common', selectable: true },
    { name: 'Mammoth', rarity: 'Common', selectable: true },
    { name: 'Bastion', rarity: 'Common', selectable: true },
    { name: 'Seraph', rarity: 'Common', selectable: true },
    // Non-starter drones (should be INCLUDED)
    { name: 'Harrier', rarity: 'Uncommon', selectable: true },
    { name: 'Bomber Drone', rarity: 'Rare', selectable: true },
  ]
}));

// Mock ship section data with starter and non-starter components
vi.mock('../../data/shipSectionData.js', () => ({
  shipComponentCollection: [
    // Starter components (should be EXCLUDED)
    { id: 'BRIDGE_001', name: 'Standard Command Bridge', type: 'Bridge', rarity: 'Common' },
    { id: 'POWERCELL_001', name: 'Standard Power Cell', type: 'Power Cell', rarity: 'Common' },
    { id: 'DRONECONTROL_001', name: 'Standard Drone Control Hub', type: 'Drone Control Hub', rarity: 'Common' },
    // Non-starter components (should be INCLUDED)
    { id: 'BRIDGE_002', name: 'Tactical Command Bridge', type: 'Bridge', rarity: 'Uncommon' },
  ]
}));

// Mock ship data with starter and non-starter ships
vi.mock('../../data/shipData.js', () => ({
  getAllShips: () => [
    // Starter ship (should be EXCLUDED)
    { id: 'SHIP_001', name: 'Reconnaissance Corvette', rarity: 'Common', baseHull: 8, baseShields: 3 },
    // Non-starter ships (should be INCLUDED)
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
      { slotIndex: 2, slotDamaged: false, assignedDrone: 'Mammoth' },
      { slotIndex: 3, slotDamaged: false, assignedDrone: 'Bastion' },
      { slotIndex: 4, slotDamaged: false, assignedDrone: 'Seraph' },
    ],
    shipComponents: {
      'BRIDGE_001': 'm',
      'POWERCELL_001': 'l',
      'DRONECONTROL_001': 'r',
    }
  }
}));

// Mock starter pool ship IDs
vi.mock('../../data/saveGameSchema.js', () => ({
  starterPoolShipIds: ['SHIP_001']
}));

// Mock economy data
vi.mock('../../data/economyData.js', () => ({
  ECONOMY: {
    REPLICATION_COSTS: { Common: 100, Uncommon: 250, Rare: 600, Mythic: 1500 },
    STARTER_BLUEPRINT_COSTS: { Common: 75, Uncommon: 175, Rare: 450, Mythic: 1100 }
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

describe('BlueprintsModal - Starter Items Exclusion', () => {
  const mockGameStateManager = {
    setState: vi.fn(),
    updateCardDiscoveryState: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock with some non-starter items unlocked
    useGameState.mockReturnValue({
      gameState: {
        singlePlayerProfile: {
          credits: 1000,
          aiCores: 10,
          // Unlock non-starter items so they display their names
          unlockedBlueprints: ['Harrier', 'Bomber Drone', 'BRIDGE_002']
        },
        // Non-starter ship owned (makes it unlocked)
        singlePlayerInventory: { 'SHIP_002': 1 }
      },
      gameStateManager: mockGameStateManager
    });
  });

  describe('Drones tab - Starter drones should be excluded', () => {
    /**
     * Starter drones (Dart, Talon, Mammoth, Bastion, Seraph)
     * should NOT appear in the Drones tab since they're infinitely available.
     */
    it('should NOT show starter drones in the Drones tab', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Drones tab is default, no need to click

      // Starter drones should NOT appear
      expect(screen.queryByText('Dart')).toBeNull();
      expect(screen.queryByText('Talon')).toBeNull();
      expect(screen.queryByText('Mammoth')).toBeNull();
      expect(screen.queryByText('Bastion')).toBeNull();
      expect(screen.queryByText('Seraph')).toBeNull();
    });

    it('should show non-starter drones in the Drones tab', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Non-starter drones SHOULD appear
      expect(screen.getByText('Harrier')).toBeInTheDocument();
      expect(screen.getByText('Bomber Drone')).toBeInTheDocument();
    });

    it('should show correct stats count excluding starter drones', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Should show "2 / 2 unlocked" (only 2 non-starter drones, both unlocked in mock)
      // NOT "7 / 7 unlocked" which would include 5 starter drones
      expect(screen.getByText('2 / 2 unlocked')).toBeInTheDocument();
    });
  });

  describe('Ships tab - Starter components should be excluded', () => {
    /**
     * Starter ship sections (BRIDGE_001, POWERCELL_001, DRONECONTROL_001)
     * should NOT appear in the Ships tab since they're infinitely available.
     */
    it('should NOT show starter components in the Ships tab', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Click Ships tab
      fireEvent.click(screen.getByText('Ships'));

      // Starter components should NOT appear
      expect(screen.queryByText('Standard Command Bridge')).toBeNull();
      expect(screen.queryByText('Standard Power Cell')).toBeNull();
      expect(screen.queryByText('Standard Drone Control Hub')).toBeNull();
    });

    it('should show non-starter components in the Ships tab', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Click Ships tab
      fireEvent.click(screen.getByText('Ships'));

      // Non-starter components SHOULD appear
      expect(screen.getByText('Tactical Command Bridge')).toBeInTheDocument();
    });

    it('should show correct stats count excluding starter components', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Click Ships tab
      fireEvent.click(screen.getByText('Ships'));

      // Should show "1 / 1 unlocked" (only 1 non-starter component, unlocked in mock)
      // NOT "4 / 4 unlocked" which would include 3 starter components
      expect(screen.getByText('1 / 1 unlocked')).toBeInTheDocument();
    });
  });

  describe('Ship Cards tab - Starter ship should be excluded', () => {
    /**
     * Starter ship (SHIP_001 - Reconnaissance Corvette)
     * should NOT appear in the Ship Cards tab since it's infinitely available.
     */
    it('should NOT show starter ship in the Ship Cards tab', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Click Ship Cards tab
      fireEvent.click(screen.getByText('Ship Cards'));

      // Starter ship should NOT appear
      expect(screen.queryByText('Reconnaissance Corvette')).toBeNull();
    });

    it('should show non-starter ships in the Ship Cards tab', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Click Ship Cards tab
      fireEvent.click(screen.getByText('Ship Cards'));

      // Non-starter ships SHOULD appear
      expect(screen.getByText('Assault Frigate')).toBeInTheDocument();
    });

    it('should show correct stats count excluding starter ship', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Click Ship Cards tab
      fireEvent.click(screen.getByText('Ship Cards'));

      // Should show "1 / 1 unlocked" (only 1 non-starter ship, owned in mock)
      // NOT "2 / 2 unlocked" which would include starter ship
      expect(screen.getByText('1 / 1 unlocked')).toBeInTheDocument();
    });
  });

  describe('No STARTER badge should be rendered', () => {
    /**
     * Since starter items are excluded, the "STARTER" badge should never appear.
     */
    it('should not render any STARTER badges', () => {
      render(<BlueprintsModal onClose={() => {}} />);

      // Check all tabs
      expect(screen.queryByText('STARTER')).toBeNull();

      fireEvent.click(screen.getByText('Ships'));
      expect(screen.queryByText('STARTER')).toBeNull();

      fireEvent.click(screen.getByText('Ship Cards'));
      expect(screen.queryByText('STARTER')).toBeNull();
    });
  });
});
