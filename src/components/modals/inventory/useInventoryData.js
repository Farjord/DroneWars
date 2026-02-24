// ========================================
// USE INVENTORY DATA HOOK
// ========================================
// Derives enriched inventory data from game state via useMemo

import { useMemo } from 'react';
import fullCardCollection from '../../../data/cardData';
import fullDroneCollection from '../../../data/droneData';
import { shipComponentCollection } from '../../../data/shipSectionData';
import { shipCollection } from '../../../data/shipData';
import { tacticalItemCollection } from '../../../data/tacticalItemData';

/**
 * Custom hook that computes all enriched inventory data from game state.
 * Returns memoized collections and stats for cards, drones, ships, components, and tactical items.
 */
const useInventoryData = (gameState) => {
  // Fallbacks for showcase mode where game state may be empty
  const {
    singlePlayerInventory = {},
    singlePlayerDiscoveredCards = [],
    singlePlayerShipSlots = [],
    singlePlayerDroneInstances = [],
    singlePlayerShipComponentInstances = [],
    singlePlayerOwnedShips = [],
    singlePlayerProfile = {},
  } = gameState || {};

  /**
   * Extract cards from Ship Slot 0 (immutable starter deck)
   * Slot 0 cards have infinite quantity
   */
  const slot0Cards = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.decklist) return {};

    const cardMap = {};
    for (const card of slot0.decklist) {
      cardMap[card.id] = Infinity;  // Infinite quantity for starter deck
    }
    return cardMap;
  }, [singlePlayerShipSlots]);

  /**
   * Enrich cards with discovery state and quantity
   * Merges Slot 0 cards (infinite) with inventory cards (finite)
   */
  const enrichedCards = useMemo(() => {
    return fullCardCollection.map(card => {
      const discoveryEntry = singlePlayerDiscoveredCards.find(d => d.cardId === card.id);

      // Determine quantity: Slot 0 cards show Infinity, inventory cards show number
      let quantity;
      let isFromSlot0 = false;

      if (slot0Cards[card.id] === Infinity) {
        quantity = Infinity;
        isFromSlot0 = true;
      } else {
        quantity = singlePlayerInventory[card.id] || 0;
      }

      // Determine discovery state
      let discoveryState;
      if (isFromSlot0 || quantity > 0) {
        discoveryState = 'owned';
      } else if (discoveryEntry) {
        discoveryState = discoveryEntry.state;
      } else {
        discoveryState = 'undiscovered';
      }

      return {
        ...card,
        discoveryState,
        quantity,
        isFromSlot0
      };
    });
  }, [singlePlayerInventory, singlePlayerDiscoveredCards, slot0Cards]);

  /**
   * Calculate collection stats
   */
  const collectionStats = useMemo(() => {
    const stats = {
      total: enrichedCards.length,
      owned: enrichedCards.filter(c => c.discoveryState === 'owned' || c.quantity > 0 || c.quantity === Infinity).length,
      discovered: enrichedCards.filter(c => c.discoveryState === 'discovered').length,
      byRarity: {}
    };

    for (const rarity of ['Common', 'Uncommon', 'Rare', 'Mythic']) {
      const rarityCards = enrichedCards.filter(c => c.rarity === rarity);
      stats.byRarity[rarity] = {
        total: rarityCards.length,
        owned: rarityCards.filter(c => c.discoveryState === 'owned' || c.quantity > 0 || c.quantity === Infinity).length,
      };
    }

    return stats;
  }, [enrichedCards]);

  /**
   * Get Slot 0 drones for reference (starter drones)
   */
  const slot0Drones = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.droneSlots) return [];
    return slot0.droneSlots.filter(s => s.assignedDrone).map(s => s.assignedDrone);
  }, [singlePlayerShipSlots]);

  /**
   * Get Slot 0 ship components for reference (starter components)
   */
  const slot0Components = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.shipComponents) return [];
    return Object.keys(slot0.shipComponents);
  }, [singlePlayerShipSlots]);

  /**
   * Enriched drone data with ownership info
   */
  const enrichedDrones = useMemo(() => {
    const unlockedBlueprints = singlePlayerProfile?.unlockedBlueprints || [];

    return fullDroneCollection.map(drone => {
      const droneId = drone.name || drone.id;
      const isStarterDrone = slot0Drones.includes(droneId);

      const ownedInstances = singlePlayerDroneInstances.filter(
        inst => (inst.droneName === droneId || inst.droneId === droneId) && inst.shipSlotId === null
      );

      const isOwned = isStarterDrone || ownedInstances.length > 0;
      const isBlueprintUnlocked = unlockedBlueprints.includes(droneId);

      let discoveryState;
      if (isOwned) {
        discoveryState = 'owned';
      } else if (isBlueprintUnlocked) {
        discoveryState = 'discovered';
      } else {
        discoveryState = 'undiscovered';
      }

      return {
        ...drone,
        isStarterDrone,
        isBlueprintUnlocked,
        ownedCount: ownedInstances.length,
        instances: ownedInstances,
        discoveryState
      };
    });
  }, [singlePlayerDroneInstances, slot0Drones, singlePlayerProfile]);

  /**
   * Drone stats
   */
  const droneStats = useMemo(() => {
    const starterCount = enrichedDrones.filter(d => d.isStarterDrone).length;
    const ownedCount = enrichedDrones.filter(d => d.ownedCount > 0 || d.isStarterDrone).length;
    const totalInstances = singlePlayerDroneInstances.filter(i => i.shipSlotId === null).length;

    const byRarity = {};
    for (const rarity of ['Common', 'Uncommon', 'Rare', 'Mythic']) {
      const rarityDrones = enrichedDrones.filter(d => d.rarity === rarity);
      byRarity[rarity] = {
        total: rarityDrones.length,
        owned: rarityDrones.filter(d => d.ownedCount > 0 || d.isStarterDrone).length
      };
    }

    return {
      total: enrichedDrones.length,
      owned: ownedCount,
      starter: starterCount,
      instances: totalInstances,
      byRarity
    };
  }, [enrichedDrones, singlePlayerDroneInstances]);

  /**
   * Enriched ship component data with ownership info
   */
  const enrichedComponents = useMemo(() => {
    return shipComponentCollection.map(comp => {
      const compId = comp.id;
      const isStarterComponent = slot0Components.includes(compId);

      const ownedInstances = singlePlayerShipComponentInstances.filter(
        inst => inst.componentId === compId && inst.shipSlotId === null
      );

      const isOwned = isStarterComponent || ownedInstances.length > 0;

      return {
        ...comp,
        isStarterComponent,
        ownedCount: ownedInstances.length,
        instances: ownedInstances,
        discoveryState: isOwned ? 'owned' : 'undiscovered'
      };
    });
  }, [singlePlayerShipComponentInstances, slot0Components]);

  /**
   * Ship component stats
   */
  const componentStats = useMemo(() => {
    const starterCount = enrichedComponents.filter(c => c.isStarterComponent).length;
    const ownedCount = enrichedComponents.filter(c => c.ownedCount > 0 || c.isStarterComponent).length;
    const totalInstances = singlePlayerShipComponentInstances.filter(i => i.shipSlotId === null).length;

    const byRarity = {};
    for (const rarity of ['Common', 'Uncommon', 'Rare', 'Mythic']) {
      const rarityComps = enrichedComponents.filter(c => c.rarity === rarity);
      byRarity[rarity] = {
        total: rarityComps.length,
        owned: rarityComps.filter(c => c.ownedCount > 0 || c.isStarterComponent).length
      };
    }

    return {
      total: enrichedComponents.length,
      owned: ownedCount,
      starter: starterCount,
      instances: totalInstances,
      byRarity
    };
  }, [enrichedComponents, singlePlayerShipComponentInstances]);

  /**
   * Enriched ship data with ownership info
   */
  const enrichedShips = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    const starterShipId = slot0?.shipId;

    return (shipCollection || []).map(ship => {
      const isStarterShip = ship.id === starterShipId;
      const ownedCount = singlePlayerOwnedShips.filter(s => s === ship.id || s.shipId === ship.id).length;
      const isOwned = isStarterShip || ownedCount > 0;

      return {
        ...ship,
        isStarterShip,
        ownedCount,
        discoveryState: isOwned ? 'owned' : 'undiscovered'
      };
    });
  }, [singlePlayerOwnedShips, singlePlayerShipSlots]);

  /**
   * Ship stats
   */
  const shipStats = useMemo(() => {
    const starterCount = enrichedShips.filter(s => s.isStarterShip).length;
    const ownedCount = enrichedShips.filter(s => s.ownedCount > 0 || s.isStarterShip).length;

    const byRarity = {};
    for (const rarity of ['Common', 'Uncommon', 'Rare', 'Mythic']) {
      const rarityShips = enrichedShips.filter(s => s.rarity === rarity);
      byRarity[rarity] = {
        total: rarityShips.length,
        owned: rarityShips.filter(s => s.ownedCount > 0 || s.isStarterShip).length
      };
    }

    return {
      total: enrichedShips.length,
      owned: ownedCount,
      starter: starterCount,
      byRarity
    };
  }, [enrichedShips]);

  /**
   * Total tactical items owned
   */
  const tacticalItemsOwned = tacticalItemCollection.reduce((sum, item) => {
    return sum + (singlePlayerProfile?.tacticalItems?.[item.id] || 0);
  }, 0);

  return {
    enrichedCards,
    enrichedDrones,
    enrichedShips,
    enrichedComponents,
    collectionStats,
    droneStats,
    shipStats,
    componentStats,
    slot0Cards,
    slot0Drones,
    tacticalItemsOwned,
    singlePlayerProfile,
  };
};

export default useInventoryData;
