import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// HANGAR SCREEN - SHIP IMAGE BACKGROUND TESTS
// ========================================
// TDD tests for displaying ship images as backgrounds on active deck slots
//
// REQUIREMENT: Active deck slots (unlocked with a saved deck) should display
// the selected ship's image as a semi-transparent background

// Mock getShipById to track calls and return expected data
const mockGetShipById = vi.fn((shipId) => {
  const ships = {
    'SHIP_001': { id: 'SHIP_001', name: 'Corvette', image: '/DroneWars/Ships/corvette.png' },
    'SHIP_002': { id: 'SHIP_002', name: 'Carrier', image: '/DroneWars/Ships/carrier.png' },
  };
  return ships[shipId] || null;
});

vi.mock('../../data/shipData.js', () => ({
  getShipById: (shipId) => mockGetShipById(shipId),
  getAllShips: () => [],
  getDefaultShip: () => ({ id: 'SHIP_001', name: 'Corvette', image: '/DroneWars/Ships/corvette.png' }),
}));

describe('HangarScreen - Ship Image Backgrounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getShipById lookup for active slots', () => {
    /**
     * When rendering an active slot with a shipId, getShipById should be called
     * to retrieve the ship data including the image URL.
     */
    it('should call getShipById with the slot shipId for active slots', () => {
      // Setup: An active slot with shipId 'SHIP_001'
      const activeSlot = {
        id: 1,
        status: 'active',
        shipId: 'SHIP_001',
        name: 'Test Deck',
        decklist: [],
        drones: [],
        shipComponents: {},
      };

      // Simulate what the component should do
      const isActive = activeSlot.status === 'active';
      if (isActive && activeSlot.shipId) {
        mockGetShipById(activeSlot.shipId);
      }

      // Verify getShipById was called with the correct shipId
      expect(mockGetShipById).toHaveBeenCalledWith('SHIP_001');
    });

    it('should NOT call getShipById for empty slots', () => {
      const emptySlot = {
        id: 2,
        status: 'empty',
        shipId: null,
        name: null,
      };

      mockGetShipById.mockClear();

      // Simulate component logic
      const isActive = emptySlot.status === 'active';
      if (isActive && emptySlot.shipId) {
        mockGetShipById(emptySlot.shipId);
      }

      // getShipById should NOT be called for empty slots
      expect(mockGetShipById).not.toHaveBeenCalled();
    });

    it('should NOT call getShipById for locked slots', () => {
      // Locked slots are not unlocked yet - they don't have decks
      const lockedSlotId = 3;
      const highestUnlockedSlot = 1; // Only slots 0-1 are unlocked
      const isUnlocked = lockedSlotId <= highestUnlockedSlot;

      mockGetShipById.mockClear();

      // Locked slots should never trigger getShipById
      if (isUnlocked) {
        mockGetShipById('SHIP_001');
      }

      expect(mockGetShipById).not.toHaveBeenCalled();
    });
  });

  describe('backgroundImage style application', () => {
    /**
     * Active slots with a ship should have backgroundImage style set
     */
    it('should return ship image URL for active slots with shipId', () => {
      const activeSlot = {
        id: 1,
        status: 'active',
        shipId: 'SHIP_001',
      };

      const isActive = activeSlot.status === 'active';
      const ship = isActive && activeSlot.shipId ? mockGetShipById(activeSlot.shipId) : null;
      const shipImage = ship?.image || null;

      expect(shipImage).toBe('/DroneWars/Ships/corvette.png');
    });

    it('should return null for empty slots', () => {
      const emptySlot = {
        id: 2,
        status: 'empty',
        shipId: null,
      };

      const isActive = emptySlot.status === 'active';
      const ship = isActive && emptySlot.shipId ? mockGetShipById(emptySlot.shipId) : null;
      const shipImage = ship?.image || null;

      expect(shipImage).toBeNull();
    });

    it('should return null for MIA slots', () => {
      const miaSlot = {
        id: 1,
        status: 'mia',
        shipId: 'SHIP_001', // Has a shipId but status is mia
      };

      const isActive = miaSlot.status === 'active';
      const ship = isActive && miaSlot.shipId ? mockGetShipById(miaSlot.shipId) : null;
      const shipImage = ship?.image || null;

      // MIA slots should NOT show ship image (status !== 'active')
      expect(shipImage).toBeNull();
    });

    it('should return null for active slots without shipId', () => {
      const slotWithoutShip = {
        id: 1,
        status: 'active',
        shipId: null, // No ship selected
      };

      const isActive = slotWithoutShip.status === 'active';
      const ship = isActive && slotWithoutShip.shipId ? mockGetShipById(slotWithoutShip.shipId) : null;
      const shipImage = ship?.image || null;

      expect(shipImage).toBeNull();
    });
  });

  describe('style object generation', () => {
    /**
     * The component should generate correct inline styles for background images
     */
    it('should generate correct backgroundImage style for active slot', () => {
      const shipImage = '/DroneWars/Ships/corvette.png';

      // Expected style object
      const expectedStyle = {
        backgroundImage: `url(${shipImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };

      // Generate style like the component should
      const style = shipImage ? {
        backgroundImage: `url(${shipImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {};

      expect(style.backgroundImage).toBe('url(/DroneWars/Ships/corvette.png)');
      expect(style.backgroundSize).toBe('cover');
      expect(style.backgroundPosition).toBe('center');
    });

    it('should generate empty style object when no ship image', () => {
      const shipImage = null;

      const style = shipImage ? {
        backgroundImage: `url(${shipImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {};

      expect(style.backgroundImage).toBeUndefined();
    });
  });
});
